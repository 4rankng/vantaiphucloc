"""Pydantic schemas for the Route Pricing interface layer."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.schemas.domain import (
    ClientSummaryOut,
    LocationSummaryOut,
)

OperationTypeLiteral = Literal[
    "XUẤT/NHẬP TÀU",
    "CHUYỂN BÃI",
    "LẤY VỎ HẠ HÀNG",
    "CHẠY SÀ LAN",
    "ĐÓNG KHO",
]


class RoutePricingCreate(BaseModel):
    client_id: int
    pickup_location_id: int
    dropoff_location_id: int
    operation_type: OperationTypeLiteral
    f20_price: int | None = None
    f40_price: int | None = None
    e20_price: int | None = None
    e40_price: int | None = None


class RoutePricingUpdate(BaseModel):
    client_id: int | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    operation_type: OperationTypeLiteral | None = None
    f20_price: int | None = None
    f40_price: int | None = None
    e20_price: int | None = None
    e40_price: int | None = None


class RoutePricingOut(BaseModel):
    id: int
    client: ClientSummaryOut
    pickup_location: LocationSummaryOut
    dropoff_location: LocationSummaryOut
    operation_type: str
    f20_price: int | None = None
    f40_price: int | None = None
    e20_price: int | None = None
    e40_price: int | None = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RoutePricingImportRow(BaseModel):
    client_id: int
    pickup_location_id: int
    dropoff_location_id: int
    operation_type: str
    f20_price: int | None = None
    f40_price: int | None = None
    e20_price: int | None = None
    e40_price: int | None = None


class RoutePricingImportCommit(BaseModel):
    rows: list[RoutePricingImportRow]


class RoutePricingImportResult(BaseModel):
    created: int = 0
    updated: int = 0
    skipped: int = 0
