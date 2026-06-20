"""FastAPI wiring for the Payroll context."""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.payroll.application import (
    GetDriverEarnings,
    GetMonthlyPnL,
    GetSalaryConfig,
    ListDriverBaseSalaryHistory,
    SetDriverBaseSalary,
    UpdateSalaryConfig,
)
from app.contexts.payroll.domain.repositories import (
    DriverSalaryConfigRepository,
    DriverSalaryRepository,
    SettingsRepository,
)
from app.contexts.payroll.infrastructure.repositories import (
    SqlDriverSalaryConfigRepository,
    SqlDriverSalaryRepository,
    SqlSettingsRepository,
)
from app.database import get_db


def get_settings_repository(
    db: AsyncSession = Depends(get_db),
) -> SettingsRepository:
    return SqlSettingsRepository(db)


def get_driver_salary_config_repository(
    db: AsyncSession = Depends(get_db),
) -> DriverSalaryConfigRepository:
    return SqlDriverSalaryConfigRepository(db)


def get_driver_salary_repository(
    db: AsyncSession = Depends(get_db),
) -> DriverSalaryRepository:
    return SqlDriverSalaryRepository(db)


def get_get_salary_config(
    repo: SettingsRepository = Depends(get_settings_repository),
) -> GetSalaryConfig:
    return GetSalaryConfig(repo)


def get_update_salary_config(
    repo: SettingsRepository = Depends(get_settings_repository),
) -> UpdateSalaryConfig:
    return UpdateSalaryConfig(repo)


def get_driver_earnings(
    db: AsyncSession = Depends(get_db),
    base_salary_repo: DriverSalaryConfigRepository = Depends(
        get_driver_salary_config_repository
    ),
    driver_salary_repo: DriverSalaryRepository = Depends(get_driver_salary_repository),
) -> GetDriverEarnings:
    return GetDriverEarnings(
        db,
        base_salary_repo=base_salary_repo,
        driver_salary_repo=driver_salary_repo,
    )


def get_list_driver_base_salary_history(
    repo: DriverSalaryConfigRepository = Depends(get_driver_salary_config_repository),
) -> ListDriverBaseSalaryHistory:
    return ListDriverBaseSalaryHistory(repo)


def get_set_driver_base_salary(
    repo: DriverSalaryConfigRepository = Depends(get_driver_salary_config_repository),
) -> SetDriverBaseSalary:
    return SetDriverBaseSalary(repo)


def get_monthly_pnl(
    db: AsyncSession = Depends(get_db),
    base_salary_repo: DriverSalaryConfigRepository = Depends(
        get_driver_salary_config_repository
    ),
    driver_salary_repo: DriverSalaryRepository = Depends(get_driver_salary_repository),
) -> GetMonthlyPnL:
    return GetMonthlyPnL(
        db,
        base_salary_repo=base_salary_repo,
        driver_salary_repo=driver_salary_repo,
    )
