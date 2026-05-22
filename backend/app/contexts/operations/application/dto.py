"""Plain dataclasses used at the application boundary for Operations."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime


# ── BookedTrip ────────────────────────────────────────────────────


@dataclass
class TripContainerInput:
    container_number: str
    work_type: str


@dataclass
class BookedTripCreateInput:
    trip_date: date
    client_id: int
    pickup_location_id: int
    dropoff_location_id: int
    operation_type: str | None = None
    work_type: str = ""
    revenue: int = 0
    containers: list[TripContainerInput] = field(default_factory=list)
    matched_delivered_trip_ids: list[int] = field(default_factory=list)


@dataclass
class BookedTripUpdateInput:
    trip_date: date | None = None
    client_id: int | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    vessel: str | None = None
    vehicle_plate: str | None = None
    operation_type: str | None = None
    work_type: str | None = None
    revenue: int | None = None
    driver_salary: int | None = None
    allowance: int | None = None
    containers: list[TripContainerInput] | None = None
    status: str | None = None
    matched_delivered_trip_ids: list[int] | None = None


@dataclass
class BookedTripListFilters:
    page: int = 1
    page_size: int = 50
    client_id: int | None = None
    status: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    unpriced: bool | None = None


@dataclass
class ImportTripRow:
    """One row from the customer-Excel import pipeline, post-mapping."""
    container_no: str
    work_type: str = ""
    pickup_location: str = ""
    dropoff_location: str = ""
    trip_date: date | None = None
    customer_ref: str = ""
    consignee: str = ""
    driver_name: str = ""
    remarks: str = ""


@dataclass
class ImportCommitInput:
    client_id: int
    rows: list[ImportTripRow]
    overwrite_duplicates: bool = False
    user_id: int | None = None


@dataclass
class ImportCommitResult:
    created: int
    containers_created: int
    grouped_trips: int
    skipped_duplicates: int
    locations_created: int
    locations_review_flagged: int
    errors: list[str] = field(default_factory=list)
    created_trip_ids: list[int] = field(default_factory=list)


# ── DeliveredTrip ────────────────────────────────────────────────────


@dataclass
class DeliveredTripContainerInput:
    container_number: str
    work_type: str
    photo_url: str | None = None
    photo_lat: float | None = None
    photo_lng: float | None = None
    photo_timestamp: datetime | None = None


@dataclass
class DeliveredTripCreateInput:
    client_id: int
    pickup_location_id: int
    dropoff_location_id: int
    driver_id: int | None = None
    vendor_id: int | None = None
    vehicle_id: int | None = None
    vessel: str | None = None
    operation_type: str | None = None
    work_type: str = ""
    containers: list[DeliveredTripContainerInput] = field(default_factory=list)
    gps_lat: float | None = None
    gps_lng: float | None = None
    trip_date: date | None = None


@dataclass
class DeliveredTripUpdateInput:
    client_id: int | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    driver_id: int | None = None
    vendor_id: int | None = None
    vehicle_id: int | None = None
    vessel: str | None = None
    operation_type: str | None = None
    work_type: str | None = None
    containers: list[DeliveredTripContainerInput] | None = None
    gps_lat: float | None = None
    gps_lng: float | None = None
    revenue: int | None = None
    driver_salary: int | None = None
    allowance: int | None = None
    status: str | None = None


@dataclass
class DeliveredTripListFilters:
    page: int = 1
    page_size: int = 50
    client_id: int | None = None
    driver_id: int | None = None
    date_from: date | None = None
    date_to: date | None = None
    status: str | None = None
    sort_by: str | None = None      # trip_date | vessel | status | revenue | created_at | ...
    sort_order: str = 'desc'        # asc | desc
    search: str | None = None       # searches vessel, container_number, operation_type


# ── Reconciliation ───────────────────────────────────────────────


@dataclass
class ReconcileInput:
    delivered_trip_id: int
    booked_trip_id: int
    user_id: int


@dataclass
class UnmatchInput:
    user_id: int
    delivered_trip_id: int
    booked_trip_id: int
