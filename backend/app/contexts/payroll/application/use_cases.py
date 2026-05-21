"""Payroll use cases."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.payroll.application.dto import (
    DriverEarningsDTO,
    DriverSalaryConfigDTO,
)
from app.contexts.payroll.domain.base_salary import (
    DriverSalaryConfig,
    effective_base_salary,
)
from app.contexts.payroll.domain.repositories import (
    DriverSalaryConfigRepository,
    SettingsRepository,
)
from app.models.domain import BookedTrip, BookedTripContainer, DeliveredTrip
from app.models.base import User

_logger = logging.getLogger(__name__)

SALARY_PREFIX = "salary_"

DEFAULTS: dict[str, str] = {
    "salary_from_day": "26",
    "salary_to_day": "25",
}


class GetDriverEarnings:
    """Calculate driver earnings on-the-fly from MATCHED work orders.

    Cross-context read: queries DeliveredTrip rows from Operations and User
    from Identity directly at the ORM level. Base salary is layered on
    top via :class:`DriverSalaryConfigRepository` (latest rate effective
    at *end_date*).
    """

    def __init__(
        self,
        session: AsyncSession,
        base_salary_repo: DriverSalaryConfigRepository | None = None,
    ) -> None:
        self.session = session
        self.base_salary_repo = base_salary_repo

    async def __call__(
        self, *, driver_id: int, start_date: date, end_date: date
    ) -> DriverEarningsDTO:
        row = (
            await self.session.execute(
                select(
                    func.count(DeliveredTrip.id),
                    func.coalesce(func.sum(DeliveredTrip.driver_salary), 0),
                    func.coalesce(func.sum(DeliveredTrip.allowance), 0),
                ).where(
                    DeliveredTrip.driver_id == driver_id,
                    DeliveredTrip.status == "MATCHED",
                    func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)) >= start_date,
                    func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)) <= end_date,
                )
            )
        ).one()

        matched_order_count = row[0] or 0
        total_salary = row[1] or 0
        total_allowance = row[2] or 0

        # Look up driver name and phone
        user_row = (
            await self.session.execute(
                select(User.full_name, User.username, User.phone).where(User.id == driver_id)
            )
        ).one_or_none()
        driver_name = None
        driver_phone = None
        if user_row is not None:
            driver_name = user_row[0] or user_row[1]
            driver_phone = user_row[2]

        # Base salary: take the rate effective at end_date. No pro-rating.
        base_salary = 0
        if self.base_salary_repo is not None:
            cfg = await self.base_salary_repo.latest_at_or_before(driver_id, end_date)
            if cfg is not None:
                base_salary = cfg.base_salary

        return DriverEarningsDTO(
            driver_id=driver_id,
            driver_name=driver_name,
            driver_phone=driver_phone,
            start_date=start_date,
            end_date=end_date,
            matched_order_count=matched_order_count,
            base_salary=base_salary,
            total_salary=total_salary,
            total_allowance=total_allowance,
            total_earnings=base_salary + total_salary + total_allowance,
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


# ---------------------------------------------------------------------------
# Base salary use cases
# ---------------------------------------------------------------------------


def _to_dto(cfg: DriverSalaryConfig) -> DriverSalaryConfigDTO:
    return DriverSalaryConfigDTO(
        id=cfg.id,
        driver_id=cfg.driver_id,
        base_salary=cfg.base_salary,
        effective_from=cfg.effective_from,
        note=cfg.note,
    )


class ListDriverBaseSalaryHistory:
    """Return the append-only history of a driver's base salary rates."""

    def __init__(self, repo: DriverSalaryConfigRepository) -> None:
        self.repo = repo

    async def __call__(self, *, driver_id: int) -> list[DriverSalaryConfigDTO]:
        history = await self.repo.list_for_driver(driver_id)
        return [_to_dto(c) for c in history]


@dataclass
class SetDriverBaseSalaryInput:
    driver_id: int
    base_salary: int
    effective_from: date
    note: str | None = None
    created_by: int | None = None


class SetDriverBaseSalary:
    """Add (or update) a base salary entry for a driver.

    Idempotent on ``(driver_id, effective_from)``: re-submitting the same
    effective date overwrites the existing row's amount and note.
    """

    def __init__(self, repo: DriverSalaryConfigRepository) -> None:
        self.repo = repo

    async def __call__(
        self, payload: SetDriverBaseSalaryInput
    ) -> DriverSalaryConfigDTO:
        if payload.base_salary < 0:
            raise ValueError("base_salary must be non-negative")
        cfg = await self.repo.add(
            driver_id=payload.driver_id,
            base_salary=payload.base_salary,
            effective_from=payload.effective_from,
            note=payload.note,
            created_by=payload.created_by,
        )
        return _to_dto(cfg)


# ---------------------------------------------------------------------------
# P&L (Doanh thu & Lãi) dashboard
# ---------------------------------------------------------------------------


@dataclass
class ClientRevenueBreakdownDTO:
    client_id: int
    client_name: str
    matched_trip_count: int
    revenue: int


@dataclass
class MonthlyPnLDTO:
    start_date: date
    end_date: date
    revenue: int
    total_productivity_salary: int  # Σ DeliveredTrip.driver_salary
    total_allowance: int            # Σ DeliveredTrip.allowance
    total_base_salary: int          # Σ effective base salary per driver
    total_vehicle_expenses: int     # Fuel + Repairs + Law + Other
    profit: int                     # revenue − all costs
    matched_trip_count: int
    client_breakdown: list[ClientRevenueBreakdownDTO]


class GetMonthlyPnL:
    """Compute revenue, total wages, and profit for an accounting period.

    Revenue counts every MATCHED ``BookedTrip`` whose ``trip_date`` falls
    within ``[start_date, end_date]``. Each trip contributes
    its ``revenue`` field.

    Costs are summed across all DeliveredTrips matched in the period:
      * productivity salary (``DeliveredTrip.driver_salary``)
      * allowance (``DeliveredTrip.allowance``)
      * base salary — for every driver who has any MATCHED DeliveredTrip in
        the period, take the rate effective at ``end_date``. Drivers
        without a base salary configured contribute 0.

    Profit = revenue − (productivity + allowance + base + vehicle_expenses).
    """

    def __init__(
        self,
        session: AsyncSession,
        base_salary_repo: DriverSalaryConfigRepository,
    ) -> None:
        self.session = session
        self.base_salary_repo = base_salary_repo

    async def __call__(
        self, *, start_date: date, end_date: date
    ) -> MonthlyPnLDTO:
        # ---- Revenue: Σ revenue over MATCHED TOs ----
        per_to_rows = (
            await self.session.execute(
                select(
                    BookedTrip.id,
                    BookedTrip.client_id,
                    BookedTrip.revenue,
                    func.count(BookedTripContainer.id),
                )
                .join(
                    BookedTripContainer,
                    BookedTripContainer.booked_trip_id == BookedTrip.id,
                    isouter=True,
                )
                .where(
                    BookedTrip.status == "MATCHED",
                    BookedTrip.trip_date >= start_date,
                    BookedTrip.trip_date <= end_date,
                )
                .group_by(BookedTrip.id, BookedTrip.client_id, BookedTrip.revenue)
            )
        ).all()

        revenue = 0
        per_client: dict[int, dict] = {}
        for to_id, client_id, to_revenue, container_count in per_to_rows:
            line = int(to_revenue or 0)
            revenue += line
            slot = per_client.setdefault(
                client_id,
                {"trip_count": 0, "revenue": 0},
            )
            slot["trip_count"] += 1
            slot["revenue"] += line

        matched_trip_count = len(per_to_rows)

        # Resolve partner names for the breakdown.
        from app.models.domain import Client

        client_rows = []
        if per_client:
            client_rows = (
                await self.session.execute(
                    select(Client.id, Client.name).where(
                        Client.id.in_(list(per_client.keys()))
                    )
                )
            ).all()
        client_names = {cid: cname for cid, cname in client_rows}

        client_breakdown = [
            ClientRevenueBreakdownDTO(
                client_id=cid,
                client_name=client_names.get(cid, f"#{cid}"),
                matched_trip_count=slot["trip_count"],
                revenue=slot["revenue"],
            )
            for cid, slot in sorted(
                per_client.items(), key=lambda kv: kv[1]["revenue"], reverse=True
            )
        ]

        # ---- Productivity & allowance: Σ over MATCHED WOs in period ----
        wage_row = (
            await self.session.execute(
                select(
                    func.coalesce(func.sum(DeliveredTrip.driver_salary), 0),
                    func.coalesce(func.sum(DeliveredTrip.allowance), 0),
                ).where(
                    DeliveredTrip.status == "MATCHED",
                    func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at))
                    >= start_date,
                    func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at))
                    <= end_date,
                )
            )
        ).one()
        total_productivity = int(wage_row[0] or 0)
        total_allowance = int(wage_row[1] or 0)

        # ---- Base salary: distinct drivers with MATCHED WOs in period ----
        driver_id_rows = (
            await self.session.execute(
                select(DeliveredTrip.driver_id)
                .where(
                    DeliveredTrip.status == "MATCHED",
                    func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at))
                    >= start_date,
                    func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at))
                    <= end_date,
                )
                .distinct()
            )
        ).scalars().all()
        driver_ids = [d for d in driver_id_rows if d is not None]

        history_by_driver = await self.base_salary_repo.list_history_for_drivers(
            driver_ids
        )
        total_base_salary = sum(
            effective_base_salary(history_by_driver.get(did, []), end_date)
            for did in driver_ids
        )

        # ---- Vehicle expenses in period ----
        from app.models.domain import VehicleExpense  # local import avoids cycles

        ve_rows = (
            await self.session.execute(
                select(
                    func.coalesce(func.sum(VehicleExpense.amount), 0),
                ).where(
                    VehicleExpense.expense_date >= start_date,
                    VehicleExpense.expense_date <= end_date,
                )
            )
        ).one()
        total_vehicle_expenses = int(ve_rows[0] or 0)

        profit = revenue - (
            total_productivity + total_allowance + total_base_salary
            + total_vehicle_expenses
        )

        return MonthlyPnLDTO(
            start_date=start_date,
            end_date=end_date,
            revenue=revenue,
            total_productivity_salary=total_productivity,
            total_allowance=total_allowance,
            total_base_salary=total_base_salary,
            total_vehicle_expenses=total_vehicle_expenses,
            profit=profit,
            matched_trip_count=matched_trip_count,
            client_breakdown=client_breakdown,
        )
