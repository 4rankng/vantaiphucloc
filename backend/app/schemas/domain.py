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


class VendorUpdate(BaseModel):
    name: str | None = None


class VendorOut(BaseModel):
    id: int
    name: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------

class ClientCreate(BaseModel):
    name: str
    type: Literal["company", "individual"]
    phone: str
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    type: Literal["company", "individual"] | None = None
    phone: str | None = None
    tax_code: str | None = None
    address: str | None = None
    contact_person: str | None = None


class ClientOut(BaseModel):
    id: int
    name: str
    type: str
    phone: str
    tax_code: str | None
    address: str | None
    contact_person: str | None
    outstanding_debt: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

class RouteCreate(BaseModel):
    route: str
    type_20ft: int
    type_40ft: int
    is_two_way: bool


class RouteUpdate(BaseModel):
    route: str | None = None
    type_20ft: int | None = None
    type_40ft: int | None = None
    is_two_way: bool | None = None


class RouteOut(BaseModel):
    id: int
    route: str
    type_20ft: int
    type_40ft: int
    is_two_way: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Pricing
# ---------------------------------------------------------------------------

class PricingLineCreate(BaseModel):
    work_type: str
    quantity: int


class PricingLineOut(BaseModel):
    id: int
    work_type: str
    quantity: int

    model_config = ConfigDict(from_attributes=True)


class PricingCreate(BaseModel):
    client_id: int
    client_name: str
    work_type: str
    route: str
    lines: list[PricingLineCreate]
    unit_price: int = Field(ge=0)
    driver_salary: int = Field(ge=0)
    allowance: int = Field(ge=0)


class PricingUpdate(BaseModel):
    client_id: int | None = None
    client_name: str | None = None
    work_type: str | None = None
    route: str | None = None
    lines: list[PricingLineCreate] | None = None
    unit_price: int | None = None
    driver_salary: int | None = None
    allowance: int | None = None


class PricingOut(BaseModel):
    id: int
    client_id: int
    client_name: str
    work_type: str
    route: str
    lines: list[PricingLineOut] = []
    unit_price: int
    driver_salary: int
    allowance: int
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
    client_name: str
    route: str
    driver_id: int
    driver_name: str
    tractor_plate: str
    gps_lat: float | None = None
    gps_lng: float | None = None


class WorkOrderUpdate(BaseModel):
    containers: list[ContainerCreate] | None = None
    client_id: int | None = None
    client_name: str | None = None
    route: str | None = None
    driver_id: int | None = None
    driver_name: str | None = None
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
    client_id: int
    client_name: str
    route: str
    driver_id: int
    driver_name: str
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
    containers: list[ContainerOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# TripOrder
# ---------------------------------------------------------------------------

class TripContainerCreate(BaseModel):
    container_number: str
    work_type: str


class TripContainerOut(BaseModel):
    id: int
    container_number: str
    work_type: str

    model_config = ConfigDict(from_attributes=True)


class TripOrderCreate(BaseModel):
    trip_date: date
    client_id: int
    client_name: str
    work_type: str | None = None  # legacy — derived from first container
    route: str
    tractor_plate: str
    driver_id: int
    driver_name: str
    containers: list[TripContainerCreate]
    container_number: str | None = None  # legacy
    pricing_id: int | None = None
    unit_price: int = Field(ge=0)
    driver_salary: int = Field(ge=0)
    allowance: int = Field(ge=0)
    revenue: int = Field(ge=0)
    matched_work_order_ids: list[int] = []


class TripOrderUpdate(BaseModel):
    trip_date: date | None = None
    client_id: int | None = None
    client_name: str | None = None
    work_type: str | None = None
    route: str | None = None
    tractor_plate: str | None = None
    driver_id: int | None = None
    driver_name: str | None = None
    container_number: str | None = None
    containers: list[TripContainerCreate] | None = None
    pricing_id: int | None = None
    unit_price: int | None = None
    driver_salary: int | None = None
    allowance: int | None = None
    revenue: int | None = None
    status: str | None = None
    matched_work_order_ids: list[int] | None = None


class TripOrderOut(BaseModel):
    id: int
    trip_date: date
    client_id: int
    client_name: str
    work_type: str | None
    route: str
    tractor_plate: str
    driver_id: int
    driver_name: str
    container_number: str | None
    containers: list[TripContainerOut] = []
    pricing_id: int | None
    unit_price: int
    driver_salary: int
    allowance: int
    revenue: int
    status: str
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
# Salary
# ---------------------------------------------------------------------------

class SalaryCalculateRequest(BaseModel):
    driver_id: int
    start_date: date
    end_date: date


class SalaryPeriodOut(BaseModel):
    id: int
    driver_id: int
    driver_name: str
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


class ContainerOCRResponse(BaseModel):
    success: bool
    container_number: str | None = None
    error: str | None = None
    attempts_remaining: int = 0


# ---------------------------------------------------------------------------
# Payments
# ---------------------------------------------------------------------------

class PaymentCreate(BaseModel):
    client_id: int
    amount: int = Field(ge=0)
    payment_method: str | None = None
    reference: str | None = None


class PaymentUpdate(BaseModel):
    amount: int | None = None
    payment_method: str | None = None
    reference: str | None = None


class PaymentOut(BaseModel):
    id: int
    client_id: int
    client_name: str
    amount: int
    payment_method: str | None
    reference: str | None
    created_at: datetime
    created_by_id: int | None
    created_by_name: str | None

    model_config = ConfigDict(from_attributes=True)


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
