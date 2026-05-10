"""Value objects for the Operations context."""

from __future__ import annotations

from enum import StrEnum
from typing import NewType


# ── Identifiers ─────────────────────────────────────────────────


TripOrderId = NewType("TripOrderId", int)
TripOrderContainerId = NewType("TripOrderContainerId", int)
TripContainerPhotoId = NewType("TripContainerPhotoId", int)
WorkOrderId = NewType("WorkOrderId", int)
WorkOrderContainerId = NewType("WorkOrderContainerId", int)


# ── Status enums ────────────────────────────────────────────────


class WorkOrderStatus(StrEnum):
    PENDING = "PENDING"
    MATCHED = "MATCHED"


class TripOrderStatus(StrEnum):
    PENDING = "PENDING"
    MATCHED = "MATCHED"


class WorkType(StrEnum):
    E20 = "E20"
    E40 = "E40"
    F20 = "F20"
    F40 = "F40"


# Photo "kind" labels for `trip_container_photos.kind` — open set;
# we keep it typed loosely so the driver app can extend without a
# schema migration.
PhotoKind = str  # "pickup" | "dropoff" | "seal" | "eir" | "other" …

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
