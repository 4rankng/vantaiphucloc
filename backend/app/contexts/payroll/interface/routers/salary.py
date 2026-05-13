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
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.payroll.application import (
    GetDriverEarnings,
    GetMonthlyPnL,
    ListDriverBaseSalaryHistory,
    SetDriverBaseSalary,
    SetDriverBaseSalaryInput,
)
from app.contexts.payroll.interface.dependencies import (
    get_driver_earnings as _get_driver_earnings_dep,
)
from app.contexts.payroll.interface.dependencies import (
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
    MonthlyPnLOut,
    PartnerRevenueBreakdownOut,
    SalaryCalculateAsyncResponse,
)

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

    content = await generate_salary_excel(
        db, start_date.isoformat(), end_date.isoformat()
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
        profit=dto.profit,
        matched_trip_count=dto.matched_trip_count,
        partner_breakdown=[
            PartnerRevenueBreakdownOut(
                partner_id=p.partner_id,
                partner_name=p.partner_name,
                matched_trip_count=p.matched_trip_count,
                revenue=p.revenue,
            )
            for p in dto.partner_breakdown
        ],
    )
