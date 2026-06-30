"""
Central application configuration. All values are read from environment
variables (via a .env file) — nothing here is hardcoded, especially not
secrets like GROQ_API_KEY or JWT_SECRET_KEY.
"""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- LLM (Groq) ---
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # --- Auth ---
    JWT_SECRET_KEY: str = "dev-only-insecure-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    DEMO_MODE: bool = True

    # --- Database ---
    DATABASE_URL: str = f"sqlite+aiosqlite:///{BASE_DIR}/storage/app.db"

    # --- Vector backend: "numpy" (default) or "pgvector" ---
    VECTOR_BACKEND: str = "numpy"
    VECTOR_INDEX_PATH: str = str(BASE_DIR / "storage" / "vector_index")

    # --- Storage ---
    STORAGE_BACKEND: str = "local"
    LOCAL_STORAGE_PATH: str = str(BASE_DIR / "storage" / "uploads")

    # --- Ingestion ---
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    MAX_UPLOAD_MB: int = 10
    ALLOWED_MIME_TYPES: tuple = (
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
    )

    # --- Models ---
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    EMBEDDING_DIM: int = 384
    RERANKER_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    # --- CORS ---
    CORS_ORIGINS: tuple = ("http://localhost:5173", "http://127.0.0.1:5173")


settings = Settings()

# Ensure runtime directories exist.
Path(settings.LOCAL_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
Path(settings.VECTOR_INDEX_PATH).mkdir(parents=True, exist_ok=True)
Path(BASE_DIR / "storage").mkdir(parents=True, exist_ok=True)
