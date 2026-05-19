"""Value objects for the Operations context."""

from __future__ import annotations

from enum import StrEnum
from typing import NewType


# ── Identifiers ─────────────────────────────────────────────────

BookedTripId = NewType("BookedTripId", int)
BookedTripContainerId = NewType("BookedTripContainerId", int)
DeliveredTripId = NewType("DeliveredTripId", int)
DeliveredTripContainerId = NewType("DeliveredTripContainerId", int)


# ── Status enums ────────────────────────────────────────────────


class BookedTripStatus(StrEnum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    MATCHED = "MATCHED"
    COMPLETED = "COMPLETED"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"


class DeliveredTripStatus(StrEnum):
    PENDING = "PENDING"
    MATCHED = "MATCHED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class WorkType(StrEnum):
    E20 = "E20"
    E40 = "E40"
    F20 = "F20"
    F40 = "F40"


# VND amounts (no decimals).
Money = int


_VALID_WORK_TYPES = {wt.value for wt in WorkType}


def normalize_work_type(value: str | None) -> str:
    if value is None:
        raise ValueError("work_type is required")
    norm = value.strip().upper()
    if norm not in _VALID_WORK_TYPES:
        raise ValueError(
            f"unknown work_type {value!r} (expected one of {sorted(_VALID_WORK_TYPES)})"
        )
    return norm
