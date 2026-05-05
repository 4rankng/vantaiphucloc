"""Translate identity-domain exceptions into FastAPI HTTPExceptions.

Domain layer raises `IdentityDomainError` subclasses; the interface layer
converts to HTTP status codes here so the use cases stay framework-agnostic.
"""

from __future__ import annotations

from fastapi import HTTPException

from app.contexts.identity.domain.exceptions import (
    DuplicateCccd,
    DuplicateEmail,
    DuplicatePhone,
    DuplicateUsername,
    InactiveUser,
    InvalidCccd,
    InvalidCredentials,
    PermissionDenied,
    UserNotFound,
    WrongCurrentPassword,
)

_STATUS_BY_TYPE: dict[type[Exception], tuple[int, str | None]] = {
    UserNotFound: (404, None),
    DuplicatePhone: (409, None),
    DuplicateEmail: (409, None),
    DuplicateUsername: (409, None),
    DuplicateCccd: (409, None),
    InvalidCccd: (400, None),
    InvalidCredentials: (401, "Invalid credentials"),
    InactiveUser: (401, "Account is deactivated"),
    PermissionDenied: (403, None),
    WrongCurrentPassword: (400, "Current password is incorrect"),
}


def to_http(error: Exception) -> HTTPException:
    for cls, (status, fallback) in _STATUS_BY_TYPE.items():
        if isinstance(error, cls):
            return HTTPException(
                status_code=status, detail=fallback or str(error)
            )
    raise error
