"""Booked trip and doi-soat Excel export helpers."""

import logging
from io import BytesIO

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    BookedTrip,
    Client,
    DeliveredTrip,
    Location,
)

_logger = logging.getLogger(__name__)


async def generate_booked_trips_excel(
    db: AsyncSession,
    date_from: str | None = None,
    date_to: str | None = None,
    client_id: int | None = None,
) -> bytes:
    """Export trip orders to Excel.

    When client_id is provided, filters to that client and includes
    match status columns for customer reconciliation.
    """
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment

    query = select(BookedTrip).order_by(BookedTrip.id.desc())
    if client_id:
        query = query.where(BookedTrip.client_id == client_id)
    if date_from:
        query = query.where(BookedTrip.trip_date >= date_from)
    if date_to:
        query = query.where(BookedTrip.trip_date <= date_to)

    result = await db.execute(query)
    booked_trips = result.scalars().all()

    # Resolve display names via JOIN.
    client_ids = {to.client_id for to in booked_trips}
    loc_ids = {to.pickup_location_id for to in booked_trips} | {to.dropoff_location_id for to in booked_trips}
    loc_ids.discard(None)
    client_name_by_id = {c.id: c.name for c in (await db.execute(select(Client).where(Client.id.in_(client_ids)))).scalars().all()} if client_ids else {}
    loc_name_by_id = {loc.id: loc.name for loc in (await db.execute(select(Location).where(Location.id.in_(loc_ids)))).scalars().all()} if loc_ids else {}

    # For per-partner export: determine match status and vessel from BookedTrip directly
    client_name = None
    if client_id:
        # Get partner name for filename
        p_result = await db.execute(select(Client).where(Client.id == client_id))
        client_obj = p_result.scalar_one_or_none()
        client_name = client_obj.name if client_obj else None

    wb = openpyxl.Workbook()
    ws = wb.active

    if client_id:
        ws.title = "Chuyến theo khách hàng"
        headers = ["STT", "Số container", "Tuyến đường", "Ngày chạy", "Biển số xe", "Số tàu", "Trạng thái khớp", "Đơn giá"]
    else:
        ws.title = "Đơn hàng"
        headers = ["Mã TO", "Ngày chạy", "Khách hàng", "Điểm lấy", "Điểm trả", "Số cont", "Loại", "Đơn giá", "Lương TX", "Phụ cấp", "Trạng thái"]
    ws.append(headers)

    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_num)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")

    match_labels = {True: "Đã khớp", False: "Chưa khớp"}

    # Build match status lookup: BookedTrip.id -> bool
    bt_ids = [to.id for to in booked_trips]
    matched_bt_ids: set[int] = set()
    if bt_ids:
        rows = (await db.execute(
            select(DeliveredTrip.booked_trip_id).where(
                DeliveredTrip.booked_trip_id.in_(bt_ids)
            )
        )).scalars().all()
        matched_bt_ids = set(rows)

    if client_id:
        stt = 0
        for to in booked_trips:
            pickup = loc_name_by_id.get(to.pickup_location_id, "")
            dropoff = loc_name_by_id.get(to.dropoff_location_id, "")
            route = f"{pickup} → {dropoff}" if pickup and dropoff else ""
            plate = to.vehicle_plate or ""
            match_status = match_labels.get(to.id in matched_bt_ids, "Chưa khớp")
            vessel = to.vessel or ""
            stt += 1
            ws.append([
                stt,
                to.cont_number or "",
                route,
                to.trip_date,
                plate,
                vessel,
                match_status,
            ])
    else:
        for to in booked_trips:
            ws.append([
                f"TO#{to.id}", to.trip_date,
                client_name_by_id.get(to.client_id, ""),
                loc_name_by_id.get(to.pickup_location_id, ""),
                loc_name_by_id.get(to.dropoff_location_id, ""),
                to.cont_number or "", to.cont_type or "",
                match_labels.get(to.id in matched_bt_ids, "Chờ ghép"),
            ])

    from app.utils.excel_utils import add_template_version as _add_ver

    for col in ws.columns:
        max_len = max(len(str(c.value or "")) for c in col)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 2, 40)

    _add_ver(ws, 13)
    buf = BytesIO()
    wb.save(buf)
    wb.close()
    buf.seek(0)
    return buf.getvalue(), client_name


async def generate_doi_soat_excel(
    db: AsyncSession,
    client_id: int,
    date_from: str,
    date_to: str,
) -> tuple[bytes, str]:
    """Generate reconciliation (đối soát) Excel for a specific client.

    Returns (excel_bytes, client_name) tuple.
    Exports ALL delivered trips for the client within the date range,
    regardless of match status — so customers without uploaded files
    (e.g. Tâm Cảng) still get a populated export.
    Columns: STT | Ngày đi | Chủ hàng | Số container | F20' | F40' | E20' | E40' | Số xe chạy | Điểm đi | Điểm đến | Tác nghiệp
    Summary row at the bottom: count per work type + total amount.
    """
    import openpyxl
    from openpyxl.styles import Font, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    # -- 1. Load partner --
    p_result = await db.execute(select(Client).where(Client.id == client_id))
    client = p_result.scalar_one_or_none()
    client_name = client.name if client else f"Client #{client_id}"

    from datetime import date as date_type

    df = date_type.fromisoformat(date_from)
    dt = date_type.fromisoformat(date_to)

    # -- 2. Load delivered trips (actual work done) --
    # Query DeliveredTrip instead of BookedTrip so customers without
    # uploaded files still have data to export.
    dt_query = select(DeliveredTrip).where(
        DeliveredTrip.client_id == client_id,
        DeliveredTrip.trip_date >= df,
        DeliveredTrip.trip_date <= dt,
    ).order_by(DeliveredTrip.trip_date, DeliveredTrip.id)
    dt_result = await db.execute(dt_query)
    delivered_trips = dt_result.scalars().all()

    # -- 3. Load location names --
    loc_ids: set[int] = set()
    for trip in delivered_trips:
        if trip.pickup_location_id:
            loc_ids.add(trip.pickup_location_id)
        if trip.dropoff_location_id:
            loc_ids.add(trip.dropoff_location_id)
    loc_name_by_id: dict[int, str] = {}
    if loc_ids:
        loc_result = await db.execute(select(Location).where(Location.id.in_(loc_ids)))
        loc_name_by_id = {loc.id: loc.name for loc in loc_result.scalars().all()}

    # -- 4. Build Excel workbook --
    # Data comes from DeliveredTrip — all actual work done for this client.
    wb = openpyxl.Workbook()
    ws = wb.active
    month_label = df.strftime("%m/%Y")
    ws.title = f"SL T{df.month}.{str(df.year)[2:]}"

    num_cols = 12  # A-L
    last_col = get_column_letter(num_cols)

    # -- Styles --
    _bold = Font(bold=True, size=11)
    _bold14 = Font(bold=True, size=14)
    _header_font = Font(bold=True, size=11)
    thin_side = Side(style="thin", color="000000")
    thin_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
    center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left = Alignment(horizontal="left", vertical="center")
    Alignment(horizontal="right", vertical="center")

    # -- Title block (rows 1-8) --
    ws.merge_cells(f"A1:{last_col}1")
    ws["A1"] = "CÔNG TY TNHH AMT PHÚC LỘC"
    ws["A1"].font = _bold

    ws.merge_cells(f"A2:{last_col}2")
    ws["A2"] = "Địa chỉ: Số 56B/97 đường Đoàn Kết, P. Hải An, TP Hải Phòng"
    ws["A2"].font = _bold

    ws.merge_cells(f"A3:{last_col}3")
    ws["A3"] = "MST: 0201965047"

    # Row 4 empty
    ws.merge_cells(f"A5:{last_col}5")
    ws["A5"] = f"BẢNG KÊ QUYẾT TOÁN CƯỚC VẬN CHUYỂN THÁNG {month_label}"
    ws["A5"].font = _bold14
    ws["A5"].alignment = center

    ws.merge_cells(f"A6:{last_col}6")
    ws["A6"] = f"Từ ngày {df.strftime('%d/%m/%Y')} đến ngày {dt.strftime('%d/%m/%Y')}"
    ws["A6"].font = _bold
    ws["A6"].alignment = center

    ws["A7"] = "KHÁCH HÀNG:"
    ws.merge_cells(f"C7:{last_col}7")
    ws["C7"] = client_name
    ws["C7"].font = _bold

    ws.merge_cells(f"A8:{last_col}8")
    ws["A8"] = "Công ty TNHH AMT Phúc Lộc xin gửi tới Quý Công ty bảng kê quyết toán vận tải như sau:"

    # -- Header row 10 --
    headers = [
        "STT", "NGÀY ĐI", "CHỦ HÀNG", "SỐ CONTAINER",
        "F20'", "F40'", "E20'", "E40'",
        "SỐ XE CHẠY", "ĐIỂM ĐI", "ĐIỂM ĐẾN",
        "TÁC NGHIỆP",
    ]
    ws.append([])  # row 9 empty
    ws.append(headers)  # row 10
    for col_num in range(1, num_cols + 1):
        cell = ws.cell(row=10, column=col_num)
        cell.font = _header_font
        cell.alignment = center
        cell.border = thin_border

    # -- Subtotal row 11 --
    last_data_row = max(len(delivered_trips) + 12, 12)
    ws.append([
        "", "", "", "",
        f"=SUBTOTAL(9,E12:E{last_data_row})",
        f"=SUBTOTAL(9,F12:F{last_data_row})",
        f"=SUBTOTAL(9,G12:G{last_data_row})",
        f"=SUBTOTAL(9,H12:H{last_data_row})",
        "", "", "",
        "",
    ])
    for col_num in [5, 6, 7, 8]:
        ws.cell(row=11, column=col_num).font = _bold
        ws.cell(row=11, column=col_num).alignment = center

    # -- Data rows (12+) -- one row per DeliveredTrip
    stt = 0
    client_code = client.code or client_name

    for trip in delivered_trips:
        pickup = loc_name_by_id.get(trip.pickup_location_id or 0, "")
        dropoff = loc_name_by_id.get(trip.dropoff_location_id or 0, "")
        plate = trip.vehicle_plate or ""
        trip_date_str = trip.trip_date.strftime("%d/%m/%Y") if trip.trip_date else ""

        ct = (trip.cont_type or "").upper()

        # Cont type flags
        f20 = 1 if ct == "F20" else None
        f40 = 1 if ct == "F40" else None
        e20 = 1 if ct == "E20" else None
        e40 = 1 if ct == "E40" else None

        stt += 1
        row_num = 11 + stt
        ws.append([
            stt, trip_date_str, client_code, trip.cont_number or "",
            f20, f40, e20, e40,
            plate, pickup, dropoff,
            trip.work_type or "",
        ])

        # Styling
        for col_num in range(1, num_cols + 1):
            cell = ws.cell(row=row_num, column=col_num)
            cell.border = thin_border
            if col_num in (1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12):
                cell.alignment = center
            elif col_num == 4:
                cell.alignment = left

    # Update subtotal range to actual last row
    actual_last = 11 + stt if stt > 0 else 12
    for col_num, col_letter in [(5, "E"), (6, "F"), (7, "G"), (8, "H")]:
        ws.cell(row=11, column=col_num).value = f"=SUBTOTAL(9,{col_letter}12:{col_letter}{actual_last})"

    # -- Column widths --
    col_widths = [6, 12, 12, 18, 6, 6, 6, 6, 14, 20, 20, 16]
    for i, width in enumerate(col_widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = width

    # Freeze header
    ws.freeze_panes = "A12"

    buf = BytesIO()
    wb.save(buf)
    wb.close()
    buf.seek(0)
    return buf.getvalue(), client_name
