from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, chat, documents
from app.config import settings
from app.database import init_db
from app.seed import run_seed_all

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Backend start hote hi seed karein
    await run_seed_all() 
    yield

app = FastAPI(
    title="Enterprise RAG Platform",
    description="Privacy-first, role-based Retrieval-Augmented Generation API.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.CORS_ORIGINS),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chat.router)

@app.get("/health")
async def health():
    return {"status": "ok"}