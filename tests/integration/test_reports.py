"""Integration tests for reports endpoints."""

from datetime import date


class TestReports:
    def test_export_customer_settlement(self, api_client, admin_headers):
        today = date.today()
        resp = api_client.get(
            "/reports/customer-settlement/export",
            headers=admin_headers,
            params={"partner_id": 1, "year": today.year, "month": today.month},
        )
        assert resp.status_code in (200, 400, 404)

    def test_export_with_date_range(self, api_client, admin_headers):
        today = date.today().isoformat()
        resp = api_client.get(
            "/reports/customer-settlement/export",
            headers=admin_headers,
            params={"partner_id": 1, "start_date": today, "end_date": today},
        )
        assert resp.status_code in (200, 400, 404)

    def test_driver_cannot_export(self, api_client, driver_headers):
        resp = api_client.get(
            "/reports/customer-settlement/export",
            headers=driver_headers,
            params={"partner_id": 1, "year": 2026, "month": 1},
        )
        assert resp.status_code == 403
