"""Fleet HTTP schemas (Pydantic)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DriverCreateIn(BaseModel):
    username: str
    phone: str
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
