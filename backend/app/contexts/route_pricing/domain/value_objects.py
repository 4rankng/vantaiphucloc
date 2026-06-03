"""Value objects for the Route Pricing context."""

from __future__ import annotations

import logging
from typing import NewType

_logger = logging.getLogger(__name__)

RoutePricingId = NewType("RoutePricingId", int)
LocationId = NewType("LocationId", int)
PartnerId = NewType("PartnerId", int)

WorkType = str
Money = int

# Hardcoded fallback — used when cache is empty (before any CRUD or on DB error).
_FALLBACK_WORK_TYPES: frozenset[str] = frozenset(
    {
        "XUẤT/NHẬP TÀU",
        "CHUYỂN BÃI",
        "LẤY VỎ HẠ HÀNG",
        "CHẠY SÀ LAN",
        "ĐÓNG KHO",
    }
)

# Module-level cache, updated by refresh_work_types_from_async() after CRUD.
_work_types_cache: frozenset[str] | None = None


def refresh_work_types_from_async(types: frozenset[str]) -> None:
    """Called from async CRUD router after create/update/delete."""
    global _work_types_cache
    _work_types_cache = types


def invalidate_work_types_cache() -> None:
    """Clear the cache so next call reloads."""
    global _work_types_cache
    _work_types_cache = None


def get_valid_work_types() -> frozenset[str]:
    """Return cached work types, or fallback if cache not yet populated."""
    global _work_types_cache
    if _work_types_cache is not None:
        return _work_types_cache
    # Cache not populated yet (no CRUD has run). Return fallback.
    # The CRUD router will populate the cache on first request.
    _work_types_cache = _FALLBACK_WORK_TYPES
    return _FALLBACK_WORK_TYPES


def validate_work_type(value: str) -> str:
    norm = value.strip()
    valid = get_valid_work_types()
    if norm not in valid:
        raise ValueError(
            f"Invalid work_type '{norm}'. "
            f"Valid: {', '.join(sorted(valid))}"
        )
    return norm


# Backward-compatible alias. This is the FALLBACK set — it does NOT update
# dynamically. Importers that need the current DB set should call
# get_valid_work_types() instead.
VALID_WORK_TYPES = _FALLBACK_WORK_TYPES
