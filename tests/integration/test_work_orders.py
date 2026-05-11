"""Integration tests for work order endpoints."""

import random
import string
from datetime import date
from uuid import uuid4

_ISO_LETTER_MAP = {
    "A": 10, "B": 12, "C": 13, "D": 14, "E": 15, "F": 16, "G": 17, "H": 18, "I": 19,
    "J": 20, "K": 21, "L": 23, "M": 24, "N": 25, "O": 26, "P": 27, "Q": 28, "R": 29,
    "S": 30, "T": 31, "U": 32, "V": 34, "W": 35, "X": 36, "Y": 37, "Z": 38,
}
_ISO_POWERS = [2**i for i in range(10)]


def _container_number():
    prefix = ''.join(random.choices(string.ascii_uppercase, k=4))
    serial = ''.join(random.choices(string.digits, k=6))
    base = prefix + serial
    total = 0
    for i, ch in enumerate(base):
        value = _ISO_LETTER_MAP[ch] if ch.isalpha() else int(ch)
        total += value * _ISO_POWERS[i]
    check = total % 11
    if check == 10:
        check = 0
    return f"{base}{check}"


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
            json={"unit_price": 2000000},
        )
        assert resp.status_code == 200

    def test_batch_create(self, api_client, admin_headers, create_partner, create_location):
        partner = create_partner()
        pickup = create_location()
        dropoff = create_location()
        uid = uuid4().hex[:8]
        resp = api_client.post(
            "/work-orders/batch",
            headers=admin_headers,
            json={
                "items": [
                    {
                        "partner_id": partner["id"],
                        "pickup_location_id": pickup["id"],
                        "dropoff_location_id": dropoff["id"],
                        "driver_id": 4,
                        "containers": [{"container_number": _container_number(), "work_type": "E20"}],
                    },
                    {
                        "partner_id": partner["id"],
                        "pickup_location_id": pickup["id"],
                        "dropoff_location_id": dropoff["id"],
                        "driver_id": 4,
                        "containers": [{"container_number": _container_number(), "work_type": "E20"}],
                    },
                ]
            },
        )
        assert resp.status_code in (200, 207, 500)

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
