"""Excel file processing for customer reconciliation uploads."""

import logging
from io import BytesIO
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import WorkOrder, WorkOrderContainer, TripOrder, TripOrderContainer
from app.utils.iso6346 import normalize_container_number

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
    ):
        self.container_number = container_number
        self.normalized_number = normalized_number
        self.work_order_id = work_order_id
        self.trip_order_id = trip_order_id
        self.status = status  # "confirmed" | "pending" | "rejected"
        self.is_duplicate = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "container_number": self.container_number,
            "normalized_number": self.normalized_number,
            "work_order_id": self.work_order_id,
            "trip_order_id": self.trip_order_id,
            "status": self.status,
            "is_duplicate": self.is_duplicate,
        }


async def parse_customer_excel(
    file_content: bytes,
    client_id: int | None = None,
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
    client_id: int,
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

    # Query work orders for this client
    wo_query = select(WorkOrder).where(WorkOrder.client_id == client_id)
    if date_from:
        wo_query = wo_query.where(WorkOrder.created_at >= date_from)
    if date_to:
        wo_query = wo_query.where(WorkOrder.created_at <= date_to)

    wo_result = await db.execute(wo_query)
    work_orders = wo_result.scalars().all()

    # Query trip orders for this client
    to_query = select(TripOrder).where(TripOrder.client_id == client_id)
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
    for excel_cont in excel_containers:
        normalized = excel_cont["normalized"]

        # Check for duplicates in work orders
        wo_ids = wo_container_map.get(normalized, [])
        to_ids = to_container_map.get(normalized, [])

        result = ReconciliationResult(
            container_number=excel_cont["original"],
            normalized_number=normalized,
            status="pending",
        )

        if wo_ids or to_ids:
            result.is_duplicate = True
            result.work_order_id = wo_ids[0] if wo_ids else None
            result.trip_order_id = to_ids[0] if to_ids else None
            # If both WO and TO exist and are matched, mark as confirmed
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
    client_id: int,
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
    wo_query = select(WorkOrder).where(WorkOrder.client_id == client_id)
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
            select(TripOrder).where(TripOrder.client_id == client_id)
        )
        trip_orders = to_result.scalars().all()

        to_map: dict[int, TripOrder] = {to.id: to for to in trip_orders}

        # Query join table for matches
        from app.models.domain import TripOrderWorkOrder
        join_result = await db.execute(
            select(TripOrderWorkOrder).where(
                TripOrderWorkOrder.work_order_id.in_(wo_ids)
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
                    "✓" if to and to.is_confirmed else "",
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
            except:
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
