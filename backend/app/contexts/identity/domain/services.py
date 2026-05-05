"""Domain ports (abstract dependencies the entities need).

These are abstract protocols. Concrete implementations live in
infrastructure (bcrypt for hashing, PyJWT for tokens).
"""

from __future__ import annotations

from typing import Protocol


class PasswordHasher(Protocol):
    """Port: how to hash + verify passwords. Bcrypt impl lives in infrastructure."""

    def hash(self, plain: str) -> str: ...

    def verify(self, plain: str, hashed: str) -> bool: ...


class TokenIssuer(Protocol):
    """Port: how to issue + verify access/refresh tokens (JWT impl in infrastructure)."""

    def access_token(self, *, user_id: int, username: str, role: str) -> str: ...

    def refresh_token(self, *, user_id: int) -> str: ...

    def decode_access(self, token: str) -> dict | None: ...

    def decode_refresh(self, token: str) -> dict | None: ...
