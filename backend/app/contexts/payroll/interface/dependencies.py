"""FastAPI wiring for the Payroll context."""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.payroll.application import (
    GetDriverEarnings,
    GetSalaryConfig,
    UpdateSalaryConfig,
)
from app.contexts.payroll.domain.repositories import SettingsRepository
from app.contexts.payroll.infrastructure.repositories import SqlSettingsRepository
from app.database import get_db


def get_settings_repository(
    db: AsyncSession = Depends(get_db),
) -> SettingsRepository:
    return SqlSettingsRepository(db)


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
) -> GetDriverEarnings:
    return GetDriverEarnings(db)
