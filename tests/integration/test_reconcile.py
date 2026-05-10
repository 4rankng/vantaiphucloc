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
        assert resp.status_code == 200

    def test_unmatch(self, api_client, admin_headers, create_work_order, create_trip_order):
        wo = create_work_order()
        to = create_trip_order()

        api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "trip_order_id": to["id"]},
        )
        resp = api_client.post(
            "/reconcile/unmatch",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "trip_order_id": to["id"]},
        )
        assert resp.status_code == 200

    def test_suggest_matches_for_wo(self, api_client, admin_headers, create_work_order):
        wo = create_work_order()
        resp = api_client.get(f"/suggest-matches/{wo['id']}", headers=admin_headers)
        assert resp.status_code == 200

    def test_suggest_matches_nonexistent_wo(self, api_client, admin_headers):
        resp = api_client.get("/suggest-matches/999999", headers=admin_headers)
        assert resp.status_code == 404

    def test_suggest_wos_for_trip(self, api_client, admin_headers, create_trip_order):
        to = create_trip_order()
        resp = api_client.get(f"/suggest-wos/{to['id']}", headers=admin_headers)
        assert resp.status_code == 200

    def test_match_scores(self, api_client, admin_headers):
        resp = api_client.get("/match-scores", headers=admin_headers)
        assert resp.status_code == 200

    def test_auto_match(self, api_client, admin_headers):
        today = date.today().isoformat()
        resp = api_client.post(
            "/reconcile/auto-match",
            headers=admin_headers,
            json={"date_from": today, "date_to": today},
        )
        assert resp.status_code in (200, 202)

    def test_bulk_match(self, api_client, admin_headers, create_work_order, create_trip_order):
        wo = create_work_order()
        to = create_trip_order()

        resp = api_client.post(
            "/reconcile/bulk-match",
            headers=admin_headers,
            json={"pairs": [{"work_order_id": wo["id"], "trip_order_id": to["id"]}]},
        )
        assert resp.status_code == 200

    def test_export_excel(self, api_client, admin_headers):
        resp = api_client.get("/export-excel", headers=admin_headers)
        assert resp.status_code in (200, 400)

    def test_driver_cannot_reconcile(self, api_client, driver_headers):
        resp = api_client.post(
            "/reconcile",
            headers=driver_headers,
            json={"work_order_id": 1, "trip_order_id": 1},
        )
        assert resp.status_code == 403
