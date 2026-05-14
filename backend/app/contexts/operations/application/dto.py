"""Plain dataclasses used at the application boundary for Operations.

Distinct from interface schemas (Pydantic) and domain entities
(business invariants).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime


# ── TripOrder ────────────────────────────────────────────────────


@dataclass
class TripContainerInput:
    container_number: str
    work_type: str
    container_size: str | None = None
    container_type: str | None = None
    freight_kind: str | None = None
    gross_weight_kg: float | None = None
    seal_no: str | None = None
    commodity: str | None = None
    container_metadata: dict | None = None


@dataclass
class TripOrderCreateInput:
    trip_date: date
    partner_id: int
    pickup_location_id: int
    dropoff_location_id: int
    containers: list[TripContainerInput] = field(default_factory=list)
    pricing_id: int | None = None
    unit_price: int = 0
    driver_salary: int = 0
    allowance: int = 0
    matched_work_order_ids: list[int] = field(default_factory=list)


@dataclass
class TripOrderUpdateInput:
    trip_date: date | None = None
    partner_id: int | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    containers: list[TripContainerInput] | None = None
    pricing_id: int | None = None
    unit_price: int | None = None
    driver_salary: int | None = None
    allowance: int | None = None
    status: str | None = None
    matched_work_order_ids: list[int] | None = None


@dataclass
class TripOrderListFilters:
    page: int = 1
    page_size: int = 50
    partner_id: int | None = None
    status: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    unpriced: bool | None = None


@dataclass
class ImportTripRow:
    """One row from the customer-Excel import pipeline, post-mapping."""
    container_no: str
    container_size: str = ""
    freight_kind: str = ""
    work_type: str = ""
    container_type_iso: str = ""
    gross_weight_kg: float | None = None
    seal_no: str = ""
    commodity: str = ""
    pickup_location: str = ""
    dropoff_location: str = ""
    trip_date: date | None = None
    customer_ref: str = ""
    consignee: str = ""
    driver_name: str = ""
    remarks: str = ""


@dataclass
class ImportCommitInput:
    partner_id: int
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


# ── WorkOrder ────────────────────────────────────────────────────


@dataclass
class WorkOrderContainerInput:
    container_number: str
    work_type: str
    photo_url: str | None = None
    photo_lat: float | None = None
    photo_lng: float | None = None
    photo_timestamp: datetime | None = None


@dataclass
class WorkOrderCreateInput:
    partner_id: int
    pickup_location_id: int
    dropoff_location_id: int
    driver_id: int | None = None
    vendor_partner_id: int | None = None
    vehicle_external_plate: str | None = None
    vehicle_id: int | None = None
    vessel: str | None = None
    operation_type: str | None = None
    shipper_partner_id: int | None = None
    containers: list[WorkOrderContainerInput] = field(default_factory=list)
    gps_lat: float | None = None
    gps_lng: float | None = None
    trip_date: date | None = None


@dataclass
class WorkOrderUpdateInput:
    partner_id: int | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    driver_id: int | None = None
    vendor_partner_id: int | None = None
    vehicle_external_plate: str | None = None
    vehicle_id: int | None = None
    vessel: str | None = None
    operation_type: str | None = None
    shipper_partner_id: int | None = None
    containers: list[WorkOrderContainerInput] | None = None
    gps_lat: float | None = None
    gps_lng: float | None = None
    unit_price: int | None = None
    driver_salary: int | None = None
    allowance: int | None = None
    status: str | None = None


@dataclass
class WorkOrderListFilters:
    page: int = 1
    page_size: int = 50
    driver_id: int | None = None
    date_from: date | None = None
    date_to: date | None = None
    status: str | None = None


# ── Reconciliation ───────────────────────────────────────────────


@dataclass
class ReconcileInput:
    work_order_id: int
    trip_order_id: int
    user_id: int


@dataclass
class UnmatchInput:
    user_id: int
    reason: str
    work_order_id: int
    trip_order_id: int
