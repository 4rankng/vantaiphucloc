from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select

from app.models.base import User
from app.schemas.base import (
    LoginRequest, LoginResponse, RefreshTokenRequest, MessageResponse, UserOut,
)
from app.core.security import (
    verify_password, create_access_token, create_refresh_token,
    decode_refresh_token,
)
from app.core.deps import get_current_user
from app.core.redis import get_redis
from app.core.rate_limit import RateLimiter
from app.config import settings
from app.repositories.user_repo import UserRepository
from app.repositories.deps import get_user_repo
from redis.asyncio import Redis

_optional_bearer = HTTPBearer(auto_error=False)

router = APIRouter(prefix="/auth")


@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    repo: UserRepository = Depends(get_user_repo),
    redis: Redis = Depends(get_redis),
):
    identifier = body.username
    limiter = RateLimiter(redis)
    await limiter.check(
        f"login:{identifier}",
        settings.RATE_LIMIT_LOGIN_MAX,
        settings.RATE_LIMIT_LOGIN_WINDOW,
    )

    user = await repo.find_by_identifier(identifier)

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
async def refresh_token(body: RefreshTokenRequest, repo: UserRepository = Depends(get_user_repo)):
    payload = decode_refresh_token(body.refresh_token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user_id: int | None = payload.get("id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid refresh token payload")

    user = await repo.get_by_id(user_id)

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
    return MessageResponse(message="Logged out successfully")
