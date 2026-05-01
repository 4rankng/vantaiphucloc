from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.base import User
from app.schemas.base import (
    LoginRequest, LoginResponse, RefreshTokenRequest, MessageResponse, UserOut,
)
from app.core.security import (
    verify_password, create_access_token, create_refresh_token,
    decode_refresh_token, decode_access_token,
)
from app.core.deps import get_current_user
from app.core.identifier import detect_identifier_type

_optional_bearer = HTTPBearer(auto_error=False)
from app.core.redis import get_redis
from app.core.rate_limit import RateLimiter
from app.config import settings
from redis.asyncio import Redis

router = APIRouter(prefix="/auth")


@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    identifier = body.username
    limiter = RateLimiter(redis)
    await limiter.check(
        f"login:{identifier}",
        settings.RATE_LIMIT_LOGIN_MAX,
        settings.RATE_LIMIT_LOGIN_WINDOW,
    )

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
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is deactivated")

    token_data = {
        "id": user.id,
        "name": user.username,
        "role": user.role,
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
async def logout(
    credentials: HTTPAuthorizationCredentials | None = Depends(_optional_bearer),
):
    # TODO: Accept the current access token jti and blacklist it.
    # For now, the short-lived tokens expire naturally.
    return MessageResponse(message="Logged out successfully")
