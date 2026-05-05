import io
import math
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func

from app.models.base import User
from app.models.domain import SalaryPeriod
from app.schemas.base import PaginatedResponse
from app.schemas.domain import (
    SalaryCalculateRequest,
    SalaryCalculateAsyncResponse,
    SalaryPeriodOut,
    SalaryPeriodUpdate,
)
from app.core.deps import require_permission, get_current_user
from app.workers import enqueue
from app.repositories.salary_repo import SalaryPeriodRepository
from app.repositories.deps import get_salary_repo
from app.services.summary_loader import load_driver_summaries, get_driver_summary

router = APIRouter()


def _to_out(period: SalaryPeriod, drivers) -> SalaryPeriodOut:
    return SalaryPeriodOut(
        id=period.id,
        driver=get_driver_summary(drivers, period.driver_id),
        start_date=period.start_date,
        end_date=period.end_date,
        work_order_count=period.work_order_count,
        price_per_order=period.price_per_order,
        total_salary=period.total_salary,
        total_allowance=period.total_allowance,
        total_deduction=period.total_deduction,
        net_pay=period.net_pay,
        status=period.status,
        created_at=period.created_at,
        updated_at=period.updated_at,
    )


async def _to_out_many(repo: SalaryPeriodRepository, periods) -> list[SalaryPeriodOut]:
    if not periods:
        return []
    drivers = await load_driver_summaries(
        repo.session, {p.driver_id for p in periods}
    )
    return [_to_out(p, drivers) for p in periods]


@router.post("/salary/calculate", response_model=list[SalaryCalculateAsyncResponse], status_code=202)
async def calculate_salary(
    body: SalaryCalculateRequest,
    current_user: User = Depends(require_permission("calculate", "Salary")),
    repo: SalaryPeriodRepository = Depends(get_salary_repo),
):
    driver_ids: list[int]
    if body.driver_id is not None:
        driver_ids = [body.driver_id]
    else:
        result = await repo.session.execute(select(User).where(User.role == "driver"))
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
    repo: SalaryPeriodRepository = Depends(get_salary_repo),
):
    query = select(SalaryPeriod)
    count_query = select(func.count(SalaryPeriod.id))

    if driver_id is not None:
        query = query.where(SalaryPeriod.driver_id == driver_id)
        count_query = count_query.where(SalaryPeriod.driver_id == driver_id)
    if active_only:
        query = query.where(SalaryPeriod.work_order_count > 0)
        count_query = count_query.where(SalaryPeriod.work_order_count > 0)

    total_q = await repo.session.execute(count_query)
    total = total_q.scalar() or 0

    result = await repo.session.execute(
        query.order_by(SalaryPeriod.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    data = result.scalars().all()

    return PaginatedResponse[SalaryPeriodOut](
        items=await _to_out_many(repo, data),
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
    repo: SalaryPeriodRepository = Depends(get_salary_repo),
):
    query = select(SalaryPeriod).where(SalaryPeriod.driver_id == current_user.id)
    count_query = select(func.count(SalaryPeriod.id)).where(SalaryPeriod.driver_id == current_user.id)

    total_q = await repo.session.execute(count_query)
    total = total_q.scalar() or 0

    result = await repo.session.execute(
        query.order_by(SalaryPeriod.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    data = result.scalars().all()

    return PaginatedResponse[SalaryPeriodOut](
        items=await _to_out_many(repo, data),
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
    repo: SalaryPeriodRepository = Depends(get_salary_repo),
):
    from app.models.base import User as _User
    result = await repo.session.execute(
        select(SalaryPeriod).where(
            SalaryPeriod.start_date == period_start,
            SalaryPeriod.end_date == period_end,
            SalaryPeriod.work_order_count > 0,
        ).order_by(SalaryPeriod.driver_id)
    )
    periods = result.scalars().all()
    driver_ids = {p.driver_id for p in periods}
    name_by_id: dict[int, str] = {}
    if driver_ids:
        u_res = await repo.session.execute(select(_User).where(_User.id.in_(driver_ids)))
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
        for p in periods
    ]


@router.put("/salary/{salary_id}", response_model=SalaryPeriodOut)
async def update_salary_period(
    salary_id: int,
    body: SalaryPeriodUpdate,
    current_user: User = Depends(require_permission("calculate", "Salary")),
    repo: SalaryPeriodRepository = Depends(get_salary_repo),
):
    salary_period = await repo.get_by_id_or_404(salary_id)
    await repo.update(salary_period, **body.model_dump(exclude_unset=True))
    await repo.session.commit()
    await repo.session.refresh(salary_period)
    return (await _to_out_many(repo, [salary_period]))[0]


@router.get("/salary/export")
async def export_salary_excel(
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_user: User = Depends(require_permission("calculate", "Salary")),
    repo: SalaryPeriodRepository = Depends(get_salary_repo),
):
    from app.services.excel_service import generate_salary_excel

    content = await generate_salary_excel(repo.session, start_date.isoformat(), end_date.isoformat())
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=salary.xlsx"},
    )
