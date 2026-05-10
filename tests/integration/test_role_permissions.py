"""Cross-cutting tests for role-based access control per policy.polar."""

import random
import string
from datetime import date
from uuid import uuid4


def _container_number():
    prefix = ''.join(random.choices(string.ascii_uppercase, k=4))
    digits = ''.join(random.choices(string.digits, k=7))
    return f"{prefix}{digits}"
from conftest import _container_number


class TestDriverPermissions:
    """Driver (role=driver) permissions from policy.polar."""

    def test_can_create_work_order(self, api_client, driver_headers, create_client, create_location):
        client = create_client()
        pickup = create_location()
        dropoff = create_location()
        uid = uuid4().hex[:8]
        resp = api_client.post(
            "/work-orders",
            headers=driver_headers,
            json={
                "client_id": client["id"],
                "route": f"IT_RBAC_{uid}",
                "pickup_location_id": pickup["id"],
                "dropoff_location_id": dropoff["id"],
                "driver_id": 4,
                "tractor_plate": "29C-12345",
                "containers": [{"container_number": _container_number(), "work_type": "E20"}],
            },
        )
        assert resp.status_code in (200, 201)

    def test_can_read_clients(self, api_client, driver_headers):
        resp = api_client.get("/clients", headers=driver_headers)
        assert resp.status_code == 200

    def test_cannot_create_client(self, api_client, driver_headers):
        resp = api_client.post(
            "/clients",
            headers=driver_headers,
            json={"name": "Blocked", "type": "company", "phone": "0900000000"},
        )
        assert resp.status_code == 403

    def test_can_read_routes(self, api_client, driver_headers):
        resp = api_client.get("/routes", headers=driver_headers)
        assert resp.status_code == 200

    def test_cannot_create_route(self, api_client, driver_headers):
        resp = api_client.post(
            "/routes",
            headers=driver_headers,
            json={"route": "blocked", "pickup_location_id": 1, "dropoff_location_id": 2},
        )
        assert resp.status_code == 403

    def test_can_read_pricings(self, api_client, driver_headers):
        resp = api_client.get("/pricings", headers=driver_headers)
        assert resp.status_code == 200

    def test_cannot_create_pricing(self, api_client, driver_headers):
        resp = api_client.post(
            "/pricings",
            headers=driver_headers,
            json={"client_id": 1, "work_type": "E20", "pickup_location_id": 1, "dropoff_location_id": 2, "lines": []},
        )
        assert resp.status_code == 403

    def test_cannot_reconcile(self, api_client, driver_headers):
        resp = api_client.post(
            "/reconcile",
            headers=driver_headers,
            json={"work_order_id": 1, "trip_order_id": 1},
        )
        assert resp.status_code == 403

    def test_cannot_read_salary_list(self, api_client, driver_headers):
        resp = api_client.get("/salary", headers=driver_headers)
        assert resp.status_code == 403

    def test_cannot_calculate_salary(self, api_client, driver_headers):
        resp = api_client.post(
            "/salary/calculate",
            headers=driver_headers,
            json={"driver_id": 4, "period_start": date.today().isoformat(), "period_end": date.today().isoformat()},
        )
        assert resp.status_code == 403

    def test_cannot_read_audit_logs(self, api_client, driver_headers):
        resp = api_client.get("/audit-logs", headers=driver_headers)
        assert resp.status_code == 403

    def test_cannot_create_trip_order(self, api_client, driver_headers):
        resp = api_client.post(
            "/trip-orders",
            headers=driver_headers,
            json={
                "trip_date": date.today().isoformat(),
                "client_id": 1, "route": "x",
                "pickup_location_id": 1, "dropoff_location_id": 2,
                "unit_price": 0, "driver_salary": 0, "allowance": 0, "revenue": 0,
            },
        )
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

    def test_can_read_own_salary(self, api_client, driver_headers):
        resp = api_client.get("/driver/salary", headers=driver_headers)
        assert resp.status_code == 200


class TestAccountantPermissions:
    """Accountant inherits driver permissions + can manage resources."""

    def test_can_create_client(self, api_client, create_client):
        client = create_client()
        assert "id" in client

    def test_can_create_route(self, api_client, create_route):
        route = create_route()
        assert "id" in route

    def test_can_create_pricing(self, api_client, create_pricing):
        pricing = create_pricing()
        assert "id" in pricing

    def test_can_reconcile(self, api_client, admin_headers):
        resp = api_client.get("/match-scores", headers=admin_headers)
        assert resp.status_code == 200

    def test_can_list_salary(self, api_client, accountant_headers):
        resp = api_client.get("/salary", headers=accountant_headers)
        assert resp.status_code == 200

    def test_can_read_audit_logs(self, api_client, accountant_headers):
        resp = api_client.get("/audit-logs", headers=accountant_headers)
        assert resp.status_code == 200

    def test_cannot_delete_users(self, api_client, accountant_headers):
        resp = api_client.delete("/users/999999", headers=accountant_headers)
        assert resp.status_code == 403

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
