"""Payroll application DTOs."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass
class DriverEarningsDTO:
    driver_id: int
    driver_name: str | None
    start_date: date
    end_date: date
    matched_order_count: int
    total_salary: int      # sum of driver_salary
    total_allowance: int   # sum of allowance
    total_earnings: int    # total_salary + total_allowance
