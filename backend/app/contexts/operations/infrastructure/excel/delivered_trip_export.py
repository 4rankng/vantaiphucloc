import logging
from io import BytesIO

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    DeliveredTrip,
    DeliveredTripContainer,
)

_logger = logging.getLogger(__name__)


async def generate_delivered_trips_excel(
    db: AsyncSession,
    date_from: str | None = None,
    date_to: str | None = None,
    status: str | None = None,
) -> bytes:
    """Export work orders to Excel."""
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment

    query = select(DeliveredTrip).order_by(DeliveredTrip.id.desc())
    if date_from:
        query = query.where(DeliveredTrip.created_at >= date_from)
    if date_to:
        query = query.where(DeliveredTrip.created_at <= date_to)
    if status:
        query = query.where(DeliveredTrip.status == status)

    result = await db.execute(query)
    delivered_trips = result.scalars().all()

    wo_ids = [wo.id for wo in delivered_trips]
    containers_map: dict[int, list[DeliveredTripContainer]] = {}
    if wo_ids:
        cont_result = await db.execute(
            select(DeliveredTripContainer).where(DeliveredTripContainer.delivered_trip_id.in_(wo_ids))
        )
        for c in cont_result.scalars().all():
            containers_map.setdefault(c.delivered_trip_id, []).append(c)

    # Resolve display names via JOIN (denormalized cols dropped).
    from app.models.domain import Client, Location, Vehicle
    from app.models.base import User as _User
    client_ids = {wo.client_id for wo in delivered_trips}
    driver_ids = {wo.driver_id for wo in delivered_trips}
    loc_ids = {wo.pickup_location_id for wo in delivered_trips} | {wo.dropoff_location_id for wo in delivered_trips}
    loc_ids.discard(None)
    client_name_by_id = {c.id: c.name for c in (await db.execute(select(Client).where(Client.id.in_(client_ids)))).scalars().all()} if client_ids else {}
    driver_name_by_id = {u.id: (u.full_name or u.username) for u in (await db.execute(select(_User).where(_User.id.in_(driver_ids)))).scalars().all()} if driver_ids else {}
    loc_name_by_id = {l.id: l.name for l in (await db.execute(select(Location).where(Location.id.in_(loc_ids)))).scalars().all()} if loc_ids else {}
    vehicle_ids = {wo.vehicle_id for wo in delivered_trips if wo.vehicle_id}
    vehicle_by_id = {v.id: v for v in (await db.execute(select(Vehicle).where(Vehicle.id.in_(vehicle_ids)))).scalars().all()} if vehicle_ids else {}

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Phiếu làm việc"

    headers = ["Mã WO", "Khách hàng", "Điểm lấy", "Điểm trả", "Tài xế", "Biển số", "Số tàu", "Số cont", "Loại", "Lương TX", "Phụ cấp", "Thu nhập", "Trạng thái", "Ngày tạo"]
    ws.append(headers)

    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_num)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")

    status_labels = {"PENDING": "Chờ ghép", "MATCHED": "Đã đối soát"}
    for wo in delivered_trips:
        containers = containers_map.get(wo.id, [])
        plate = vehicle_by_id.get(wo.vehicle_id).plate if wo.vehicle_id and wo.vehicle_id in vehicle_by_id else ""
        for c in containers:
            ws.append([
                f"WO#{wo.id}", client_name_by_id.get(wo.client_id, ""),
                loc_name_by_id.get(wo.pickup_location_id, ""),
                loc_name_by_id.get(wo.dropoff_location_id, ""),
                driver_name_by_id.get(wo.driver_id, ""), plate,
                wo.vessel or "",
                c.container_number, c.cont_type,
                wo.driver_salary, wo.allowance, wo.driver_salary + wo.allowance,
                status_labels.get(wo.status, wo.status),
                wo.created_at.date() if wo.created_at else "",
            ])

    for col in ws.columns:
        max_len = max(len(str(c.value or "")) for c in col)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 2, 40)

    buf = BytesIO()
    wb.save(buf)
    wb.close()
    buf.seek(0)
    return buf.getvalue()
