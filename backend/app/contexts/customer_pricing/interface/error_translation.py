"""Translate Customer Pricing domain exceptions into HTTPException."""

from __future__ import annotations

from fastapi import HTTPException

from app.contexts.customer_pricing.domain.exceptions import (
    AlreadyExists,
    LocationInUse,
    NotFound,
)
from app.core.error_translation import translate as _translate

_MAPPINGS = {
    NotFound: 404,
    AlreadyExists: 409,
    LocationInUse: 409,
}


def translate(exc: Exception) -> HTTPException:
    return _translate(exc, extra_mappings=_MAPPINGS)
