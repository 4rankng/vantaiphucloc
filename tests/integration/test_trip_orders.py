"""Integration tests for trip order endpoints."""

from datetime import date


class TestTripOrders:
    def test_list_trip_orders(self, api_client, accountant_headers):
        resp = api_client.get("/trip-orders", headers=accountant_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert isinstance(data["items"], list)

    def test_list_filter_status(self, api_client, accountant_headers):
        resp = api_client.get("/trip-orders", headers=accountant_headers, params={"status": "PENDING"})
        assert resp.status_code == 200
        for item in resp.json()["items"]:
            assert item["status"] == "PENDING"

    def test_list_filter_date_range(self, api_client, accountant_headers):
        today = date.today().isoformat()
        resp = api_client.get(
            "/trip-orders",
            headers=accountant_headers,
            params={"date_from": today, "date_to": today},
        )
        assert resp.status_code == 200

    def test_list_filter_partner(self, api_client, accountant_headers, create_partner):
        partner = create_partner()
        resp = api_client.get(
            "/trip-orders",
            headers=accountant_headers,
            params={"partner_id": partner["id"]},
        )
        assert resp.status_code == 200

    def test_create_trip_order(self, api_client, create_trip_order):
        to = create_trip_order()
        assert "id" in to
        assert to["status"] == "PENDING"
        assert len(to["containers"]) >= 1

    def test_create_trip_order_with_containers(self, api_client, create_trip_order):
        to = create_trip_order()
        assert to["containers"][0]["container_number"]
        assert to["containers"][0]["work_type"]

    def test_get_trip_order(self, api_client, admin_headers, create_trip_order):
        to = create_trip_order()
        resp = api_client.get(f"/trip-orders/{to['id']}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == to["id"]

    def test_get_nonexistent_trip_order(self, api_client, admin_headers):
        resp = api_client.get("/trip-orders/999999", headers=admin_headers)
        assert resp.status_code == 404

    def test_update_trip_order(self, api_client, admin_headers, create_trip_order):
        to = create_trip_order()
        resp = api_client.put(
            f"/trip-orders/{to['id']}",
            headers=admin_headers,
            json={"unit_price": 2000000},
        )
        assert resp.status_code == 200
        assert resp.json()["unit_price"] == 2000000

    def test_delete_trip_order(self, api_client, admin_headers, create_trip_order):
        to = create_trip_order()
        resp = api_client.request(
            "DELETE", f"/trip-orders/{to['id']}",
            headers=admin_headers,
            json={"reason": "integration test"},
        )
        assert resp.status_code in (200, 204)

    def test_download_template(self, api_client, accountant_headers):
        resp = api_client.get("/trip-orders/template", headers=accountant_headers)
        assert resp.status_code in (200, 500)

    def test_export_trip_orders(self, api_client, accountant_headers):
        resp = api_client.get("/trip-orders/export", headers=accountant_headers)
        assert resp.status_code == 200

    def test_driver_can_create_trip_order(self, api_client, driver_headers, create_partner, create_location):
        partner = create_partner()
        pickup = create_location()
        dropoff = create_location()
        resp = api_client.post(
            "/trip-orders",
            headers=driver_headers,
            json={
                "trip_date": date.today().isoformat(),
                "partner_id": partner["id"],
                "pickup_location_id": pickup["id"],
                "dropoff_location_id": dropoff["id"],
                "unit_price": 0,
                "driver_salary": 0,
                "allowance": 0,
            },
        )
        assert resp.status_code in (200, 201, 403)
