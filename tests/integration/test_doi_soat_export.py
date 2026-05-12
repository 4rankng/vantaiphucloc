"""Integration tests for GET /trip-orders/export-doi-soat endpoint."""

import io

import pytest
from openpyxl import load_workbook


class TestDoiSoatExport:
    """Tests for the đối soát (reconciliation) Excel export endpoint."""

    def test_doi_soat_export_with_matched_trips(
        self, api_client, admin_headers, create_partner, create_location,
        create_work_order, create_trip_order,
    ):
        """TC1: Export with matched trips returns correct Excel with only MATCHED rows."""
        partner = create_partner(name="Công ty Đối Soát Test", code="DS-TEST")
        partner_id = partner["id"]

        pickup = create_location(name="Kho ĐS A")
        dropoff = create_location(name="Cảng ĐS B")

        # Create 3 trip orders
        to1 = create_trip_order(
            partner_id=partner_id,
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            trip_date="2026-05-10",
            containers=[{"container_number": "DSNU0000010", "work_type": "E20"}],
        )
        to2 = create_trip_order(
            partner_id=partner_id,
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            trip_date="2026-05-10",
            containers=[{"container_number": "DSNU0000020", "work_type": "E40"}],
        )
        to3 = create_trip_order(
            partner_id=partner_id,
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            trip_date="2026-05-10",
            containers=[{"container_number": "DSNU0000030", "work_type": "E20"}],
        )

        # Create 2 work orders and match with first 2 trip orders
        wo1 = create_work_order(
            partner_id=partner_id,
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": "DSNU0000010", "work_type": "E20"}],
        )
        wo2 = create_work_order(
            partner_id=partner_id,
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": "DSNU0000020", "work_type": "E40"}],
        )

        # Match first 2 pairs
        resp1 = api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo1["id"], "trip_order_id": to1["id"]},
        )
        assert resp1.status_code == 200, f"Match 1 failed: {resp1.text}"

        resp2 = api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo2["id"], "trip_order_id": to2["id"]},
        )
        assert resp2.status_code == 200, f"Match 2 failed: {resp2.text}"

        # Export
        resp = api_client.get(
            "/trip-orders/export-doi-soat",
            params={"partner_id": partner_id, "date_from": "2026-05-01", "date_to": "2026-05-31"},
            headers=admin_headers,
        )
        assert resp.status_code == 200, f"Export failed: {resp.text}"

        # Verify content-disposition header
        assert "doi_soat_" in resp.headers.get("content-disposition", "")

        # Verify Excel structure
        wb = load_workbook(io.BytesIO(resp.content))
        ws = wb.active
        assert ws.title == "Công ty Đối Soát Test"[:31]

        # Check headers
        headers = [c.value for c in ws[1]]
        assert headers == ["STT", "Ngày chạy", "Số cont", "Loại", "Điểm lấy", "Điểm trả", "Biển số xe"]

        # Should have 2 data rows (only matched, to3 is pending)
        data_rows = list(ws.iter_rows(min_row=2, values_only=True))
        assert len(data_rows) == 2

        # Check sequential STT
        assert data_rows[0][0] == 1
        assert data_rows[1][0] == 2

        # Check date format
        assert data_rows[0][1] == "2026-05-10"

        # Check locations
        assert data_rows[0][4] == "Kho ĐS A"
        assert data_rows[0][5] == "Cảng ĐS B"

        wb.close()

    def test_doi_soat_export_no_matching_trips(
        self, api_client, admin_headers, create_partner, create_location,
        create_work_order, create_trip_order,
    ):
        """TC2: Date range with no trips returns Excel with only header row."""
        partner = create_partner(name="Công ty Trống", code="DS-EMPTY")
        pickup = create_location(name="Kho Trống")
        dropoff = create_location(name="Cảng Trống")

        # Create trip outside date range
        create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            trip_date="2026-04-10",
            containers=[{"container_number": "EMNU0000010", "work_type": "E20"}],
        )

        resp = api_client.get(
            "/trip-orders/export-doi-soat",
            params={"partner_id": partner["id"], "date_from": "2026-01-01", "date_to": "2026-01-31"},
            headers=admin_headers,
        )
        assert resp.status_code == 200

        wb = load_workbook(io.BytesIO(resp.content))
        ws = wb.active
        data_rows = list(ws.iter_rows(min_row=2, values_only=True))
        assert len(data_rows) == 0
        wb.close()

    def test_doi_soat_export_nonexistent_partner(self, api_client, admin_headers):
        """TC3: Non-existent partner_id returns valid Excel with only header row."""
        resp = api_client.get(
            "/trip-orders/export-doi-soat",
            params={"partner_id": 99999, "date_from": "2026-05-01", "date_to": "2026-05-31"},
            headers=admin_headers,
        )
        assert resp.status_code == 200

        wb = load_workbook(io.BytesIO(resp.content))
        ws = wb.active
        data_rows = list(ws.iter_rows(min_row=2, values_only=True))
        assert len(data_rows) == 0
        wb.close()
