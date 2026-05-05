"""ORM re-exports for Payroll."""

from __future__ import annotations

from app.models.domain import (
    SalaryPeriod as SalaryPeriodORM,
    SalaryPeriodConfig as SalaryPeriodConfigORM,
)

__all__ = ["SalaryPeriodORM", "SalaryPeriodConfigORM"]
