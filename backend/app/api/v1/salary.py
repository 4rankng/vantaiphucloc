from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.base import User
from app.models.domain import SalaryPeriod
from app.schemas.domain import (
    SalaryCalculateRequest,
    SalaryCalculateAsyncResponse,
    SalaryPeriodOut,
    SalaryPeriodUpdate,
)
from app.core.deps import require_roles
from app.workers import enqueue

router = APIRouter()


@router.post("/salary/calculate", response_model=SalaryCalculateAsyncResponse, status_code=202)
async def calculate_salary(
    body: SalaryCalculateRequest,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
):
    try:
        job_id = await enqueue(
            "calculate_salary_task",
            company_id=current_user.company_id,
            driver_id=body.driver_id,
            start_date=body.start_date.isoformat(),
            end_date=body.end_date.isoformat(),
        )
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Background worker unavailable")
    return SalaryCalculateAsyncResponse(job_id=job_id)


@router.get("/salary", response_model=list[SalaryPeriodOut])
async def list_salary_periods(
    driver_id: int | None = None,
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    query = select(SalaryPeriod).where(SalaryPeriod.company_id == current_user.company_id)

    if driver_id is not None:
        query = query.where(SalaryPeriod.driver_id == driver_id)

    result = await db.execute(query.order_by(SalaryPeriod.id.desc()))
    return result.scalars().all()


@router.put("/salary/{salary_id}", response_model=SalaryPeriodOut)
async def update_salary_period(
    salary_id: int,
    body: SalaryPeriodUpdate,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SalaryPeriod).where(
            SalaryPeriod.id == salary_id,
            SalaryPeriod.company_id == current_user.company_id,
        )
    )
    salary_period = result.scalar_one_or_none()
    if salary_period is None:
        raise HTTPException(status_code=404, detail="Salary period not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(salary_period, field, value)

    await db.commit()
    await db.refresh(salary_period)

    return salary_period
