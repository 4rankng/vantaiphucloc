"""Integration tests for reconciliation endpoints."""

from datetime import date


class TestReconcile:
    def test_reconcile_match(self, api_client, admin_headers, create_work_order, create_trip_order):
        wo = create_work_order()
        to = create_trip_order()

        resp = api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "trip_order_id": to["id"]},
        )
        assert resp.status_code == 200, f"Match failed: {resp.text}"
        data = resp.json()
        # TO-centric: status should be MATCHED (not COMPLETED)
        assert data["status"] == "MATCHED", f"Expected MATCHED, got {data['status']}"
        assert wo["id"] in data.get("matched_work_order_ids", [])

    def test_reconcile_match_idempotent(self, api_client, admin_headers, create_work_order, create_trip_order):
        wo = create_work_order()
        to = create_trip_order()

        # First match
        resp1 = api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "trip_order_id": to["id"]},
        )
        assert resp1.status_code == 200, f"First match failed: {resp1.text}"

        # Second match on same pair should fail (WO already matched)
        resp2 = api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "trip_order_id": to["id"]},
        )
        assert resp2.status_code in (400, 409), f"Duplicate match should fail: {resp2.text}"

    def test_unmatch(self, api_client, admin_headers, create_work_order, create_trip_order):
        wo = create_work_order()
        to = create_trip_order()

        # Match first
        match = api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "trip_order_id": to["id"]},
        )
        assert match.status_code == 200, f"Match failed: {match.text}"

        # Unmatch
        resp = api_client.post(
            "/reconcile/unmatch",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "trip_order_id": to["id"], "reason": "test unmatch"},
        )
        assert resp.status_code == 200, f"Unmatch failed: {resp.text}"

        # Verify WO is back to PENDING
        wo_check = api_client.get(f"/work-orders/{wo['id']}", headers=admin_headers)
        assert wo_check.json()["status"] == "PENDING"

        # Verify TO is back to PENDING
        to_check = api_client.get(f"/trip-orders/{to['id']}", headers=admin_headers)
        assert to_check.json()["status"] == "PENDING"

    def test_suggest_matches_for_wo(self, api_client, admin_headers, create_work_order):
        wo = create_work_order()
        resp = api_client.get(f"/suggest-matches/{wo['id']}", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "work_order_id" in data
        assert "suggestions" in data

    def test_suggest_matches_nonexistent_wo(self, api_client, admin_headers):
        resp = api_client.get("/suggest-matches/999999", headers=admin_headers)
        assert resp.status_code == 404

    def test_suggest_wos_for_trip(self, api_client, admin_headers, create_trip_order):
        to = create_trip_order()
        resp = api_client.get(f"/suggest-wos/{to['id']}", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "trip_order_id" in data
        assert "suggestions" in data

    def test_match_scores(self, api_client, admin_headers):
        resp = api_client.get("/match-scores", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "scores" in data

    def test_auto_match(self, api_client, admin_headers):
        today = date.today().isoformat()
        resp = api_client.post(
            "/reconcile/auto-match",
            headers=admin_headers,
            json={"date_from": today, "date_to": today},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "candidates" in data
        assert "scanned_work_order_count" in data
        assert "unmatched_work_order_refs" in data
        assert "errors" in data

    def test_bulk_match(self, api_client, admin_headers, create_work_order, create_trip_order):
        wo = create_work_order()
        to = create_trip_order()

        resp = api_client.post(
            "/reconcile/bulk-match",
            headers=admin_headers,
            json={"pairs": [{"work_order_id": wo["id"], "trip_order_id": to["id"]}]},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "matched" in data
        assert "errors" in data

    def test_export_excel(self, api_client, admin_headers):
        resp = api_client.get("/reconcile/export", headers=admin_headers)
        assert resp.status_code in (200, 400, 404)

    def test_driver_cannot_reconcile(self, api_client, driver_headers):
        resp = api_client.post(
            "/reconcile",
            headers=driver_headers,
            json={"work_order_id": 1, "trip_order_id": 1},
        )
        assert resp.status_code == 403
