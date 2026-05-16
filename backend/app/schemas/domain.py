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
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


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
# Client
# ---------------------------------------------------------------------------

class ClientCreate(BaseModel):
    name: str
    code: str | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None


class ClientSummaryOut(BaseModel):
    id: int
    code: str | None = None
    name: str

    model_config = ConfigDict(from_attributes=True)


class ClientOut(BaseModel):
    id: int
    code: str | None
    name: str
    phone: str | None
    tax_code: str | None
    address: str | None
    contact_person: str | None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Vendor
# ---------------------------------------------------------------------------

class VendorCreate(BaseModel):
    name: str
    code: str | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None


class VendorUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None


class VendorOut(BaseModel):
    id: int
    code: str | None
    name: str
    phone: str | None
    tax_code: str | None
    address: str | None
    contact_person: str | None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Backward-compat aliases
# ---------------------------------------------------------------------------

PartnerCreate = ClientCreate
PartnerUpdate = ClientUpdate
PartnerOut = ClientOut
PartnerSummaryOut = ClientSummaryOut


# ---------------------------------------------------------------------------
# Vehicle
# ---------------------------------------------------------------------------

class VehicleCreate(BaseModel):
    plate: str
    driver_id: int | None = None


class VehicleOut(BaseModel):
    id: int
    plate: str
    driver_id: int | None = None
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
    location_name: str | None = None
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
    client_id: int
    work_type: str
    pickup_location_id: int
    dropoff_location_id: int
    operation_type: str | None = None  # XUAT_NHAP_TAU | CHUYEN_BAI | LAY_VO_HA_HANG | CHAY_SA_LAN | DONG_KHO
    lines: list[PricingLineCreate]


class PricingUpdate(BaseModel):
    client_id: int | None = None
    work_type: str | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    operation_type: str | None = None
    lines: list[PricingLineCreate] | None = None


class PricingOut(BaseModel):
    id: int
    partner: PartnerSummaryOut
    operation_type: str | None = None
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
    client_id: int
    pickup_location_id: int
    dropoff_location_id: int
    driver_id: int | None = None             # required unless vendor_client_id is set
    vendor_client_id: int | None = None     # xe ngoài: external transport company
    vehicle_external_plate: str | None = None  # vendor plate (free text)
    vehicle_id: int | None = None
    vessel: str | None = None
    operation_type: str | None = None   # XUAT_NHAP_TAU | CHUYEN_BAI | LAY_VO_HA_HANG | CHAY_SA_LAN | DONG_KHO
    gps_lat: float | None = None
    gps_lng: float | None = None
    trip_date: date | None = None  # explicit trip execution date; defaults to today if not provided

    @model_validator(mode="after")
    def _check_driver_xor_vendor(self) -> "WorkOrderCreate":
        has_driver = self.driver_id is not None
        has_vendor = self.vendor_client_id is not None
        if has_driver == has_vendor:  # both set or both missing
            raise ValueError(
                "Exactly one of driver_id or vendor_client_id must be provided."
            )
        return self


class WorkOrderUpdate(BaseModel):
    containers: list[ContainerCreate] | None = None
    client_id: int | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    driver_id: int | None = None
    vendor_client_id: int | None = None
    vehicle_external_plate: str | None = None
    vehicle_id: int | None = None
    vessel: str | None = None
    operation_type: str | None = None
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
    driver: DriverSummaryOut | None = None
    vendor_client_id: int | None = None
    vehicle_external_plate: str | None = None
    vehicle: VehicleSummaryOut | None = None
    vessel: str | None = None
    operation_type: str | None = None
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
    client_id: int
    pickup_location_id: int
    dropoff_location_id: int
    containers: list[TripContainerCreate] = []
    pricing_id: int | None = None
    operation_type: str | None = None  # XUAT_NHAP_TAU | CHUYEN_BAI | LAY_VO_HA_HANG | CHAY_SA_LAN | DONG_KHO
    unit_price: int = Field(ge=0)
    driver_salary: int = Field(ge=0)
    allowance: int = Field(ge=0)
    matched_work_order_ids: list[int] = []


class TripOrderUpdate(BaseModel):
    trip_date: date | None = None
    client_id: int | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    containers: list[TripContainerCreate] | None = None
    pricing_id: int | None = None
    operation_type: str | None = None
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
    operation_type: str | None = None
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
    reason: str | None = None


class CriterionBreakdown(BaseModel):
    name: str
    label: str
    match: bool
    wo_value: str | None = None
    to_value: str | None = None
    fuzzy: bool = False


class MatchSuggestion(BaseModel):
    trip_order: TripOrderOut
    container_id: int
    confidence: Literal["full", "partial", "none"]
    matched_fields: list[str]
    score: float
    criteria: list[CriterionBreakdown] = Field(default_factory=list)
    match_score: int = 0
    max_score: int = 5
    match_warnings: list[str] = Field(default_factory=list)


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
    match_warnings: list[str] = Field(default_factory=list)


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


class AutoMatchRejectionReason(BaseModel):
    code: str
    label: str
    count: int


class AutoMatchStats(BaseModel):
    reasons: list[AutoMatchRejectionReason] = []


class AutoMatchResponse(BaseModel):
    scanned_work_order_count: int = 0
    skipped_already_matched: int = 0
    candidates: list[AutoMatchCandidate] = []
    unmatched_work_order_refs: list[UnmatchedWorkOrderRef] = []
    errors: list[str] = []
    stats: AutoMatchStats = AutoMatchStats()


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
    driver_phone: str | None = None
    start_date: date
    end_date: date
    matched_order_count: int
    base_salary: int = 0
    total_salary: int
    total_allowance: int
    total_earnings: int


# ---------------------------------------------------------------------------
# Driver base salary history (append-only)
# ---------------------------------------------------------------------------

class DriverBaseSalaryOut(BaseModel):
    id: int
    driver_id: int
    base_salary: int
    effective_from: date
    note: str | None = None


class DriverBaseSalarySet(BaseModel):
    base_salary: int = Field(..., ge=0)
    effective_from: date
    note: str | None = Field(default=None, max_length=500)


# ---------------------------------------------------------------------------
# P&L dashboard (revenue & profit per accounting period)
# ---------------------------------------------------------------------------

class PartnerRevenueBreakdownOut(BaseModel):
    client_id: int
    partner_name: str
    matched_trip_count: int
    revenue: int


class MonthlyPnLOut(BaseModel):
    start_date: date
    end_date: date
    revenue: int
    total_productivity_salary: int
    total_allowance: int
    total_base_salary: int
    total_vehicle_expenses: int = 0
    total_cp_chung: int = 0
    profit: int
    matched_trip_count: int
    partner_breakdown: list[PartnerRevenueBreakdownOut]


# ---------------------------------------------------------------------------
# Customer reconciliation import (file đối soát do KH gửi lại)
# ---------------------------------------------------------------------------

class CustomerReconciliationRowInput(BaseModel):
    """One parsed row from a customer's reconciliation file.

    The frontend (or a future Excel parser) is responsible for producing
    this shape. The backend treats it as authoritative parsed output.
    """

    container_number: str | None = Field(default=None, max_length=50)
    trip_date: date | None = None
    customer_status: str = Field(..., pattern="^(MATCHED|REJECTED|UNKNOWN)$")
    customer_note: str | None = Field(default=None, max_length=500)
    customer_amount: int | None = None


class CustomerReconciliationPreviewRequest(BaseModel):
    client_id: int
    period_start: date
    period_end: date
    source_filename: str | None = Field(default=None, max_length=500)
    rows: list[CustomerReconciliationRowInput]


class CustomerReconciliationRowOut(BaseModel):
    id: int
    container_number: str | None = None
    trip_date: date | None = None
    customer_status: str
    customer_note: str | None = None
    resolved_trip_order_id: int | None = None
    apply_status: str
    apply_message: str | None = None
    diff_classification: str | None = None
    customer_amount: int | None = None
    our_amount: int | None = None


class CustomerReconciliationImportOut(BaseModel):
    id: int
    client_id: int
    partner_name: str | None = None
    period_start: date
    period_end: date
    source_filename: str | None = None
    status: str  # PARSED | APPLIED
    summary: dict | None = None
    uploaded_at: datetime
    applied_at: datetime | None = None
    rows: list[CustomerReconciliationRowOut] = []


class RowVerdictUpdate(BaseModel):
    """Per-row action for customer reconciliation."""
    action: str = Field(..., pattern="^(accept|dispute|edit)$")
    amount: int | None = None
    note: str | None = Field(default=None, max_length=500)


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
# VehicleExpense (CP Xe)
# ---------------------------------------------------------------------------

VEHICLE_EXPENSE_CATEGORIES = {"XANG_DAU", "SUA_CHUA", "CHUNG"}


class VehicleExpenseCreate(BaseModel):
    vehicle_id: int | None = None  # null for CHUNG (general overhead)
    category: str = Field(..., pattern="^(XANG_DAU|SUA_CHUA|CHUNG)$")
    amount: int = Field(..., gt=0, description="Amount in VND")
    expense_date: date
    description: str | None = Field(default=None, max_length=500)
    receipt_url: str | None = Field(default=None, max_length=1000)


class VehicleExpenseUpdate(BaseModel):
    vehicle_id: int | None = None
    category: str | None = Field(default=None, pattern="^(XANG_DAU|SUA_CHUA|CHUNG)$")
    amount: int | None = Field(default=None, gt=0)
    expense_date: date | None = None
    description: str | None = Field(default=None, max_length=500)
    receipt_url: str | None = Field(default=None, max_length=1000)


class VehicleExpenseOut(BaseModel):
    id: int
    vehicle_id: int | None
    vehicle_plate: str | None = None
    category: str
    amount: int
    expense_date: date
    description: str | None
    receipt_url: str | None
    created_by: int | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# VehicleDriver (multi-driver per vehicle)
# ---------------------------------------------------------------------------


class VehicleDriverCreate(BaseModel):
    vehicle_id: int
    driver_id: int
    effective_from: date
    effective_to: date | None = None


class VehicleDriverOut(BaseModel):
    id: int
    vehicle_id: int
    vehicle_plate: str | None = None
    driver_id: int
    driver_name: str | None = None
    effective_from: date
    effective_to: date | None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


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


class KpiTrendDeltas(BaseModel):
    """Percent change comparing the second half of the window vs the first half."""
    unmatched_work_orders: float = 0.0
    pending_trips: float = 0.0
    driver_salary: float = 0.0
    revenue: float = 0.0


class KpiTrendsOut(BaseModel):
    """Daily time-series for accountant dashboard KPI cards.

    Each series is aligned to ``labels`` (ISO YYYY-MM-DD) and represents the
    activity that occurred on that day:

    - ``unmatched_work_orders``: count of WorkOrders dated that day still PENDING
    - ``pending_trips``: count of TripOrders dated that day still PENDING
    - ``driver_salary``: SUM(driver_salary + allowance) for MATCHED WOs that day
    - ``revenue``: SUM(TripOrder.unit_price) for trips dated that day
    """
    end_date: date
    days: int
    labels: list[str]
    unmatched_work_orders: list[int]
    pending_trips: list[int]
    driver_salary: list[int]
    revenue: list[int]
    deltas: KpiTrendDeltas


# ---------------------------------------------------------------------------
# Per-vehicle P&L
# ---------------------------------------------------------------------------


class VehicleExpenseSummary(BaseModel):
    """Expense subtotals by category for one vehicle."""
    xang_dau: int = 0    # Fuel
    sua_chua: int = 0    # Repairs
    total: int = 0


class VehiclePnLRow(BaseModel):
    """P&L breakdown for a single vehicle in a period."""
    vehicle_id: int
    plate: str
    revenue: int                          # Σ TripOrder.unit_price for matched TOs linked to this vehicle
    cp_xe: VehicleExpenseSummary          # Vehicle-specific expenses (excl. CHUNG)
    cp_chung_allocated: int = 0           # Proportional share of CHUNG overhead (by trip count)
    cp_luong_san_luong: int               # Σ WorkOrder.driver_salary + allowance
    cp_luong_co_ban: int                  # Base salary for drivers on this vehicle
    loi_nhuan: int                        # revenue − all costs (incl. CHUNG allocation)


class VehiclePnLResponse(BaseModel):
    date_from: date
    date_to: date
    rows: list[VehiclePnLRow]
    cp_chung: int                         # General overhead total (for reference; allocated into rows)
    total_revenue: int
    total_profit: int                     # Sum of row profits (CHUNG already allocated)


class TripDayBucket(BaseModel):
    day: int
    matched: int = 0
    pending: int = 0


class TripDailyStatsOut(BaseModel):
    date_from: date
    date_to: date
    total: int = 0
    matched: int = 0
    pending: int = 0
    match_rate: float | None = None
    buckets: list[TripDayBucket] = []


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


# ---------------------------------------------------------------------------
# Bulk import + match (Excel upload for work orders)
# ---------------------------------------------------------------------------

class BulkImportAndMatchResult(BaseModel):
    total_rows: int
    created: int
    matched: int
    warnings: int
    unmatched: int
    errors: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# AI Parse Preview
# ---------------------------------------------------------------------------

class AIParsedCell(BaseModel):
    value: Any = None
    confidence: float
    original_value: Any = None
    cleaned: bool = False


class AIParsedRow(BaseModel):
    row_number: int
    cells: dict[str, AIParsedCell]
    source_row_ref: str
    parse_error: str | None = None


class AIParsePreviewResponse(BaseModel):
    filename: str
    column_mapping: dict[int, str]
    mapping_confidence: float
    header_row: int
    cached_mapping: bool
    total_rows: int
    cost_estimate_usd: float
    rows: list[AIParsedRow]
