from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

__all__ = [
    "VehicleCreate",
    "VehicleOut",
    "VehicleSummaryOut",
    "VEHICLE_EXPENSE_CATEGORIES",
    "VehicleExpenseCreate",
    "VehicleExpenseUpdate",
    "VehicleExpenseOut",
    "VehicleDriverCreate",
    "VehicleDriverOut",
]


class VehicleCreate(BaseModel):
    plate: str
    driver_id: int | None = None
    vendor_id: int | None = None


class VehicleOut(BaseModel):
    id: int
    plate: str
    driver_id: int | None = None
    vendor_id: int | None = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VehicleSummaryOut(BaseModel):
    id: int
    plate: str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# VehicleExpense (CP Xe)
# ---------------------------------------------------------------------------

VEHICLE_EXPENSE_CATEGORIES = {"XANG_DAU", "SUA_CHUA", "TIEN_LUAT", "KHAC"}


class VehicleExpenseCreate(BaseModel):
    vehicle_id: int
    category: str = Field(..., pattern="^(XANG_DAU|SUA_CHUA|TIEN_LUAT|KHAC)$")
    amount: int = Field(..., gt=0, description="Amount in VND")
    expense_date: date
    description: str | None = Field(default=None, max_length=500)
    receipt_url: str | None = Field(default=None, max_length=1000)


class VehicleExpenseUpdate(BaseModel):
    vehicle_id: int | None = None
    category: str | None = Field(default=None, pattern="^(XANG_DAU|SUA_CHUA|TIEN_LUAT|KHAC)$")
    amount: int | None = Field(default=None, gt=0)
    expense_date: date | None = None
    description: str | None = Field(default=None, max_length=500)
    receipt_url: str | None = Field(default=None, max_length=1000)


class VehicleExpenseOut(BaseModel):
    id: int
    vehicle_id: int
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
