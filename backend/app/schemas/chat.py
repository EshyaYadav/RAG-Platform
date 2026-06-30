from pydantic import BaseModel


class ChatRequest(BaseModel):
    question: str


class SourceCitation(BaseModel):
    document_id: str
    document_name: str
    chunk_excerpt: str
    similarity_score: float


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceCitation]
