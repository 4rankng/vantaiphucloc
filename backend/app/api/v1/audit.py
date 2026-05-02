import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.base import User
from app.schemas.base import PaginatedResponse
from app.core.deps import require_roles
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class AuditLogOut(BaseModel):
    id: int
    user_id: int | None
    action: str
    table_name: str
    record_id: int
    old_value: str | None
    new_value: str | None
    reason: str | None
    ip_address: str | None
    user_agent: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


router = APIRouter()


@router.get("/audit-logs", response_model=PaginatedResponse[AuditLogOut])
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    table_name: str | None = Query(None),
    action: str | None = Query(None),
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    q = select(AuditLog)
    count_q = select(func.count(AuditLog.id))

    if table_name:
        q = q.where(AuditLog.table_name == table_name)
        count_q = count_q.where(AuditLog.table_name == table_name)
    if action:
        q = q.where(AuditLog.action == action)
        count_q = count_q.where(AuditLog.action == action)

    total = (await db.execute(count_q)).scalar() or 0

    result = await db.execute(
        q.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = [AuditLogOut.model_validate(row) for row in result.scalars().all()]

    return PaginatedResponse[AuditLogOut](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )
