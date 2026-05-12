"""Payroll application DTOs."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass
class DriverEarningsDTO:
    driver_id: int
    driver_name: str | None
    driver_phone: str | None = None
    start_date: date = date(2000, 1, 1)
    end_date: date = date(2000, 1, 1)
    matched_order_count: int = 0
    total_salary: int = 0      # sum of driver_salary
    total_allowance: int = 0   # sum of allowance
    total_earnings: int = 0    # total_salary + total_allowance
