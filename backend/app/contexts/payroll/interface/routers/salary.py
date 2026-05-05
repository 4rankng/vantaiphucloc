"""Salary HTTP router."""

from __future__ import annotations

import io
import math
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.payroll.application import (
    ListSalaryPeriods,
    ListSalaryPeriodsForDateRange,
    ListSalaryPeriodsQuery,
    UpdateSalaryPeriod,
    UpdateSalaryPeriodInput,
)
from app.contexts.payroll.application.dto import SalaryPeriodDTO
from app.contexts.payroll.domain.exceptions import SalaryPeriodNotFound
from app.contexts.payroll.interface.dependencies import (
    get_list_salary_periods,
    get_list_salary_periods_for_range,
    get_update_salary_period,
)
from app.contexts.payroll.interface.error_translation import to_http
from app.core.deps import get_current_user, require_permission
from app.database import get_db
from app.models.base import User
from app.schemas.base import PaginatedResponse
from app.schemas.domain import (
    SalaryCalculateAsyncResponse,
    SalaryCalculateRequest,
    SalaryPeriodOut,
    SalaryPeriodUpdate,
)
from app.services.summary_loader import get_driver_summary, load_driver_summaries
from app.workers import enqueue

router = APIRouter()


def _to_out(dto: SalaryPeriodDTO, drivers: dict) -> SalaryPeriodOut:
    return SalaryPeriodOut(
        id=dto.id,
        driver=get_driver_summary(drivers, dto.driver_id),
        start_date=dto.start_date,
        end_date=dto.end_date,
        work_order_count=dto.work_order_count,
        price_per_order=dto.price_per_order,
        total_salary=dto.total_salary,
        total_allowance=dto.total_allowance,
        total_deduction=dto.total_deduction,
        net_pay=dto.net_pay,
        status=dto.status,
        created_at=dto.created_at,
        updated_at=dto.updated_at,
    )


async def _to_out_many(
    db: AsyncSession, items: list[SalaryPeriodDTO]
) -> list[SalaryPeriodOut]:
    if not items:
        return []
    drivers = await load_driver_summaries(
        db, {p.driver_id for p in items}
    )
    return [_to_out(p, drivers) for p in items]


@router.post(
    "/salary/calculate",
    response_model=list[SalaryCalculateAsyncResponse],
    status_code=202,
)
async def calculate_salary(
    body: SalaryCalculateRequest,
    _current_user: User = Depends(require_permission("calculate", "Salary")),
    db: AsyncSession = Depends(get_db),
):
    if body.driver_id is not None:
        driver_ids = [body.driver_id]
    else:
        rows = (await db.execute(select(User).where(User.role == "driver"))).scalars().all()
        driver_ids = [d.id for d in rows]

    responses: list[SalaryCalculateAsyncResponse] = []
    for did in driver_ids:
        try:
            job_id = await enqueue(
                "calculate_salary_task",
                driver_id=did,
                start_date=body.start_date.isoformat(),
                end_date=body.end_date.isoformat(),
            )
            responses.append(SalaryCalculateAsyncResponse(job_id=job_id))
        except RuntimeError as exc:
            raise HTTPException(
                status_code=503, detail="Background worker unavailable"
            ) from exc
    return responses


@router.get("/salary", response_model=PaginatedResponse[SalaryPeriodOut])
async def list_salary_periods(
    driver_id: int | None = None,
    active_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _current_user: User = Depends(require_permission("read", "Salary")),
    use_case: ListSalaryPeriods = Depends(get_list_salary_periods),
    db: AsyncSession = Depends(get_db),
):
    result = await use_case(
        ListSalaryPeriodsQuery(
            driver_id=driver_id,
            active_only=active_only,
            page=page,
            page_size=page_size,
        )
    )
    return PaginatedResponse[SalaryPeriodOut](
        items=await _to_out_many(db, result.items),
        total=result.total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(result.total / page_size) if result.total > 0 else 0,
    )


@router.get("/driver/salary", response_model=PaginatedResponse[SalaryPeriodOut])
async def list_my_salary_periods(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission("read_own_salary", "Salary")),
    use_case: ListSalaryPeriods = Depends(get_list_salary_periods),
    db: AsyncSession = Depends(get_db),
):
    result = await use_case(
        ListSalaryPeriodsQuery(
            driver_id=current_user.id,
            page=page,
            page_size=page_size,
        )
    )
    return PaginatedResponse[SalaryPeriodOut](
        items=await _to_out_many(db, result.items),
        total=result.total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(result.total / page_size) if result.total > 0 else 0,
    )


@router.get("/salary/dashboard")
async def salary_dashboard(
    period_start: date = Query(...),
    period_end: date = Query(...),
    _current_user: User = Depends(require_permission("read", "Salary")),
    use_case: ListSalaryPeriodsForDateRange = Depends(
        get_list_salary_periods_for_range
    ),
    db: AsyncSession = Depends(get_db),
):
    items = await use_case(
        start_date=period_start, end_date=period_end, active_only=True
    )
    if not items:
        return []
    driver_ids = {p.driver_id for p in items}
    name_by_id: dict[int, str] = {}
    if driver_ids:
        u_res = await db.execute(select(User).where(User.id.in_(driver_ids)))
        for u in u_res.scalars().all():
            name_by_id[u.id] = u.full_name or u.username

    return [
        {
            "id": p.id,
            "driver_id": p.driver_id,
            "driver_name": name_by_id.get(p.driver_id, ""),
            "work_order_count": p.work_order_count,
            "total_salary": p.total_salary,
            "total_allowance": p.total_allowance,
            "net_pay": p.net_pay,
            "status": p.status,
        }
        for p in items
    ]


@router.put("/salary/{salary_id}", response_model=SalaryPeriodOut)
async def update_salary_period(
    salary_id: int,
    body: SalaryPeriodUpdate,
    _current_user: User = Depends(require_permission("calculate", "Salary")),
    use_case: UpdateSalaryPeriod = Depends(get_update_salary_period),
    db: AsyncSession = Depends(get_db),
):
    payload = body.model_dump(exclude_unset=True)
    try:
        dto = await use_case(
            UpdateSalaryPeriodInput(period_id=salary_id, **payload)
        )
    except SalaryPeriodNotFound as exc:
        raise to_http(exc) from exc
    drivers = await load_driver_summaries(db, {dto.driver_id})
    return _to_out(dto, drivers)


@router.get("/salary/export")
async def export_salary_excel(
    start_date: date = Query(...),
    end_date: date = Query(...),
    _current_user: User = Depends(require_permission("calculate", "Salary")),
    db: AsyncSession = Depends(get_db),
):
    from app.services.excel_service import generate_salary_excel

    content = await generate_salary_excel(
        db, start_date.isoformat(), end_date.isoformat()
    )
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=salary.xlsx"},
    )
