from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import CurrentUser, get_current_user
from app.database import get_db
from app.schemas.chat import ChatRequest, ChatResponse, SourceCitation
from app.services.hybrid_search import hybrid_search
from app.services.llm import generate_answer

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/ask", response_model=ChatResponse)
async def ask(
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    # The RBAC filter is applied inside hybrid_search() itself, computed
    # from current_user.role before any retrieval happens.
    retrieved_chunks = await hybrid_search(
        query=payload.question, user_role=current_user.role.value, db=db, top_k=5
    )

    answer = generate_answer(payload.question, retrieved_chunks)

    sources = [
        SourceCitation(
            document_id=c["document_id"],
            document_name=c["document_name"],
            chunk_excerpt=c["content"][:300] + ("..." if len(c["content"]) > 300 else ""),
            similarity_score=round(c["score"], 4),
        )
        for c in retrieved_chunks
    ]

    return ChatResponse(answer=answer, sources=sources)
