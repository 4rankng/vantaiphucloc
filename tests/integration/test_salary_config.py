"""Integration tests for salary config endpoint."""


class TestSalaryConfig:
    def test_get_salary_config(self, api_client, accountant_headers):
        resp = api_client.get("/salary-config", headers=accountant_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "from_day" in data
        assert "to_day" in data
        assert 1 <= data["from_day"] <= 28
        assert 1 <= data["to_day"] <= 28

    def test_update_salary_config(self, api_client, admin_headers):
        original = api_client.get("/salary-config", headers=admin_headers)
        original_data = original.json()

        resp = api_client.put(
            "/salary-config",
            headers=admin_headers,
            json={"from_day": 1, "to_day": 25},
        )
        assert resp.status_code == 200
        assert resp.json()["from_day"] == 1
        assert resp.json()["to_day"] == 25

        api_client.put(
            "/salary-config",
            headers=admin_headers,
            json={"from_day": original_data["from_day"], "to_day": original_data["to_day"]},
        )

    def test_update_salary_config_invalid(self, api_client, admin_headers):
        resp = api_client.put(
            "/salary-config",
            headers=admin_headers,
            json={"from_day": 30, "to_day": 25},
        )
        assert resp.status_code == 422

    def test_driver_can_read_config(self, api_client, driver_headers):
        resp = api_client.get("/salary-config", headers=driver_headers)
        assert resp.status_code == 200
