import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.document import Visibility


class Chunk(Base):
    """
    A single chunk of a parsed document. The actual embedding vector is NOT
    stored here in the default (numpy) backend — it lives in the
    VectorStore, keyed by this row's id, alongside its visibility tag so the
    vector store can filter without needing to join back to SQL.

    `visibility` is intentionally denormalized (copied) from the parent
    Document at ingestion time rather than always joined, so that the
    role-filter WHERE clause can run directly against the Chunk table /
    vector index without a join — this is what keeps the RBAC filter cheap
    and impossible to accidentally skip.
    """

    __tablename__ = "chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id"), index=True, nullable=False)
    document_name: Mapped[str] = mapped_column(String(512), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    visibility: Mapped[Visibility] = mapped_column(
        String(20), index=True, nullable=False
    )  # stored as plain string for portability across SQLite/Postgres
