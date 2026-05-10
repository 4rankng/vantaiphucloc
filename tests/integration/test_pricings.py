"""Integration tests for pricing endpoints."""


class TestPricings:
    def test_list_pricings(self, api_client, accountant_headers):
        resp = api_client.get("/pricings", headers=accountant_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert isinstance(data["items"], list)

    def test_create_pricing(self, api_client, create_pricing):
        pricing = create_pricing()
        assert "id" in pricing
        assert "lines" in pricing
        assert len(pricing["lines"]) >= 1
        assert pricing["lines"][0]["unit_price"] == 1000000

    def test_list_pricings_filter_work_type(self, api_client, accountant_headers):
        resp = api_client.get("/pricings", headers=accountant_headers, params={"work_type": "E20"})
        assert resp.status_code == 200
        items = resp.json()["items"]
        for item in items:
            assert item["work_type"] == "E20"

    def test_update_pricing_lines(self, api_client, admin_headers, create_pricing):
        pricing = create_pricing()
        resp = api_client.put(
            f"/pricings/{pricing['id']}",
            headers=admin_headers,
            json={
                "lines": [
                    {"quantity": 2, "unit_price": 2000000, "driver_salary": 500000, "allowance": 100000}
                ]
            },
        )
        assert resp.status_code == 200
        assert resp.json()["lines"][0]["quantity"] == 2

    def test_update_nonexistent_pricing(self, api_client, admin_headers):
        resp = api_client.put("/pricings/999999", headers=admin_headers, json={"work_type": "E40"})
        assert resp.status_code == 404

    def test_delete_pricing(self, api_client, admin_headers, create_pricing):
        pricing = create_pricing()
        resp = api_client.delete(f"/pricings/{pricing['id']}", headers=admin_headers)
        assert resp.status_code in (200, 204)

    def test_delete_nonexistent_pricing(self, api_client, admin_headers):
        resp = api_client.delete("/pricings/999999", headers=admin_headers)
        assert resp.status_code == 404

    def test_driver_can_read_pricings(self, api_client, driver_headers):
        resp = api_client.get("/pricings", headers=driver_headers)
        assert resp.status_code == 200

    def test_driver_cannot_create_pricing(self, api_client, driver_headers):
        resp = api_client.post(
            "/pricings",
            headers=driver_headers,
            json={
                "client_id": 1,
                "work_type": "E20",
                "pickup_location_id": 1,
                "dropoff_location_id": 2,
                "lines": [{"quantity": 1, "unit_price": 100}],
            },
        )
        assert resp.status_code == 403
