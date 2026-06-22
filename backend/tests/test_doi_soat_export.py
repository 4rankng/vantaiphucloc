from datetime import date
from io import BytesIO

import openpyxl
import pytest

from app.contexts.operations.infrastructure.excel.booked_trip_export import (
    generate_doi_soat_excel,
)
from app.models.domain import BookedTrip, Client, DeliveredTrip, Location


@pytest.mark.asyncio
async def test_doi_soat_export_includes_revenue_and_salary_columns(db_session):
    client = Client(id=1, code="KH01", name="Khach Hang 01", is_active=True)
    pickup = Location(id=1, name="Cang Tan Vu", is_active=True)
    dropoff = Location(id=2, name="Kho Hai Phong", is_active=True)
    db_session.add_all([client, pickup, dropoff])

    booked = BookedTrip(
        id=100,
        trip_date=date(2026, 6, 5),
        client_id=1,
        pickup_location_id=1,
        dropoff_location_id=2,
        work_type="NANG HA",
        cont_number="MSCU1234567",
        cont_type="F20",
    )
    delivered = DeliveredTrip(
        id=200,
        trip_date=date(2026, 6, 5),
        client_id=1,
        pickup_location_id=1,
        dropoff_location_id=2,
        work_type="NANG HA",
        cont_number="MSCU1234567",
        cont_type="F20",
        vehicle_plate="15C-12345",
        booked_trip_id=100,
        revenue=1_200_000,
        driver_salary=300_000,
        note="Tài xế báo kẹt cổng",
    )
    db_session.add_all([booked, delivered])
    await db_session.flush()

    content, _client_name = await generate_doi_soat_excel(
        db_session,
        client_id=1,
        date_from="2026-06-01",
        date_to="2026-06-30",
    )

    wb = openpyxl.load_workbook(BytesIO(content), data_only=False)
    ws = wb.active

    headers = [cell.value for cell in ws[10]]
    assert headers[12:16] == ["CƯỚC", "LƯƠNG", "TRẠNG THÁI", "GHI CHÚ"]

    row = [cell.value for cell in ws[12]]
    assert row[12] == 1_200_000
    assert row[13] == 300_000
    assert row[14] == "Đã ghép"
    assert row[15] == "Tài xế báo kẹt cổng"
