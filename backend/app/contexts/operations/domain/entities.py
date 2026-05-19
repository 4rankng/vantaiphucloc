"""Domain aggregates for the Operations context.

Two aggregate roots:

  - **BookedTrip** — đơn hàng. Owns containers and tracks reconciliation
    state (matched DeliveredTrip ids).

  - **DeliveredTrip** — phiếu làm việc. Owns containers (with photo metadata),
    GPS, driver assignment, and pricing.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.contexts.operations.domain.exceptions import (
    ContainerCountInvalid,
    InvalidStateTransition,
)
from app.contexts.operations.domain.value_objects import (
    Money,
    BookedTripContainerId,
    BookedTripId,
    BookedTripStatus,
    DeliveredTripContainerId,
    DeliveredTripId,
    DeliveredTripStatus,
    normalize_work_type,
)
from app.utils.iso6346 import validate_container_number


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _validate_container_count(work_type: str, count: int) -> None:
    if count < 1:
        raise ContainerCountInvalid(work_type, count)
    wt = (work_type or "").strip().upper()
    if wt.endswith("40") and count > 1:
        raise ContainerCountInvalid(wt, count)
    if wt.endswith("20") and count > 2:
        raise ContainerCountInvalid(wt, count)


# ── BookedTrip aggregate ─────────────────────────────────────────


@dataclass
class BookedTripContainer:
    id: BookedTripContainerId | None
    booked_trip_id: BookedTripId | None
    container_number: str
    cont_type: str


@dataclass
class BookedTrip:
    id: BookedTripId | None
    trip_date: object
    client_id: int
    pickup_location_id: int
    dropoff_location_id: int
    operation_type: str | None = None
    work_type: str = ""
    revenue: Money = 0
    status: str = BookedTripStatus.PENDING
    vessel: str | None = None
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)
    containers: list[BookedTripContainer] = field(default_factory=list)
    matched_delivered_trip_ids: list[int] = field(default_factory=list)
    matched_by: int = 0

    def add_container(
        self,
        *,
        container_number: str,
        cont_type: str,
    ) -> BookedTripContainer:
        valid, err = validate_container_number(container_number)
        if not valid:
            raise ValueError(f"Invalid container number {container_number!r}: {err}")
        _validate_container_count(self.work_type, len(self.containers) + 1)
        c = BookedTripContainer(
            id=None,
            booked_trip_id=self.id,
            container_number=container_number,
            cont_type=cont_type,
        )
        self.containers.append(c)
        self.updated_at = _utcnow()
        return c

    def match(self) -> None:
        if self.status == BookedTripStatus.MATCHED:
            return
        if self.status != BookedTripStatus.PENDING:
            raise InvalidStateTransition(
                kind="BookedTrip",
                current=self.status,
                attempted=BookedTripStatus.MATCHED,
            )
        self.status = BookedTripStatus.MATCHED
        self.updated_at = _utcnow()

    def unmatch(self) -> None:
        if self.status == BookedTripStatus.PENDING:
            return
        if self.status != BookedTripStatus.MATCHED:
            raise InvalidStateTransition(
                kind="BookedTrip",
                current=self.status,
                attempted=BookedTripStatus.PENDING,
            )
        self.status = BookedTripStatus.PENDING
        self.updated_at = _utcnow()

    def link_delivered_trip(self, delivered_trip_id: int, matched_by: int = 0) -> None:
        if delivered_trip_id not in self.matched_delivered_trip_ids:
            self.matched_delivered_trip_ids.append(int(delivered_trip_id))
            self.matched_by = matched_by
            self.updated_at = _utcnow()

    def unlink_delivered_trip(self, delivered_trip_id: int) -> None:
        if delivered_trip_id in self.matched_delivered_trip_ids:
            self.matched_delivered_trip_ids.remove(int(delivered_trip_id))
            self.updated_at = _utcnow()


# ── DeliveredTrip aggregate ──────────────────────────────────────


@dataclass
class DeliveredTripContainer:
    id: DeliveredTripContainerId | None
    delivered_trip_id: DeliveredTripId | None
    container_number: str
    cont_type: str
    photo_url: str | None = None
    photo_lat: float | None = None
    photo_lng: float | None = None
    photo_timestamp: datetime | None = None
    photo_address: str | None = None


@dataclass
class DeliveredTrip:
    id: DeliveredTripId | None
    client_id: int
    pickup_location_id: int
    dropoff_location_id: int
    driver_id: int
    vehicle_id: int | None = None
    vendor_id: int | None = None
    vessel: str | None = None
    operation_type: str | None = None
    work_type: str = ""
    gps_lat: float | None = None
    gps_lng: float | None = None
    gps_address: str | None = None
    revenue: Money = 0
    driver_salary: Money = 0
    allowance: Money = 0
    trip_date: object | None = None
    status: str = DeliveredTripStatus.PENDING
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)
    containers: list[DeliveredTripContainer] = field(default_factory=list)

    def add_container(
        self,
        *,
        container_number: str,
        cont_type: str,
        photo_url: str | None = None,
        photo_lat: float | None = None,
        photo_lng: float | None = None,
        photo_timestamp: datetime | None = None,
        photo_address: str | None = None,
    ) -> DeliveredTripContainer:
        valid, err = validate_container_number(container_number)
        if not valid:
            raise ValueError(f"Invalid container number {container_number!r}: {err}")
        _validate_container_count(self.work_type, len(self.containers) + 1)
        c = DeliveredTripContainer(
            id=None,
            delivered_trip_id=self.id,
            container_number=container_number,
            cont_type=cont_type,
            photo_url=photo_url,
            photo_lat=photo_lat,
            photo_lng=photo_lng,
            photo_timestamp=photo_timestamp,
            photo_address=photo_address,
        )
        self.containers.append(c)
        self.updated_at = _utcnow()
        return c

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

    def match(self) -> None:
        if self.status == DeliveredTripStatus.MATCHED:
            return
        if self.status != DeliveredTripStatus.PENDING:
            raise InvalidStateTransition(
                kind="DeliveredTrip",
                current=self.status,
                attempted=DeliveredTripStatus.MATCHED,
            )
        self.status = DeliveredTripStatus.MATCHED
        self.updated_at = _utcnow()

    def unmatch(self) -> None:
        if self.status != DeliveredTripStatus.MATCHED:
            raise InvalidStateTransition(
                kind="DeliveredTrip",
                current=self.status,
                attempted=DeliveredTripStatus.PENDING,
            )
        self.status = DeliveredTripStatus.PENDING
        self.updated_at = _utcnow()
