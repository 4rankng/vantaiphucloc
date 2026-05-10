"""Integration tests for salary endpoints."""

from datetime import date


class TestSalary:
    def test_calculate_salary(self, api_client, admin_headers):
        resp = api_client.post(
            "/salary/calculate",
            headers=admin_headers,
            json={"driver_id": 4, "period_start": date.today().isoformat(), "period_end": date.today().isoformat()},
        )
        assert resp.status_code in (200, 202)

    def test_list_salary_periods(self, api_client, accountant_headers):
        resp = api_client.get("/salary", headers=accountant_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data or isinstance(data, list)

    def test_list_salary_filter_driver(self, api_client, accountant_headers):
        resp = api_client.get("/salary", headers=accountant_headers, params={"driver_id": 4})
        assert resp.status_code == 200

    def test_driver_own_salary(self, api_client, driver_headers):
        resp = api_client.get("/driver/salary", headers=driver_headers)
        assert resp.status_code == 200

    def test_salary_dashboard(self, api_client, accountant_headers):
        today = date.today().isoformat()
        resp = api_client.get(
            "/salary/dashboard",
            headers=accountant_headers,
            params={"period_start": today, "period_end": today},
        )
        assert resp.status_code == 200

    def test_export_salary(self, api_client, accountant_headers):
        today = date.today().isoformat()
        resp = api_client.get(
            "/salary/export",
            headers=accountant_headers,
            params={"period_start": today, "period_end": today},
        )
        assert resp.status_code in (200, 400)

    def test_driver_cannot_calculate_salary(self, api_client, driver_headers):
        resp = api_client.post(
            "/salary/calculate",
            headers=driver_headers,
            json={"driver_id": 4, "period_start": date.today().isoformat(), "period_end": date.today().isoformat()},
        )
        assert resp.status_code == 403

    def test_driver_cannot_list_salary(self, api_client, driver_headers):
        resp = api_client.get("/salary", headers=driver_headers)
        assert resp.status_code == 403
