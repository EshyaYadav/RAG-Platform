from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import CurrentUser, get_current_user
from app.database import get_db
from app.models.document import Document, Visibility
from app.schemas.document import DocumentListResponse, DocumentResponse
from app.services.ingestion import get_ingestion_service
from app.services.storage import get_storage_backend

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    visibility: str = Form(...),
    department: str | None = Form(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if visibility not in Visibility.__members__:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid visibility '{visibility}'. Use one of: "
            f"{', '.join(Visibility.__members__)}.",
        )

    if file.content_type not in settings.ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{file.content_type}'. "
            f"Allowed: PDF, DOCX, TXT.",
        )

    raw_bytes = await file.read()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(raw_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {settings.MAX_UPLOAD_MB}MB limit.",
        )

    storage = get_storage_backend()
    storage_path = storage.save(file.filename, raw_bytes)

    document = Document(
        filename=file.filename,
        storage_path=storage_path,
        mime_type=file.content_type,
        visibility=Visibility(visibility),
        department=department,
        uploaded_by=current_user.id,
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)

    ingestion_service = get_ingestion_service()
    background_tasks.add_task(ingestion_service.run, document.id)

    return document


@router.get("/list", response_model=DocumentListResponse)
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Lists documents this user is permitted to know about (filtered by the
    same role hierarchy used for retrieval) plus anything they personally
    uploaded, so users can always track their own uploads even before
    access-control would normally surface them.
    """
    from app.core.rbac import allowed_visibilities

    allowed = allowed_visibilities(current_user.role.value)
    result = await db.execute(
        select(Document).where(
            (Document.visibility.in_(allowed)) | (Document.uploaded_by == current_user.id)
        ).order_by(Document.created_at.desc())
    )
    documents = result.scalars().all()
    return DocumentListResponse(documents=documents)


@router.get("/{document_id}/status", response_model=DocumentResponse)
async def get_document_status(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document
