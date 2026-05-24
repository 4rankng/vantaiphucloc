from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from ._vehicle import VehicleSummaryOut

__all__ = [
    "DriverEarningsOut",
    "DriverBaseSalaryOut",
    "DriverBaseSalarySet",
    "SalaryConfigOut",
    "SalaryConfigUpdate",
    "DriverCreate",
    "DriverOut",
    "JobStatusResponse",
    "SalaryCalculateAsyncResponse",
    "DriverSalaryOut",
    "DriverSalaryUpdateIn",
]


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


class SalaryConfigOut(BaseModel):
    from_day: int
    to_day: int

    model_config = ConfigDict(from_attributes=True)


class SalaryConfigUpdate(BaseModel):
    from_day: int | None = Field(default=None, ge=1, le=31)
    to_day: int | None = Field(default=None, ge=1, le=31)


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


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    result: dict | None = None


class SalaryCalculateAsyncResponse(BaseModel):
    job_id: str
    message: str = "Calculation enqueued"


class DriverSalaryOut(BaseModel):
    id: int
    driver_id: int
    driver_name: str | None = None
    driver_username: str | None = None
    from_date: date
    to_date: date
    basic_salary: int
    bonus_salary: int
    allowance: int
    note: str | None = None


class DriverSalaryUpdateIn(BaseModel):
    basic_salary: int | None = Field(default=None, ge=0)
    allowance: int | None = Field(default=None, ge=0)
    note: str | None = Field(default=None, max_length=500)
