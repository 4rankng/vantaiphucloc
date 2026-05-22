import logging
from io import BytesIO

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    BookedTrip,
    DeliveredTrip,
)

_logger = logging.getLogger(__name__)


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
        select(DeliveredTrip).where(
            DeliveredTrip.status == "MATCHED",
        ).order_by(DeliveredTrip.driver_id)
    )
    all_matched = result.scalars().all()

    # Filter by reconciliations and trip order date range
    matched_wo_ids = {wo.id for wo in all_matched}
    driver_earnings: dict[int, dict] = {}

    if matched_wo_ids:
        recon_result = await db.execute(
            select(Reconciliation, BookedTrip).join(
                BookedTrip, BookedTrip.id == Reconciliation.booked_trip_id
            ).where(
                Reconciliation.delivered_trip_id.in_(matched_wo_ids),
                Reconciliation.is_active == True,  # noqa: E712
                BookedTrip.trip_date >= start_dt,
                BookedTrip.trip_date <= end_dt,
            )
        )
        for recon, trip in recon_result.all():
            wo = next((w for w in all_matched if w.id == recon.delivered_trip_id), None)
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
