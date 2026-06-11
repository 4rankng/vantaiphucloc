"""Translate Operations domain exceptions into HTTPException."""

from __future__ import annotations

from fastapi import HTTPException

from app.contexts.operations.domain.exceptions import (
    AlreadyExists,
    AlreadyMatched,
    NotFound,
)
from app.core.error_translation import translate as _translate

_MAPPINGS = {
    NotFound: 404,
    AlreadyExists: 409,
    AlreadyMatched: 400,
}


def translate(exc: Exception) -> HTTPException:
    return _translate(exc, extra_mappings=_MAPPINGS)
