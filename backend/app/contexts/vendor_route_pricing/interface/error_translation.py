"""Translate domain exceptions into HTTPException."""
from __future__ import annotations

from fastapi import HTTPException

from app.contexts.vendor_route_pricing.domain.exceptions import (
    AlreadyExists,
    NoPriceSet,
    NotFound,
)


def translate(exc: Exception) -> HTTPException:
    if isinstance(exc, NotFound):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, AlreadyExists):
        return HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, NoPriceSet):
        return HTTPException(status_code=422, detail=str(exc))
    return HTTPException(status_code=500, detail=str(exc))
