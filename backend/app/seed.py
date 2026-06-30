"""
Creates the 3 demo users and a handful of seed documents with mixed
visibility, so the RBAC demo has something real to show on first run.

Run with: python -m app.seed
"""
import asyncio
from sqlalchemy import select

from app.core.security import hash_password
from app.database import AsyncSessionLocal, init_db
from app.models.document import Document, DocumentStatus, Visibility
from app.models.user import User, UserRole
from app.services.embeddings import embed_texts
from app.services.ingestion import IngestionService
from app.services.vector_store import get_vector_store

DEMO_PASSWORD = "demo1234"

DEMO_USERS = [
    {"email": "admin@demo.com", "role": UserRole.ADMIN, "full_name": "Alex Admin"},
    {"email": "hr@demo.com", "role": UserRole.HR, "full_name": "Hana HR"},
    {"email": "employee@demo.com", "role": UserRole.EMPLOYEE, "full_name": "Evan Employee"},
]

SEED_DOCUMENTS = [
    {"filename": "company-handbook.txt", "visibility": Visibility.PUBLIC, "text": "Company Handbook (Public)..."},
    {"filename": "engineering-onboarding.txt", "visibility": Visibility.EMPLOYEE, "text": "Engineering Onboarding Guide..."},
    {"filename": "salary-bands-policy.txt", "visibility": Visibility.HR, "text": "Salary Bands..."},
    {"filename": "layoff-contingency-plan.txt", "visibility": Visibility.ADMIN, "text": "Confidential Layoff..."},
    {"filename": "remote-work-policy.txt", "visibility": Visibility.PUBLIC, "text": "Remote Work Policy..."},
]

async def seed_users(db) -> dict[str, str]:
    user_ids = {}
    for u in DEMO_USERS:
        result = await db.execute(select(User).where(User.email == u["email"]))
        existing = result.scalar_one_or_none()
        if existing:
            user_ids[u["email"]] = existing.id
            continue
        user = User(email=u["email"], hashed_password=hash_password(DEMO_PASSWORD), role=u["role"], full_name=u["full_name"])
        db.add(user)
        await db.flush()
        user_ids[u["email"]] = user.id
    await db.commit()
    return user_ids

async def seed_documents(db, admin_user_id: str) -> None:
    result = await db.execute(select(Document))
    if result.scalars().first() is not None:
        return
    ingestion = IngestionService()
    vector_store = get_vector_store()
    for doc_spec in SEED_DOCUMENTS:
        document = Document(filename=doc_spec["filename"], storage_path="", mime_type="text/plain", 
                            visibility=doc_spec["visibility"], uploaded_by=admin_user_id, status=DocumentStatus.PROCESSING)
        db.add(document)
        await db.flush()
        chunks_text = ingestion.splitter.split_text(doc_spec["text"])
        embeddings = embed_texts(chunks_text)
        from app.models.chunk import Chunk
        chunk_rows = [Chunk(document_id=document.id, document_name=document.filename, content=chunk_text, 
                           chunk_index=idx, visibility=document.visibility.value) for idx, chunk_text in enumerate(chunks_text)]
        db.add_all(chunk_rows)
        await db.flush()
        vector_store.add_batch(chunk_ids=[c.id for c in chunk_rows], vectors=embeddings, visibility=document.visibility.value)
        document.status = DocumentStatus.READY
        document.chunk_count = len(chunk_rows)
    await db.commit()

async def run_seed_all():
    """Ye function main.py se call hoga."""
    async with AsyncSessionLocal() as db:
        user_ids = await seed_users(db)
        await seed_documents(db, admin_user_id=user_ids["admin@demo.com"])

if __name__ == "__main__":
    asyncio.run(run_seed_all())