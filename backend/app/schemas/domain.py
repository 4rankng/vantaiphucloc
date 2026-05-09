"""
Pydantic schemas for all domain entities.

Each entity has three variants:
  - XxxCreate  — fields accepted on POST
  - XxxUpdate  — all fields optional, used for PUT
  - XxxOut     — response shape, includes id / created_at / updated_at

All monetary fields are int (Vietnamese Dong, no decimals).
All Out schemas use model_config = ConfigDict(from_attributes=True).
"""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------------------------------------------------------------------------
# Status Enums
# ---------------------------------------------------------------------------

class WorkOrderStatus(str, Enum):
    PENDING = "PENDING"
    MATCHED = "MATCHED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class TripOrderStatus(str, Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


# ---------------------------------------------------------------------------
# Vendor
# ---------------------------------------------------------------------------

class VendorCreate(BaseModel):
    name: str
    type: Literal["company", "individual"] | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None


class VendorUpdate(BaseModel):
    name: str | None = None
    type: Literal["company", "individual"] | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None


class VendorOut(BaseModel):
    id: int
    name: str
    type: str | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------

class LocationCreate(BaseModel):
    name: str


class LocationUpdate(BaseModel):
    name: str | None = None


# ---------------------------------------------------------------------------
# Read-DTO summary schemas — nested in OUT responses
#
# Domain DB stores only FKs; the application layer composes these on read
# so frontends get the human-readable label without storing a denormalized
# duplicate column. See BizLogic.md §4.
# ---------------------------------------------------------------------------

class ClientSummaryOut(BaseModel):
    id: int
    code: str | None = None
    name: str

    model_config = ConfigDict(from_attributes=True)


class LocationSummaryOut(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class DriverSummaryOut(BaseModel):
    id: int
    name: str
    tractor_plate: str | None = None

    model_config = ConfigDict(from_attributes=True)


class LocationOut(BaseModel):
    id: int
    name: str
    is_active: bool = True
    lat: float | None = None
    lng: float | None = None
    geocoded_at: datetime | None = None
    geocode_source: str | None = None
    pending_geocode: bool = True
    created_via: str | None = None
    location_review_needed: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LocationNearbyOut(BaseModel):
    id: int
    name: str
    lat: float | None = None
    lng: float | None = None
    distance_km: float | None = None  # null when location has no coords

    model_config = ConfigDict(from_attributes=True)


class LocationPinRequest(BaseModel):
    name: str
    lat: float
    lng: float
    note: str | None = None


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------

class ClientCreate(BaseModel):
    name: str
    code: str | None = None
    type: Literal["company", "individual"]
    phone: str
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    type: Literal["company", "individual"] | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None


class ClientOut(BaseModel):
    id: int
    code: str | None
    name: str
    type: str
    phone: str
    tax_code: str | None
    address: str | None
    contact_person: str | None
    outstanding_debt: int
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

class RouteCreate(BaseModel):
    route: str
    pickup_location_id: int
    dropoff_location_id: int


class RouteUpdate(BaseModel):
    route: str | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None


class RouteOut(BaseModel):
    id: int
    route: str
    pickup_location: LocationSummaryOut
    dropoff_location: LocationSummaryOut
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Pricing
# ---------------------------------------------------------------------------

class PricingLineCreate(BaseModel):
    quantity: int
    unit_price: int = 0
    driver_salary: int = 0
    allowance: int = 0


class PricingLineOut(BaseModel):
    id: int
    quantity: int
    unit_price: int = 0
    driver_salary: int = 0
    allowance: int = 0

    model_config = ConfigDict(from_attributes=True)


class PricingCreate(BaseModel):
    client_id: int
    work_type: str
    pickup_location_id: int
    dropoff_location_id: int
    lines: list[PricingLineCreate]


class PricingUpdate(BaseModel):
    client_id: int | None = None
    work_type: str | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    lines: list[PricingLineCreate] | None = None


class PricingOut(BaseModel):
    id: int
    client: ClientSummaryOut
    work_type: str
    pickup_location: LocationSummaryOut
    dropoff_location: LocationSummaryOut
    lines: list[PricingLineOut] = []
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# WorkOrder
# ---------------------------------------------------------------------------

class ContainerCreate(BaseModel):
    container_number: str
    work_type: str
    photo_url: str | None = None
    photo_lat: float | None = None
    photo_lng: float | None = None
    photo_timestamp: datetime | None = None


class ContainerOut(BaseModel):
    id: int
    container_number: str
    work_type: str
    photo_url: str | None
    photo_lat: float | None = None
    photo_lng: float | None = None
    photo_timestamp: datetime | None = None
    photo_address: str | None = None

    model_config = ConfigDict(from_attributes=True)


class WorkOrderCreate(BaseModel):
    containers: list[ContainerCreate]
    client_id: int
    route: str
    pickup_location_id: int
    dropoff_location_id: int
    driver_id: int
    tractor_plate: str
    gps_lat: float | None = None
    gps_lng: float | None = None


class WorkOrderUpdate(BaseModel):
    containers: list[ContainerCreate] | None = None
    client_id: int | None = None
    route: str | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    driver_id: int | None = None
    tractor_plate: str | None = None
    gps_lat: float | None = None
    gps_lng: float | None = None
    unit_price: int | None = None
    driver_salary: int | None = None
    allowance: int | None = None
    earning: int | None = None
    status: str | None = None


class WorkOrderOut(BaseModel):
    id: int
    client: ClientSummaryOut
    code: str | None = None
    route: str
    pickup_location: LocationSummaryOut
    dropoff_location: LocationSummaryOut
    driver: DriverSummaryOut
    tractor_plate: str
    gps_lat: float | None
    gps_lng: float | None
    gps_address: str | None
    unit_price: int
    driver_salary: int
    allowance: int
    earning: int
    pricing_id: int | None
    status: str
    is_locked: bool = False
    locked_at: datetime | None = None
    locked_by: int | None = None
    containers: list[ContainerOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# TripOrder
# ---------------------------------------------------------------------------

class TripContainerPhotoOut(BaseModel):
    id: int
    kind: str
    file_url: str
    caption: str | None = None
    uploaded_at: datetime
    uploaded_by: int | None = None

    model_config = ConfigDict(from_attributes=True)


class TripContainerCreate(BaseModel):
    container_number: str
    work_type: str
    container_size: str | None = None
    container_type: str | None = None
    freight_kind: str | None = None
    gross_weight_kg: float | None = None
    seal_no: str | None = None
    commodity: str | None = None
    container_metadata: dict | None = None


class TripContainerOut(BaseModel):
    id: int
    container_number: str
    work_type: str
    container_size: str | None = None
    container_type: str | None = None
    freight_kind: str | None = None
    gross_weight_kg: float | None = None
    seal_no: str | None = None
    commodity: str | None = None
    container_metadata: dict | None = None
    photos: list[TripContainerPhotoOut] = []

    model_config = ConfigDict(from_attributes=True)


class TripOrderCreate(BaseModel):
    trip_date: date
    client_id: int
    route: str
    pickup_location_id: int
    dropoff_location_id: int
    containers: list[TripContainerCreate] = []
    pricing_id: int | None = None
    unit_price: int = Field(ge=0)
    driver_salary: int = Field(ge=0)
    allowance: int = Field(ge=0)
    revenue: int = Field(ge=0)
    matched_work_order_ids: list[int] = []


class TripOrderUpdate(BaseModel):
    trip_date: date | None = None
    client_id: int | None = None
    route: str | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    containers: list[TripContainerCreate] | None = None
    pricing_id: int | None = None
    unit_price: int | None = None
    driver_salary: int | None = None
    allowance: int | None = None
    revenue: int | None = None
    status: str | None = None
    is_confirmed: bool | None = None
    confirmed_by: int | None = None
    confirmed_at: datetime | None = None
    matched_work_order_ids: list[int] | None = None


class TripOrderOut(BaseModel):
    id: int
    trip_date: date
    client: ClientSummaryOut
    code: str | None = None
    route: str
    pickup_location: LocationSummaryOut
    dropoff_location: LocationSummaryOut
    containers: list[TripContainerOut] = []
    pricing_id: int | None
    unit_price: int
    driver_salary: int
    allowance: int
    revenue: int
    status: str
    is_confirmed: bool = False
    confirmed_by: int | None = None
    confirmed_at: datetime | None = None
    is_locked: bool = False
    locked_at: datetime | None = None
    locked_by: int | None = None
    matched_work_order_ids: list[int] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Reconcile
# ---------------------------------------------------------------------------

class ReconcileRequest(BaseModel):
    work_order_id: int
    trip_order_id: int


class MatchSuggestion(BaseModel):
    trip_order: TripOrderOut
    confidence: Literal["full", "partial", "none"]
    matched_fields: list[str]
    score: float


class SuggestMatchesResponse(BaseModel):
    work_order_id: int
    suggestions: list[MatchSuggestion]


class WOSuggestion(BaseModel):
    work_order: WorkOrderOut
    confidence: Literal["full", "partial", "none"]
    matched_fields: list[str]
    score: float


class SuggestWosResponse(BaseModel):
    trip_order_id: int
    suggestions: list[WOSuggestion]


# ---------------------------------------------------------------------------
# Auto-match
# ---------------------------------------------------------------------------

class AutoMatchRequest(BaseModel):
    date_from: str | None = None
    date_to: str | None = None


class AutoMatchResult(BaseModel):
    work_order_id: int
    trip_order_id: int
    score: float
    matched_fields: list[str]


class AutoMatchResponse(BaseModel):
    auto_matched: list[AutoMatchResult]
    partial_matches: list[AutoMatchResult]
    skipped_already_matched: int
    errors: list[str]


# ---------------------------------------------------------------------------
# Salary
# ---------------------------------------------------------------------------

class SalaryCalculateRequest(BaseModel):
    driver_id: int | None = None
    start_date: date
    end_date: date


class SalaryPeriodOut(BaseModel):
    id: int
    driver: DriverSummaryOut
    start_date: date
    end_date: date
    work_order_count: int
    price_per_order: int
    total_salary: int
    total_allowance: int
    total_deduction: int
    net_pay: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SalaryPeriodUpdate(BaseModel):
    status: str | None = None


# ---------------------------------------------------------------------------
# SalaryConfig
# ---------------------------------------------------------------------------

class SalaryConfigOut(BaseModel):
    id: int
    from_day: int
    to_day: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SalaryConfigUpdate(BaseModel):
    from_day: int | None = Field(default=None, ge=1, le=28)
    to_day: int | None = Field(default=None, ge=1, le=28)


# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------

class DriverCreate(BaseModel):
    username: str
    phone: str | None = None
    tractor_plate: str | None = None
    vendor: str | None = None  # defaults to "Phúc Lộc" if omitted


class DriverOut(BaseModel):
    id: int
    username: str
    phone: str | None = None
    tractor_plate: str | None = None
    vendor: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Job status (arq async queue polling)
# ---------------------------------------------------------------------------

class JobStatusResponse(BaseModel):
    job_id: str
    status: str          # queued | in_progress | complete | not_found
    result: dict | None = None


class SalaryCalculateAsyncResponse(BaseModel):
    job_id: str
    message: str = "Salary calculation enqueued"


# ---------------------------------------------------------------------------
# Batch work orders (offline sync)
# ---------------------------------------------------------------------------

class BatchWorkOrderCreate(BaseModel):
    items: list[WorkOrderCreate] = Field(..., max_length=50)


class BatchWorkOrderResult(BaseModel):
    index: int
    id: int | None = None
    success: bool
    error: str | None = None


# ---------------------------------------------------------------------------
# OCR (Container Number Extraction)
# ---------------------------------------------------------------------------

class ContainerOCRRequest(BaseModel):
    image_data: str  # base64-encoded image
    mime_type: str = "image/jpeg"
    container_index: int = 0  # which container slot (0-based) this OCR attempt is for


class ContainerOCRResponse(BaseModel):
    success: bool
    container_number: str | None = None
    error: str | None = None
    attempts_remaining: int = 0


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class DriverSalarySummaryItem(BaseModel):
    driver_id: int
    driver_name: str
    tractor_plate: str | None = None
    total_jobs: int
    total_salary: int


class DashboardSummaryOut(BaseModel):
    total_revenue: int
    total_expense: int
    trip_count: int
    active_trips: int
    outstanding_debt: int
    driver_salary_summary: list[DriverSalarySummaryItem] = []
    unmatched_work_order_count: int = 0
    pending_trip_count: int = 0


# ---------------------------------------------------------------------------
# Cancel / Unmatch / Soft-delete requests
# ---------------------------------------------------------------------------

class CancelRequest(BaseModel):
    reason: str = Field(..., min_length=1, description="Required reason for cancellation")


class UnmatchRequest(BaseModel):
    reason: str = Field(..., min_length=1, description="Required reason for unmatching")
    work_order_id: int | None = None
    trip_order_id: int | None = None


class SoftDeleteRequest(BaseModel):
    reason: str = Field(..., min_length=1, description="Required reason for soft deletion")
