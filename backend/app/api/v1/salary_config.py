from fastapi import APIRouter, Depends

from app.models.base import User
from app.schemas.domain import SalaryConfigOut, SalaryConfigUpdate
from app.core.deps import require_permission
from app.repositories.salary_repo import SalaryPeriodConfigRepository
from app.repositories.deps import get_salary_config_repo

router = APIRouter()


@router.get("/salary-config", response_model=SalaryConfigOut)
async def get_salary_config(
    current_user: User = Depends(require_permission("read", "SalaryConfig")),
    repo: SalaryPeriodConfigRepository = Depends(get_salary_config_repo),
):
    config = await repo.get_current()

    if config is None:
        config = await repo.create(from_day=1, to_day=31)
        await repo.session.commit()
        await repo.session.refresh(config)

    return config


@router.put("/salary-config", response_model=SalaryConfigOut)
async def update_salary_config(
    body: SalaryConfigUpdate,
    current_user: User = Depends(require_permission("update", "SalaryConfig")),
    repo: SalaryPeriodConfigRepository = Depends(get_salary_config_repo),
):
    config = await repo.get_current()

    if config is None:
        config = await repo.create(
            from_day=body.from_day or 1,
            to_day=body.to_day or 28,
        )
    else:
        await repo.update(config, **body.model_dump(exclude_unset=True))

    await repo.session.commit()
    await repo.session.refresh(config)
    return config
