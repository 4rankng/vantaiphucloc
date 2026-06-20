"""Plain dataclasses used at the application boundary for Operations."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime


# ── BookedTrip ────────────────────────────────────────────────────


@dataclass
class BookedTripCreateInput:
    trip_date: date
    client_id: int
    pickup_location_id: int
    dropoff_location_id: int
    work_type: str = ""
    cont_number: str | None = None
    cont_type: str | None = None


@dataclass
class BookedTripUpdateInput:
    trip_date: date | None = None
    client_id: int | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    vessel: str | None = None
    vehicle_plate: str | None = None
    work_type: str | None = None
    cont_number: str | None = None
    cont_type: str | None = None


@dataclass
class BookedTripListFilters:
    page: int = 1
    page_size: int = 50
    client_id: int | None = None
    date_from: date | None = None
    date_to: date | None = None


@dataclass
class ImportTripRow:
    """One row from the customer-Excel import pipeline, post-mapping."""

    container_no: str
    container_size: str = ""
    freight_kind: str = ""
    cont_type: str = ""
    work_type: str = "CHUYỂN BÃI"
    container_type_iso: str = ""
    gross_weight_kg: float | None = None
    seal_no: str = ""
    commodity: str = ""
    pickup_location: str = ""
    dropoff_location: str = ""
    pickup_date: date | None = None
    dropoff_date: date | None = None
    trip_date: date | None = None
    customer_ref: str = ""
    consignee: str = ""
    driver_name: str = ""
    vessel: str = ""
    remarks: str = ""
    freight_kind_unknown: bool = (
        False  # True if freight_kind was not explicitly provided
    )


@dataclass
class ImportCommitInput:
    client_id: int
    rows: list[ImportTripRow]
    overwrite_duplicates: bool = False
    user_id: int | None = None


@dataclass
class ImportCommitResult:
    created: int
    updated: int = 0
    grouped_trips: int = 0
    skipped_duplicates: int = 0
    locations_created: int = 0
    locations_review_flagged: int = 0
    errors: list[str] = field(default_factory=list)
    created_trip_ids: list[int] = field(default_factory=list)


# ── DeliveredTrip ────────────────────────────────────────────────────


@dataclass
class DeliveredTripCreateInput:
    client_id: int
    pickup_location_id: int
    dropoff_location_id: int
    driver_id: int | None = None
    vendor_id: int | None = None
    vehicle_plate: str | None = None
    vessel: str | None = None
    work_type: str = ""
    cont_number: str | None = None
    cont_type: str | None = None
    cont_photo_url: str | None = None
    trip_date: date | None = None
    note: str | None = None


@dataclass
class DeliveredTripUpdateInput:
    client_id: int | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    driver_id: int | None = None
    vendor_id: int | None = None
    vehicle_plate: str | None = None
    vessel: str | None = None
    work_type: str | None = None
    cont_number: str | None = None
    cont_type: str | None = None
    cont_photo_url: str | None = None
    cont_photo_hash: str | None = None
    trip_date: date | None = None
    revenue: int | None = None
    driver_salary: int | None = None
    note: str | None = None


@dataclass
class DeliveredTripListFilters:
    page: int = 1
    page_size: int = 50
    client_id: int | None = None
    driver_id: int | None = None
    vendor_id: int | None = None
    date_from: date | None = None
    date_to: date | None = None
    matched: bool | None = None
    sort_by: str | None = None
    sort_order: str = "desc"
    search: str | None = None


@dataclass
class DuplicateContainerGroup:
    """One container number that appears on multiple DeliveredTrips within the filter window."""

    cont_number: str
    count: int
    trip_ids: list[int]
    trip_dates: list[date | None]
    driver_ids: list[int | None]


@dataclass
class DuplicateContainersFilters:
    date_from: date | None = None
    date_to: date | None = None
    client_id: int | None = None
    driver_id: int | None = None


# ── DeliveredTrip duplicate check (driver submit-time warning) ────────


@dataclass
class DuplicateCheckRequest:
    """A single trip a driver is about to submit, checked against the
    driver's own trips within the look-back window."""

    driver_id: int
    photo_hash: str | None = None
    cont_number: str | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    cont_type: str | None = None
    exclude_trip_id: int | None = None


@dataclass
class DuplicateCheckCandidate:
    """An existing trip that looks like a duplicate of the submitted one.

    ``reason`` is ``"photo"`` when the photo hash matched (Tier 1, strongest)
    or ``"fields"`` when container + route + type matched (Tier 2).
    """

    trip_id: int
    cont_number: str | None
    trip_date: date | None
    work_type: str
    created_at: datetime
    reason: str
    photo_match: bool
