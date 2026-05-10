"""Integration tests for location endpoints."""

from uuid import uuid4


class TestLocations:
    def test_list_locations(self, api_client, accountant_headers):
        resp = api_client.get("/locations", headers=accountant_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert isinstance(data["items"], list)

    def test_list_all_locations(self, api_client, accountant_headers):
        resp = api_client.get("/locations/all", headers=accountant_headers)
        assert resp.status_code == 200
        items = resp.json()
        assert isinstance(items, list)

    def test_create_location(self, api_client, create_location):
        loc = create_location()
        assert "id" in loc
        assert loc["is_active"] is True

    def test_update_location(self, api_client, admin_headers, create_location):
        loc = create_location()
        resp = api_client.put(
            f"/locations/{loc['id']}",
            headers=admin_headers,
            json={"name": f"IT_Updated_{loc['id']}"},
        )
        assert resp.status_code == 200

    def test_delete_location(self, api_client, admin_headers, create_location):
        loc = create_location()
        resp = api_client.delete(f"/locations/{loc['id']}", headers=admin_headers)
        assert resp.status_code in (200, 204)

    def test_delete_nonexistent_location(self, api_client, admin_headers):
        resp = api_client.delete("/locations/999999", headers=admin_headers)
        assert resp.status_code == 404

    def test_nearby_locations(self, api_client, admin_headers):
        resp = api_client.get(
            "/locations/nearby",
            headers=admin_headers,
            params={"lat": 10.8231, "lng": 106.6297},
        )
        assert resp.status_code == 200
        results = resp.json()
        assert isinstance(results, list)

    def test_pin_driver_location(self, api_client, admin_headers):
        uid = uuid4().hex[:8]
        resp = api_client.post(
            "/locations/pin",
            headers=admin_headers,
            json={"name": f"IT_Pin_{uid}", "lat": 10.8, "lng": 106.7},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["geocode_source"] == "driver_pin"

    def test_pin_location_idempotent(self, api_client, admin_headers):
        uid = uuid4().hex[:8]
        name = f"IT_PinIdem_{uid}"
        payload = {"name": name, "lat": 10.8, "lng": 106.7}

        resp1 = api_client.post("/locations/pin", headers=admin_headers, json=payload)
        resp2 = api_client.post("/locations/pin", headers=admin_headers, json=payload)
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        assert resp1.json()["id"] == resp2.json()["id"]

    def test_driver_can_read_locations(self, api_client, driver_headers):
        resp = api_client.get("/locations", headers=driver_headers)
        assert resp.status_code == 200
