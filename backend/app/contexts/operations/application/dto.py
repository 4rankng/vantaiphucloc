"""Plain dataclasses used at the application boundary for Operations."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date


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
    grouped_trips: int
    skipped_duplicates: int
    locations_created: int
    locations_review_flagged: int
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
    trip_date: date | None = None


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
    revenue: int | None = None
    driver_salary: int | None = None
    allowance: int | None = None


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
    sort_order: str = 'desc'
    search: str | None = None
