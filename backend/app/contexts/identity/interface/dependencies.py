"""FastAPI dependency wiring for the Identity context.

Composition root for the context: maps a per-request DB session to
concrete repository implementations and supplies singleton adapters
(BcryptPasswordHasher, JwtTokenIssuer).
"""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.contexts.identity.application import (
    AuthenticateUser,
    ChangePassword,
    CreateUser,
    DeleteUser,
    ListUsers,
    RefreshTokens,
    RegisterPushSubscription,
    UnregisterPushSubscription,
    UpdateOwnProfile,
    UpdateUser,
)
from app.contexts.identity.domain.repositories import (
    PushSubscriptionRepository,
    UserRepository,
)
from app.contexts.identity.domain.services import PasswordHasher, TokenIssuer
from app.contexts.identity.infrastructure.repositories import (
    SqlPushSubscriptionRepository,
    SqlUserRepository,
)
from app.contexts.identity.infrastructure.security import (
    BcryptPasswordHasher,
    JwtTokenIssuer,
)
from app.database import get_db

# Singletons — stateless and safe to share across requests.
_hasher = BcryptPasswordHasher()
_tokens = JwtTokenIssuer.from_settings()
_access_ttl = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def get_password_hasher() -> PasswordHasher:
    return _hasher


def get_token_issuer() -> TokenIssuer:
    return _tokens


def get_user_repository(db: AsyncSession = Depends(get_db)) -> UserRepository:
    return SqlUserRepository(db)


def get_push_repository(
    db: AsyncSession = Depends(get_db),
) -> PushSubscriptionRepository:
    return SqlPushSubscriptionRepository(db)


def get_authenticate_user(
    repo: UserRepository = Depends(get_user_repository),
) -> AuthenticateUser:
    return AuthenticateUser(repo, _hasher, _tokens, _access_ttl)


def get_refresh_tokens(
    repo: UserRepository = Depends(get_user_repository),
) -> RefreshTokens:
    return RefreshTokens(repo, _tokens, _access_ttl)


def get_create_user(
    repo: UserRepository = Depends(get_user_repository),
) -> CreateUser:
    return CreateUser(repo, _hasher)


def get_update_user(
    repo: UserRepository = Depends(get_user_repository),
) -> UpdateUser:
    return UpdateUser(repo, _hasher)


def get_delete_user(
    repo: UserRepository = Depends(get_user_repository),
) -> DeleteUser:
    return DeleteUser(repo)


def get_change_password(
    repo: UserRepository = Depends(get_user_repository),
) -> ChangePassword:
    return ChangePassword(repo, _hasher)


def get_update_own_profile(
    repo: UserRepository = Depends(get_user_repository),
) -> UpdateOwnProfile:
    return UpdateOwnProfile(repo)


def get_list_users(
    repo: UserRepository = Depends(get_user_repository),
) -> ListUsers:
    return ListUsers(repo)


def get_register_push(
    repo: PushSubscriptionRepository = Depends(get_push_repository),
) -> RegisterPushSubscription:
    return RegisterPushSubscription(repo)


def get_unregister_push(
    repo: PushSubscriptionRepository = Depends(get_push_repository),
) -> UnregisterPushSubscription:
    return UnregisterPushSubscription(repo)
