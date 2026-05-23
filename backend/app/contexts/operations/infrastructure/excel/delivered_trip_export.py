import logging
from io import BytesIO

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    DeliveredTrip,
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
    from openpyxl.styles import Font, PatternFill, Alignment

    query = select(DeliveredTrip).order_by(DeliveredTrip.id.desc())
    if date_from:
        query = query.where(DeliveredTrip.created_at >= date_from)
    if date_to:
        query = query.where(DeliveredTrip.created_at <= date_to)
    if matched is not None:
        query = query.where(DeliveredTrip.matched == matched)

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
    loc_name_by_id = {l.id: l.name for l in (await db.execute(select(Location).where(Location.id.in_(loc_ids)))).scalars().all()} if loc_ids else {}

    # Resolve vehicle plates directly from denormalized column
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

    match_labels = {True: "Đã đối soát", False: "Chờ ghép"}
    for wo in delivered_trips:
        plate = wo.vehicle_plate or ""
        ws.append([
            f"WO#{wo.id}", client_name_by_id.get(wo.client_id, ""),
            loc_name_by_id.get(wo.pickup_location_id, ""),
            loc_name_by_id.get(wo.dropoff_location_id, ""),
            driver_name_by_id.get(wo.driver_id, ""), plate,
            wo.vessel or "",
            wo.cont_number or "", wo.cont_type or "",
            wo.driver_salary, wo.allowance, wo.driver_salary + wo.allowance,
            match_labels.get(wo.matched, "Chờ ghép"),
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
