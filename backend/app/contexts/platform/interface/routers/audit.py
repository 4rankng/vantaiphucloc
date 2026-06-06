import math
import json
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
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
        financial_tables = ["booked_trips", "pricing_lines", "delivered_trips", "driver_salaries", "vehicle_expenses", "route_pricings", "vendor_route_pricings"]
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

    # ── Batch resolve: driver names, vendor names, client names, locations ──────
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

    driver_ids = (
        _collect_ids("driver_salaries", "driver_id")
        | _collect_ids("driver_salary_configs", "driver_id")
        | _collect_ids("delivered_trips", "driver_id")
        | _collect_ids("vehicle_drivers", "driver_id")
        | _collect_ids("vehicles", "driver_id")
    )
    client_ids = (
        _collect_ids("delivered_trips", "client_id")
        | _collect_ids("booked_trips", "client_id")
        | _collect_ids("route_pricings", "client_id")
    )
    vendor_ids = (
        _collect_ids("vehicles", "vendor_id")
        | _collect_ids("vendor_route_pricings", "vendor_id")
    )
    vehicle_ids = (
        _collect_ids("vehicle_expenses", "vehicle_id")
        | _collect_ids("vehicle_drivers", "vehicle_id")
    )
    location_ids = (
        _collect_ids("route_pricings", "pickup_location_id")
        | _collect_ids("route_pricings", "dropoff_location_id")
        | _collect_ids("vendor_route_pricings", "pickup_location_id")
        | _collect_ids("vendor_route_pricings", "dropoff_location_id")
        | _collect_ids("delivered_trips", "pickup_location_id")
        | _collect_ids("delivered_trips", "dropoff_location_id")
        | _collect_ids("booked_trips", "pickup_location_id")
        | _collect_ids("booked_trips", "dropoff_location_id")
    )

    driver_name_map: dict[int, str] = {}
    if driver_ids:
        for r in (await db.execute(select(User.id, User.full_name, User.username).where(User.id.in_(driver_ids)))).all():
            driver_name_map[r.id] = r.full_name or r.username

    # Fallback: resolve driver_salaries / driver_salary_configs record_ids → driver_ids
    def _has_key(val: str | None, key: str) -> bool:
        if not val:
            return False
        try:
            return key in json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return False

    from app.models.domain import DriverSalary, DriverSalaryConfig, Client, Vendor, Vehicle, Location

    salary_to_driver: dict[int, int] = {}
    salary_record_ids = {
        row.record_id for row in rows
        if row.table_name == "driver_salaries" and not _has_key(row.new_value, "driver_id") and not _has_key(row.old_value, "driver_id")
    }
    if salary_record_ids:
        for r in (await db.execute(select(DriverSalary.id, DriverSalary.driver_id).where(DriverSalary.id.in_(salary_record_ids)))).all():
            salary_to_driver[r.id] = r.driver_id
        for did in salary_to_driver.values():
            if did not in driver_name_map:
                driver_ids.add(did)
        if driver_ids:
            for r in (await db.execute(select(User.id, User.full_name, User.username).where(User.id.in_(driver_ids)))).all():
                driver_name_map[r.id] = r.full_name or r.username

    salary_config_to_driver: dict[int, int] = {}
    config_record_ids = {
        row.record_id for row in rows
        if row.table_name == "driver_salary_configs" and not _has_key(row.new_value, "driver_id") and not _has_key(row.old_value, "driver_id")
    }
    if config_record_ids:
        for r in (await db.execute(select(DriverSalaryConfig.id, DriverSalaryConfig.driver_id).where(DriverSalaryConfig.id.in_(config_record_ids)))).all():
            salary_config_to_driver[r.id] = r.driver_id
        for did in salary_config_to_driver.values():
            if did not in driver_name_map:
                driver_ids.add(did)
        if driver_ids:
            for r in (await db.execute(select(User.id, User.full_name, User.username).where(User.id.in_(driver_ids)))).all():
                driver_name_map[r.id] = r.full_name or r.username

    client_name_map: dict[int, str] = {}
    if client_ids:
        for r in (await db.execute(select(Client.id, Client.name).where(Client.id.in_(client_ids)))).all():
            client_name_map[r.id] = r.name

    vendor_name_map: dict[int, str] = {}
    if vendor_ids:
        for r in (await db.execute(select(Vendor.id, Vendor.name).where(Vendor.id.in_(vendor_ids)))).all():
            vendor_name_map[r.id] = r.name

    vehicle_plate_map: dict[int, str] = {}
    if vehicle_ids:
        for r in (await db.execute(select(Vehicle.id, Vehicle.plate).where(Vehicle.id.in_(vehicle_ids)))).all():
            vehicle_plate_map[r.id] = r.plate

    location_name_map: dict[int, str] = {}
    if location_ids:
        for r in (await db.execute(select(Location.id, Location.name).where(Location.id.in_(location_ids)))).all():
            location_name_map[r.id] = r.name

    # ── Subject extraction ────────────────────────────────────────────────────
    CATEGORY_LABELS = {
        "XANG_DAU": "xăng dầu",
        "SUA_CHUA": "sửa chữa",
        "TIEN_LUAT": "tiền luật",
        "KHAC": "khác",
    }

    def _j(val: str | None) -> dict | None:
        if not val:
            return None
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return None

    def _lane_str(d: dict | None) -> str | None:
        """Build 'Pickup → Dropoff' lane string from location IDs."""
        if not d:
            return None
        p = location_name_map.get(d.get("pickup_location_id"))
        q = location_name_map.get(d.get("dropoff_location_id"))
        if p and q:
            return f"{p} → {q}"
        return None

    def _extract_subject(table_name: str, nv: str | None, ov: str | None, record_id: int | None = None) -> str | None:
        data = _j(nv) or _j(ov)

        if table_name == "driver_salaries":
            did = (data or {}).get("driver_id")
            if not did and record_id:
                did = salary_to_driver.get(record_id)
            return driver_name_map.get(did) if did else None

        if table_name == "driver_salary_configs":
            did = (data or {}).get("driver_id")
            if not did and record_id:
                did = salary_config_to_driver.get(record_id)
            return driver_name_map.get(did) if did else None

        if table_name == "clients":
            return (data or {}).get("name")

        if table_name == "vendors":
            return (data or {}).get("name")

        if table_name == "locations":
            return (data or {}).get("name")

        if table_name == "location_aliases":
            return (data or {}).get("alias")

        if table_name == "users":
            return (data or {}).get("username")

        if table_name == "vehicles":
            plate = (data or {}).get("plate")
            vid = (data or {}).get("vendor_id")
            if plate:
                vname = vendor_name_map.get(vid, "")
                return f"{plate}" + (f" ({vname})" if vname else "")
            return None

        if table_name == "vehicle_drivers":
            d = data or {}
            vid = d.get("vehicle_id")
            did = d.get("driver_id")
            parts = []
            if vid:
                plate = vehicle_plate_map.get(vid)
                if plate:
                    parts.append(plate)
            if did:
                name = driver_name_map.get(did)
                if name:
                    parts.append(name)
            return " – ".join(parts) if parts else None

        if table_name == "vehicle_expenses":
            d = data or {}
            vid = d.get("vehicle_id")
            parts = []
            if vid:
                plate = vehicle_plate_map.get(vid)
                if plate:
                    parts.append(plate)
            cat = d.get("category")
            if cat:
                parts.append(CATEGORY_LABELS.get(cat, cat))
            return " – ".join(parts) if parts else d.get("description")

        if table_name == "delivered_trips":
            d = data or {}
            parts = []
            cid = d.get("client_id")
            if cid:
                cname = client_name_map.get(cid)
                if cname:
                    parts.append(cname)
            lane = _lane_str(d)
            if lane:
                parts.append(lane)
            cont = d.get("cont_number")
            if cont:
                parts.append(cont)
            return " – ".join(parts) if parts else None

        if table_name == "booked_trips":
            d = data or {}
            parts = []
            cid = d.get("client_id")
            if cid:
                cname = client_name_map.get(cid)
                if cname:
                    parts.append(cname)
            lane = _lane_str(d)
            if lane:
                parts.append(lane)
            cont = d.get("cont_number")
            if cont:
                parts.append(cont)
            return " – ".join(parts) if parts else None

        if table_name == "route_pricings":
            d = data or {}
            parts = []
            cid = d.get("client_id")
            if cid:
                parts.append(client_name_map.get(cid, ""))
            lane = _lane_str(d)
            if lane:
                parts.append(lane)
            wt = d.get("work_type")
            if wt:
                parts.append(wt)
            return " – ".join(p for p in parts if p) or None

        if table_name == "vendor_route_pricings":
            d = data or {}
            parts = []
            vid = d.get("vendor_id")
            if vid:
                parts.append(vendor_name_map.get(vid, ""))
            lane = _lane_str(d)
            if lane:
                parts.append(lane)
            wt = d.get("work_type")
            if wt:
                parts.append(wt)
            return " – ".join(p for p in parts if p) or None

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
            subject_name=_extract_subject(row.table_name, row.new_value, row.old_value, row.record_id),
        ))

    return PaginatedResponse[AuditLogOut](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )
