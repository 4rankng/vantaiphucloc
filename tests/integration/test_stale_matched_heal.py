"""Integration tests for auto-healing stale MATCHED WorkOrders.

Validates that WOs stuck in MATCHED status with 0 active reconciliation
links are automatically reset to PENDING when loaded via the API.

Covers:
  TC1: Auto-heal resets MATCHED WO with 0 active links → PENDING
  TC2: Auto-heal does NOT affect legitimately MATCHED WO
  TC3: Auto-heal works on individual GET endpoint
  TC4: matched_trip_count is accurate across mixed WO states
  TC5: Unmatch last TO resets WO via normal flow (not auto-heal)
"""

import pytest


class TestStaleMatchedHeal:
    """Test auto-heal for stale MATCHED WorkOrders."""

    def _setup_match(self, api_client, admin_headers, create_work_order,
                     create_trip_order):
        """Create and match a WO+TO pair. Returns (wo, to)."""
        # Use conftest factories which generate valid container numbers
        wo = create_work_order()
        to_data = create_trip_order()

        # Match them
        match_resp = api_client.post("/reconcile", json={
            "work_order_id": wo["id"],
            "trip_order_id": to_data["id"],
        }, headers=admin_headers)
        assert match_resp.status_code in (200, 201), f"Match failed: {match_resp.text}"

        return wo, to_data

    # ── TC1: Auto-heal resets MATCHED WO with 0 active links ────────

    def test_tc1_auto_heal_resets_stale_matched(
        self, api_client, admin_headers, create_work_order,
        create_trip_order,
    ):
        """WO with MATCHED status but 0 active links should be auto-healed to PENDING."""
        wo, to_data = self._setup_match(api_client, admin_headers, create_work_order, create_trip_order)

        # Verify WO is MATCHED
        wo_check = api_client.get(f"/work-orders/{wo['id']}", headers=admin_headers)
        assert wo_check.status_code == 200
        assert wo_check.json()["status"] == "MATCHED"

        # Unmatch (this should set WO back to PENDING and deactivate link)
        unmatch_resp = api_client.post("/reconcile/unmatch", json={
            "work_order_id": wo["id"],
            "trip_order_id": to_data["id"],
            "reason": "simulate stale state",
        }, headers=admin_headers)
        assert unmatch_resp.status_code == 200

        # Now manually set WO status back to MATCHED to simulate a stale state
        update_resp = api_client.put(f"/work-orders/{wo['id']}", json={
            "status": "MATCHED",
        }, headers=admin_headers)
        assert update_resp.status_code == 200

        # GET the WO — auto-heal should have kicked in
        wo_verify = api_client.get(f"/work-orders/{wo['id']}", headers=admin_headers)
        assert wo_verify.status_code == 200
        assert wo_verify.json()["status"] == "PENDING", \
            f"Auto-heal should have reset stale MATCHED WO to PENDING, got {wo_verify.json()['status']}"
        assert wo_verify.json()["matched_trip_count"] == 0

    # ── TC2: Legitimately MATCHED WO is not affected ────────────────

    def test_tc2_legitimately_matched_wo_not_healed(
        self, api_client, admin_headers, create_work_order,
        create_trip_order,
    ):
        """WO that is MATCHED with active links should remain MATCHED."""
        wo, _ = self._setup_match(api_client, admin_headers, create_work_order, create_trip_order)

        # GET the WO — should remain MATCHED
        resp = api_client.get(f"/work-orders/{wo['id']}", headers=admin_headers)
        assert resp.status_code == 200
        wo_data = resp.json()
        assert wo_data["status"] == "MATCHED"
        assert wo_data["matched_trip_count"] == 1

    # ── TC3: Auto-heal works on individual GET endpoint ──────────────

    def test_tc3_auto_heal_on_individual_get(
        self, api_client, admin_headers, create_work_order,
        create_trip_order,
    ):
        """Auto-heal should work when fetching a single WO via GET /{id}."""
        wo, to_data = self._setup_match(api_client, admin_headers, create_work_order, create_trip_order)

        # Unmatch to deactivate links
        unmatch_resp = api_client.post("/reconcile/unmatch", json={
            "work_order_id": wo["id"],
            "trip_order_id": to_data["id"],
            "reason": "simulate stale",
        }, headers=admin_headers)
        assert unmatch_resp.status_code == 200

        # Manually set status back to MATCHED
        update_resp = api_client.put(f"/work-orders/{wo['id']}", json={
            "status": "MATCHED",
        }, headers=admin_headers)
        assert update_resp.status_code == 200

        # Fetch individual WO — auto-heal should trigger
        resp = api_client.get(f"/work-orders/{wo['id']}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "PENDING"

        # List endpoint should also show PENDING (already healed in DB)
        list_resp = api_client.get("/work-orders?limit=100", headers=admin_headers)
        assert list_resp.status_code == 200
        items = list_resp.json().get("items", list_resp.json())
        if isinstance(items, list):
            found = next((w for w in items if w["id"] == wo["id"]), None)
        else:
            found = items
        assert found is not None
        assert found["status"] == "PENDING"

    # ── TC4: Mixed WO states — matched_trip_count accurate ──────────

    def test_tc4_mixed_wo_states_accurate_counts(
        self, api_client, admin_headers, create_work_order,
        create_trip_order,
    ):
        """3 WOs: 1 stale MATCHED → healed to PENDING, 1 legit MATCHED, 1 PENDING."""
        # WO3 first (stays PENDING, simplest)
        wo3 = create_work_order()

        # WO2+TO2: will be legitimately MATCHED
        wo2, to2 = self._setup_match(api_client, admin_headers, create_work_order, create_trip_order)

        # WO1+TO1: will become stale MATCHED (create last to avoid code conflicts)
        wo1, to1 = self._setup_match(api_client, admin_headers, create_work_order, create_trip_order)

        # Make WO1 stale: unmatch, then force status back to MATCHED
        api_client.post("/reconcile/unmatch", json={
            "work_order_id": wo1["id"], "trip_order_id": to1["id"],
            "reason": "simulate stale",
        }, headers=admin_headers)
        api_client.put(f"/work-orders/{wo1['id']}", json={"status": "MATCHED"},
                       headers=admin_headers)

        # Fetch list — auto-heal should fix WO1
        list_resp = api_client.get("/work-orders?limit=100", headers=admin_headers)
        assert list_resp.status_code == 200
        items = list_resp.json().get("items", list_resp.json())
        if not isinstance(items, list):
            items = [items]

        wo_map = {w["id"]: w for w in items}

        # WO1 (stale): should be healed to PENDING, count=0
        assert wo1["id"] in wo_map
        assert wo_map[wo1["id"]]["status"] == "PENDING"
        assert wo_map[wo1["id"]]["matched_trip_count"] == 0

        # WO2 (legit): should remain MATCHED, count=1
        assert wo2["id"] in wo_map
        assert wo_map[wo2["id"]]["status"] == "MATCHED"
        assert wo_map[wo2["id"]]["matched_trip_count"] == 1

        # WO3: should be PENDING, count=0
        assert wo3["id"] in wo_map
        assert wo_map[wo3["id"]]["status"] == "PENDING"
        assert wo_map[wo3["id"]]["matched_trip_count"] == 0

    # ── TC5: Unmatch last TO resets WO via normal flow ───────────────

    def test_tc5_unmatch_last_to_resets_wo(
        self, api_client, admin_headers, create_work_order,
        create_trip_order,
    ):
        """Unmatching the last TO from a matched WO resets WO to PENDING normally."""
        wo, to_data = self._setup_match(api_client, admin_headers, create_work_order, create_trip_order)

        # Verify matched
        resp = api_client.get(f"/work-orders/{wo['id']}", headers=admin_headers)
        assert resp.json()["status"] == "MATCHED"
        assert resp.json()["matched_trip_count"] == 1

        # Unmatch
        unmatch_resp = api_client.post("/reconcile/unmatch", json={
            "work_order_id": wo["id"],
            "trip_order_id": to_data["id"],
            "reason": "normal unmatch flow",
        }, headers=admin_headers)
        assert unmatch_resp.status_code == 200

        # Verify WO is now PENDING (via normal unmatch, not auto-heal)
        resp = api_client.get(f"/work-orders/{wo['id']}", headers=admin_headers)
        assert resp.json()["status"] == "PENDING"
        assert resp.json()["matched_trip_count"] == 0
