"""Value objects for the Route Pricing context."""

from __future__ import annotations

from typing import NewType


RoutePricingId = NewType("RoutePricingId", int)
LocationId = NewType("LocationId", int)
PartnerId = NewType("PartnerId", int)

WorkType = str
Money = int

# Module-level cache of valid work types.
# Populated on first call, refreshed by invalidate_work_types_cache().
# Falls back to hardcoded set when DB is unavailable.
_FALLBACK_WORK_TYPES: frozenset[str] = frozenset(
    {
        "XUẤT/NHẬP TÀU",
        "CHUYỂN BÃI",
        "LẤY VỎ HẠ HÀNG",
        "CHẠY SÀ LAN",
        "ĐÓNG KHO",
    }
)

_work_types_cache: frozenset[str] | None = None


def _load_work_types_sync() -> frozenset[str]:
    """Try to load from DB synchronously (for cache warm-up outside async)."""
    try:
        from sqlalchemy import select
        from app.database import engine
        from app.models.operation_type import OperationType
        from sqlalchemy.orm import Session

        with Session(engine) as s:
            rows = s.execute(
                select(OperationType.name).where(OperationType.is_active == True)  # noqa: E712
            ).scalars().all()
            return frozenset(rows) if rows else _FALLBACK_WORK_TYPES
    except Exception:
        return _FALLBACK_WORK_TYPES


def refresh_work_types_from_async(types: frozenset[str]) -> None:
    """Called from async CRUD router after create/update/delete."""
    global _work_types_cache
    _work_types_cache = types


async def get_valid_work_types_async() -> frozenset[str]:
    """Load valid work types from DB in async context."""
    from sqlalchemy import select
    from app.database import get_db
    from app.models.operation_type import OperationType

    db = None
    try:
        async for session in get_db():
            db = session
            rows = (await db.execute(
                select(OperationType.name).where(OperationType.is_active == True)  # noqa: E712
            )).scalars().all()
            result = frozenset(rows) if rows else _FALLBACK_WORK_TYPES
            global _work_types_cache
            _work_types_cache = result
            return result
    except Exception:
        return _FALLBACK_WORK_TYPES
    return _FALLBACK_WORK_TYPES


def invalidate_work_types_cache() -> None:
    """Clear the cache so next call reloads."""
    global _work_types_cache
    _work_types_cache = None


def get_valid_work_types() -> frozenset[str]:
    global _work_types_cache
    if _work_types_cache is not None:
        return _work_types_cache
    loaded = _load_work_types_sync()
    _work_types_cache = loaded
    return loaded


def validate_work_type(value: str) -> str:
    norm = value.strip()
    valid = get_valid_work_types()
    if norm not in valid:
        raise ValueError(
            f"Invalid work_type '{norm}'. "
            f"Valid: {', '.join(sorted(valid))}"
        )
    return norm


# Backward-compatible alias — callers that import VALID_WORK_TYPES
# get a dynamic frozenset instead of a stale hardcoded one.
VALID_WORK_TYPES = _FALLBACK_WORK_TYPES  # will be overridden by get_valid_work_types()
