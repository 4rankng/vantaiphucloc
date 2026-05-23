"""Translate Operations domain exceptions into HTTPException."""

from __future__ import annotations

from fastapi import HTTPException

from app.contexts.operations.domain.exceptions import (
    AlreadyExists,
    AlreadyMatched,
    NotFound,
)


def translate(exc: Exception) -> HTTPException:
    if isinstance(exc, NotFound):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, AlreadyExists):
        return HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, AlreadyMatched):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, PermissionError):
        return HTTPException(status_code=403, detail=str(exc))
    if isinstance(exc, ValueError):
        return HTTPException(status_code=422, detail=str(exc))
    return HTTPException(status_code=500, detail=str(exc))
