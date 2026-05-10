"""Fleet HTTP schemas (Pydantic)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DriverCreateIn(BaseModel):
    username: str
    phone: str
    full_name: str | None = None
    tractor_plate: str | None = None
    vendor: str | None = None  # defaults to "TTransport" if omitted


class DriverOut(BaseModel):
    id: int
    username: str
    full_name: str | None = None
    phone: str | None = None
    tractor_plate: str | None = None
    vendor: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
