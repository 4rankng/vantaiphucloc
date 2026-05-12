"""Integration tests for GET /trip-orders/export-doi-soat endpoint."""

import io
import random
import string
from uuid import uuid4

import pytest
from openpyxl import load_workbook

_ISO_LETTER_MAP = {
    "A": 10, "B": 12, "C": 13, "D": 14, "E": 15, "F": 16, "G": 17, "H": 18, "I": 19,
    "J": 20, "K": 21, "L": 23, "M": 24, "N": 25, "O": 26, "P": 27, "Q": 28, "R": 29,
    "S": 30, "T": 31, "U": 32, "V": 34, "W": 35, "X": 36, "Y": 37, "Z": 38,
}
_ISO_POWERS = [2**i for i in range(10)]


def _uid() -> str:
    return uuid4().hex[:8]


def _container_number() -> str:
    prefix = ''.join(random.choices(string.ascii_uppercase, k=4))
    serial = ''.join(random.choices(string.digits, k=6))
    base = prefix + serial
    total = 0
    for i, ch in enumerate(base):
        value = _ISO_LETTER_MAP[ch] if ch.isalpha() else int(ch)
        total += value * _ISO_POWERS[i]
    check = total % 11
    if check == 10:
        check = 0
    return f"{base}{check}"


class TestDoiSoatExport:
    """Tests for the đối soát (reconciliation) Excel export endpoint."""

    def test_doi_soat_export_with_matched_trips(
        self, api_client, admin_headers, create_partner, create_location,
        create_work_order, create_trip_order,
    ):
        """TC1: Export with matched trips returns correct Excel with only MATCHED rows."""
        uid = _uid()
        partner = create_partner(name=f"CTY DS {uid}", code=f"DS{uid.upper()}")
        partner_id = partner["id"]

        pickup = create_location(name=f"Kho DS {uid}A")
        dropoff = create_location(name=f"Cảng DS {uid}B")

        cn1 = _container_number()
        cn2 = _container_number()
        cn3 = _container_number()

        # Create 3 trip orders
        to1 = create_trip_order(
            partner_id=partner_id,
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            trip_date="2026-05-10",
            containers=[{"container_number": cn1, "work_type": "E20"}],
        )
        to2 = create_trip_order(
            partner_id=partner_id,
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            trip_date="2026-05-10",
            containers=[{"container_number": cn2, "work_type": "E40"}],
        )
        to3 = create_trip_order(
            partner_id=partner_id,
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            trip_date="2026-05-10",
            containers=[{"container_number": cn3, "work_type": "E20"}],
        )

        # Create 2 work orders and match with first 2 trip orders
        wo1 = create_work_order(
            partner_id=partner_id,
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": cn1, "work_type": "E20"}],
        )
        wo2 = create_work_order(
            partner_id=partner_id,
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": cn2, "work_type": "E40"}],
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
        expected_title = f"CTY DS {uid}"[:31]
        assert ws.title == expected_title

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
        assert data_rows[0][4] == f"Kho DS {uid}A"
        assert data_rows[0][5] == f"Cảng DS {uid}B"

        wb.close()

    def test_doi_soat_export_no_matching_trips(
        self, api_client, admin_headers, create_partner, create_location,
        create_work_order, create_trip_order,
    ):
        """TC2: Date range with no trips returns Excel with only header row."""
        uid = _uid()
        partner = create_partner(name=f"CTY Empty {uid}", code=f"EM{uid.upper()}")
        pickup = create_location(name=f"Kho Empty {uid}")
        dropoff = create_location(name=f"Cảng Empty {uid}")

        # Create trip outside date range
        create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            trip_date="2026-04-10",
            containers=[{"container_number": _container_number(), "work_type": "E20"}],
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
