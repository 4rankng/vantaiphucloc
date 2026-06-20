"""Pydantic schemas for the Vendor Route Pricing interface layer."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas._vendor import VendorSummaryOut
from app.schemas.domain import LocationSummaryOut

WorkTypeLiteral = str  # validated at runtime via validate_work_type()


class VendorRoutePricingCreate(BaseModel):
    vendor_id: int
    pickup_location_id: int
    dropoff_location_id: int
    work_type: WorkTypeLiteral
    f20_price: int | None = None
    f40_price: int | None = None
    e20_price: int | None = None
    e40_price: int | None = None


class VendorRoutePricingUpdate(BaseModel):
    vendor_id: int | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    work_type: WorkTypeLiteral | None = None
    f20_price: int | None = None
    f40_price: int | None = None
    e20_price: int | None = None
    e40_price: int | None = None


class VendorRoutePricingOut(BaseModel):
    id: int
    vendor: VendorSummaryOut
    pickup_location: LocationSummaryOut
    dropoff_location: LocationSummaryOut
    work_type: str
    f20_price: int | None = None
    f40_price: int | None = None
    e20_price: int | None = None
    e40_price: int | None = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VendorRoutePricingImportRow(BaseModel):
    vendor_id: int | None = None
    vendor_raw: str | None = None
    pickup_location_id: int | None = None
    pickup_raw: str | None = None
    dropoff_location_id: int | None = None
    dropoff_raw: str | None = None
    work_type: str | None = None
    f20_price: int | None = None
    f40_price: int | None = None
    e20_price: int | None = None
    e40_price: int | None = None


class VendorRoutePricingImportCommit(BaseModel):
    rows: list[VendorRoutePricingImportRow]


class VendorRoutePricingImportResult(BaseModel):
    created: int = 0
    updated: int = 0
    skipped: int = 0
    created_vendors: int = 0
    created_locations: int = 0
