"""FastAPI wiring for the Payroll context."""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.payroll.application import (
    GetOrCreateSalaryConfig,
    ListSalaryPeriods,
    ListSalaryPeriodsForDateRange,
    UpdateSalaryConfig,
    UpdateSalaryPeriod,
)
from app.contexts.payroll.domain.repositories import (
    SalaryPeriodConfigRepository,
    SalaryPeriodRepository,
)
from app.contexts.payroll.infrastructure.repositories import (
    SqlSalaryPeriodConfigRepository,
    SqlSalaryPeriodRepository,
)
from app.database import get_db


def get_salary_period_repository(
    db: AsyncSession = Depends(get_db),
) -> SalaryPeriodRepository:
    return SqlSalaryPeriodRepository(db)


def get_salary_config_repository(
    db: AsyncSession = Depends(get_db),
) -> SalaryPeriodConfigRepository:
    return SqlSalaryPeriodConfigRepository(db)


def get_list_salary_periods(
    repo: SalaryPeriodRepository = Depends(get_salary_period_repository),
) -> ListSalaryPeriods:
    return ListSalaryPeriods(repo)


def get_list_salary_periods_for_range(
    repo: SalaryPeriodRepository = Depends(get_salary_period_repository),
) -> ListSalaryPeriodsForDateRange:
    return ListSalaryPeriodsForDateRange(repo)


def get_update_salary_period(
    repo: SalaryPeriodRepository = Depends(get_salary_period_repository),
) -> UpdateSalaryPeriod:
    return UpdateSalaryPeriod(repo)


def get_or_create_salary_config(
    repo: SalaryPeriodConfigRepository = Depends(get_salary_config_repository),
) -> GetOrCreateSalaryConfig:
    return GetOrCreateSalaryConfig(repo)


def get_update_salary_config(
    repo: SalaryPeriodConfigRepository = Depends(get_salary_config_repository),
) -> UpdateSalaryConfig:
    return UpdateSalaryConfig(repo)
