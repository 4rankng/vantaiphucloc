from __future__ import annotations

from enum import Enum

__all__ = ["BookedTripStatus", "DeliveredTripStatus"]


class BookedTripStatus(str, Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    MATCHED = "MATCHED"
    COMPLETED = "COMPLETED"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"


class DeliveredTripStatus(str, Enum):
    PENDING = "PENDING"
    MATCHED = "MATCHED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
