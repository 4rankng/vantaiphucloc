"""Integration tests for vehicle expense (CP Xe) endpoints.

Tests:
  - CRUD: create, list, get, update, delete
  - Category enum enforcement (only valid categories accepted)
  - All categories require vehicle_id
"""

import pytest
from datetime import date, timedelta


class TestVehicleExpenses:
    """CRUD for /vehicle-expenses."""

    def _payload(self, plate: str | None, category: str = "XANG_DAU", amount: int = 500_000) -> dict:
        """Build a minimal valid create payload."""
        return {
            "vehicle_id": 1,  # seeded vehicle
            "category": category,
            "amount": amount,
            "expense_date": date.today().isoformat(),
            "description": f"Test {category}",
        }

    def test_create_xang_dau_requires_vehicle_id(self, api_client, accountant_headers):
        """XANG_DAU without vehicle_id must fail with 422."""
        res = api_client.post(
            "/vehicle-expenses",
            headers=accountant_headers,
            json={
                "vehicle_id": None,
                "category": "XANG_DAU",
                "amount": 500_000,
                "expense_date": date.today().isoformat(),
            },
        )
        assert res.status_code == 422, f"Expected 422, got {res.status_code}: {res.text}"

    def test_create_tien_luat_with_vehicle_id(self, api_client, accountant_headers):
        """TIEN_LUAT with vehicle_id must succeed."""
        res = api_client.post(
            "/vehicle-expenses",
            headers=accountant_headers,
            json={
                "vehicle_id": 1,
                "category": "TIEN_LUAT",
                "amount": 1_000_000,
                "expense_date": date.today().isoformat(),
            },
        )
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
        body = res.json()
        assert body["category"] == "TIEN_LUAT"
        assert body["vehicle_id"] == 1
        assert body["amount"] == 1_000_000

        # Cleanup
        api_client.delete(f"/vehicle-expenses/{body['id']}", headers=accountant_headers)

    def test_invalid_category_rejected(self, api_client, accountant_headers):
        """Unknown category strings must be rejected at schema validation."""
        res = api_client.post(
            "/vehicle-expenses",
            headers=accountant_headers,
            json={
                "category": "INVALID",
                "amount": 100_000,
                "expense_date": date.today().isoformat(),
            },
        )
        assert res.status_code == 422, f"Expected 422, got {res.status_code}: {res.text}"

    def test_create_expense_without_vehicle_id_fails(self, api_client, accountant_headers):
        """Any category without vehicle_id must fail with 422."""
        res = api_client.post(
            "/vehicle-expenses",
            headers=accountant_headers,
            json={
                "vehicle_id": None,
                "category": "XANG_DAU",
                "amount": 2_000_000,
                "expense_date": date.today().isoformat(),
                "description": "No vehicle test",
            },
        )
        assert res.status_code == 422, f"Expected 422: {res.text}"

    def test_list_returns_created_expense(self, api_client, accountant_headers):
        """Created expenses appear in the list endpoint."""
        # Create
        res = api_client.post(
            "/vehicle-expenses",
            headers=accountant_headers,
            json={
                "vehicle_id": 1,
                "category": "KHAC",
                "amount": 300_000,
                "expense_date": date.today().isoformat(),
                "description": "List test",
            },
        )
        assert res.status_code == 201, res.text
        expense_id = res.json()["id"]

        try:
            # List
            list_res = api_client.get("/vehicle-expenses", headers=accountant_headers)
            assert list_res.status_code == 200, list_res.text
            ids = [e["id"] for e in list_res.json()["items"]]
            assert expense_id in ids, f"Created expense {expense_id} not found in list"
        finally:
            api_client.delete(f"/vehicle-expenses/{expense_id}", headers=accountant_headers)

    def test_get_expense(self, api_client, accountant_headers):
        """GET /vehicle-expenses/{id} returns the correct record."""
        res = api_client.post(
            "/vehicle-expenses",
            headers=accountant_headers,
            json={
                "vehicle_id": 1,
                "category": "XANG_DAU",
                "amount": 750_000,
                "expense_date": date.today().isoformat(),
            },
        )
        assert res.status_code == 201
        expense_id = res.json()["id"]

        try:
            get_res = api_client.get(f"/vehicle-expenses/{expense_id}", headers=accountant_headers)
            assert get_res.status_code == 200, get_res.text
            assert get_res.json()["id"] == expense_id
            assert get_res.json()["amount"] == 750_000
        finally:
            api_client.delete(f"/vehicle-expenses/{expense_id}", headers=accountant_headers)

    def test_update_expense(self, api_client, accountant_headers):
        """PUT updates category and amount."""
        res = api_client.post(
            "/vehicle-expenses",
            headers=accountant_headers,
            json={
                "vehicle_id": 1,
                "category": "SUA_CHUA",
                "amount": 100_000,
                "expense_date": date.today().isoformat(),
            },
        )
        assert res.status_code == 201
        expense_id = res.json()["id"]

        try:
            upd = api_client.put(
                f"/vehicle-expenses/{expense_id}",
                headers=accountant_headers,
                json={"amount": 999_000},
            )
            assert upd.status_code == 200, upd.text
            assert upd.json()["amount"] == 999_000
        finally:
            api_client.delete(f"/vehicle-expenses/{expense_id}", headers=accountant_headers)

    def test_delete_expense(self, api_client, accountant_headers):
        """DELETE removes the record; subsequent GET returns 404."""
        res = api_client.post(
            "/vehicle-expenses",
            headers=accountant_headers,
            json={
                "vehicle_id": 1,
                "category": "TIEN_LUAT",
                "amount": 50_000,
                "expense_date": date.today().isoformat(),
            },
        )
        assert res.status_code == 201
        expense_id = res.json()["id"]

        del_res = api_client.delete(f"/vehicle-expenses/{expense_id}", headers=accountant_headers)
        assert del_res.status_code == 204

        get_res = api_client.get(f"/vehicle-expenses/{expense_id}", headers=accountant_headers)
        assert get_res.status_code == 404

    def test_list_filter_by_category(self, api_client, accountant_headers):
        """Filter by category returns only matching records."""
        res = api_client.post(
            "/vehicle-expenses",
            headers=accountant_headers,
            json={
                "vehicle_id": 1,
                "category": "TIEN_LUAT",
                "amount": 111_000,
                "expense_date": date.today().isoformat(),
                "description": "Category filter test",
            },
        )
        assert res.status_code == 201
        expense_id = res.json()["id"]

        try:
            list_res = api_client.get(
                "/vehicle-expenses",
                headers=accountant_headers,
                params={"category": "TIEN_LUAT"},
            )
            assert list_res.status_code == 200, list_res.text
            for item in list_res.json()["items"]:
                assert item["category"] == "TIEN_LUAT", f"Unexpected category: {item['category']}"
        finally:
            api_client.delete(f"/vehicle-expenses/{expense_id}", headers=accountant_headers)

    def test_list_filter_by_date_range(self, api_client, accountant_headers):
        """Date range filter excludes out-of-range records."""
        today = date.today()
        yesterday = (today - timedelta(days=1)).isoformat()
        two_days_ago = (today - timedelta(days=2)).isoformat()

        res = api_client.post(
            "/vehicle-expenses",
            headers=accountant_headers,
            json={
                "vehicle_id": 1,
                "category": "KHAC",
                "amount": 222_000,
                "expense_date": two_days_ago,
            },
        )
        assert res.status_code == 201
        expense_id = res.json()["id"]

        try:
            # Query for yesterday only — should not include the two-days-ago record
            list_res = api_client.get(
                "/vehicle-expenses",
                headers=accountant_headers,
                params={"date_from": yesterday, "date_to": yesterday},
            )
            assert list_res.status_code == 200
            ids = [e["id"] for e in list_res.json()["items"]]
            assert expense_id not in ids, "Out-of-range expense should not appear"
        finally:
            api_client.delete(f"/vehicle-expenses/{expense_id}", headers=accountant_headers)

    def test_driver_cannot_create_expense(self, api_client, driver_headers):
        """Drivers do not have permission to create vehicle expenses."""
        res = api_client.post(
            "/vehicle-expenses",
            headers=driver_headers,
            json={
                "vehicle_id": 1,
                "category": "XANG_DAU",
                "amount": 100_000,
                "expense_date": date.today().isoformat(),
            },
        )
        assert res.status_code in (401, 403), f"Expected 401/403, got {res.status_code}"


class TestVehiclePnL:
    """GET /dashboard/vehicle-pnl."""

    def test_vehicle_pnl_returns_200(self, api_client, accountant_headers):
        """Endpoint is reachable and returns a valid structure."""
        today = date.today().isoformat()
        month_start = date.today().replace(day=1).isoformat()
        res = api_client.get(
            "/dashboard/vehicle-pnl",
            headers=accountant_headers,
            params={"date_from": month_start, "date_to": today},
        )
        assert res.status_code == 200, f"Expected 200: {res.text}"
        body = res.json()
        assert "rows" in body
        assert "total_revenue" in body
        assert "total_profit" in body
        assert isinstance(body["rows"], list)

    def test_vehicle_pnl_profit_equals_revenue_minus_costs(self, api_client, accountant_headers):
        """For each row: loi_nhuan == revenue - (cp_xe.total + cp_luong_san_luong + cp_luong_co_ban)."""
        today = date.today().isoformat()
        month_start = date.today().replace(day=1).isoformat()
        res = api_client.get(
            "/dashboard/vehicle-pnl",
            headers=accountant_headers,
            params={"date_from": month_start, "date_to": today},
        )
        assert res.status_code == 200
        for row in res.json()["rows"]:
            expected = (
                row["revenue"]
                - row["cp_xe"]["total"]
                - row["cp_luong_san_luong"]
                - row["cp_luong_co_ban"]
            )
            assert row["loi_nhuan"] == expected, (
                f"P&L mismatch for vehicle {row['plate']}: "
                f"expected {expected}, got {row['loi_nhuan']}"
            )

    def test_vehicle_pnl_invalid_dates_returns_422(self, api_client, accountant_headers):
        """Bad date format should return 422."""
        res = api_client.get(
            "/dashboard/vehicle-pnl",
            headers=accountant_headers,
            params={"date_from": "not-a-date", "date_to": "also-bad"},
        )
        assert res.status_code == 422, f"Expected 422, got {res.status_code}"
