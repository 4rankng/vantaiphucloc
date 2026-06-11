"""Translate Vendor Route Pricing domain exceptions into HTTPException."""
from __future__ import annotations

from fastapi import HTTPException

from app.contexts.vendor_route_pricing.domain.exceptions import (
    AlreadyExists,
    NoPriceSet,
    NotFound,
)
from app.core.error_translation import translate as _translate

_MAPPINGS = {
    NotFound: 404,
    AlreadyExists: (409, "Bảng phí thuê xe cho tuyến này đã tồn tại"),
    NoPriceSet: 422,
}


def translate(exc: Exception) -> HTTPException:
    return _translate(exc, extra_mappings=_MAPPINGS)
