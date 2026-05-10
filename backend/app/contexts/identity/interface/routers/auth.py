"""HTTP routes for login, refresh, logout."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis

from app.config import settings
from app.contexts.identity.application import (
    AuthenticateInput,
    AuthenticateUser,
    RefreshTokens,
)
from app.contexts.identity.domain.exceptions import IdentityDomainError
from app.contexts.identity.domain.repositories import UserRepository
from app.contexts.identity.domain.value_objects import UserId
from app.contexts.identity.interface.dependencies import (
    get_authenticate_user,
    get_refresh_tokens,
    get_user_repository,
)
from app.contexts.identity.interface.error_translation import to_http
from app.contexts.identity.interface.schemas import (
    LoginRequest,
    LoginResponse,
    MessageResponse,
    RefreshTokenRequest,
    UserOut,
)
from app.core.rate_limit import RateLimiter
from app.core.redis import get_redis

_optional_bearer = HTTPBearer(auto_error=False)

router = APIRouter(prefix="/auth")


@router.post("/login", response_model=LoginResponse)
async def login(
    request: Request,
    body: LoginRequest,
    repo: UserRepository = Depends(get_user_repository),
    use_case: AuthenticateUser = Depends(get_authenticate_user),
    redis: Redis = Depends(get_redis),
):
    client_ip = request.client.host if request.client else "unknown"
    limiter = RateLimiter(redis)
    await limiter.check(
        f"login:{client_ip}:{body.username}",
        settings.RATE_LIMIT_LOGIN_MAX,
        settings.RATE_LIMIT_LOGIN_WINDOW,
    )
    try:
        result = await use_case.execute(
            AuthenticateInput(identifier=body.username, password=body.password)
        )
    except IdentityDomainError as e:
        raise to_http(e)

    # Re-fetch the entity for the response payload (single read; users are small).
    user = await repo.get_by_id(UserId(result.user_id))
    if user is None:  # pragma: no cover — auth just succeeded
        raise HTTPException(status_code=401, detail="User not found")
    return LoginResponse(
        user=UserOut.from_entity(user),
        access_token=result.access_token,
        refresh_token=result.refresh_token,
        token_type="Bearer",
        expires_in=result.expires_in,
    )


@router.post("/refresh", response_model=LoginResponse)
async def refresh(
    body: RefreshTokenRequest,
    repo: UserRepository = Depends(get_user_repository),
    use_case: RefreshTokens = Depends(get_refresh_tokens),
):
    try:
        result = await use_case.execute(body.refresh_token)
    except IdentityDomainError as e:
        raise to_http(e)
    user = await repo.get_by_id(UserId(result.user_id))
    if user is None:  # pragma: no cover
        raise HTTPException(status_code=401, detail="User not found")
    return LoginResponse(
        user=UserOut.from_entity(user),
        access_token=result.access_token,
        refresh_token=result.refresh_token,
        token_type="Bearer",
        expires_in=result.expires_in,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    credentials: HTTPAuthorizationCredentials | None = Depends(_optional_bearer),
):
    return MessageResponse(message="Logged out successfully")
