"""
Document ingestion pipeline: parse -> chunk -> embed -> store.

Structured as a standalone class (IngestionService) with no FastAPI/web
dependencies inside it, so it can be lifted into a Celery task later with
zero logic changes — only the calling code (BackgroundTask vs Celery
.delay()) would differ. For this MVP it's invoked via FastAPI
BackgroundTasks, which is enough for demo-scale usage with no extra infra
(no Redis/Celery required to run this project).
"""
import io

from docx import Document as DocxDocument
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.chunk import Chunk
from app.models.document import Document, DocumentStatus
from app.services.embeddings import embed_texts
from app.services.storage import get_storage_backend
from app.services.vector_store import get_vector_store


class IngestionService:
    def __init__(self):
        self.storage = get_storage_backend()
        self.vector_store = get_vector_store()
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
        )

    def extract_text(self, raw_bytes: bytes, mime_type: str, filename: str) -> str:
        if mime_type == "application/pdf":
            reader = PdfReader(io.BytesIO(raw_bytes))
            return "\n\n".join(page.extract_text() or "" for page in reader.pages)

        if mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            doc = DocxDocument(io.BytesIO(raw_bytes))
            return "\n\n".join(p.text for p in doc.paragraphs)

        if mime_type == "text/plain":
            return raw_bytes.decode("utf-8", errors="replace")

        raise ValueError(f"Unsupported mime_type for ingestion: {mime_type}")

    async def run(self, document_id: str) -> None:
        """
        Entry point invoked from a FastAPI BackgroundTask. Uses its own DB
        session (background tasks must not reuse a request-scoped session
        that may already be closed).
        """
        async with AsyncSessionLocal() as db:
            try:
                document = await self._get_document(db, document_id)
                if document is None:
                    return

                raw_bytes = self.storage.get(document.storage_path)
                text = self.extract_text(raw_bytes, document.mime_type, document.filename)

                if not text.strip():
                    await self._mark_failed(db, document_id, "No extractable text found in file.")
                    return

                chunks_text = self.splitter.split_text(text)
                if not chunks_text:
                    await self._mark_failed(db, document_id, "Document produced zero chunks.")
                    return

                embeddings = embed_texts(chunks_text)

                chunk_rows: list[Chunk] = []
                for idx, chunk_text in enumerate(chunks_text):
                    chunk_rows.append(
                        Chunk(
                            document_id=document.id,
                            document_name=document.filename,
                            content=chunk_text,
                            chunk_index=idx,
                            # Visibility copied from parent document at
                            # ingestion time — this is what allows the RBAC
                            # filter to run directly on Chunk without a join.
                            visibility=document.visibility.value,
                        )
                    )

                db.add_all(chunk_rows)
                await db.flush()  # populate chunk_rows[i].id

                self.vector_store.add_batch(
                    chunk_ids=[c.id for c in chunk_rows],
                    vectors=embeddings,
                    visibility=document.visibility.value,
                )

                document.status = DocumentStatus.READY
                document.chunk_count = len(chunk_rows)
                await db.commit()

            except Exception as exc:  # noqa: BLE001 - ingestion must never crash the worker
                await db.rollback()
                await self._mark_failed(db, document_id, str(exc))

    async def _get_document(self, db: AsyncSession, document_id: str) -> Document | None:
        result = await db.execute(select(Document).where(Document.id == document_id))
        return result.scalar_one_or_none()

    async def _mark_failed(self, db: AsyncSession, document_id: str, error_message: str) -> None:
        await db.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(status=DocumentStatus.FAILED, error_message=error_message[:2000])
        )
        await db.commit()


# Module-level singleton — sentence-transformers model loads are expensive,
# so we want one IngestionService (and therefore one cached embedding
# model) shared across requests.
_ingestion_service: IngestionService | None = None


def get_ingestion_service() -> IngestionService:
    global _ingestion_service
    if _ingestion_service is None:
        _ingestion_service = IngestionService()
    return _ingestion_service


# --- Moving to Celery later (sketch, not used in this MVP) ---
#
# from celery import Celery
# celery_app = Celery("rag", broker="redis://localhost:6379/0")
#
# @celery_app.task
# def ingest_document_task(document_id: str):
#     import asyncio
#     asyncio.run(get_ingestion_service().run(document_id))
#
# Then in the upload endpoint, swap:
#     background_tasks.add_task(get_ingestion_service().run, document.id)
# for:
#     ingest_document_task.delay(document.id)
# No other code changes required.
