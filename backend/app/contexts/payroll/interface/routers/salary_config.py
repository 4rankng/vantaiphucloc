"""Salary config router — backed by the generic ``settings`` key-value table."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.contexts.payroll.application import (
    GetSalaryConfig,
    UpdateSalaryConfig,
    UpdateSalaryConfigInput,
)
from app.contexts.payroll.interface.dependencies import (
    get_get_salary_config,
    get_update_salary_config,
)
from app.core.deps import require_permission
from app.models.base import User
from app.schemas.domain import SalaryConfigOut, SalaryConfigUpdate

router = APIRouter()


@router.get("/salary/config", response_model=SalaryConfigOut)
async def get_salary_config(
    _current_user: User = Depends(require_permission("read", "SalaryConfig")),
    use_case: GetSalaryConfig = Depends(get_get_salary_config),
):
    settings = await use_case()
    return SalaryConfigOut(
        from_day=int(settings.get("salary_from_day", "26")),
        to_day=int(settings.get("salary_to_day", "25")),
    )


@router.put("/salary/config", response_model=SalaryConfigOut)
async def update_salary_config(
    body: SalaryConfigUpdate,
    _current_user: User = Depends(require_permission("update", "SalaryConfig")),
    use_case: UpdateSalaryConfig = Depends(get_update_salary_config),
):
    settings = await use_case(
        UpdateSalaryConfigInput(
            from_day=body.from_day,
            to_day=body.to_day,
        )
    )
    return SalaryConfigOut(
        from_day=int(settings.get("salary_from_day", "26")),
        to_day=int(settings.get("salary_to_day", "25")),
    )
