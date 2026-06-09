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
    base_salary: int = 0       # effective base salary at end_date
    total_salary: int = 0      # sum of driver_salary for MATCHED trips
    unmatched_salary: int = 0  # sum of driver_salary for UNMATCHED trips
    total_allowance: int = 0   # sum of allowance
    total_earnings: int = 0    # base_salary + total_salary + total_allowance


@dataclass
class DriverSalaryConfigDTO:
    id: int
    driver_id: int
    base_salary: int
    effective_from: date
    note: str | None = None
