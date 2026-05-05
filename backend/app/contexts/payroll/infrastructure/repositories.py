"""SQL implementations of Payroll repositories."""

from __future__ import annotations

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.payroll.domain.entities import (
    SalaryPeriod,
    SalaryPeriodConfig,
)
from app.contexts.payroll.domain.repositories import (
    SalaryPeriodConfigRepository,
    SalaryPeriodFilter,
    SalaryPeriodPage,
    SalaryPeriodRepository,
)
from app.contexts.payroll.domain.value_objects import (
    DriverId,
    SalaryPeriodId,
    SalaryStatus,
)
from app.contexts.payroll.infrastructure.mappers import (
    config_to_domain,
    period_to_domain,
)
from app.contexts.payroll.infrastructure.orm import (
    SalaryPeriodConfigORM,
    SalaryPeriodORM,
)


class SqlSalaryPeriodRepository(SalaryPeriodRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, period_id: SalaryPeriodId) -> SalaryPeriod | None:
        row = (
            await self.session.execute(
                select(SalaryPeriodORM).where(SalaryPeriodORM.id == period_id)
            )
        ).scalar_one_or_none()
        return period_to_domain(row) if row else None

    async def find_by_driver_and_dates(
        self, *, driver_id: DriverId, start_date: date, end_date: date
    ) -> SalaryPeriod | None:
        row = (
            await self.session.execute(
                select(SalaryPeriodORM).where(
                    SalaryPeriodORM.driver_id == driver_id,
                    SalaryPeriodORM.start_date == start_date,
                    SalaryPeriodORM.end_date == end_date,
                )
            )
        ).scalar_one_or_none()
        return period_to_domain(row) if row else None

    async def list_paged(
        self,
        *,
        filter_: SalaryPeriodFilter,
        page: int,
        page_size: int,
    ) -> SalaryPeriodPage:
        base = select(SalaryPeriodORM)
        count_q = select(func.count(SalaryPeriodORM.id))
        if filter_.driver_id is not None:
            base = base.where(SalaryPeriodORM.driver_id == filter_.driver_id)
            count_q = count_q.where(
                SalaryPeriodORM.driver_id == filter_.driver_id
            )
        if filter_.active_only:
            base = base.where(SalaryPeriodORM.work_order_count > 0)
            count_q = count_q.where(SalaryPeriodORM.work_order_count > 0)
        total = (await self.session.execute(count_q)).scalar() or 0
        rows = (
            await self.session.execute(
                base.order_by(SalaryPeriodORM.id.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).scalars().all()
        return SalaryPeriodPage(
            items=[period_to_domain(r) for r in rows], total=total
        )

    async def list_for_period(
        self, *, start_date: date, end_date: date, active_only: bool = True
    ) -> list[SalaryPeriod]:
        q = select(SalaryPeriodORM).where(
            SalaryPeriodORM.start_date == start_date,
            SalaryPeriodORM.end_date == end_date,
        )
        if active_only:
            q = q.where(SalaryPeriodORM.work_order_count > 0)
        rows = (
            await self.session.execute(q.order_by(SalaryPeriodORM.driver_id))
        ).scalars().all()
        return [period_to_domain(r) for r in rows]

    async def upsert(self, period: SalaryPeriod) -> SalaryPeriod:
        if period.id is None:
            row = SalaryPeriodORM(
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
            )
            self.session.add(row)
        else:
            row = await self.session.get(SalaryPeriodORM, period.id)
            if row is None:
                raise ValueError(f"SalaryPeriod {period.id} disappeared")
            row.work_order_count = period.work_order_count
            row.price_per_order = period.price_per_order
            row.total_salary = period.total_salary
            row.total_allowance = period.total_allowance
            row.total_deduction = period.total_deduction
            row.net_pay = period.net_pay
            row.status = str(period.status)
        await self.session.commit()
        await self.session.refresh(row)
        return period_to_domain(row)

    async def update(self, period: SalaryPeriod) -> SalaryPeriod:
        if period.id is None:
            raise ValueError("Cannot update unsaved SalaryPeriod")
        row = await self.session.get(SalaryPeriodORM, period.id)
        if row is None:
            raise ValueError(f"SalaryPeriod {period.id} not found")
        row.work_order_count = period.work_order_count
        row.price_per_order = period.price_per_order
        row.total_salary = period.total_salary
        row.total_allowance = period.total_allowance
        row.total_deduction = period.total_deduction
        row.net_pay = period.net_pay
        row.status = str(period.status)
        await self.session.commit()
        await self.session.refresh(row)
        return period_to_domain(row)


class SqlSalaryPeriodConfigRepository(SalaryPeriodConfigRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_current(self) -> SalaryPeriodConfig | None:
        row = (
            await self.session.execute(
                select(SalaryPeriodConfigORM).limit(1)
            )
        ).scalar_one_or_none()
        return config_to_domain(row) if row else None

    async def upsert(
        self, config: SalaryPeriodConfig
    ) -> SalaryPeriodConfig:
        if config.id is None:
            row = SalaryPeriodConfigORM(
                from_day=config.from_day,
                to_day=config.to_day,
            )
            self.session.add(row)
        else:
            row = await self.session.get(SalaryPeriodConfigORM, config.id)
            if row is None:
                raise ValueError(f"SalaryPeriodConfig {config.id} disappeared")
            row.from_day = config.from_day
            row.to_day = config.to_day
        await self.session.commit()
        await self.session.refresh(row)
        return config_to_domain(row)
