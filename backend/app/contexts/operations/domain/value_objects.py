"""Value objects for the Operations context."""

from __future__ import annotations

from typing import NewType


# ── Identifiers ─────────────────────────────────────────────────

BookedTripId = NewType("BookedTripId", int)
DeliveredTripId = NewType("DeliveredTripId", int)


# VND amounts (no decimals).
Money = int


def normalize_work_type(value: str | None) -> str:
    if value is None:
        raise ValueError("work_type is required")
    norm = value.strip().upper()
    if not norm:
        raise ValueError("work_type cannot be empty")
    return norm
