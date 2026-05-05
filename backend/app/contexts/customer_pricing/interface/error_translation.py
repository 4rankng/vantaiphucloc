"""Translate domain exceptions into HTTPException."""

from __future__ import annotations

from fastapi import HTTPException

from app.contexts.customer_pricing.domain.exceptions import (
    AlreadyExists,
    LocationInUse,
    NotFound,
    PricingNotMatched,
)


def translate(exc: Exception) -> HTTPException:
    if isinstance(exc, NotFound):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, AlreadyExists):
        return HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, LocationInUse):
        return HTTPException(
            status_code=409,
            detail=f"location is referenced in {exc.table}.{exc.column}",
        )
    if isinstance(exc, PricingNotMatched):
        return HTTPException(status_code=404, detail=str(exc))
    return HTTPException(status_code=500, detail=str(exc))
