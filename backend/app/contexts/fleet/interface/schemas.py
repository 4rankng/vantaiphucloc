"""Fleet HTTP schemas (Pydantic)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DriverCreateIn(BaseModel):
    username: str
    phone: str | None = None
    full_name: str | None = None
    password: str | None = None


class DriverResetPasswordIn(BaseModel):
    new_password: str = Field(..., min_length=4)


class DriverOut(BaseModel):
    id: int
    username: str
    full_name: str | None = None
    phone: str | None = None
    vehicle_plate: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
