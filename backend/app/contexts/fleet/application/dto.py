"""Application DTOs for Fleet — outbound shapes consumed by the interface layer."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass
class DriverDTO:
    id: int
    username: str
    phone: str | None
    full_name: str | None
    vendor: str | None
    tractor_plate: str | None
    created_at: datetime
    updated_at: datetime


@dataclass
class DriverListDTO:
    items: list[DriverDTO]
    total: int
    page: int
    page_size: int
