"""Domain aggregates for the Operations context.

Two aggregate roots:

  - **BookedTrip** — đơn hàng.

  - **DeliveredTrip** — phiếu làm việc.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.contexts.operations.domain.value_objects import (
    Money,
    BookedTripId,
    DeliveredTripId,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── BookedTrip aggregate ─────────────────────────────────────────


@dataclass
class BookedTrip:
    id: BookedTripId | None
    trip_date: object
    client_id: int
    pickup_location_id: int
    dropoff_location_id: int
    work_type: str = ""
    cont_number: str | None = None
    cont_type: str | None = None
    matched: bool = False
    vessel: str | None = None
    vehicle_plate: str | None = None
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)


# ── DeliveredTrip aggregate ──────────────────────────────────────


@dataclass
class DeliveredTrip:
    id: DeliveredTripId | None
    client_id: int
    pickup_location_id: int
    dropoff_location_id: int
    driver_id: int | None = None
    vendor_id: int | None = None
    vessel: str | None = None
    work_type: str = ""
    cont_number: str | None = None
    cont_type: str | None = None
    vehicle_plate: str | None = None
    matched: bool = False
    revenue: Money = 0
    driver_salary: Money = 0
    allowance: Money = 0
    trip_date: object | None = None
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)

    def apply_pricing(
        self,
        *,
        revenue: Money,
        driver_salary: Money,
        allowance: Money,
    ) -> None:
        self.revenue = int(revenue)
        self.driver_salary = int(driver_salary)
        self.allowance = int(allowance)
        self.updated_at = _utcnow()
