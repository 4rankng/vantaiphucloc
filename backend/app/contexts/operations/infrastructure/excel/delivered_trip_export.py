import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    DeliveredTrip,
)
from app.utils.excel_utils import (
    apply_header_style,
    auto_fit_columns,
    workbook_to_bytes,
)

_logger = logging.getLogger(__name__)


async def generate_delivered_trips_excel(
    db: AsyncSession,
    date_from: str | None = None,
    date_to: str | None = None,
    matched: bool | None = None,
) -> bytes:
    """Export work orders to Excel."""
    import openpyxl

    query = select(DeliveredTrip).order_by(DeliveredTrip.id.desc())
    if date_from:
        query = query.where(DeliveredTrip.created_at >= date_from)
    if date_to:
        query = query.where(DeliveredTrip.created_at <= date_to)
    if matched is not None:
        if matched:
            query = query.where(DeliveredTrip.booked_trip_id.isnot(None))
        else:
            query = query.where(DeliveredTrip.booked_trip_id.is_(None))

    result = await db.execute(query)
    delivered_trips = result.scalars().all()

    # Resolve display names via JOIN (denormalized cols dropped).
    from app.models.domain import Client, Location
    from app.models.base import User as _User
    client_ids = {wo.client_id for wo in delivered_trips}
    driver_ids = {wo.driver_id for wo in delivered_trips}
    loc_ids = {wo.pickup_location_id for wo in delivered_trips} | {wo.dropoff_location_id for wo in delivered_trips}
    loc_ids.discard(None)
    client_name_by_id = {c.id: c.name for c in (await db.execute(select(Client).where(Client.id.in_(client_ids)))).scalars().all()} if client_ids else {}
    driver_name_by_id = {u.id: (u.full_name or u.username) for u in (await db.execute(select(_User).where(_User.id.in_(driver_ids)))).scalars().all()} if driver_ids else {}
    loc_name_by_id = {loc.id: loc.name for loc in (await db.execute(select(Location).where(Location.id.in_(loc_ids)))).scalars().all()} if loc_ids else {}

    # Resolve vehicle plates directly from denormalized column
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Phiếu làm việc"

    headers = ["Mã WO", "Khách hàng", "Điểm lấy", "Điểm trả", "Tài xế", "Biển số", "Số tàu", "Số cont", "Loại", "Lương TX", "Trạng thái", "Ngày tạo"]
    ws.append(headers)

    apply_header_style(ws, 1, len(headers))

    for wo in delivered_trips:
        plate = wo.vehicle_plate or ""
        ws.append([
            f"WO#{wo.id}", client_name_by_id.get(wo.client_id, ""),
            loc_name_by_id.get(wo.pickup_location_id, ""),
            loc_name_by_id.get(wo.dropoff_location_id, ""),
            driver_name_by_id.get(wo.driver_id, ""), plate,
            wo.vessel or "",
            wo.cont_number or "", wo.cont_type or "",
            wo.driver_salary,
            "Đã đối soát" if wo.booked_trip_id else "Chờ ghép",
            wo.created_at.date() if wo.created_at else "",
        ])

    auto_fit_columns(ws)

    return workbook_to_bytes(wb)
