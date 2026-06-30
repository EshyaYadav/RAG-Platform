"""
SQLAlchemy async engine/session. Stores Users, Documents, and Chunk metadata
(text + visibility + foreign keys) — actual embedding vectors live in the
VectorStore (see services/vector_store.py), not in this DB, when using the
default numpy backend. (A PgVectorStore implementation would instead store
vectors directly on the Chunk row via a pgvector column.)
"""
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    """Create all tables. Used in place of full Alembic migrations for the
    SQLite/local-dev path — for a real Postgres deployment, generate and run
    proper Alembic migrations instead of calling this directly."""
    # Import models so they're registered on Base.metadata before create_all.
    from app.models import chunk, document, user  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
