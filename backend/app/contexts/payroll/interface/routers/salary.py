"""Salary HTTP router.

SalaryPeriod CRUD has been removed. This router now exposes:
  - GET  /salary/earnings/{driver_id}  -- accountant view
  - GET  /driver/earnings              -- driver self-service
  - POST /salary/calculate             -- kept as no-op placeholder
  - GET  /salary/export                -- Excel export
"""

from __future__ import annotations

import io
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.contexts.payroll.application import GetDriverEarnings
from app.contexts.payroll.interface.dependencies import get_driver_earnings as _get_driver_earnings_dep
from app.core.deps import require_permission
from app.database import get_db
from app.models.base import User
from app.schemas.domain import DriverEarningsOut, SalaryCalculateAsyncResponse

router = APIRouter()


@router.get("/salary/earnings/{driver_id}", response_model=DriverEarningsOut)
async def get_driver_earnings(
    driver_id: int,
    start_date: date = Query(...),
    end_date: date = Query(...),
    _current_user: User = Depends(require_permission("read", "Salary")),
    use_case: GetDriverEarnings = Depends(_get_driver_earnings_dep),
):
    dto = await use_case(driver_id=driver_id, start_date=start_date, end_date=end_date)
    return DriverEarningsOut(
        driver_id=dto.driver_id,
        driver_name=dto.driver_name,
        start_date=dto.start_date,
        end_date=dto.end_date,
        matched_order_count=dto.matched_order_count,
        total_salary=dto.total_salary,
        total_allowance=dto.total_allowance,
        total_earnings=dto.total_earnings,
    )


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
    return DriverEarningsOut(
        driver_id=dto.driver_id,
        driver_name=dto.driver_name,
        start_date=dto.start_date,
        end_date=dto.end_date,
        matched_order_count=dto.matched_order_count,
        total_salary=dto.total_salary,
        total_allowance=dto.total_allowance,
        total_earnings=dto.total_earnings,
    )


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
