"""Concrete adapters for PasswordHasher (bcrypt) and TokenIssuer (PyJWT)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import settings
from app.contexts.identity.domain.services import PasswordHasher, TokenIssuer

_ACCESS_TOKEN_TYPE = "access"
_REFRESH_TOKEN_TYPE = "refresh"


class BcryptPasswordHasher(PasswordHasher):
    def hash(self, plain: str) -> str:
        return bcrypt.hashpw(
            plain.encode("utf-8"), bcrypt.gensalt(rounds=12)
        ).decode("utf-8")

    def verify(self, plain: str, hashed: str) -> bool:
        return bcrypt.checkpw(
            plain.encode("utf-8"), hashed.encode("utf-8")
        )


class JwtTokenIssuer(TokenIssuer):
    def __init__(
        self,
        *,
        secret_key: str,
        algorithm: str,
        access_minutes: int,
        refresh_days: int,
    ) -> None:
        self._secret = secret_key
        self._algo = algorithm
        self._access_delta = timedelta(minutes=access_minutes)
        self._refresh_delta = timedelta(days=refresh_days)

    @classmethod
    def from_settings(cls) -> "JwtTokenIssuer":
        return cls(
            secret_key=settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
            access_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            refresh_days=settings.REFRESH_TOKEN_EXPIRE_DAYS,
        )

    def _encode(self, data: dict, token_type: str, delta: timedelta) -> str:
        payload = data.copy()
        payload["type"] = token_type
        payload["exp"] = datetime.now(timezone.utc) + delta
        return jwt.encode(payload, self._secret, algorithm=self._algo)

    def access_token(self, *, user_id: int, username: str, role: str) -> str:
        return self._encode(
            {"id": user_id, "name": username, "role": role},
            _ACCESS_TOKEN_TYPE,
            self._access_delta,
        )

    def refresh_token(self, *, user_id: int) -> str:
        return self._encode(
            {"id": user_id}, _REFRESH_TOKEN_TYPE, self._refresh_delta
        )

    def _decode(self, token: str, expected_type: str) -> dict | None:
        try:
            payload = jwt.decode(token, self._secret, algorithms=[self._algo])
            if payload.get("type") != expected_type:
                return None
            return payload
        except jwt.PyJWTError:
            return None

    def decode_access(self, token: str) -> dict | None:
        return self._decode(token, _ACCESS_TOKEN_TYPE)

    def decode_refresh(self, token: str) -> dict | None:
        return self._decode(token, _REFRESH_TOKEN_TYPE)
