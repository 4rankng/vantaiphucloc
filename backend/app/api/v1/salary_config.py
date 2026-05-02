from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.base import User
from app.models.domain import SalaryPeriodConfig
from app.schemas.domain import SalaryConfigOut, SalaryConfigUpdate
from app.core.deps import require_roles

router = APIRouter()


@router.get("/salary-config", response_model=SalaryConfigOut)
async def get_salary_config(
    current_user: User = Depends(require_roles("accountant", "superadmin", "driver")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SalaryPeriodConfig))
    config = result.scalar_one_or_none()

    if config is None:
        # Create default config (singleton) — full calendar month
        config = SalaryPeriodConfig(
            from_day=1,
            to_day=31,
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)

    return config


@router.put("/salary-config", response_model=SalaryConfigOut)
async def update_salary_config(
    body: SalaryConfigUpdate,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SalaryPeriodConfig))
    config = result.scalar_one_or_none()

    if config is None:
        # Upsert: create with provided values
        config = SalaryPeriodConfig(
            from_day=body.from_day or 1,
            to_day=body.to_day or 28,
        )
        db.add(config)
    else:
        for field, value in body.model_dump(exclude_unset=True).items():
            setattr(config, field, value)

    await db.commit()
    await db.refresh(config)

    return config
