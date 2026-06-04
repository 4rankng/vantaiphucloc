import logging
from io import BytesIO

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    DeliveredTrip,
)

_logger = logging.getLogger(__name__)


async def generate_salary_excel(
    db: AsyncSession,
    start_date: str,
    end_date: str,
    driver_salary_repo=None,
) -> bytes:
    """Export driver earnings breakdown to Excel, computed on-the-fly from matched work orders."""
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
    from datetime import date as _date

    from app.models.base import User as _User

    start_dt = _date.fromisoformat(start_date)
    end_dt = _date.fromisoformat(end_date)

    # Find matched DeliveredTrips in the date range, grouped by driver
    result = await db.execute(
        select(DeliveredTrip).where(
            DeliveredTrip.booked_trip_id.isnot(None),
            DeliveredTrip.trip_date >= start_dt,
            DeliveredTrip.trip_date <= end_dt,
        ).order_by(DeliveredTrip.driver_id)
    )
    matched_trips = result.scalars().all()

    driver_earnings: dict[int, dict] = {}
    for wo in matched_trips:
        if wo.driver_id is None:
            continue
        if wo.driver_id not in driver_earnings:
            driver_earnings[wo.driver_id] = {
                "order_count": 0,
                "total_salary": 0,
            }
        driver_earnings[wo.driver_id]["order_count"] += 1
        driver_earnings[wo.driver_id]["total_salary"] += wo.driver_salary or 0

    # Read per-driver allowance from driver_salaries when available
    driver_allowance: dict[int, int] = {}
    if driver_salary_repo is not None:
        salary_records = await driver_salary_repo.list_for_period(start_dt, end_dt)
        for rec in salary_records:
            driver_allowance[rec.driver_id] = rec.allowance

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
        total_allowance = driver_allowance.get(driver_id, 0)
        ws.append([
            driver_name_by_id.get(driver_id, ""),
            f"{start_date} → {end_date}",
            data["order_count"],
            data["total_salary"],
            total_allowance,
            data["total_salary"] + total_allowance,
        ])

    for col in ws.columns:
        max_len = max(len(str(c.value or "")) for c in col)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 2, 40)

    buf = BytesIO()
    wb.save(buf)
    wb.close()
    buf.seek(0)
    return buf.getvalue()
