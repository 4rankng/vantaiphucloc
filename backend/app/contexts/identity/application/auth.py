"""Authentication use cases."""

from __future__ import annotations

from app.contexts.identity.application.dto import (
    AuthenticateInput,
    AuthenticateResult,
)
from app.contexts.identity.domain.exceptions import (
    InactiveUser,
    InvalidCredentials,
    UserNotFound,
)
from app.contexts.identity.domain.repositories import UserRepository
from app.contexts.identity.domain.services import PasswordHasher, TokenIssuer
from app.contexts.identity.domain.value_objects import UserId


class AuthenticateUser:
    """Login by phone | email | username + password. Issues access + refresh tokens."""

    def __init__(
        self,
        users: UserRepository,
        hasher: PasswordHasher,
        tokens: TokenIssuer,
        access_token_ttl_seconds: int,
    ) -> None:
        self._users = users
        self._hasher = hasher
        self._tokens = tokens
        self._access_ttl = access_token_ttl_seconds

    async def execute(self, cmd: AuthenticateInput) -> AuthenticateResult:
        user = await self._users.find_by_identifier(cmd.identifier)
        if user is None:
            raise InvalidCredentials("Invalid credentials")
        # User.authenticate raises on bad password or inactive account.
        user.authenticate(cmd.password, self._hasher)

        assert user.id is not None  # persisted user always has id
        access = self._tokens.access_token(
            user_id=int(user.id),
            username=user.username,
            role=user.role.value,
        )
        refresh = self._tokens.refresh_token(user_id=int(user.id))
        return AuthenticateResult(
            user_id=int(user.id),
            username=user.username,
            role=user.role.value,
            access_token=access,
            refresh_token=refresh,
            expires_in=self._access_ttl,
        )


class RefreshTokens:
    """Exchange a refresh token for a new access + refresh pair."""

    def __init__(
        self,
        users: UserRepository,
        tokens: TokenIssuer,
        access_token_ttl_seconds: int,
    ) -> None:
        self._users = users
        self._tokens = tokens
        self._access_ttl = access_token_ttl_seconds

    async def execute(self, refresh_token: str) -> AuthenticateResult:
        payload = self._tokens.decode_refresh(refresh_token)
        if payload is None:
            raise InvalidCredentials("Invalid or expired refresh token")
        raw_user_id = payload.get("id")
        if raw_user_id is None:
            raise InvalidCredentials("Invalid refresh token payload")
        user = await self._users.get_by_id(UserId(int(raw_user_id)))
        if user is None:
            raise UserNotFound("User not found")
        if not user.is_active:
            raise InactiveUser("Account is deactivated")

        assert user.id is not None
        access = self._tokens.access_token(
            user_id=int(user.id),
            username=user.username,
            role=user.role.value,
        )
        refresh = self._tokens.refresh_token(user_id=int(user.id))
        return AuthenticateResult(
            user_id=int(user.id),
            username=user.username,
            role=user.role.value,
            access_token=access,
            refresh_token=refresh,
            expires_in=self._access_ttl,
        )
