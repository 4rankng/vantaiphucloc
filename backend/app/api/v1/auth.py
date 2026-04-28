import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.base import User
from app.schemas.base import (
    LoginRequest, LoginResponse, RefreshTokenRequest, MessageResponse, UserOut,
)
from app.core.security import (
    verify_password, create_access_token, create_refresh_token,
    decode_refresh_token,
)
from app.core.deps import get_current_user
from app.core.identifier import detect_identifier_type
from app.config import settings

router = APIRouter(prefix="/auth")

# ── In-memory rate limiting (adequate for single-process deployment) ─
_login_attempts: dict[str, tuple[int, float]] = {}
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_SECONDS = 300


def _check_rate_limit(identifier: str) -> None:
    now = time.monotonic()
    entry = _login_attempts.get(identifier)
    if entry:
        count, last_time = entry
        if count >= MAX_LOGIN_ATTEMPTS and (now - last_time) < LOCKOUT_SECONDS:
            raise HTTPException(
                status_code=429,
                detail="Too many login attempts. Please try again later.",
            )
        if (now - last_time) >= LOCKOUT_SECONDS:
            _login_attempts.pop(identifier, None)


def _record_failed_attempt(identifier: str) -> None:
    now = time.monotonic()
    entry = _login_attempts.get(identifier)
    if entry:
        count, _ = entry
        _login_attempts[identifier] = (count + 1, now)
    else:
        _login_attempts[identifier] = (1, now)


def _clear_failed_attempts(identifier: str) -> None:
    _login_attempts.pop(identifier, None)


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    identifier = body.username
    _check_rate_limit(identifier)

    id_type = detect_identifier_type(identifier)
    if id_type == "phone":
        query = select(User).where(User.phone == identifier)
    elif id_type == "email":
        query = select(User).where(User.email == identifier)
    else:
        query = select(User).where(User.username == identifier)

    result = await db.execute(query)
    user = result.scalars().first()

    if not user or not verify_password(body.password, user.hashed_password):
        _record_failed_attempt(identifier)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is deactivated")

    _clear_failed_attempts(identifier)

    token_data = {
        "id": user.id,
        "name": user.username,
        "role": user.role,
        "company_id": user.company_id,
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token({"id": user.id})

    return LoginResponse(
        user=UserOut.model_validate(user),
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_refresh_token(body.refresh_token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user_id: int | None = payload.get("id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid refresh token payload")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    token_data = {
        "id": user.id,
        "name": user.username,
        "role": user.role,
        "company_id": user.company_id,
    }
    new_access = create_access_token(token_data)
    new_refresh = create_refresh_token({"id": user.id})

    return LoginResponse(
        user=UserOut.model_validate(user),
        access_token=new_access,
        refresh_token=new_refresh,
        token_type="Bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(_current_user: User = Depends(get_current_user)):
    return MessageResponse(message="Logged out successfully")
