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


class TripOrderStatus(str, Enum):
    PENDING = "PENDING"
    MATCHED = "MATCHED"


# ---------------------------------------------------------------------------
# Partner (unified clients + vendors)
# ---------------------------------------------------------------------------

class PartnerCreate(BaseModel):
    name: str
    code: str | None = None
    partner_type: Literal["client", "vendor", "both"]
    partner_role: str | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None


class PartnerUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    partner_type: Literal["client", "vendor", "both"] | None = None
    partner_role: str | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None


class PartnerSummaryOut(BaseModel):
    id: int
    code: str | None = None
    name: str

    model_config = ConfigDict(from_attributes=True)


class PartnerOut(BaseModel):
    id: int
    code: str | None
    name: str
    partner_type: str
    partner_role: str | None
    phone: str | None
    tax_code: str | None
    address: str | None
    contact_person: str | None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Vehicle
# ---------------------------------------------------------------------------

class VehicleCreate(BaseModel):
    plate: str
    driver_id: int


class VehicleOut(BaseModel):
    id: int
    plate: str
    driver_id: int
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VehicleSummaryOut(BaseModel):
    id: int
    plate: str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Location
# ---------------------------------------------------------------------------

class LocationCreate(BaseModel):
    name: str


class LocationUpdate(BaseModel):
    name: str | None = None


class LocationSummaryOut(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class DriverSummaryOut(BaseModel):
    id: int
    name: str
    phone: str | None = None
    vehicle: VehicleSummaryOut | None = None

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
    distance_km: float | None = None

    model_config = ConfigDict(from_attributes=True)


class LocationPinRequest(BaseModel):
    name: str
    lat: float
    lng: float
    note: str | None = None


# ---------------------------------------------------------------------------
# LocationAlias (confirmation FSM)
# ---------------------------------------------------------------------------

class LocationAliasOut(BaseModel):
    id: int
    location_id: int
    alias: str
    alias_normalized: str
    source: str
    status: str
    confirmed_by_id: int | None = None
    confirmed_at: datetime | None = None
    rejected_by_id: int | None = None
    rejected_at: datetime | None = None
    merge_target_location_id: int | None = None
    note: str | None = None
    created_at: datetime
    created_by_id: int | None = None

    model_config = ConfigDict(from_attributes=True)


class CreateAliasRequest(BaseModel):
    location_id: int
    alias: str


class RejectAliasRequest(BaseModel):
    note: str | None = None


class MergeLocationsRequest(BaseModel):
    source_location_id: int
    target_location_id: int


class MergeLocationsResponse(BaseModel):
    source_location_id: int
    target_location_id: int
    aliases_moved: int
    fk_updates: dict[str, int]


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
    partner_id: int
    work_type: str
    pickup_location_id: int
    dropoff_location_id: int
    lines: list[PricingLineCreate]


class PricingUpdate(BaseModel):
    partner_id: int | None = None
    work_type: str | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    lines: list[PricingLineCreate] | None = None


class PricingOut(BaseModel):
    id: int
    partner: PartnerSummaryOut
    work_type: str
    pickup_location: LocationSummaryOut
    dropoff_location: LocationSummaryOut
    lines: list[PricingLineOut] = []
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# WorkOrder (driver trip)
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
    partner_id: int
    pickup_location_id: int
    dropoff_location_id: int
    driver_id: int
    vehicle_id: int | None = None
    gps_lat: float | None = None
    gps_lng: float | None = None
    trip_date: date | None = None  # explicit trip execution date; defaults to today if not provided


class WorkOrderUpdate(BaseModel):
    containers: list[ContainerCreate] | None = None
    partner_id: int | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    driver_id: int | None = None
    vehicle_id: int | None = None
    gps_lat: float | None = None
    gps_lng: float | None = None
    unit_price: int | None = None
    driver_salary: int | None = None
    allowance: int | None = None
    status: str | None = None


class WorkOrderOut(BaseModel):
    id: int
    partner: PartnerSummaryOut
    code: str | None = None
    pickup_location: LocationSummaryOut
    dropoff_location: LocationSummaryOut
    driver: DriverSummaryOut
    vehicle: VehicleSummaryOut | None = None
    gps_lat: float | None
    gps_lng: float | None
    gps_address: str | None
    unit_price: int
    driver_salary: int
    allowance: int
    pricing_id: int | None
    trip_date: date | None = None
    status: str
    containers: list[ContainerOut] = []
    matched_trip_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# TripOrder (customer order from Excel)
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
    partner_id: int
    pickup_location_id: int
    dropoff_location_id: int
    containers: list[TripContainerCreate] = []
    pricing_id: int | None = None
    unit_price: int = Field(ge=0)
    driver_salary: int = Field(ge=0)
    allowance: int = Field(ge=0)
    matched_work_order_ids: list[int] = []


class TripOrderUpdate(BaseModel):
    trip_date: date | None = None
    partner_id: int | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    containers: list[TripContainerCreate] | None = None
    pricing_id: int | None = None
    unit_price: int | None = None
    driver_salary: int | None = None
    allowance: int | None = None
    status: str | None = None
    matched_work_order_ids: list[int] | None = None


class TripOrderOut(BaseModel):
    id: int
    trip_date: date
    partner: PartnerSummaryOut
    code: str | None = None
    pickup_location: LocationSummaryOut
    dropoff_location: LocationSummaryOut
    containers: list[TripContainerOut] = []
    pricing_id: int | None
    unit_price: int
    driver_salary: int
    allowance: int
    status: str
    matched_work_order_ids: list[int] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Reconciliation
# ---------------------------------------------------------------------------

class ReconciliationOut(BaseModel):
    id: int
    trip_order_id: int
    work_order_id: int
    match_score: float
    matched_by: int
    matched_at: datetime
    unmatched_by: int | None = None
    unmatched_at: datetime | None = None
    reason: str | None = None
    is_active: bool = True
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReconcileRequest(BaseModel):
    work_order_id: int
    trip_order_id: int


class CriterionBreakdown(BaseModel):
    name: str
    label: str
    match: bool
    wo_value: str | None = None
    to_value: str | None = None


class MatchSuggestion(BaseModel):
    trip_order: TripOrderOut
    confidence: Literal["full", "partial", "none"]
    matched_fields: list[str]
    score: float
    criteria: list[CriterionBreakdown] = Field(default_factory=list)
    match_score: int = 0
    max_score: int = 5


class SuggestMatchesResponse(BaseModel):
    work_order_id: int
    suggestions: list[MatchSuggestion]


class WOSuggestion(BaseModel):
    work_order: WorkOrderOut
    confidence: Literal["full", "partial", "none"]
    matched_fields: list[str]
    score: float
    criteria: list[CriterionBreakdown] = Field(default_factory=list)
    match_score: int = 0
    max_score: int = 5


class SuggestWosResponse(BaseModel):
    trip_order_id: int
    suggestions: list[WOSuggestion]


# ---------------------------------------------------------------------------
# Match scores (lightweight — for master list)
# ---------------------------------------------------------------------------

class WorkOrderMatchScore(BaseModel):
    work_order_id: int
    best_score: float
    best_match_score: int
    max_score: int = 5
    suggestion_count: int = 0


class MatchScoresResponse(BaseModel):
    scores: list[WorkOrderMatchScore]


# ---------------------------------------------------------------------------
# Bulk match
# ---------------------------------------------------------------------------

class BulkMatchPair(BaseModel):
    work_order_id: int
    trip_order_id: int


class BulkMatchRequest(BaseModel):
    pairs: list[BulkMatchPair]


class BulkMatchResult(BaseModel):
    work_order_id: int
    trip_order_id: int
    success: bool
    error: str | None = None


class BulkMatchResponse(BaseModel):
    matched: list[BulkMatchResult]
    errors: list[str]


# ---------------------------------------------------------------------------
# Batch match for WO (1 WO → N TripOrders)
# ---------------------------------------------------------------------------

class BatchMatchForWORequest(BaseModel):
    work_order_id: int
    trip_order_ids: list[int]

class BatchMatchForWOResult(BaseModel):
    trip_order_id: int
    success: bool
    error: str | None = None

class BatchMatchForWOResponse(BaseModel):
    work_order_id: int
    results: list[BatchMatchForWOResult]


# ---------------------------------------------------------------------------
# Auto-match
# ---------------------------------------------------------------------------

class AutoMatchRequest(BaseModel):
    date_from: str | None = None
    date_to: str | None = None


class AutoMatchCriterion(BaseModel):
    key: str
    label: str
    match: bool


class AutoMatchWorkOrderRef(BaseModel):
    id: int
    code: str | None = None
    plate: str | None = None
    date: str | None = None
    client_name: str | None = None


class AutoMatchTripOrderRef(BaseModel):
    id: int
    code: str | None = None
    client_name: str | None = None
    containers: list[TripContainerOut] = []


class AutoMatchCandidate(BaseModel):
    work_order_id: int
    trip_order_id: int
    score: float
    match_score: int
    max_score: int = 5
    matched_fields: list[str]
    criteria: list[AutoMatchCriterion] = []
    suggested_default: bool = False
    work_order_ref: AutoMatchWorkOrderRef | None = None
    trip_order_ref: AutoMatchTripOrderRef | None = None


class UnmatchedWorkOrderRef(BaseModel):
    id: int
    code: str | None = None
    plate: str | None = None
    date: str | None = None


class AutoMatchResponse(BaseModel):
    scanned_work_order_count: int = 0
    skipped_already_matched: int = 0
    candidates: list[AutoMatchCandidate] = []
    unmatched_work_order_refs: list[UnmatchedWorkOrderRef] = []
    errors: list[str] = []


# Legacy aliases for backward compat (old response shape)
class AutoMatchResult(BaseModel):
    work_order_id: int
    trip_order_id: int
    score: float
    matched_fields: list[str]


class AutoMatchConfirmRequest(BaseModel):
    pairs: list[BulkMatchPair]


class AutoMatchConfirmResult(BaseModel):
    work_order_id: int
    trip_order_id: int
    success: bool
    error: str | None = None


class AutoMatchConfirmResponse(BaseModel):
    matched: list[AutoMatchConfirmResult]
    failed: list[AutoMatchConfirmResult] = []
    duration_ms: int = 0


# ---------------------------------------------------------------------------
# Salary / Driver Earnings (calculated on-the-fly from matched work_orders)
# ---------------------------------------------------------------------------

class DriverEarningsOut(BaseModel):
    driver_id: int
    driver_name: str | None = None
    start_date: date
    end_date: date
    matched_order_count: int
    total_salary: int
    total_allowance: int
    total_earnings: int


# ---------------------------------------------------------------------------
# SalaryConfig
# ---------------------------------------------------------------------------

class SalaryConfigOut(BaseModel):
    from_day: int
    to_day: int

    model_config = ConfigDict(from_attributes=True)


class SalaryConfigUpdate(BaseModel):
    from_day: int | None = Field(default=None, ge=1, le=31)
    to_day: int | None = Field(default=None, ge=1, le=31)


# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------

class DriverCreate(BaseModel):
    username: str
    phone: str | None = None
    plate: str | None = None  # vehicle plate


class DriverOut(BaseModel):
    id: int
    username: str
    phone: str | None = None
    vehicle: VehicleSummaryOut | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Job status (arq async queue polling)
# ---------------------------------------------------------------------------

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    result: dict | None = None


class SalaryCalculateAsyncResponse(BaseModel):
    job_id: str
    message: str = "Calculation enqueued"


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
    image_data: str
    mime_type: str = "image/jpeg"
    container_index: int = 0


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
    work_order_id: int
    trip_order_id: int


class BatchMatchForWORequest(BaseModel):
    work_order_id: int
    trip_order_ids: list[int] = Field(..., min_length=1)


class BatchMatchForWOResult(BaseModel):
    trip_order_id: int
    success: bool
    error: str | None = None


class BatchMatchForWOResponse(BaseModel):
    work_order_id: int
    results: list[BatchMatchForWOResult]


class SoftDeleteRequest(BaseModel):
    reason: str = Field(..., min_length=1, description="Required reason for soft deletion")


# ---------------------------------------------------------------------------
# Batch match for TO (1 TO → N WorkOrders) — TO-centric model
# ---------------------------------------------------------------------------

class BatchMatchForTORequest(BaseModel):
    trip_order_id: int
    work_order_ids: list[int] = Field(..., min_length=1)


class BatchMatchForTOResult(BaseModel):
    work_order_id: int
    success: bool
    error: str | None = None


class BatchMatchForTOResponse(BaseModel):
    trip_order_id: int
    results: list[BatchMatchForTOResult]
