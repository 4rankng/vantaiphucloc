"""Mappers between Payroll domain and persistence."""

from __future__ import annotations

from app.contexts.payroll.domain.entities import (
    SalaryPeriod,
    SalaryPeriodConfig,
)
from app.contexts.payroll.domain.value_objects import SalaryStatus
from app.contexts.payroll.infrastructure.orm import (
    SalaryPeriodConfigORM,
    SalaryPeriodORM,
)


def period_to_domain(row: SalaryPeriodORM) -> SalaryPeriod:
    return SalaryPeriod(
        id=row.id,
        driver_id=row.driver_id,
        start_date=row.start_date,
        end_date=row.end_date,
        work_order_count=row.work_order_count,
        price_per_order=row.price_per_order,
        total_salary=row.total_salary,
        total_allowance=row.total_allowance,
        total_deduction=row.total_deduction,
        net_pay=row.net_pay,
        status=SalaryStatus(row.status),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def config_to_domain(row: SalaryPeriodConfigORM) -> SalaryPeriodConfig:
    return SalaryPeriodConfig(
        id=row.id,
        from_day=row.from_day,
        to_day=row.to_day,
        updated_at=row.updated_at,
    )
