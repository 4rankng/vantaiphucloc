import math
import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.base import User
from app.schemas.base import PaginatedResponse
from app.core.deps import require_permission
from pydantic import BaseModel, ConfigDict


class AuditLogOut(BaseModel):
    id: int
    user_id: int | None
    user_name: str | None = None
    user_role: str | None = None
    action: str
    table_name: str
    record_id: int
    old_value: str | None
    new_value: str | None
    reason: str | None
    created_at: datetime
    subject_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


router = APIRouter()


@router.get("/audit-logs", response_model=PaginatedResponse[AuditLogOut])
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    table_name: str | None = Query(None),
    action: str | None = Query(None),
    is_financial: bool = Query(False),
    created_after: datetime | None = Query(None),
    current_user: User = Depends(require_permission("read", "Audit")),
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
    if created_after:
        q = q.where(AuditLog.created_at >= created_after)
        count_q = count_q.where(AuditLog.created_at >= created_after)

    if is_financial:
        financial_tables = ["booked_trips", "pricing_lines", "delivered_trips", "driver_salaries"]
        q = q.where(AuditLog.table_name.in_(financial_tables))
        count_q = count_q.where(AuditLog.table_name.in_(financial_tables))

    total = (await db.execute(count_q)).scalar() or 0

    result = await db.execute(
        q.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = result.scalars().all()

    # ── Batch user lookup ─────────────────────────────────────────────────────
    user_ids = {row.user_id for row in rows if row.user_id}
    user_map: dict[int, tuple[str, str, str]] = {}
    if user_ids:
        user_rows = (await db.execute(
            select(User.id, User.full_name, User.role, User.username).where(User.id.in_(user_ids))
        )).all()
        user_map = {r.id: (r.full_name or r.username, r.role, r.username) for r in user_rows}

    # ── Batch resolve: driver names, vendor names, client names ────────────────
    def _collect_ids(table: str, key: str) -> set[int]:
        ids: set[int] = set()
        for row in rows:
            if row.table_name == table:
                for val in (row.new_value, row.old_value):
                    if val:
                        try:
                            v = json.loads(val).get(key)
                            if isinstance(v, int):
                                ids.add(v)
                        except (json.JSONDecodeError, TypeError):
                            pass
        return ids

    driver_ids = _collect_ids("driver_salaries", "driver_id") | _collect_ids("driver_salary_configs", "driver_id")
    client_ids = _collect_ids("delivered_trips", "client_id") | _collect_ids("booked_trips", "client_id")
    vendor_ids = _collect_ids("vehicles", "vendor_id")

    driver_name_map: dict[int, str] = {}
    if driver_ids:
        for r in (await db.execute(select(User.id, User.full_name, User.username).where(User.id.in_(driver_ids)))).all():
            driver_name_map[r.id] = r.full_name or r.username

    from app.models.domain import Client, Vendor
    client_name_map: dict[int, str] = {}
    if client_ids:
        for r in (await db.execute(select(Client.id, Client.name).where(Client.id.in_(client_ids)))).all():
            client_name_map[r.id] = r.name

    vendor_name_map: dict[int, str] = {}
    if vendor_ids:
        for r in (await db.execute(select(Vendor.id, Vendor.name).where(Vendor.id.in_(vendor_ids)))).all():
            vendor_name_map[r.id] = r.name

    # ── Subject extraction ────────────────────────────────────────────────────
    def _j(val: str | None) -> dict | None:
        if not val:
            return None
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return None

    def _extract_subject(table_name: str, nv: str | None, ov: str | None) -> str | None:
        data = _j(nv) or _j(ov)
        if not data:
            return None

        if table_name == "driver_salaries":
            did = data.get("driver_id")
            return driver_name_map.get(did) if did else None

        if table_name == "driver_salary_configs":
            did = data.get("driver_id")
            return driver_name_map.get(did) if did else None

        if table_name == "clients":
            return data.get("name")

        if table_name == "vendors":
            return data.get("name")

        if table_name == "locations":
            return data.get("name")

        if table_name == "location_aliases":
            return data.get("alias")

        if table_name == "users":
            return data.get("username")

        if table_name == "vehicles":
            plate = data.get("plate")
            vid = data.get("vendor_id")
            if plate:
                vname = vendor_name_map.get(vid, "")
                return f"{plate}" + (f" ({vname})" if vname else "")
            return None

        if table_name == "delivered_trips":
            cid = data.get("client_id")
            return client_name_map.get(cid) if cid else None

        if table_name == "booked_trips":
            cid = data.get("client_id")
            return client_name_map.get(cid) if cid else None

        if table_name == "vehicle_expenses":
            plate = data.get("vehicle_plate")
            return plate or data.get("description")

        return None

    # ── Build response ────────────────────────────────────────────────────────
    items = []
    for row in rows:
        uname, urole, _ = (user_map.get(row.user_id, (None, None, None))) if row.user_id else (None, None, None)
        items.append(AuditLogOut(
            id=row.id,
            user_id=row.user_id,
            user_name=uname,
            user_role=urole,
            action=row.action,
            table_name=row.table_name,
            record_id=row.record_id,
            old_value=row.old_value,
            new_value=row.new_value,
            reason=row.reason,
            created_at=row.created_at,
            subject_name=_extract_subject(row.table_name, row.new_value, row.old_value),
        ))

    return PaginatedResponse[AuditLogOut](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )
