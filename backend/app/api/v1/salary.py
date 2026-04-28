from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.base import User
from app.models.domain import WorkOrder, SalaryPeriod
from app.schemas.domain import SalaryCalculateRequest, SalaryPeriodOut, SalaryPeriodUpdate
from app.core.deps import require_roles

router = APIRouter()


@router.post("/salary/calculate", response_model=SalaryPeriodOut, status_code=201)
async def calculate_salary(
    body: SalaryCalculateRequest,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    # Load driver to get name
    driver_result = await db.execute(select(User).where(User.id == body.driver_id))
    driver = driver_result.scalar_one_or_none()
    if driver is None:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Query all MATCHED work orders for the driver in the period
    result = await db.execute(
        select(WorkOrder).where(
            WorkOrder.company_id == current_user.company_id,
            WorkOrder.driver_id == body.driver_id,
            WorkOrder.status == "MATCHED",
            WorkOrder.created_at >= body.start_date,
            WorkOrder.created_at <= body.end_date,
        )
    )
    work_orders = result.scalars().all()

    total_salary = sum(wo.driver_salary for wo in work_orders)
    total_allowance = sum(wo.allowance for wo in work_orders)
    total_deduction = 0
    net_pay = total_salary + total_allowance - total_deduction
    work_order_count = len(work_orders)

    salary_period = SalaryPeriod(
        company_id=current_user.company_id,
        driver_id=body.driver_id,
        driver_name=driver.username,
        start_date=body.start_date,
        end_date=body.end_date,
        work_order_count=work_order_count,
        price_per_order=total_salary // work_order_count if work_order_count > 0 else 0,
        total_salary=total_salary,
        total_allowance=total_allowance,
        total_deduction=total_deduction,
        net_pay=net_pay,
        status="CALCULATED",
    )
    db.add(salary_period)
    await db.commit()
    await db.refresh(salary_period)

    return salary_period


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
