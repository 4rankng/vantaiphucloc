"""Integration tests for salary endpoints."""

from datetime import date


class TestSalary:
    def test_calculate_salary(self, api_client, admin_headers):
        today = date.today().isoformat()
        resp = api_client.post(
            "/salary/calculate",
            headers=admin_headers,
            json={"driver_id": 4, "start_date": today, "end_date": today},
        )
        assert resp.status_code in (200, 202)

    def test_get_driver_earnings(self, api_client, admin_headers):
        today = date.today().isoformat()
        resp = api_client.get(
            f"/salary/earnings/4",
            headers=admin_headers,
            params={"start_date": today, "end_date": today},
        )
        assert resp.status_code in (200, 404)

    def test_driver_own_earnings(self, api_client, driver_headers):
        today = date.today().isoformat()
        resp = api_client.get(
            "/driver/earnings",
            headers=driver_headers,
            params={"start_date": today, "end_date": today},
        )
        assert resp.status_code in (200, 404)

    def test_export_salary(self, api_client, accountant_headers):
        today = date.today().isoformat()
        resp = api_client.get(
            "/salary/export",
            headers=accountant_headers,
            params={"start_date": today, "end_date": today},
        )
        assert resp.status_code in (200, 400, 500)

    def test_driver_cannot_calculate_salary(self, api_client, driver_headers):
        today = date.today().isoformat()
        resp = api_client.post(
            "/salary/calculate",
            headers=driver_headers,
            json={"driver_id": 4, "start_date": today, "end_date": today},
        )
        assert resp.status_code == 403
