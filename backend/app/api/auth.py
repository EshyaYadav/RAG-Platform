from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import create_access_token, verify_password
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token(user_id=user.id, email=user.email, role=user.role.value)
    return TokenResponse(
        access_token=token, role=user.role.value, email=user.email, full_name=user.full_name
    )


@router.post("/demo-login/{role}", response_model=TokenResponse)
async def demo_login(role: str, db: AsyncSession = Depends(get_db)):
    """
    Issues a valid JWT for a pre-seeded demo user of the given role, no
    password required. Gated behind DEMO_MODE so this can never accidentally
    ship enabled in a real deployment.
    """
    if not settings.DEMO_MODE:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    role_upper = role.upper()
    if role_upper not in UserRole.__members__:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown role '{role}'. Use one of: employee, hr, admin.",
        )

    demo_email = f"{role_upper.lower()}@demo.com"
    result = await db.execute(select(User).where(User.email == demo_email))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo users not seeded yet. Run `python -m app.seed` first.",
        )

    token = create_access_token(user_id=user.id, email=user.email, role=user.role.value)
    return TokenResponse(
        access_token=token, role=user.role.value, email=user.email, full_name=user.full_name
    )
