"""Pydantic schemas for the Route Pricing interface layer."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.domain import (
    ClientSummaryOut,
    LocationSummaryOut,
)

WorkTypeLiteral = str  # validated at runtime via validate_work_type()


class RoutePricingCreate(BaseModel):
    client_id: int
    pickup_location_id: int
    dropoff_location_id: int
    work_type: WorkTypeLiteral
    f20_price: int | None = None
    f40_price: int | None = None
    e20_price: int | None = None
    e40_price: int | None = None
    f20_driver_salary: int | None = None
    f40_driver_salary: int | None = None
    e20_driver_salary: int | None = None
    e40_driver_salary: int | None = None


class RoutePricingUpdate(BaseModel):
    client_id: int | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    work_type: WorkTypeLiteral | None = None
    f20_price: int | None = None
    f40_price: int | None = None
    e20_price: int | None = None
    e40_price: int | None = None
    f20_driver_salary: int | None = None
    f40_driver_salary: int | None = None
    e20_driver_salary: int | None = None
    e40_driver_salary: int | None = None


class RoutePricingOut(BaseModel):
    id: int
    client: ClientSummaryOut
    pickup_location: LocationSummaryOut
    dropoff_location: LocationSummaryOut
    work_type: str
    f20_price: int | None = None
    f40_price: int | None = None
    e20_price: int | None = None
    e40_price: int | None = None
    f20_driver_salary: int | None = None
    f40_driver_salary: int | None = None
    e20_driver_salary: int | None = None
    e40_driver_salary: int | None = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RoutePricingImportRow(BaseModel):
    client_id: int | None = None
    client_raw: str | None = None
    pickup_location_id: int | None = None
    pickup_raw: str | None = None
    dropoff_location_id: int | None = None
    dropoff_raw: str | None = None
    work_type: str | None = None
    f_20_price: int | None = None
    f_40_price: int | None = None
    e_20_price: int | None = None
    e_40_price: int | None = None
    f_20_driver_salary: int | None = None
    f_40_driver_salary: int | None = None
    e_20_driver_salary: int | None = None
    e_40_driver_salary: int | None = None


class RoutePricingImportCommit(BaseModel):
    rows: list[RoutePricingImportRow]


class RoutePricingImportResult(BaseModel):
    created: int = 0
    updated: int = 0
    skipped: int = 0
    created_clients: int = 0
    created_locations: int = 0
