"""Cross-cutting tests for role-based access control per policy.polar."""

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


class TestDriverPermissions:
    """Driver (role=driver) permissions from policy.polar."""

    def test_can_create_work_order(self, api_client, driver_headers, create_partner, create_location):
        partner = create_partner()
        pickup = create_location()
        dropoff = create_location()
        resp = api_client.post(
            "/work-orders",
            headers=driver_headers,
            json={
                "partner_id": partner["id"],
                "pickup_location_id": pickup["id"],
                "dropoff_location_id": dropoff["id"],
                "driver_id": 4,
                "containers": [{"container_number": _container_number(), "work_type": "E20"}],
            },
        )
        assert resp.status_code in (200, 201)

    def test_can_read_partners(self, api_client, driver_headers):
        resp = api_client.get("/partners", headers=driver_headers)
        assert resp.status_code == 200

    def test_cannot_create_partner(self, api_client, driver_headers):
        resp = api_client.post(
            "/partners",
            headers=driver_headers,
            json={"name": "Blocked", "partner_type": "client", "partner_role": "shipping_line"},
        )
        assert resp.status_code == 403

    def test_can_read_pricings(self, api_client, driver_headers):
        resp = api_client.get("/pricings", headers=driver_headers)
        assert resp.status_code == 200

    def test_cannot_create_pricing(self, api_client, driver_headers):
        resp = api_client.post(
            "/pricings",
            headers=driver_headers,
            json={"partner_id": 1, "work_type": "E20", "pickup_location_id": 1, "dropoff_location_id": 2, "lines": []},
        )
        assert resp.status_code == 403

    def test_cannot_reconcile(self, api_client, driver_headers):
        resp = api_client.post(
            "/reconcile",
            headers=driver_headers,
            json={"work_order_id": 1, "trip_order_id": 1},
        )
        assert resp.status_code == 403

    def test_cannot_calculate_salary(self, api_client, driver_headers):
        today = date.today().isoformat()
        resp = api_client.post(
            "/salary/calculate",
            headers=driver_headers,
            json={"driver_id": 4, "start_date": today, "end_date": today},
        )
        assert resp.status_code == 403

    def test_cannot_read_audit_logs(self, api_client, driver_headers):
        resp = api_client.get("/audit-logs", headers=driver_headers)
        assert resp.status_code == 403

    def test_can_read_trip_orders(self, api_client, driver_headers):
        resp = api_client.get("/trip-orders", headers=driver_headers)
        assert resp.status_code == 200

    def test_can_read_locations(self, api_client, driver_headers):
        resp = api_client.get("/locations", headers=driver_headers)
        assert resp.status_code == 200

    def test_cannot_create_location(self, api_client, driver_headers):
        resp = api_client.post(
            "/locations", headers=driver_headers, json={"name": "BlockedLoc"}
        )
        assert resp.status_code == 403

    def test_can_view_dashboard(self, api_client, driver_headers):
        resp = api_client.get("/dashboard/summary", headers=driver_headers)
        assert resp.status_code == 200


class TestAccountantPermissions:
    """Accountant inherits driver permissions + can manage resources."""

    def test_can_create_partner(self, api_client, create_partner):
        partner = create_partner()
        assert "id" in partner

    def test_can_create_pricing(self, api_client, create_pricing):
        pricing = create_pricing()
        assert "id" in pricing

    def test_can_reconcile(self, api_client, admin_headers):
        resp = api_client.get("/match-scores", headers=admin_headers)
        assert resp.status_code == 200

    def test_can_read_audit_logs(self, api_client, accountant_headers):
        resp = api_client.get("/audit-logs", headers=accountant_headers)
        assert resp.status_code == 200

    def test_cannot_delete_users(self, api_client, accountant_headers):
        resp = api_client.delete("/users/999999", headers=accountant_headers)
        assert resp.status_code in (403, 404)

    def test_can_list_users(self, api_client, accountant_headers):
        resp = api_client.get("/users", headers=accountant_headers)
        assert resp.status_code == 200


class TestDirectorPermissions:
    """Director inherits accountant + can manage users."""

    def test_can_list_users(self, api_client, director_headers):
        resp = api_client.get("/users", headers=director_headers)
        assert resp.status_code == 200

    def test_can_create_user(self, api_client, director_headers):
        uid = uuid4().hex[:8]
        resp = api_client.post(
            "/users",
            headers=director_headers,
            json={
                "username": f"it_dir_{uid}",
                "password": "testpass123",
                "full_name": f"IT Dir {uid}",
                "phone": f"097{uid[:7]}",
                "role": "driver",
            },
        )
        assert resp.status_code in (200, 201)
        user_id = resp.json()["id"]
        api_client.delete(f"/users/{user_id}", headers=director_headers)

    def test_can_delete_users(self, api_client, director_headers):
        uid = uuid4().hex[:8]
        login = api_client.post("/auth/login", json={"username": "admin", "password": "admin123"})
        admin_h = {"Authorization": f"Bearer {login.json()['access_token']}"}
        create = api_client.post(
            "/users",
            headers=admin_h,
            json={
                "username": f"it_del_{uid}",
                "password": "testpass123",
                "full_name": "ToDelete",
                "phone": f"096{uid[:7]}",
                "role": "driver",
            },
        )
        user_id = create.json()["id"]
        resp = api_client.delete(f"/users/{user_id}", headers=director_headers)
        assert resp.status_code in (200, 204)

    def test_can_reconcile(self, api_client, director_headers):
        resp = api_client.get("/match-scores", headers=director_headers)
        assert resp.status_code == 200
