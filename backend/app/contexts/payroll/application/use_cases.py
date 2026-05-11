"""Payroll use cases."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.payroll.application.dto import DriverEarningsDTO
from app.contexts.payroll.domain.repositories import SettingsRepository
from app.models.domain import WorkOrder
from app.models.base import User

_logger = logging.getLogger(__name__)

SALARY_PREFIX = "salary_"

DEFAULTS: dict[str, str] = {
    "salary_from_day": "26",
    "salary_to_day": "25",
}


class GetDriverEarnings:
    """Calculate driver earnings on-the-fly from MATCHED work orders.

    Cross-context read: queries WorkOrder rows from Operations and User
    from Identity directly at the ORM level.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def __call__(
        self, *, driver_id: int, start_date: date, end_date: date
    ) -> DriverEarningsDTO:
        row = (
            await self.session.execute(
                select(
                    func.count(WorkOrder.id),
                    func.coalesce(func.sum(WorkOrder.driver_salary), 0),
                    func.coalesce(func.sum(WorkOrder.allowance), 0),
                ).where(
                    WorkOrder.driver_id == driver_id,
                    WorkOrder.status == "MATCHED",
                    func.coalesce(WorkOrder.trip_date, func.date(WorkOrder.created_at)) >= start_date,
                    func.coalesce(WorkOrder.trip_date, func.date(WorkOrder.created_at)) <= end_date,
                )
            )
        ).one()

        matched_order_count = row[0] or 0
        total_salary = row[1] or 0
        total_allowance = row[2] or 0

        # Look up driver name
        user_row = (
            await self.session.execute(
                select(User.full_name, User.username).where(User.id == driver_id)
            )
        ).one_or_none()
        driver_name = None
        if user_row is not None:
            driver_name = user_row[0] or user_row[1]

        return DriverEarningsDTO(
            driver_id=driver_id,
            driver_name=driver_name,
            start_date=start_date,
            end_date=end_date,
            matched_order_count=matched_order_count,
            total_salary=total_salary,
            total_allowance=total_allowance,
            total_earnings=total_salary + total_allowance,
        )


class GetSalaryConfig:
    """Return all ``salary_*`` settings, filling defaults for missing keys."""

    def __init__(self, repo: SettingsRepository) -> None:
        self.repo = repo

    async def __call__(self) -> dict[str, str]:
        stored = await self.repo.get_many(SALARY_PREFIX)
        return {**DEFAULTS, **stored}


@dataclass
class UpdateSalaryConfigInput:
    from_day: int | None = None
    to_day: int | None = None


class UpdateSalaryConfig:
    """Persist ``salary_from_day`` / ``salary_to_day`` as Setting rows."""

    def __init__(self, repo: SettingsRepository) -> None:
        self.repo = repo

    async def __call__(
        self, payload: UpdateSalaryConfigInput
    ) -> dict[str, str]:
        if payload.from_day is not None:
            await self.repo.set("salary_from_day", str(payload.from_day))
        if payload.to_day is not None:
            await self.repo.set("salary_to_day", str(payload.to_day))
        return await self.repo.get_many(SALARY_PREFIX)
