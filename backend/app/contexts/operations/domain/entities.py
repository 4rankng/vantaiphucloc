"""Domain aggregates for the Operations context.

Two aggregate roots:

  - **BookedTrip** — đơn hàng.

  - **DeliveredTrip** — phiếu làm việc.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from app.utils.dates import utcnow

from app.contexts.operations.domain.value_objects import (
    Money,
    BookedTripId,
    DeliveredTripId,
)


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
    vessel: str | None = None
    vehicle_plate: str | None = None
    created_at: datetime = field(default_factory=utcnow)
    updated_at: datetime = field(default_factory=utcnow)


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
    cont_photo_url: str | None = None
    cont_photo_hash: str | None = None
    vehicle_plate: str | None = None
    booked_trip_id: int | None = None
    revenue: Money = 0
    driver_salary: Money = 0
    trip_date: object | None = None
    note: str | None = None
    created_at: datetime = field(default_factory=utcnow)
    updated_at: datetime = field(default_factory=utcnow)

    @property
    def matched(self) -> bool:
        return self.booked_trip_id is not None

    def apply_pricing(
        self,
        *,
        revenue: Money,
        driver_salary: Money,
    ) -> None:
        self.revenue = int(revenue)
        self.driver_salary = int(driver_salary)
        self.updated_at = utcnow()
