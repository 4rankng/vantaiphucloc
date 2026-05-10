"""Integration tests for dashboard endpoints."""

from datetime import date


class TestDashboard:
    def test_dashboard_summary(self, api_client, admin_headers):
        resp = api_client.get("/dashboard/summary", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_revenue" in data or "trip_count" in data or "unmatched_work_order_count" in data

    def test_dashboard_summary_date_filter(self, api_client, admin_headers):
        today = date.today().isoformat()
        resp = api_client.get(
            "/dashboard/summary",
            headers=admin_headers,
            params={"date_from": today, "date_to": today},
        )
        assert resp.status_code == 200

    def test_dashboard_notifications(self, api_client, admin_headers):
        resp = api_client.get("/dashboard/notifications", headers=admin_headers)
        assert resp.status_code == 200

    def test_dashboard_no_auth(self, api_client):
        resp = api_client.get("/dashboard/summary")
        assert resp.status_code == 401

    def test_driver_can_view_dashboard(self, api_client, driver_headers):
        resp = api_client.get("/dashboard/summary", headers=driver_headers)
        assert resp.status_code == 200
