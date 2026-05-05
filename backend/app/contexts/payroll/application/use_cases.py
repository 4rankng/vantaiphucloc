"""Payroll use cases."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.payroll.application.dto import (
    SalaryPeriodDTO,
    SalaryPeriodPageDTO,
)
from app.contexts.payroll.domain.entities import (
    SalaryPeriod,
    SalaryPeriodConfig,
)
from app.contexts.payroll.domain.exceptions import SalaryPeriodNotFound
from app.contexts.payroll.domain.repositories import (
    SalaryPeriodConfigRepository,
    SalaryPeriodFilter,
    SalaryPeriodRepository,
)
from app.contexts.payroll.domain.value_objects import SalaryStatus
from app.models.domain import WorkOrder

_logger = logging.getLogger(__name__)


def _to_dto(period: SalaryPeriod) -> SalaryPeriodDTO:
    return SalaryPeriodDTO(
        id=period.id or 0,
        driver_id=period.driver_id,
        start_date=period.start_date,
        end_date=period.end_date,
        work_order_count=period.work_order_count,
        price_per_order=period.price_per_order,
        total_salary=period.total_salary,
        total_allowance=period.total_allowance,
        total_deduction=period.total_deduction,
        net_pay=period.net_pay,
        status=str(period.status),
        created_at=period.created_at,
        updated_at=period.updated_at,
    )


@dataclass
class ListSalaryPeriodsQuery:
    driver_id: int | None = None
    active_only: bool = False
    page: int = 1
    page_size: int = 50


class ListSalaryPeriods:
    def __init__(self, repo: SalaryPeriodRepository) -> None:
        self.repo = repo

    async def __call__(
        self, query: ListSalaryPeriodsQuery
    ) -> SalaryPeriodPageDTO:
        result = await self.repo.list_paged(
            filter_=SalaryPeriodFilter(
                driver_id=query.driver_id,
                active_only=query.active_only,
            ),
            page=query.page,
            page_size=query.page_size,
        )
        return SalaryPeriodPageDTO(
            items=[_to_dto(p) for p in result.items],
            total=result.total,
            page=query.page,
            page_size=query.page_size,
        )


class ListSalaryPeriodsForDateRange:
    def __init__(self, repo: SalaryPeriodRepository) -> None:
        self.repo = repo

    async def __call__(
        self, *, start_date: date, end_date: date, active_only: bool = True
    ) -> list[SalaryPeriodDTO]:
        rows = await self.repo.list_for_period(
            start_date=start_date,
            end_date=end_date,
            active_only=active_only,
        )
        return [_to_dto(p) for p in rows]


@dataclass
class UpdateSalaryPeriodInput:
    period_id: int
    work_order_count: int | None = None
    price_per_order: int | None = None
    total_salary: int | None = None
    total_allowance: int | None = None
    total_deduction: int | None = None
    net_pay: int | None = None
    status: str | None = None


class UpdateSalaryPeriod:
    def __init__(self, repo: SalaryPeriodRepository) -> None:
        self.repo = repo

    async def __call__(
        self, payload: UpdateSalaryPeriodInput
    ) -> SalaryPeriodDTO:
        period = await self.repo.get(payload.period_id)
        if period is None:
            raise SalaryPeriodNotFound(
                f"Salary period {payload.period_id} not found"
            )
        if payload.work_order_count is not None:
            period.work_order_count = payload.work_order_count
        if payload.price_per_order is not None:
            period.price_per_order = payload.price_per_order
        if payload.total_salary is not None:
            period.total_salary = payload.total_salary
        if payload.total_allowance is not None:
            period.total_allowance = payload.total_allowance
        if payload.total_deduction is not None:
            period.total_deduction = payload.total_deduction
        if payload.net_pay is not None:
            period.net_pay = payload.net_pay
        if payload.status is not None:
            period.status = SalaryStatus(payload.status)
        updated = await self.repo.update(period)
        return _to_dto(updated)


class GetOrCreateSalaryConfig:
    def __init__(self, repo: SalaryPeriodConfigRepository) -> None:
        self.repo = repo

    async def __call__(self) -> SalaryPeriodConfig:
        config = await self.repo.get_current()
        if config is None:
            config = await self.repo.upsert(
                SalaryPeriodConfig(id=None, from_day=1, to_day=31)
            )
        return config


@dataclass
class UpdateSalaryConfigInput:
    from_day: int | None = None
    to_day: int | None = None


class UpdateSalaryConfig:
    def __init__(self, repo: SalaryPeriodConfigRepository) -> None:
        self.repo = repo

    async def __call__(
        self, payload: UpdateSalaryConfigInput
    ) -> SalaryPeriodConfig:
        current = await self.repo.get_current()
        if current is None:
            new = SalaryPeriodConfig(
                id=None,
                from_day=payload.from_day or 1,
                to_day=payload.to_day or 28,
            )
        else:
            current.from_day = (
                payload.from_day if payload.from_day is not None else current.from_day
            )
            current.to_day = (
                payload.to_day if payload.to_day is not None else current.to_day
            )
            new = current
        return await self.repo.upsert(new)


class CalculateSalary:
    """Calculate one driver's salary period from MATCHED/COMPLETED work orders.

    Cross-context read: needs WorkOrder rows from Operations. We reach
    directly into the ORM here because it's a worker-side aggregate roll-up
    (running outside the request cycle).
    """

    def __init__(
        self,
        session: AsyncSession,
        repo: SalaryPeriodRepository,
    ) -> None:
        self.session = session
        self.repo = repo

    async def __call__(
        self, *, driver_id: int, start_date: date, end_date: date
    ) -> int:
        start_dt = datetime(
            start_date.year, start_date.month, start_date.day, tzinfo=timezone.utc
        )
        end_dt = (
            datetime(
                end_date.year, end_date.month, end_date.day, tzinfo=timezone.utc
            )
            + timedelta(days=1)
        )
        result = await self.session.execute(
            select(WorkOrder).where(
                WorkOrder.driver_id == driver_id,
                WorkOrder.status.in_(["MATCHED", "COMPLETED"]),
                WorkOrder.created_at >= start_dt,
                WorkOrder.created_at < end_dt,
            )
        )
        work_orders = result.scalars().all()
        total_salary = sum(wo.driver_salary or 0 for wo in work_orders)
        total_allowance = sum(wo.allowance or 0 for wo in work_orders)
        total_deduction = 0

        existing = await self.repo.find_by_driver_and_dates(
            driver_id=driver_id,
            start_date=start_date,
            end_date=end_date,
        )
        if existing is None:
            period = SalaryPeriod(
                id=None,
                driver_id=driver_id,
                start_date=start_date,
                end_date=end_date,
            )
        else:
            period = existing
        period.recalculate(
            work_order_count=len(work_orders),
            total_salary=total_salary,
            total_allowance=total_allowance,
            total_deduction=total_deduction,
        )
        saved = await self.repo.upsert(period)
        _logger.info(
            "Salary period %s calculated for driver=%s: %d orders, salary=%d",
            saved.id,
            driver_id,
            len(work_orders),
            total_salary,
        )
        return saved.id or 0
