"""Payroll value objects."""

from __future__ import annotations

from enum import StrEnum


class SalaryStatus(StrEnum):
    OPEN = "OPEN"
    CALCULATED = "CALCULATED"
    PAID = "PAID"


SalaryPeriodId = int
DriverId = int
