"""Salary HTTP router.

SalaryPeriod CRUD has been removed. This router now exposes:
  - GET  /salary/earnings/{driver_id}  -- accountant view (includes base salary)
  - GET  /salary/dashboard             -- all drivers summary
  - GET  /driver/earnings              -- driver self-service
  - POST /salary/calculate             -- kept as no-op placeholder
  - GET  /salary/export                -- Excel export
  - GET  /salary/pnl                   -- doanh thu & lãi theo kỳ
  - GET  /salary/drivers/{id}/base-salary    -- history of base salaries
  - POST /salary/drivers/{id}/base-salary    -- set new effective base salary
"""

from __future__ import annotations

import io
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.payroll.application import (
    GetDriverEarnings,
    GetMonthlyPnL,
    ListDriverBaseSalaryHistory,
    SetDriverBaseSalary,
    SetDriverBaseSalaryInput,
)
from app.contexts.payroll.domain.driver_salary import DriverSalaryRecord
from app.contexts.payroll.interface.dependencies import (
    get_driver_earnings as _get_driver_earnings_dep,
)
from app.contexts.payroll.interface.dependencies import (
    get_driver_salary_repository,
    get_list_driver_base_salary_history,
    get_monthly_pnl,
    get_set_driver_base_salary,
)
from app.core.deps import require_permission
from app.database import get_db
from app.models.base import User
from app.schemas.domain import (
    DriverBaseSalaryOut,
    DriverBaseSalarySet,
    DriverEarningsOut,
    DriverSalaryOut,
    DriverSalaryUpdateIn,
    MonthlyPnLOut,
    ClientRevenueBreakdownOut,
    SalaryCalculateAsyncResponse,
)
from app.contexts.payroll.domain.repositories import DriverSalaryRepository

router = APIRouter()


def _dto_to_out(dto) -> DriverEarningsOut:
    return DriverEarningsOut(
        driver_id=dto.driver_id,
        driver_name=dto.driver_name,
        driver_phone=dto.driver_phone,
        start_date=dto.start_date,
        end_date=dto.end_date,
        matched_order_count=dto.matched_order_count,
        base_salary=dto.base_salary,
        total_salary=dto.total_salary,
        total_allowance=dto.total_allowance,
        total_earnings=dto.total_earnings,
    )


@router.get("/salary/dashboard", response_model=list[DriverEarningsOut])
async def salary_dashboard(
    start_date: date = Query(...),
    end_date: date = Query(...),
    _current_user: User = Depends(require_permission("read", "Salary")),
    db: AsyncSession = Depends(get_db),
):
    from app.contexts.payroll.infrastructure.repositories import (
        SqlDriverSalaryConfigRepository,
    )

    base_repo = SqlDriverSalaryConfigRepository(db)
    use_case = GetDriverEarnings(db, base_salary_repo=base_repo)
    rows = (await db.execute(
        select(User.id).where(User.role == "driver", User.is_active == True)  # noqa: E712
    )).scalars().all()

    results = []
    for driver_id in rows:
        dto = await use_case(driver_id=driver_id, start_date=start_date, end_date=end_date)
        results.append(_dto_to_out(dto))
    return results


@router.get("/salary/earnings/{driver_id}", response_model=DriverEarningsOut)
async def get_driver_earnings(
    driver_id: int,
    start_date: date = Query(...),
    end_date: date = Query(...),
    _current_user: User = Depends(require_permission("read", "Salary")),
    use_case: GetDriverEarnings = Depends(_get_driver_earnings_dep),
):
    dto = await use_case(driver_id=driver_id, start_date=start_date, end_date=end_date)
    return _dto_to_out(dto)


@router.get("/driver/earnings", response_model=DriverEarningsOut)
async def get_my_earnings(
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_user: User = Depends(require_permission("read_own_salary", "Salary")),
    use_case: GetDriverEarnings = Depends(_get_driver_earnings_dep),
):
    dto = await use_case(
        driver_id=current_user.id, start_date=start_date, end_date=end_date
    )
    return _dto_to_out(dto)


@router.post(
    "/salary/calculate",
    response_model=list[SalaryCalculateAsyncResponse],
    status_code=202,
)
async def calculate_salary(
    _current_user: User = Depends(require_permission("calculate", "Salary")),
):
    """No-op placeholder. Earnings are now calculated on-the-fly."""
    return []


@router.get("/salary/export")
async def export_salary_excel(
    start_date: date = Query(...),
    end_date: date = Query(...),
    _current_user: User = Depends(require_permission("calculate", "Salary")),
    db=Depends(get_db),
):
    from app.contexts.operations.infrastructure.excel import generate_salary_excel
    from app.contexts.payroll.infrastructure.repositories import SqlDriverSalaryRepository

    driver_salary_repo = SqlDriverSalaryRepository(db)
    content = await generate_salary_excel(
        db, start_date.isoformat(), end_date.isoformat(),
        driver_salary_repo=driver_salary_repo,
    )
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=salary.xlsx"},
    )


# ---------------------------------------------------------------------------
# Driver base salary
# ---------------------------------------------------------------------------


@router.get(
    "/salary/drivers/{driver_id}/base-salary",
    response_model=list[DriverBaseSalaryOut],
)
async def list_driver_base_salary(
    driver_id: int,
    _current_user: User = Depends(require_permission("read", "Salary")),
    use_case: ListDriverBaseSalaryHistory = Depends(
        get_list_driver_base_salary_history
    ),
):
    history = await use_case(driver_id=driver_id)
    return [
        DriverBaseSalaryOut(
            id=h.id,
            driver_id=h.driver_id,
            base_salary=h.base_salary,
            effective_from=h.effective_from,
            note=h.note,
        )
        for h in history
    ]


@router.post(
    "/salary/drivers/{driver_id}/base-salary",
    response_model=DriverBaseSalaryOut,
    status_code=201,
)
async def set_driver_base_salary(
    driver_id: int,
    body: DriverBaseSalarySet,
    current_user: User = Depends(require_permission("update", "Salary")),
    use_case: SetDriverBaseSalary = Depends(get_set_driver_base_salary),
):
    dto = await use_case(
        SetDriverBaseSalaryInput(
            driver_id=driver_id,
            base_salary=body.base_salary,
            effective_from=body.effective_from,
            note=body.note,
            created_by=current_user.id,
        )
    )
    return DriverBaseSalaryOut(
        id=dto.id,
        driver_id=dto.driver_id,
        base_salary=dto.base_salary,
        effective_from=dto.effective_from,
        note=dto.note,
    )


# ---------------------------------------------------------------------------
# Monthly P&L (doanh thu, lương, lãi)
# ---------------------------------------------------------------------------


@router.get("/salary/pnl", response_model=MonthlyPnLOut)
async def get_monthly_pnl_endpoint(
    start_date: date = Query(...),
    end_date: date = Query(...),
    _current_user: User = Depends(require_permission("read", "Salary")),
    use_case: GetMonthlyPnL = Depends(get_monthly_pnl),
):
    dto = await use_case(start_date=start_date, end_date=end_date)
    return MonthlyPnLOut(
        start_date=dto.start_date,
        end_date=dto.end_date,
        revenue=dto.revenue,
        total_productivity_salary=dto.total_productivity_salary,
        total_allowance=dto.total_allowance,
        total_base_salary=dto.total_base_salary,
        total_vehicle_expenses=dto.total_vehicle_expenses,
        total_vendor_cost=dto.total_vendor_cost,
        profit=dto.profit,
        matched_trip_count=dto.matched_trip_count,
        client_breakdown=[
            ClientRevenueBreakdownOut(
                client_id=p.client_id,
                client_name=p.client_name,
                matched_trip_count=p.matched_trip_count,
                revenue=p.revenue,
            )
            for p in dto.client_breakdown
        ],
    )


# ---------------------------------------------------------------------------
# Driver salary period CRUD
# ---------------------------------------------------------------------------


def _record_to_out(
    rec: DriverSalaryRecord,
    driver_name: str | None = None,
    driver_username: str | None = None,
) -> DriverSalaryOut:
    return DriverSalaryOut(
        id=rec.id,
        driver_id=rec.driver_id,
        driver_name=driver_name,
        driver_username=driver_username,
        from_date=rec.from_date,
        to_date=rec.to_date,
        basic_salary=rec.basic_salary,
        bonus_salary=rec.bonus_salary,
        allowance=rec.allowance,
        note=rec.note,
    )


@router.get("/salary/periods/{from_date}/{to_date}", response_model=list[DriverSalaryOut])
async def list_driver_salaries_for_period(
    from_date: date,
    to_date: date,
    _current_user: User = Depends(require_permission("read", "Salary")),
    repo: DriverSalaryRepository = Depends(get_driver_salary_repository),
    db: AsyncSession = Depends(get_db),
):
    records = await repo.list_for_period(from_date, to_date)
    driver_ids = {r.driver_id for r in records}
    driver_names: dict[int, str | None] = {}
    driver_usernames: dict[int, str | None] = {}
    if driver_ids:
        rows = (
            await db.execute(
                select(User.id, User.full_name, User.username).where(User.id.in_(driver_ids))
            )
        ).all()
        driver_names = {rid: (full_name or username) for rid, full_name, username in rows}
        driver_usernames = {rid: username for rid, full_name, username in rows}
    return [
        _record_to_out(r, driver_names.get(r.driver_id), driver_usernames.get(r.driver_id))
        for r in records
    ]


@router.put(
    "/salary/periods/{from_date}/{to_date}/{driver_id}",
    response_model=DriverSalaryOut,
)
async def upsert_driver_salary(
    from_date: date,
    to_date: date,
    driver_id: int,
    body: DriverSalaryUpdateIn,
    _current_user: User = Depends(require_permission("update", "Salary")),
    repo: DriverSalaryRepository = Depends(get_driver_salary_repository),
    db: AsyncSession = Depends(get_db),
):
    existing = await repo.get_for_period(driver_id, from_date, to_date)
    if existing is not None:
        basic = body.basic_salary if body.basic_salary is not None else existing.basic_salary
        allow = body.allowance if body.allowance is not None else existing.allowance
        note = body.note if body.note is not None else existing.note
        bonus = existing.bonus_salary
    else:
        basic = body.basic_salary if body.basic_salary is not None else 0
        allow = body.allowance if body.allowance is not None else 0
        note = body.note
        bonus = 0

    record = DriverSalaryRecord(
        id=existing.id if existing else None,
        driver_id=driver_id,
        from_date=from_date,
        to_date=to_date,
        basic_salary=basic,
        bonus_salary=bonus,
        allowance=allow,
        note=note,
    )
    saved = await repo.upsert(record)

    driver_row = (
        await db.execute(
            select(User.full_name, User.username).where(User.id == driver_id)
        )
    ).one_or_none()
    display_name = (driver_row.full_name or driver_row.username) if driver_row else None
    username = driver_row.username if driver_row else None
    return _record_to_out(saved, display_name, username)


@router.post(
    "/salary/periods/{from_date}/{to_date}/initialize",
    response_model=list[DriverSalaryOut],
    status_code=201,
)
async def initialize_driver_salaries(
    from_date: date,
    to_date: date,
    _current_user: User = Depends(require_permission("update", "Salary")),
    repo: DriverSalaryRepository = Depends(get_driver_salary_repository),
    db: AsyncSession = Depends(get_db),
):
    """Auto-create salary rows for all active drivers.

    For each driver: look up effective base_salary from driver_salary_configs,
    compute bonus_salary from SUM(delivered_trips.driver_salary) for matched
    trips in the period, and set allowance=0.
    """
    from app.contexts.payroll.infrastructure.repositories import (
        SqlDriverSalaryConfigRepository,
    )
    from app.models.domain import DeliveredTrip as DT

    base_repo = SqlDriverSalaryConfigRepository(db)

    driver_rows = (
        await db.execute(
            select(User.id).where(User.role == "driver", User.is_active == True)  # noqa: E712
        )
    ).scalars().all()

    results: list[DriverSalaryOut] = []
    for driver_id in driver_rows:
        existing = await repo.get_for_period(driver_id, from_date, to_date)
        if existing is not None:
            continue

        config = await base_repo.latest_at_or_before(driver_id, from_date)
        basic_salary = config.base_salary if config else 0

        bonus_result = (
            await db.execute(
                select(
                    func.coalesce(func.sum(DT.driver_salary), 0)
                ).where(
                    DT.driver_id == driver_id,
                    DT.trip_date >= from_date,
                    DT.trip_date <= to_date,
                    DT.booked_trip_id.isnot(None),
                )
            )
        ).scalar() or 0

        record = DriverSalaryRecord(
            id=None,
            driver_id=driver_id,
            from_date=from_date,
            to_date=to_date,
            basic_salary=basic_salary,
            bonus_salary=int(bonus_result),
            allowance=0,
        )
        saved = await repo.upsert(record)
        driver_row = (
            await db.execute(select(User.full_name, User.username).where(User.id == driver_id))
        ).one_or_none()
        display_name = (driver_row.full_name or driver_row.username) if driver_row else None
        username = driver_row.username if driver_row else None
        results.append(_record_to_out(saved, display_name, username))

    return results
