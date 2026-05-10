"""Integration tests for work order endpoints."""

from datetime import date
from uuid import uuid4


class TestWorkOrders:
    def test_list_work_orders(self, api_client, accountant_headers):
        resp = api_client.get("/work-orders", headers=accountant_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert isinstance(data["items"], list)

    def test_list_filter_status(self, api_client, accountant_headers):
        resp = api_client.get("/work-orders", headers=accountant_headers, params={"status": "PENDING"})
        assert resp.status_code == 200
        for item in resp.json()["items"]:
            assert item["status"] == "PENDING"

    def test_list_filter_driver(self, api_client, accountant_headers):
        resp = api_client.get("/work-orders", headers=accountant_headers, params={"driver_id": 4})
        assert resp.status_code == 200

    def test_list_filter_date(self, api_client, accountant_headers):
        today = date.today().isoformat()
        resp = api_client.get(
            "/work-orders",
            headers=accountant_headers,
            params={"date_from": today, "date_to": today},
        )
        assert resp.status_code == 200

    def test_create_work_order(self, api_client, create_work_order):
        wo = create_work_order()
        assert "id" in wo
        assert wo["status"] == "PENDING"
        assert len(wo["containers"]) >= 1

    def test_get_work_order(self, api_client, admin_headers, create_work_order):
        wo = create_work_order()
        resp = api_client.get(f"/work-orders/{wo['id']}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == wo["id"]

    def test_get_nonexistent_work_order(self, api_client, admin_headers):
        resp = api_client.get("/work-orders/999999", headers=admin_headers)
        assert resp.status_code == 404

    def test_update_work_order(self, api_client, admin_headers, create_work_order):
        wo = create_work_order()
        resp = api_client.put(
            f"/work-orders/{wo['id']}",
            headers=admin_headers,
            json={"route": f"IT_Updated_{wo['id']}"},
        )
        assert resp.status_code == 200

    def test_cancel_work_order(self, api_client, admin_headers, create_work_order):
        wo = create_work_order()
        resp = api_client.put(
            f"/work-orders/{wo['id']}/cancel",
            headers=admin_headers,
            json={"reason": "integration test"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "CANCELLED"

    def test_cancel_already_cancelled(self, api_client, admin_headers, create_work_order):
        wo = create_work_order()
        api_client.put(
            f"/work-orders/{wo['id']}/cancel",
            headers=admin_headers,
            json={"reason": "first cancel"},
        )
        resp = api_client.put(
            f"/work-orders/{wo['id']}/cancel",
            headers=admin_headers,
            json={"reason": "second cancel"},
        )
        assert resp.status_code in (400, 409)

    def test_batch_create(self, api_client, admin_headers, create_client, create_location):
        client = create_client()
        pickup = create_location()
        dropoff = create_location()
        uid = uuid4().hex[:8]
        resp = api_client.post(
            "/work-orders/batch",
            headers=admin_headers,
            json={
                "items": [
                    {
                        "client_id": client["id"],
                        "route": f"IT_Batch1_{uid}",
                        "pickup_location_id": pickup["id"],
                        "dropoff_location_id": dropoff["id"],
                        "driver_id": 4,
                        "tractor_plate": "29C-12345",
                        "containers": [{"container_number": f"BTCH{uid}1", "work_type": "E20"}],
                    },
                    {
                        "client_id": client["id"],
                        "route": f"IT_Batch2_{uid}",
                        "pickup_location_id": pickup["id"],
                        "dropoff_location_id": dropoff["id"],
                        "driver_id": 4,
                        "tractor_plate": "29C-12345",
                        "containers": [{"container_number": f"BTCH{uid}2", "work_type": "E20"}],
                    },
                ]
            },
        )
        assert resp.status_code in (200, 207)

    def test_validate_container_valid(self, api_client, admin_headers):
        resp = api_client.get(
            "/work-orders/validate-container",
            headers=admin_headers,
            params={"container_number": "TCNU1234567"},
        )
        assert resp.status_code == 200

    def test_validate_container_invalid(self, api_client, admin_headers):
        resp = api_client.get(
            "/work-orders/validate-container",
            headers=admin_headers,
            params={"container_number": "INVALID"},
        )
        assert resp.status_code == 200

    def test_export_work_orders(self, api_client, accountant_headers):
        resp = api_client.get("/work-orders/export", headers=accountant_headers)
        assert resp.status_code == 200

    def test_driver_sees_own_work_orders(self, api_client, driver_headers):
        resp = api_client.get("/work-orders", headers=driver_headers)
        assert resp.status_code == 200
        items = resp.json()["items"]
        for item in items:
            assert item["driver"]["id"] == 4
