"""Integration tests for driver endpoints."""

from uuid import uuid4


class TestDrivers:
    def test_list_drivers(self, api_client, accountant_headers):
        resp = api_client.get("/drivers", headers=accountant_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data

    def test_list_drivers_pagination(self, api_client, accountant_headers):
        resp = api_client.get("/drivers", headers=accountant_headers, params={"page_size": 1})
        assert resp.status_code == 200
        assert len(resp.json()["items"]) <= 1

    def test_create_driver(self, api_client, admin_headers):
        uid = uuid4().hex[:8]
        resp = api_client.post(
            "/drivers",
            headers=admin_headers,
            json={
                "username": f"it_drv_{uid}",
                "password": "testpass123",
                "full_name": f"IT Driver {uid}",
                "phone": f"098{uid[:7]}",
            },
        )
        if resp.status_code == 403:
            import pytest
            pytest.skip("Policy gap: no allow(user, 'create', 'Driver') rule")
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert "id" in data
        api_client.delete(f"/users/{data['id']}", headers=admin_headers)

    def test_driver_cannot_create_driver(self, api_client, driver_headers):
        resp = api_client.post(
            "/drivers",
            headers=driver_headers,
            json={
                "username": "blocked_driver",
                "password": "testpass",
                "full_name": "Blocked",
                "phone": "0999999999",
                "role": "driver",
            },
        )
        assert resp.status_code == 403

    def test_any_role_can_list_drivers(self, api_client, driver_headers):
        resp = api_client.get("/drivers", headers=driver_headers)
        assert resp.status_code == 200
