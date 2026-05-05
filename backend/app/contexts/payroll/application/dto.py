"""Payroll application DTOs."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime


@dataclass
class SalaryPeriodDTO:
    id: int
    driver_id: int
    start_date: date
    end_date: date
    work_order_count: int
    price_per_order: int
    total_salary: int
    total_allowance: int
    total_deduction: int
    net_pay: int
    status: str
    created_at: datetime
    updated_at: datetime


@dataclass
class SalaryPeriodPageDTO:
    items: list[SalaryPeriodDTO]
    total: int
    page: int
    page_size: int
