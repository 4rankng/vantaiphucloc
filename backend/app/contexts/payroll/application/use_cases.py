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
from app.contexts.payroll.domain.driver_salary import DriverSalaryRecord
from app.contexts.payroll.domain.repositories import (
    DriverSalaryConfigRepository,
    DriverSalaryRepository,
    SettingsRepository,
)
from app.models.domain import DeliveredTrip
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
    from Identity directly at the ORM level.

    Salary is resolved from the ``driver_salaries`` table when a record
    exists for the requested period. Falls back to computing from
    ``driver_salary_configs`` + trip aggregation when no record exists.
    """

    def __init__(
        self,
        session: AsyncSession,
        base_salary_repo: DriverSalaryConfigRepository | None = None,
        driver_salary_repo: DriverSalaryRepository | None = None,
    ) -> None:
        self.session = session
        self.base_salary_repo = base_salary_repo
        self.driver_salary_repo = driver_salary_repo

    async def __call__(
        self, *, driver_id: int, start_date: date, end_date: date
    ) -> DriverEarningsDTO:
        # Trip counts and driver_salary sum (no allowance column on trips)
        row = (
            await self.session.execute(
                select(
                    func.count(DeliveredTrip.id),
                    func.coalesce(func.sum(DeliveredTrip.driver_salary), 0),
                ).where(
                    DeliveredTrip.driver_id == driver_id,
                    DeliveredTrip.booked_trip_id.isnot(None),
                    func.coalesce(
                        DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)
                    )
                    >= start_date,
                    func.coalesce(
                        DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)
                    )
                    <= end_date,
                )
            )
        ).one()

        matched_order_count = row[0] or 0
        total_salary = row[1] or 0

        # Unmatched trip salary
        unmatched_row = (
            await self.session.execute(
                select(
                    func.coalesce(func.sum(DeliveredTrip.driver_salary), 0),
                ).where(
                    DeliveredTrip.driver_id == driver_id,
                    DeliveredTrip.booked_trip_id.is_(None),
                    func.coalesce(
                        DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)
                    )
                    >= start_date,
                    func.coalesce(
                        DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)
                    )
                    <= end_date,
                )
            )
        ).one()
        unmatched_salary = unmatched_row[0] or 0

        # Look up driver name and phone
        user_row = (
            await self.session.execute(
                select(User.full_name, User.username, User.phone).where(
                    User.id == driver_id
                )
            )
        ).one_or_none()
        driver_name = None
        driver_phone = None
        if user_row is not None:
            driver_name = user_row[0] or user_row[1]
            driver_phone = user_row[2]

        # Try driver_salaries table first (source of truth when present).
        base_salary = 0
        total_allowance = 0
        salary_record: DriverSalaryRecord | None = None
        if self.driver_salary_repo is not None:
            salary_record = await self.driver_salary_repo.get_for_period(
                driver_id, start_date, end_date
            )

        if salary_record is not None:
            base_salary = salary_record.basic_salary
            total_allowance = salary_record.allowance
            # bonus_salary is always computed from trips (total_salary above)
        elif self.base_salary_repo is not None:
            # Fallback: read base_salary from driver_salary_configs
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
            unmatched_salary=unmatched_salary,
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

    async def __call__(self, payload: UpdateSalaryConfigInput) -> dict[str, str]:
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
    total_allowance: int  # Σ driver_salaries.allowance
    total_base_salary: int  # Σ effective base salary per driver
    total_vehicle_expenses: int  # Fuel + Repairs + Law + Other
    total_vendor_cost: int  # Σ vendor route pricing for xe ngoài
    profit: int  # revenue − all costs
    matched_trip_count: int
    client_breakdown: list[ClientRevenueBreakdownDTO]


class GetMonthlyPnL:
    """Compute revenue, total wages, and profit for an accounting period.

    Revenue = SUM(DeliveredTrip.revenue) for all MATCHED DeliveredTrips
    (booked_trip_id IS NOT NULL) whose trip_date falls within
    [start_date, end_date].

    Salary costs are read from ``driver_salaries`` when records exist for
    the period. Falls back to computing from trips + base salary configs
    when no salary records are found.

    Profit = revenue - (productivity + allowance + base + vehicle_expenses).
    """

    def __init__(
        self,
        session: AsyncSession,
        base_salary_repo: DriverSalaryConfigRepository,
        driver_salary_repo: DriverSalaryRepository | None = None,
    ) -> None:
        self.session = session
        self.base_salary_repo = base_salary_repo
        self.driver_salary_repo = driver_salary_repo

    async def __call__(self, *, start_date: date, end_date: date) -> MonthlyPnLDTO:
        # ---- Revenue: sum DeliveredTrip.revenue for MATCHED trips in period ----
        from app.models.domain import Client

        dt_revenue_rows = (
            await self.session.execute(
                select(
                    DeliveredTrip.client_id,
                    func.count(DeliveredTrip.id),
                    func.coalesce(func.sum(DeliveredTrip.revenue), 0),
                )
                .where(
                    DeliveredTrip.booked_trip_id.isnot(None),
                    func.coalesce(
                        DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)
                    )
                    >= start_date,
                    func.coalesce(
                        DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)
                    )
                    <= end_date,
                )
                .group_by(DeliveredTrip.client_id)
            )
        ).all()

        revenue = 0
        matched_trip_count = 0
        per_client: dict[int, dict] = {}
        for client_id, trip_count, client_rev in dt_revenue_rows:
            revenue += int(client_rev or 0)
            matched_trip_count += int(trip_count or 0)
            per_client[client_id] = {
                "trip_count": int(trip_count or 0),
                "revenue": int(client_rev or 0),
            }

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

        # ---- Productivity salary: Σ DeliveredTrip.driver_salary (own-driver only) ----
        # Vendor trips (vendor_id IS NOT NULL) carry their cost on
        # `total_vendor_cost` line; including them here would double-count.
        wage_row = (
            await self.session.execute(
                select(
                    func.coalesce(func.sum(DeliveredTrip.driver_salary), 0),
                ).where(
                    DeliveredTrip.booked_trip_id.isnot(None),
                    DeliveredTrip.vendor_id.is_(None),
                    func.coalesce(
                        DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)
                    )
                    >= start_date,
                    func.coalesce(
                        DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)
                    )
                    <= end_date,
                )
            )
        ).one()
        trip_productivity = int(wage_row[0] or 0)

        # ---- Try driver_salaries table for base/bonus/allowance ----
        salary_records: list[DriverSalaryRecord] = []
        if self.driver_salary_repo is not None:
            salary_records = await self.driver_salary_repo.list_for_period(
                start_date, end_date
            )

        if salary_records:
            total_base_salary = sum(r.basic_salary for r in salary_records)
            total_allowance = sum(r.allowance for r in salary_records)
            # bonus_salary is always computed from trips
            total_productivity = trip_productivity
        else:
            # Fallback: compute from trips + base salary configs
            total_productivity = trip_productivity
            total_allowance = 0

            driver_id_rows = (
                (
                    await self.session.execute(
                        select(DeliveredTrip.driver_id)
                        .where(
                            DeliveredTrip.booked_trip_id.isnot(None),
                            DeliveredTrip.vendor_id.is_(None),
                            DeliveredTrip.driver_id.is_not(None),
                            func.coalesce(
                                DeliveredTrip.trip_date,
                                func.date(DeliveredTrip.created_at),
                            )
                            >= start_date,
                            func.coalesce(
                                DeliveredTrip.trip_date,
                                func.date(DeliveredTrip.created_at),
                            )
                            <= end_date,
                        )
                        .distinct()
                    )
                )
                .scalars()
                .all()
            )
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

        # ---- Vendor cost: lookup vendor route pricing for xe ngoài ----
        vendor_trips_rows = (
            await self.session.execute(
                select(
                    DeliveredTrip.id,
                    DeliveredTrip.vendor_id,
                    DeliveredTrip.pickup_location_id,
                    DeliveredTrip.dropoff_location_id,
                    DeliveredTrip.work_type,
                    DeliveredTrip.cont_type,
                ).where(
                    DeliveredTrip.booked_trip_id.isnot(None),
                    DeliveredTrip.vendor_id.isnot(None),
                    func.coalesce(
                        DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)
                    )
                    >= start_date,
                    func.coalesce(
                        DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)
                    )
                    <= end_date,
                )
            )
        ).all()

        from app.core.pricing_lookup import lookup_vendor_prices

        vendor_trips = [
            TripPriceInfo(
                id=r[0],
                partner_id=r[1],
                pickup_location_id=r[2],
                dropoff_location_id=r[3],
                work_type=r[4],
                cont_type=r[5],
            )
            for r in vendor_trips_rows
        ]
        vendor_prices = await lookup_vendor_prices(self.session, vendor_trips)
        total_vendor_cost = sum(vendor_prices.values())

        profit = revenue - (
            total_productivity
            + total_allowance
            + total_base_salary
            + total_vehicle_expenses
            + total_vendor_cost
        )

        return MonthlyPnLDTO(
            start_date=start_date,
            end_date=end_date,
            revenue=revenue,
            total_productivity_salary=total_productivity,
            total_allowance=total_allowance,
            total_base_salary=total_base_salary,
            total_vehicle_expenses=total_vehicle_expenses,
            total_vendor_cost=total_vendor_cost,
            profit=profit,
            matched_trip_count=matched_trip_count,
            client_breakdown=client_breakdown,
        )
