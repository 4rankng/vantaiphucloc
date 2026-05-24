"""Domain entity for per-driver, per-period salary record."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass
class DriverSalaryRecord:
    id: int | None
    driver_id: int
    from_date: date
    to_date: date
    basic_salary: int
    bonus_salary: int
    allowance: int = 0
    note: str | None = None
