import io
import math
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.base import User
from app.models.domain import SalaryPeriod, WorkOrder
from app.schemas.base import PaginatedResponse
from app.schemas.domain import (
    SalaryCalculateRequest,
    SalaryCalculateAsyncResponse,
    SalaryPeriodOut,
    SalaryPeriodUpdate,
)
from app.core.deps import require_permission, get_current_user
from app.workers import enqueue

router = APIRouter()


@router.post("/salary/calculate", response_model=list[SalaryCalculateAsyncResponse], status_code=202)
async def calculate_salary(
    body: SalaryCalculateRequest,
    current_user: User = Depends(require_permission("calculate", "Salary")),
    db: AsyncSession = Depends(get_db),
):
    driver_ids: list[int]
    if body.driver_id is not None:
        driver_ids = [body.driver_id]
    else:
        result = await db.execute(select(User).where(User.role == "driver"))
        drivers = result.scalars().all()
        driver_ids = [d.id for d in drivers]

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
        except RuntimeError:
            raise HTTPException(status_code=503, detail="Background worker unavailable")
    return responses


@router.get("/salary", response_model=PaginatedResponse[SalaryPeriodOut])
async def list_salary_periods(
    driver_id: int | None = None,
    active_only: bool = Query(False, description="Only return drivers with work_order_count > 0"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission("read", "Salary")),
    db: AsyncSession = Depends(get_db),
):
    query = select(SalaryPeriod)
    count_query = select(func.count(SalaryPeriod.id))

    if driver_id is not None:
        query = query.where(SalaryPeriod.driver_id == driver_id)
        count_query = count_query.where(SalaryPeriod.driver_id == driver_id)
    if active_only:
        query = query.where(SalaryPeriod.work_order_count > 0)
        count_query = count_query.where(SalaryPeriod.work_order_count > 0)

    total_q = await db.execute(count_query)
    total = total_q.scalar() or 0

    result = await db.execute(
        query.order_by(SalaryPeriod.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    data = result.scalars().all()

    return PaginatedResponse[SalaryPeriodOut](
        items=[SalaryPeriodOut.model_validate(s) for s in data],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/driver/salary", response_model=PaginatedResponse[SalaryPeriodOut])
async def list_my_salary_periods(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission("read_own_salary", "Salary")),
    db: AsyncSession = Depends(get_db),
):
    query = select(SalaryPeriod).where(SalaryPeriod.driver_id == current_user.id)
    count_query = select(func.count(SalaryPeriod.id)).where(SalaryPeriod.driver_id == current_user.id)

    total_q = await db.execute(count_query)
    total = total_q.scalar() or 0

    result = await db.execute(
        query.order_by(SalaryPeriod.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    data = result.scalars().all()

    return PaginatedResponse[SalaryPeriodOut](
        items=[SalaryPeriodOut.model_validate(s) for s in data],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/salary/dashboard")
async def salary_dashboard(
    period_start: date = Query(...),
    period_end: date = Query(...),
    current_user: User = Depends(require_permission("read", "Salary")),
    db: AsyncSession = Depends(get_db),
):
    """Return salary breakdown for all active drivers in a period."""
    # Get salary periods for this date range
    result = await db.execute(
        select(SalaryPeriod).where(
            SalaryPeriod.start_date == period_start,
            SalaryPeriod.end_date == period_end,
            SalaryPeriod.work_order_count > 0,
        ).order_by(SalaryPeriod.driver_name)
    )
    periods = result.scalars().all()

    return [
        {
            "id": p.id,
            "driver_id": p.driver_id,
            "driver_name": p.driver_name,
            "work_order_count": p.work_order_count,
            "total_salary": p.total_salary,
            "total_allowance": p.total_allowance,
            "net_pay": p.net_pay,
            "status": p.status,
        }
        for p in periods
    ]


@router.put("/salary/{salary_id}", response_model=SalaryPeriodOut)
async def update_salary_period(
    salary_id: int,
    body: SalaryPeriodUpdate,
    current_user: User = Depends(require_permission("calculate", "Salary")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SalaryPeriod).where(SalaryPeriod.id == salary_id)
    )
    salary_period = result.scalar_one_or_none()
    if salary_period is None:
        raise HTTPException(status_code=404, detail="Salary period not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(salary_period, field, value)

    await db.commit()
    await db.refresh(salary_period)

    return salary_period


@router.get("/salary/export")
async def export_salary_excel(
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_user: User = Depends(require_permission("calculate", "Salary")),
    db: AsyncSession = Depends(get_db),
):
    """Export salary breakdown to Excel."""
    from app.services.excel_service import generate_salary_excel

    content = await generate_salary_excel(db, start_date.isoformat(), end_date.isoformat())
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=salary.xlsx"},
    )
