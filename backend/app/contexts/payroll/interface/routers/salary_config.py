"""Salary config (singleton) router."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.contexts.payroll.application import (
    GetOrCreateSalaryConfig,
    UpdateSalaryConfig,
    UpdateSalaryConfigInput,
)
from app.contexts.payroll.interface.dependencies import (
    get_or_create_salary_config,
    get_update_salary_config,
)
from app.core.deps import require_permission
from app.models.base import User
from app.schemas.domain import SalaryConfigOut, SalaryConfigUpdate

router = APIRouter()


@router.get("/salary-config", response_model=SalaryConfigOut)
async def get_salary_config(
    _current_user: User = Depends(require_permission("read", "SalaryConfig")),
    use_case: GetOrCreateSalaryConfig = Depends(get_or_create_salary_config),
):
    config = await use_case()
    return SalaryConfigOut(
        id=config.id or 0,
        from_day=config.from_day,
        to_day=config.to_day,
        updated_at=config.updated_at,
    )


@router.put("/salary-config", response_model=SalaryConfigOut)
async def update_salary_config(
    body: SalaryConfigUpdate,
    _current_user: User = Depends(require_permission("update", "SalaryConfig")),
    use_case: UpdateSalaryConfig = Depends(get_update_salary_config),
):
    config = await use_case(
        UpdateSalaryConfigInput(
            from_day=body.from_day,
            to_day=body.to_day,
        )
    )
    return SalaryConfigOut(
        id=config.id or 0,
        from_day=config.from_day,
        to_day=config.to_day,
        updated_at=config.updated_at,
    )
