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
    {
        "filename": "company-handbook.txt",
        "visibility": Visibility.PUBLIC,
        "text": (
            "Company Handbook (Public)\n\n"
            "Welcome to the company! Office hours are 9am-6pm Monday through Friday. "
            "All employees get 20 days of paid time off per year, accrued monthly. "
            "Our core values are integrity, curiosity, and collaboration. "
            "The office is located at 123 Main Street, and badge access is required after 7pm. "
            "For any IT issues, contact it-support@demo-company.com."
        ),
    },
    {
        "filename": "engineering-onboarding.txt",
        "visibility": Visibility.EMPLOYEE,
        "text": (
            "Engineering Onboarding Guide (Employee-level)\n\n"
            "New engineers should set up their dev environment using the internal "
            "bootstrap script `setup.sh`. Our main tech stack is Python, TypeScript, "
            "and PostgreSQL. Code review requires at least one approval before merging "
            "to main. On-call rotations are managed via the internal scheduling tool, "
            "and the on-call engineer is responsible for triaging Sev1/Sev2 incidents "
            "within 15 minutes."
        ),
    },
    {
        "filename": "salary-bands-policy.txt",
        "visibility": Visibility.HR,
        "text": (
            "Salary Bands and Compensation Policy (HR-only)\n\n"
            "Compensation bands are reviewed twice yearly, in January and July. "
            "Band L3 ranges from $95,000 to $120,000 base salary. Band L4 ranges from "
            "$120,000 to $155,000. Annual bonus targets are 10% of base for L3 and "
            "15% of base for L4, paid out in March based on prior calendar year "
            "performance. Equity refreshes are evaluated during the July review cycle "
            "for employees rated 'Exceeds' or above."
        ),
    },
    {
        "filename": "layoff-contingency-plan.txt",
        "visibility": Visibility.ADMIN,
        "text": (
            "Confidential Layoff Contingency Plan (Admin-only)\n\n"
            "In the event of a reduction in force, department heads will be notified "
            "48 hours in advance under NDA. Severance is calculated as 2 weeks of base "
            "pay per year of tenure, with a 4-week minimum. Legal counsel must review "
            "all termination packages before they are issued. This document is strictly "
            "confidential and must not be shared outside the executive team."
        ),
    },
    {
        "filename": "remote-work-policy.txt",
        "visibility": Visibility.PUBLIC,
        "text": (
            "Remote Work Policy (Public)\n\n"
            "Employees may work remotely up to 3 days per week, subject to manager "
            "approval. Fully remote arrangements require VP-level sign-off. The "
            "company provides a one-time $500 home office stipend for new hires. "
            "All remote workers must use company-issued VPN software when accessing "
            "internal systems."
        ),
    },
]


async def seed_users(db) -> dict[str, str]:
    """Returns {email: user_id} for use when attributing seed documents."""
    user_ids = {}
    for u in DEMO_USERS:
        result = await db.execute(select(User).where(User.email == u["email"]))
        existing = result.scalar_one_or_none()
        if existing:
            user_ids[u["email"]] = existing.id
            continue

        user = User(
            email=u["email"],
            hashed_password=hash_password(DEMO_PASSWORD),
            role=u["role"],
            full_name=u["full_name"],
        )
        db.add(user)
        await db.flush()
        user_ids[u["email"]] = user.id

    await db.commit()
    return user_ids


async def seed_documents(db, admin_user_id: str) -> None:
    result = await db.execute(select(Document))
    if result.scalars().first() is not None:
        print("Seed documents already exist, skipping.")
        return

    ingestion = IngestionService()
    vector_store = get_vector_store()

    for doc_spec in SEED_DOCUMENTS:
        document = Document(
            filename=doc_spec["filename"],
            storage_path="",  # seed docs aren't backed by a real uploaded file
            mime_type="text/plain",
            visibility=doc_spec["visibility"],
            uploaded_by=admin_user_id,
            status=DocumentStatus.PROCESSING,
        )
        db.add(document)
        await db.flush()

        chunks_text = ingestion.splitter.split_text(doc_spec["text"])
        embeddings = embed_texts(chunks_text)

        from app.models.chunk import Chunk

        chunk_rows = [
            Chunk(
                document_id=document.id,
                document_name=document.filename,
                content=chunk_text,
                chunk_index=idx,
                visibility=document.visibility.value,
            )
            for idx, chunk_text in enumerate(chunks_text)
        ]
        db.add_all(chunk_rows)
        await db.flush()

        vector_store.add_batch(
            chunk_ids=[c.id for c in chunk_rows],
            vectors=embeddings,
            visibility=document.visibility.value,
        )

        document.status = DocumentStatus.READY
        document.chunk_count = len(chunk_rows)

        print(f"Seeded document: {document.filename} ({document.visibility.value}, "
              f"{len(chunk_rows)} chunks)")

    await db.commit()


async def main():
    await init_db()
    async with AsyncSessionLocal() as db:
        user_ids = await seed_users(db)
        print(f"Seeded {len(user_ids)} demo users (password: '{DEMO_PASSWORD}' for all).")
        for email in user_ids:
            print(f"  - {email}")

        await seed_documents(db, admin_user_id=user_ids["admin@demo.com"])

    print("\nSeed complete. Start the backend with:")
    print("  uvicorn app.main:app --reload --port 8000")


if __name__ == "__main__":
    asyncio.run(main())
