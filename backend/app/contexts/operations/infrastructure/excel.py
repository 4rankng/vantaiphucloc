"""Excel file processing for customer reconciliation uploads and trip order imports."""

import logging
import re
from datetime import date as date_type, datetime as dt
from io import BytesIO
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import WorkOrder, WorkOrderContainer, TripOrder, TripOrderContainer, Partner, PricingLine
from app.utils.iso6346 import normalize_container_number, validate_container_number

_logger = logging.getLogger(__name__)


class ReconciliationResult:
    """Result of comparing customer Excel data with system records."""

    def __init__(
        self,
        container_number: str,
        normalized_number: str,
        work_order_id: int | None = None,
        trip_order_id: int | None = None,
        status: str = "pending",
        match_type: str = "none",
    ):
        self.container_number = container_number
        self.normalized_number = normalized_number
        self.work_order_id = work_order_id
        self.trip_order_id = trip_order_id
        self.status = status  # "confirmed" | "pending" | "rejected"
        self.is_duplicate = False
        self.match_type = match_type  # "exact" | "partial" | "none"

    def to_dict(self) -> dict[str, Any]:
        return {
            "container_number": self.container_number,
            "normalized_number": self.normalized_number,
            "work_order_id": self.work_order_id,
            "trip_order_id": self.trip_order_id,
            "status": self.status,
            "is_duplicate": self.is_duplicate,
            "match_type": self.match_type,
        }


async def parse_customer_excel(
    file_content: bytes,
    partner_id: int | None = None,
) -> list[dict[str, Any]]:
    """
    Parse Excel file uploaded by customer.

    Expected columns (to be confirmed with customer):
    - Container Number (required)
    - Date (optional)
    - Pickup Location (optional)
    - Dropoff Location (optional)

    Returns list of dicts with parsed data.
    """
    try:
        import openpyxl
    except ImportError:
        _logger.error("openpyxl not installed. Install with: pip install openpyxl")
        raise ImportError("openpyxl is required for Excel processing")

    workbook = openpyxl.load_workbook(BytesIO(file_content), read_only=True)
    sheet = workbook.active

    # Get header row
    headers = [cell.value for cell in sheet[1]]
    _logger.info(f"Excel headers: {headers}")

    results = []
    for row in sheet.iter_rows(min_row=2, values_only=True):
        if not any(row):  # Skip empty rows
            continue

        row_dict = dict(zip(headers, row))
        results.append(row_dict)

    workbook.close()
    _logger.info(f"Parsed {len(results)} rows from Excel file")
    return results


async def compare_with_system_records(
    db: AsyncSession,
    partner_id: int,
    excel_data: list[dict[str, Any]],
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[ReconciliationResult]:
    """
    Compare customer Excel data with system work orders and trip orders.

    Returns list of ReconciliationResult objects with duplicate detection.
    """
    results: list[ReconciliationResult] = []

    # Extract and normalize container numbers from Excel
    excel_containers = []
    for row in excel_data:
        container_number = row.get("Container Number") or row.get("Số Container") or row.get("container_number")
        if container_number:
            normalized = normalize_container_number(str(container_number))
            excel_containers.append({
                "original": container_number,
                "normalized": normalized,
                "row_data": row,
            })

    # Query work orders for this partner
    wo_query = select(WorkOrder).where(WorkOrder.partner_id == partner_id)
    if date_from:
        wo_query = wo_query.where(WorkOrder.created_at >= date_from)
    if date_to:
        wo_query = wo_query.where(WorkOrder.created_at <= date_to)

    wo_result = await db.execute(wo_query)
    work_orders = wo_result.scalars().all()

    # Query trip orders for this partner
    to_query = select(TripOrder).where(TripOrder.partner_id == partner_id)
    if date_from:
        to_query = to_query.where(TripOrder.trip_date >= date_from)
    if date_to:
        to_query = to_query.where(TripOrder.trip_date <= date_to)

    to_result = await db.execute(to_query)
    trip_orders = to_result.scalars().all()

    # Load containers for all work orders
    wo_ids = [wo.id for wo in work_orders]
    if wo_ids:
        wo_cont_result = await db.execute(
            select(WorkOrderContainer).where(
                WorkOrderContainer.work_order_id.in_(wo_ids)
            )
        )
        wo_containers = wo_cont_result.scalars().all()

        # Build lookup: normalized container number -> list of work order IDs
        wo_container_map: dict[str, list[int]] = {}
        for wc in wo_containers:
            normalized = normalize_container_number(wc.container_number)
            if normalized not in wo_container_map:
                wo_container_map[normalized] = []
            wo_container_map[normalized].append(wc.work_order_id)

    # Load containers for all trip orders
    to_ids = [to.id for to in trip_orders]
    if to_ids:
        to_cont_result = await db.execute(
            select(TripOrderContainer).where(
                TripOrderContainer.trip_order_id.in_(to_ids)
            )
        )
        to_containers = to_cont_result.scalars().all()

        # Build lookup: normalized container number -> list of trip order IDs
        to_container_map: dict[str, list[int]] = {}
        for tc in to_containers:
            normalized = normalize_container_number(tc.container_number)
            if normalized not in to_container_map:
                to_container_map[normalized] = []
            to_container_map[normalized].append(tc.trip_order_id)

    # Compare Excel containers with system records
    # Build digits-only lookup for partial matching
    def _digits_only(s: str) -> str:
        return re.sub(r'[^0-9]', '', s)

    wo_digits_map: dict[str, list[int]] = {}
    for cn, ids in wo_container_map.items():
        digits = _digits_only(cn)
        if digits:
            wo_digits_map.setdefault(digits, []).extend(ids)

    to_digits_map: dict[str, list[int]] = {}
    for cn, ids in to_container_map.items():
        digits = _digits_only(cn)
        if digits:
            to_digits_map.setdefault(digits, []).extend(ids)

    for excel_cont in excel_containers:
        normalized = excel_cont["normalized"]

        # Check for exact matches
        wo_ids = wo_container_map.get(normalized, [])
        to_ids = to_container_map.get(normalized, [])

        match_type = "none"

        if wo_ids or to_ids:
            match_type = "exact"
        else:
            # Try digits-only partial match
            digits = _digits_only(normalized)
            if digits:
                wo_ids = list(set(wo_digits_map.get(digits, [])))
                to_ids = list(set(to_digits_map.get(digits, [])))
                if wo_ids or to_ids:
                    match_type = "partial"

        result = ReconciliationResult(
            container_number=excel_cont["original"],
            normalized_number=normalized,
            status="pending",
            match_type=match_type,
        )

        if wo_ids or to_ids:
            result.is_duplicate = True
            result.work_order_id = wo_ids[0] if wo_ids else None
            result.trip_order_id = to_ids[0] if to_ids else None
            if wo_ids and to_ids:
                result.status = "confirmed"

        results.append(result)

    _logger.info(
        f"Comparison complete: {len(results)} containers, "
        f"{sum(1 for r in results if r.is_duplicate)} duplicates found"
    )

    return results


async def generate_reconciliation_excel(
    db: AsyncSession,
    partner_id: int,
    date_from: str | None = None,
    date_to: str | None = None,
) -> bytes:
    """
    Generate Excel file with reconciliation data for export.

    Returns Excel file content as bytes.
    """
    try:
        import openpyxl
        from openpyxl.styles import Font, Alignment, PatternFill
    except ImportError:
        _logger.error("openpyxl not installed")
        raise ImportError("openpyxl is required for Excel generation")

    # Create workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Đối soát"

    # Define styles
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center")

    # Add headers
    headers = [
        "Số Container",
        "Số cont chuẩn hóa",
        "Mã WO",
        "Mã TO",
        "Trạng thái",
        "Đã chốt",
        "Ngày chạy",
    ]
    ws.append(headers)

    # Style headers
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_num)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment

    # Query data
    wo_query = select(WorkOrder).where(WorkOrder.partner_id == partner_id)
    if date_from:
        wo_query = wo_query.where(WorkOrder.created_at >= date_from)
    if date_to:
        wo_query = wo_query.where(WorkOrder.created_at <= date_to)

    wo_result = await db.execute(wo_query)
    work_orders = wo_result.scalars().all()

    wo_ids = [wo.id for wo in work_orders]
    if wo_ids:
        wo_cont_result = await db.execute(
            select(WorkOrderContainer).where(
                WorkOrderContainer.work_order_id.in_(wo_ids)
            )
        )
        wo_containers = wo_cont_result.scalars().all()

        # Group containers by work order
        wo_cont_map: dict[int, list[WorkOrderContainer]] = {}
        for wc in wo_containers:
            if wc.work_order_id not in wo_cont_map:
                wo_cont_map[wc.work_order_id] = []
            wo_cont_map[wc.work_order_id].append(wc)

        # Check for matched trip orders
        to_result = await db.execute(
            select(TripOrder).where(TripOrder.partner_id == partner_id)
        )
        trip_orders = to_result.scalars().all()

        to_map: dict[int, TripOrder] = {to.id: to for to in trip_orders}

        # Query Reconciliation table for matches
        from app.models.domain import Reconciliation as ReconciliationModel
        join_result = await db.execute(
            select(ReconciliationModel).where(
                ReconciliationModel.work_order_id.in_(wo_ids),
                ReconciliationModel.is_active == True,  # noqa: E712
            )
        )
        joins = join_result.scalars().all()

        wo_to_map: dict[int, int] = {j.work_order_id: j.trip_order_id for j in joins}

        # Add data rows
        row_num = 2
        for wo in work_orders:
            containers = wo_cont_map.get(wo.id, [])
            for wc in containers:
                to_id = wo_to_map.get(wo.id)
                to = to_map.get(to_id) if to_id else None

                status = "Chưa khớp"
                if to:
                    status = "Đã khớp"

                ws.append([
                    wc.container_number,
                    normalize_container_number(wc.container_number),
                    f"WO#{wo.id}",
                    f"TO#{to_id}" if to_id else "",
                    status,
                    "✓" if to else "",
                    wo.created_at.date() if wo.created_at else "",
                ])

                # Highlight duplicate containers
                if to:
                    cell = ws.cell(row=row_num, column=1)
                    cell.fill = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")

                row_num += 1

    # Auto-adjust column widths
    for column in ws.columns:
        max_length = 0
        column_letter = column[0].column_letter
        for cell in column:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except Exception:
                pass
        adjusted_width = min(max_length + 2, 50)
        ws.column_dimensions[column_letter].width = adjusted_width

    # Save to bytes
    excel_buffer = BytesIO()
    wb.save(excel_buffer)
    excel_buffer.seek(0)
    content = excel_buffer.getvalue()
    wb.close()

    _logger.info(f"Generated Excel file with {row_num - 1} data rows")
    return content


# ---------------------------------------------------------------------------
# Trip Order Excel Import
# ---------------------------------------------------------------------------

# Vietnamese/English column name mappings
_TRIP_IMPORT_COLUMNS = {
    "ngay": "trip_date",
    "date": "trip_date",
    "ngay_chay": "trip_date",
    "trip_date": "trip_date",
    "ma_kh": "client_code",
    "client_code": "client_code",
    "khach_hang": "client_code",
    "ma_khach_hang": "client_code",
    "diem_lay": "pickup_location",
    "pickup": "pickup_location",
    "pickup_location": "pickup_location",
    "diem_tra": "dropoff_location",
    "dropoff": "dropoff_location",
    "dropoff_location": "dropoff_location",
    "cung_duong": "route",
    "route": "route",
    "so_cont": "container_number",
    "container": "container_number",
    "container_number": "container_number",
    "loai": "work_type",
    "work_type": "work_type",
    "loai_cont": "work_type",
    "don_gia": "unit_price",
    "unit_price": "unit_price",
    "luong_tx": "driver_salary",
    "driver_salary": "driver_salary",
    "phu_cap": "allowance",
    "allowance": "allowance",
}


def _normalize_trip_import_header(header: str) -> str:
    """Map Vietnamese/English header to standard field name."""
    if not header:
        return ""
    normalized = re.sub(r'[^a-zA-Z0-9_]', '_', str(header).strip().lower())
    return _TRIP_IMPORT_COLUMNS.get(normalized, normalized)


async def parse_trip_order_excel(file_content: bytes) -> list[dict[str, Any]]:
    """Parse Excel file for batch trip order import.

    Expected columns (Vietnamese or English):
    - trip_date (Ngày/Ngày chạy)
    - client_code (Mã KH/Mã khách hàng)
    - pickup_location (Điểm lấy) + dropoff_location (Điểm trả) or route (Cung đường)
    - container_number (Số cont/Container)
    - work_type (Loại/Loại cont) — E20/E40/F20/F40
    - unit_price (Đơn giá) — optional
    - driver_salary (Lương TX) — optional
    - allowance (Phụ cấp) — optional
    """
    try:
        import openpyxl
    except ImportError:
        raise ImportError("openpyxl is required for Excel processing")

    workbook = openpyxl.load_workbook(BytesIO(file_content), read_only=True)
    sheet = workbook.active

    raw_headers = [cell.value for cell in sheet[1]]
    headers = [_normalize_trip_import_header(h) for h in raw_headers]

    results = []
    for row in sheet.iter_rows(min_row=2, values_only=True):
        if not any(row):
            continue
        row_dict = {}
        for col_idx, value in enumerate(row):
            if col_idx < len(headers) and headers[col_idx]:
                row_dict[headers[col_idx]] = value
        results.append(row_dict)

    workbook.close()
    _logger.info(f"Parsed {len(results)} trip order rows from Excel")
    return results


async def import_trip_orders(
    db: AsyncSession,
    rows: list[dict[str, Any]],
    user_id: int,
) -> dict[str, Any]:
    """Validate and create trip orders from parsed Excel rows.

    Groups rows by (trip_date, client_code) to form trip orders.
    Returns { created: int, errors: list[str] }.
    """
    from app.contexts.customer_pricing.infrastructure.pricing_lookup import (
        find_tiered_pricing,
    )

    created = 0
    errors: list[str] = []
    warnings: list[str] = []

    # Group rows by trip key
    groups: dict[tuple, list[dict]] = {}
    for i, row in enumerate(rows):
        trip_date = row.get("trip_date")
        client_code = row.get("client_code")

        if not trip_date or not client_code:
            errors.append(f"Dòng {i + 2}: thiếu ngày hoặc mã khách hàng")
            continue

        if isinstance(trip_date, str):
            try:
                trip_date = dt.strptime(trip_date, "%Y-%m-%d").date()
            except ValueError:
                try:
                    trip_date = dt.strptime(trip_date, "%d/%m/%Y").date()
                except ValueError:
                    errors.append(f"Dòng {i + 2}: định dạng ngày không hợp lệ '{trip_date}'")
                    continue
        elif hasattr(trip_date, "date"):
            pass  # already a date

        key = (str(trip_date), str(client_code))
        groups.setdefault(key, []).append(row)

    for key, group_rows in groups.items():
        trip_date, client_code_str = key

        # Look up partner by code
        partner_result = await db.execute(
            select(Partner).where(Partner.code == client_code_str)
        )
        partner = partner_result.scalar_one_or_none()
        if not partner:
            errors.append(f"Nhóm {key}: không tìm thấy đối tác mã '{client_code_str}'")
            continue

        first_row = group_rows[0]
        pickup = first_row.get("pickup_location")
        dropoff = first_row.get("dropoff_location")
        route = first_row.get("route") or (f"{pickup} - {dropoff}" if pickup and dropoff else "")

        # Build containers (normalize numbers — strip hyphens, uppercase)
        containers_data = []
        for row in group_rows:
            cn = normalize_container_number(str(row.get("container_number", "")).strip())
            wt = str(row.get("work_type", "")).strip().upper()
            if cn:
                valid, err = validate_container_number(cn)
                if not valid:
                    errors.append(f"Nhóm {key}: Container {cn} không hợp lệ — {err}")
                    continue
                containers_data.append({"container_number": cn, "work_type": wt or "E20"})

        if not containers_data:
            errors.append(f"Nhóm {key}: không có số container")
            continue

        work_type = containers_data[0]["work_type"]
        container_count = sum(1 for c in containers_data if c["work_type"] == work_type) or 1

        # Try auto-pricing
        unit_price = int(first_row.get("unit_price") or 0)
        driver_salary = int(first_row.get("driver_salary") or 0)
        allowance = int(first_row.get("allowance") or 0)
        pricing_id = None

        # Resolve pickup/dropoff strings to Location FKs via the alias
        # resolver. Auto-creates if missing.
        from app.contexts.customer_pricing.infrastructure.location_resolver import (
            LocationResolverService,
            ResolverSource,
        )
        resolver = LocationResolverService(db)
        pickup_id = None
        dropoff_id = None
        if pickup:
            r = await resolver.resolve_or_create(pickup, source=ResolverSource.MANUAL, user_id=user_id)
            pickup_id = r.location.id if r.location else None
        if dropoff:
            r = await resolver.resolve_or_create(dropoff, source=ResolverSource.MANUAL, user_id=user_id)
            dropoff_id = r.location.id if r.location else None
        if not pickup_id or not dropoff_id:
            errors.append(f"Nhóm {key}: pickup/dropoff không có")
            continue

        if not unit_price:
            tiered = await find_tiered_pricing(
                db, partner_id=partner.id, work_type=work_type,
                quantity=container_count,
                pickup_location_id=pickup_id, dropoff_location_id=dropoff_id,
            )
            if tiered:
                unit_price = tiered.unit_price
                driver_salary = tiered.driver_salary
                allowance = tiered.allowance
                pricing_id = tiered.pricing.id

        trip_date_val = date_type.fromisoformat(str(trip_date)) if isinstance(trip_date, str) else trip_date

        trip_order = TripOrder(
            trip_date=trip_date_val,
            partner_id=partner.id,
            pickup_location_id=pickup_id,
            dropoff_location_id=dropoff_id,
            pricing_id=pricing_id,
            unit_price=unit_price,
            driver_salary=driver_salary,
            allowance=allowance,
            status="PENDING",
        )
        db.add(trip_order)
        await db.flush()

        for c in containers_data:
            db.add(TripOrderContainer(
                trip_order_id=trip_order.id,
                container_number=c["container_number"],
                work_type=c["work_type"],
            ))

        created += 1

    await db.commit()
    return {"created": created, "errors": errors, "warnings": warnings}


def generate_trip_order_template() -> bytes:
    """Generate a blank Excel template for trip order import."""
    headers = [
        "Ngày", "Mã KH", "Điểm lấy", "Điểm trả",
        "Cung đường", "Số cont", "Loại cont", "Đơn giá",
        "Lương TX", "Phụ cấp",
    ]
    examples = [
        "01/05/2026", "KH001", "Cát lái", "KC Bình Dương",
        "Cát lái - KC Bình Dương", "TCLU1234567", "E20", "1500000",
        "500000", "100000",
    ]
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.title = "Nhập chuyến"
    sheet.append(headers)
    sheet.append(examples)

    for col in sheet.iter_cols(min_row=1, max_row=1):
        for cell in col:
            cell.font = openpyxl.styles.Font(bold=True)

    buf = io.BytesIO()
    workbook.save(buf)
    workbook.close()
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Excel Export for Work Orders, Trip Orders, Salary
# ---------------------------------------------------------------------------

async def generate_work_orders_excel(
    db: AsyncSession,
    date_from: str | None = None,
    date_to: str | None = None,
    status: str | None = None,
) -> bytes:
    """Export work orders to Excel."""
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment

    query = select(WorkOrder).order_by(WorkOrder.id.desc())
    if date_from:
        query = query.where(WorkOrder.created_at >= date_from)
    if date_to:
        query = query.where(WorkOrder.created_at <= date_to)
    if status:
        query = query.where(WorkOrder.status == status)

    result = await db.execute(query)
    work_orders = result.scalars().all()

    wo_ids = [wo.id for wo in work_orders]
    containers_map: dict[int, list[WorkOrderContainer]] = {}
    if wo_ids:
        cont_result = await db.execute(
            select(WorkOrderContainer).where(WorkOrderContainer.work_order_id.in_(wo_ids))
        )
        for c in cont_result.scalars().all():
            containers_map.setdefault(c.work_order_id, []).append(c)

    # Resolve display names via JOIN (denormalized cols dropped).
    from app.models.domain import Partner, Location, Vehicle
    from app.models.base import User as _User
    partner_ids = {wo.partner_id for wo in work_orders}
    driver_ids = {wo.driver_id for wo in work_orders}
    loc_ids = {wo.pickup_location_id for wo in work_orders} | {wo.dropoff_location_id for wo in work_orders}
    loc_ids.discard(None)
    partner_name_by_id = {c.id: c.name for c in (await db.execute(select(Partner).where(Partner.id.in_(partner_ids)))).scalars().all()} if partner_ids else {}
    driver_name_by_id = {u.id: (u.full_name or u.username) for u in (await db.execute(select(_User).where(_User.id.in_(driver_ids)))).scalars().all()} if driver_ids else {}
    loc_name_by_id = {l.id: l.name for l in (await db.execute(select(Location).where(Location.id.in_(loc_ids)))).scalars().all()} if loc_ids else {}
    vehicle_ids = {wo.vehicle_id for wo in work_orders if wo.vehicle_id}
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
    for wo in work_orders:
        containers = containers_map.get(wo.id, [])
        plate = vehicle_by_id.get(wo.vehicle_id).plate if wo.vehicle_id and wo.vehicle_id in vehicle_by_id else ""
        for c in containers:
            ws.append([
                f"WO#{wo.id}", partner_name_by_id.get(wo.partner_id, ""),
                loc_name_by_id.get(wo.pickup_location_id, ""),
                loc_name_by_id.get(wo.dropoff_location_id, ""),
                driver_name_by_id.get(wo.driver_id, ""), plate,
                wo.vessel or "",
                c.container_number, c.work_type,
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


async def generate_trip_orders_excel(
    db: AsyncSession,
    date_from: str | None = None,
    date_to: str | None = None,
    status: str | None = None,
    partner_id: int | None = None,
) -> bytes:
    """Export trip orders to Excel.

    When partner_id is provided, filters to that partner and includes
    match status columns for customer reconciliation.
    """
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment

    query = select(TripOrder).order_by(TripOrder.id.desc())
    if partner_id:
        query = query.where(TripOrder.partner_id == partner_id)
    if date_from:
        query = query.where(TripOrder.trip_date >= date_from)
    if date_to:
        query = query.where(TripOrder.trip_date <= date_to)
    if status:
        query = query.where(TripOrder.status == status)

    result = await db.execute(query)
    trip_orders = result.scalars().all()

    to_ids = [to.id for to in trip_orders]
    containers_map: dict[int, list[TripOrderContainer]] = {}
    if to_ids:
        cont_result = await db.execute(
            select(TripOrderContainer).where(TripOrderContainer.trip_order_id.in_(to_ids))
        )
        for c in cont_result.scalars().all():
            containers_map.setdefault(c.trip_order_id, []).append(c)

    # Resolve display names via JOIN.
    from app.models.domain import Partner, Location
    partner_ids = {to.partner_id for to in trip_orders}
    loc_ids = {to.pickup_location_id for to in trip_orders} | {to.dropoff_location_id for to in trip_orders}
    loc_ids.discard(None)
    partner_name_by_id = {c.id: c.name for c in (await db.execute(select(Partner).where(Partner.id.in_(partner_ids)))).scalars().all()} if partner_ids else {}
    loc_name_by_id = {l.id: l.name for l in (await db.execute(select(Location).where(Location.id.in_(loc_ids)))).scalars().all()} if loc_ids else {}

    # For per-partner export: load match status and vehicle plates
    match_map: dict[int, str] = {}  # to_id -> "Đã khớp" / "Chưa khớp"
    plate_map: dict[int, str] = {}  # to_id -> plate
    vessel_map: dict[int, str] = {}  # to_id -> vessel
    partner_name = None
    if partner_id:
        # Get partner name for filename
        p_result = await db.execute(select(Partner).where(Partner.id == partner_id))
        partner_obj = p_result.scalar_one_or_none()
        partner_name = partner_obj.name if partner_obj else None

        # Load reconciliation links to determine match status
        from app.models.domain import Reconciliation
        if to_ids:
            recon_result = await db.execute(
                select(Reconciliation.trip_order_id).where(
                    Reconciliation.trip_order_id.in_(to_ids),
                    Reconciliation.is_active == True,  # noqa: E712
                )
            )
            matched_to_ids = {r for (r,) in recon_result.all()}
            for to_id in to_ids:
                match_map[to_id] = "Đã khớp" if to_id in matched_to_ids else "Chưa khớp"

        # Load driver plates via work orders linked to these TOs
        from app.models.base import User as _User
        from app.models.domain import Vehicle
        if to_ids:
            # Get driver_ids from work orders linked via reconciliation
            recon_wo_result = await db.execute(
                select(Reconciliation.work_order_id, Reconciliation.trip_order_id).where(
                    Reconciliation.trip_order_id.in_(to_ids),
                    Reconciliation.is_active == True,  # noqa: E712
                )
            )
            wo_to_pairs = recon_wo_result.all()
            wo_ids = list({r[0] for r in wo_to_pairs})

            if wo_ids:
                wo_result = await db.execute(
                    select(WorkOrder.id, WorkOrder.driver_id, WorkOrder.vessel).where(WorkOrder.id.in_(wo_ids))
                )
                wo_driver_map = {r[0]: r[1] for r in wo_result.all()}
                wo_vessel_map = {r[0]: (r[2] or "") for r in wo_result.all()}
                driver_ids = list(set(wo_driver_map.values()))

                if driver_ids:
                    v_result = await db.execute(
                        select(Vehicle.driver_id, Vehicle.plate).where(
                            Vehicle.driver_id.in_(driver_ids),
                            Vehicle.is_active == True,  # noqa: E712
                        )
                    )
                    driver_plate_map = dict(v_result.all())

                    for wo_id, to_id in wo_to_pairs:
                        driver_id = wo_driver_map.get(wo_id)
                        if driver_id and driver_id in driver_plate_map:
                            plate_map[to_id] = driver_plate_map[driver_id]
                        vessel = wo_vessel_map.get(wo_id, "")
                        if vessel:
                            vessel_map[to_id] = vessel

    wb = openpyxl.Workbook()
    ws = wb.active

    if partner_id:
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

    status_labels = {"PENDING": "Chờ ghép", "MATCHED": "Đã đối soát"}

    if partner_id:
        stt = 0
        for to in trip_orders:
            containers = containers_map.get(to.id, [])
            pickup = loc_name_by_id.get(to.pickup_location_id, "")
            dropoff = loc_name_by_id.get(to.dropoff_location_id, "")
            route = f"{pickup} → {dropoff}" if pickup and dropoff else ""
            plate = plate_map.get(to.id, "")
            match_status = match_map.get(to.id, "Chưa khớp")
            for c in containers:
                stt += 1
                ws.append([
                    stt,
                    c.container_number,
                    route,
                    to.trip_date,
                    plate,
                    vessel_map.get(to.id, ""),
                    match_status,
                    to.unit_price or "",
                ])
    else:
        for to in trip_orders:
            containers = containers_map.get(to.id, [])
            for c in containers:
                ws.append([
                    f"TO#{to.id}", to.trip_date,
                    partner_name_by_id.get(to.partner_id, ""),
                    loc_name_by_id.get(to.pickup_location_id, ""),
                    loc_name_by_id.get(to.dropoff_location_id, ""),
                    c.container_number, c.work_type,
                    to.unit_price, to.driver_salary, to.allowance,
                    status_labels.get(to.status, to.status),
                ])

    for col in ws.columns:
        max_len = max(len(str(c.value or "")) for c in col)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 2, 40)

    buf = BytesIO()
    wb.save(buf)
    wb.close()
    buf.seek(0)
    return buf.getvalue(), partner_name


async def generate_doi_soat_excel(
    db: AsyncSession,
    partner_id: int,
    date_from: str,
    date_to: str,
) -> tuple[bytes, str]:
    """Generate reconciliation (đối soát) Excel for a specific partner.

    Returns (excel_bytes, partner_name) tuple.
    Only includes MATCHED trip orders within the date range.
    Columns: STT | Ngày chạy | Số cont | Loại | Điểm lấy | Điểm trả | Tác nghiệp | Biển số xe | Số tàu | Đơn giá
    Summary row at the bottom: count per work type + total amount.
    """
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    from app.models.domain import Partner, Location, Reconciliation, Vehicle
    from app.models.base import User as _User

    # ── 1. Load partner ───────────────────────────────────────────────────────
    p_result = await db.execute(select(Partner).where(Partner.id == partner_id))
    partner = p_result.scalar_one_or_none()
    partner_name = partner.name if partner else f"Partner #{partner_id}"

    from datetime import date as date_type

    df = date_type.fromisoformat(date_from)
    dt = date_type.fromisoformat(date_to)

    # ── 2. Load MATCHED trip orders ───────────────────────────────────────────
    to_query = select(TripOrder).where(
        TripOrder.partner_id == partner_id,
        TripOrder.trip_date >= df,
        TripOrder.trip_date <= dt,
        TripOrder.status == "MATCHED",
    ).order_by(TripOrder.trip_date, TripOrder.id)
    to_result = await db.execute(to_query)
    trip_orders = to_result.scalars().all()

    to_ids = [to.id for to in trip_orders]

    # ── 3. Load containers ───────────────────────────────────────────────────
    containers_map: dict[int, list[TripOrderContainer]] = {}
    if to_ids:
        cont_result = await db.execute(
            select(TripOrderContainer).where(TripOrderContainer.trip_order_id.in_(to_ids))
        )
        for c in cont_result.scalars().all():
            containers_map.setdefault(c.trip_order_id, []).append(c)

    # ── 4. Load location names ───────────────────────────────────────────────
    loc_ids: set[int] = set()
    for to in trip_orders:
        if to.pickup_location_id:
            loc_ids.add(to.pickup_location_id)
        if to.dropoff_location_id:
            loc_ids.add(to.dropoff_location_id)
    loc_name_by_id: dict[int, str] = {}
    if loc_ids:
        loc_result = await db.execute(select(Location).where(Location.id.in_(loc_ids)))
        loc_name_by_id = {loc.id: loc.name for loc in loc_result.scalars().all()}

    # ── 5. Load plate + vessel + operation_type via Reconciliation → WorkOrder ─
    plate_map: dict[int, str] = {}   # to_id -> plate string
    vessel_map: dict[int, str] = {}  # to_id -> vessel string
    op_type_map: dict[int, str] = {} # to_id -> operation_type label
    _op_labels = {
        "XUAT_TAU": "Xuất tàu",
        "NHAP_TAU": "Nhập tàu",
        "CHUYEN_BAI": "Chuyển bãi",
        "KHAC": "Khác",
    }

    if to_ids:
        recon_result = await db.execute(
            select(Reconciliation.work_order_id, Reconciliation.trip_order_id).where(
                Reconciliation.trip_order_id.in_(to_ids),
                Reconciliation.is_active == True,  # noqa: E712
            )
        )
        wo_to_pairs = recon_result.all()
        wo_ids = list({r[0] for r in wo_to_pairs})

        if wo_ids:
            wo_result = await db.execute(
                select(
                    WorkOrder.id, WorkOrder.driver_id, WorkOrder.vessel,
                    WorkOrder.vendor_partner_id, WorkOrder.vehicle_external_plate,
                    WorkOrder.operation_type,
                ).where(WorkOrder.id.in_(wo_ids))
            )
            wo_rows = wo_result.all()
            wo_driver_map   = {r[0]: r[1] for r in wo_rows}
            wo_vessel_map   = {r[0]: (r[2] or "") for r in wo_rows}
            wo_ext_plate_map = {r[0]: r[4] for r in wo_rows if r[3]}
            wo_op_type_map  = {r[0]: (r[5] or "") for r in wo_rows}
            driver_ids = [d for d in wo_driver_map.values() if d is not None]

            driver_plate_map: dict[int, str] = {}
            if driver_ids:
                v_result = await db.execute(
                    select(Vehicle.driver_id, Vehicle.plate).where(
                        Vehicle.driver_id.in_(driver_ids),
                        Vehicle.is_active == True,  # noqa: E712
                    )
                )
                driver_plate_map = dict(v_result.all())

            for wo_id, to_id in wo_to_pairs:
                if wo_id in wo_ext_plate_map and wo_ext_plate_map[wo_id]:
                    plate_map[to_id] = wo_ext_plate_map[wo_id]
                else:
                    d_id = wo_driver_map.get(wo_id)
                    if d_id and d_id in driver_plate_map:
                        plate_map[to_id] = driver_plate_map[d_id]
                vessel = wo_vessel_map.get(wo_id, "")
                if vessel:
                    vessel_map[to_id] = vessel
                op = wo_op_type_map.get(wo_id, "")
                if op:
                    op_type_map[to_id] = _op_labels.get(op, op)

    # ── 6. Build Excel workbook ───────────────────────────────────────────────
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = partner_name[:31]

    # ── Styles ────────────────────────────────────────────────────────────────
    thin_side = Side(style="thin", color="BBBBBB")
    thin_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
    thick_bottom = Border(
        left=thin_side, right=thin_side,
        top=Side(style="thin", color="BBBBBB"),
        bottom=Side(style="medium", color="1F4E79"),
    )
    _blue_dark   = "1F4E79"
    _blue_header = "2E75B6"
    _blue_light  = "DEEAF1"
    _yellow_sum  = "FFF2CC"
    _white       = "FFFFFF"
    _grey_row    = "F5F8FC"

    # ── Title block (rows 1–3) ────────────────────────────────────────────────
    num_cols = 10  # number of data columns
    last_col_letter = get_column_letter(num_cols)

    # Row 1: Company + report title
    ws.append(["VẬN TẢI PHÚC LỘC", "", "", "", "", "", "", "", "", ""])
    ws.merge_cells(f"A1:{last_col_letter}1")
    title_cell = ws["A1"]
    title_cell.font = Font(bold=True, size=14, color=_blue_dark)
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 24

    # Row 2: Subtitle
    month_range_str = f"Từ {df.strftime('%d/%m/%Y')} đến {dt.strftime('%d/%m/%Y')}"
    ws.append([f"BẢNG ĐỐI SOÁT – {partner_name.upper()} – {month_range_str}", *[""] * (num_cols - 1)])
    ws.merge_cells(f"A2:{last_col_letter}2")
    subtitle_cell = ws["A2"]
    subtitle_cell.font = Font(bold=True, size=11, color=_blue_dark)
    subtitle_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[2].height = 20

    # Row 3: empty spacer
    ws.append([""] * num_cols)
    ws.row_dimensions[3].height = 6

    # ── Header row (row 4) ────────────────────────────────────────────────────
    headers = [
        "STT", "Ngày chạy", "Số cont", "Loại cont",
        "Điểm lấy", "Điểm trả",
        "Tác nghiệp", "Biển số xe", "Số tàu", "Đơn giá (VNĐ)"
    ]
    ws.append(headers)
    header_row = 4
    header_font = Font(bold=True, color=_white, size=10)
    header_fill = PatternFill(start_color=_blue_header, end_color=_blue_header, fill_type="solid")
    for col_num in range(1, num_cols + 1):
        cell = ws.cell(row=header_row, column=col_num)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thick_bottom
    ws.row_dimensions[header_row].height = 32

    # Freeze rows 1–4 (title + header)
    ws.freeze_panes = ws.cell(row=5, column=1)

    # ── Data rows ─────────────────────────────────────────────────────────────
    WORK_TYPE_FULL = {
        "E20": "Rỗng 20ft", "E40": "Rỗng 40ft",
        "F20": "Hàng 20ft", "F40": "Hàng 40ft",
    }
    stt = 0
    type_count: dict[str, int] = {}
    total_amount = 0

    for row_idx, to in enumerate(trip_orders):
        containers = containers_map.get(to.id, [])
        pickup  = loc_name_by_id.get(to.pickup_location_id or 0, "")
        dropoff = loc_name_by_id.get(to.dropoff_location_id or 0, "")
        plate   = plate_map.get(to.id, "")
        vessel  = vessel_map.get(to.id, "")
        op_type = op_type_map.get(to.id, "")
        unit_price = to.unit_price or 0
        trip_date_str = to.trip_date.strftime("%d/%m/%Y") if to.trip_date else ""

        # Fill colour alternates every trip (not every row) for readability
        fill_color = _white if row_idx % 2 == 0 else _grey_row
        row_fill = PatternFill(start_color=fill_color, end_color=fill_color, fill_type="solid")

        for c in containers:
            stt += 1
            wt_label = WORK_TYPE_FULL.get(c.work_type or "", c.work_type or "")
            type_count[wt_label] = type_count.get(wt_label, 0) + 1
            total_amount += unit_price

            data_row = [
                stt, trip_date_str, c.container_number, wt_label,
                pickup, dropoff, op_type, plate, vessel, unit_price or "",
            ]
            ws.append(data_row)
            data_row_num = ws.max_row

            for col_num in range(1, num_cols + 1):
                cell = ws.cell(row=data_row_num, column=col_num)
                cell.fill = row_fill
                cell.border = thin_border
                cell.alignment = Alignment(vertical="center")
                if col_num == 1:  # STT
                    cell.alignment = Alignment(horizontal="center", vertical="center")
                if col_num == 10 and unit_price:  # Đơn giá
                    cell.number_format = '#,##0'
                    cell.alignment = Alignment(horizontal="right", vertical="center")
            ws.row_dimensions[data_row_num].height = 18

    # ── Summary rows ──────────────────────────────────────────────────────────
    sum_fill = PatternFill(start_color=_blue_light, end_color=_blue_light, fill_type="solid")
    sum_font_bold = Font(bold=True, size=10, color=_blue_dark)

    # Spacer row
    ws.append([""] * num_cols)

    # Count per loại cont
    ws.append(["Tổng hợp theo loại container:", *[""] * (num_cols - 1)])
    label_row = ws.max_row
    ws.merge_cells(f"A{label_row}:J{label_row}")
    ws[f"A{label_row}"].font = sum_font_bold
    ws[f"A{label_row}"].fill = sum_fill

    for wt_label, count in sorted(type_count.items()):
        ws.append(["", f"  {wt_label}", count, "cont", *[""] * (num_cols - 4)])
        r = ws.max_row
        for col_num in range(1, num_cols + 1):
            ws.cell(row=r, column=col_num).fill = sum_fill
        ws.cell(row=r, column=2).font = Font(size=10)
        ws.cell(row=r, column=3).font = Font(bold=True, size=10, color=_blue_dark)

    # Total rows
    total_row_cells: list[list] = [
        ["Tổng số container:", *[""] * 3, "", "", "", "", "", stt],
    ]
    if total_amount:
        total_row_cells.append(["Tổng đơn giá:", *[""] * 3, "", "", "", "", "", total_amount])

    total_fill = PatternFill(start_color=_yellow_sum, end_color=_yellow_sum, fill_type="solid")
    for row_data in total_row_cells:
        ws.append(row_data)
        r = ws.max_row
        ws.merge_cells(f"A{r}:I{r}")
        label_cell = ws.cell(row=r, column=1)
        val_cell   = ws.cell(row=r, column=10)
        label_cell.font = Font(bold=True, size=10, color=_blue_dark)
        val_cell.font   = Font(bold=True, size=11, color=_blue_dark)
        val_cell.number_format = '#,##0'
        val_cell.alignment = Alignment(horizontal="right", vertical="center")
        for col_num in range(1, num_cols + 1):
            ws.cell(row=r, column=col_num).fill = total_fill

    # ── Column widths ─────────────────────────────────────────────────────────
    col_widths = [6, 12, 16, 14, 24, 24, 14, 14, 14, 16]
    for i, width in enumerate(col_widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = width

    buf = BytesIO()
    wb.save(buf)
    wb.close()
    buf.seek(0)
    return buf.getvalue(), partner_name


async def generate_salary_excel(
    db: AsyncSession,
    start_date: str,
    end_date: str,
) -> bytes:
    """Export driver earnings breakdown to Excel, computed on-the-fly from matched work orders."""
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
    from app.models.domain import Reconciliation
    from datetime import date as _date

    from app.models.base import User as _User

    start_dt = _date.fromisoformat(start_date)
    end_dt = _date.fromisoformat(end_date)

    # Find matched work orders in the date range
    result = await db.execute(
        select(WorkOrder).where(
            WorkOrder.status == "MATCHED",
        ).order_by(WorkOrder.driver_id)
    )
    all_matched = result.scalars().all()

    # Filter by reconciliations and trip order date range
    # Get work order IDs that have active reconciliations with trip_orders in the date range
    matched_wo_ids = {wo.id for wo in all_matched}
    driver_earnings: dict[int, dict] = {}

    if matched_wo_ids:
        recon_result = await db.execute(
            select(Reconciliation, TripOrder).join(
                TripOrder, TripOrder.id == Reconciliation.trip_order_id
            ).where(
                Reconciliation.work_order_id.in_(matched_wo_ids),
                Reconciliation.is_active == True,  # noqa: E712
                TripOrder.trip_date >= start_dt,
                TripOrder.trip_date <= end_dt,
            )
        )
        for recon, trip in recon_result.all():
            wo = next((w for w in all_matched if w.id == recon.work_order_id), None)
            if wo is None:
                continue
            if wo.driver_id not in driver_earnings:
                driver_earnings[wo.driver_id] = {
                    "order_count": 0,
                    "total_salary": 0,
                    "total_allowance": 0,
                }
            driver_earnings[wo.driver_id]["order_count"] += 1
            driver_earnings[wo.driver_id]["total_salary"] += wo.driver_salary
            driver_earnings[wo.driver_id]["total_allowance"] += wo.allowance

    driver_ids = set(driver_earnings.keys())
    driver_name_by_id = (
        {u.id: (u.full_name or u.username) for u in
         (await db.execute(select(_User).where(_User.id.in_(driver_ids)))).scalars().all()}
        if driver_ids else {}
    )

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Bảng lương"

    headers = ["Tài xế", "Kỳ lương", "Số chuyến", "Tổng lương", "Phụ cấp", "Tổng thu nhập"]
    ws.append(headers)

    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_num)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")

    for driver_id, data in sorted(driver_earnings.items()):
        ws.append([
            driver_name_by_id.get(driver_id, ""),
            f"{start_date} → {end_date}",
            data["order_count"],
            data["total_salary"],
            data["total_allowance"],
            data["total_salary"] + data["total_allowance"],
        ])

    for col in ws.columns:
        max_len = max(len(str(c.value or "")) for c in col)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 2, 40)

    buf = BytesIO()
    wb.save(buf)
    wb.close()
    buf.seek(0)
    return buf.getvalue()
