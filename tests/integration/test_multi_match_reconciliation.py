"""Integration tests for multi-match reconciliation (1 WorkOrder → N TripOrders).

Validates the full REQ-001 acceptance criteria:
  AC-1: Multi-Match Happy Path
  AC-2: Partial Match (1 WO, subset of containers)
  AC-3: Unmatch One of Many
  AC-4: Unmatch Last One
  AC-5: Block Duplicate Match
  AC-6: Auto-Match Multi-Container
  AC-7: Salary Accumulation
"""

from datetime import date
from conftest import _container_number


class TestMultiMatchReconciliation:
    """Test 1 WO → N TOs batch matching flows."""

    def _create_shared_context(self, create_partner, create_location):
        """Create shared partner + locations for multi-match tests."""
        partner = create_partner()
        pickup = create_location()
        dropoff = create_location()
        return partner, pickup, dropoff

    # ── AC-1: Multi-Match Happy Path ────────────────────────────────

    def test_ac1_multi_match_happy_path(
        self, api_client, admin_headers, create_work_order, create_trip_order,
        create_partner, create_location,
    ):
        """WO with 2 containers matched to 2 TripOrders via batch-for-wo."""
        partner, pickup, dropoff = self._create_shared_context(create_partner, create_location)
        c1 = _container_number()
        c2 = _container_number()

        wo = create_work_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[
                {"container_number": c1, "work_type": "E20"},
                {"container_number": c2, "work_type": "E20"},
            ],
        )
        to1 = create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c1, "work_type": "E20"}],
        )
        to2 = create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c2, "work_type": "E20"}],
        )

        resp = api_client.post(
            "/reconcile/batch-for-wo",
            headers=admin_headers,
            json={
                "work_order_id": wo["id"],
                "trip_order_ids": [to1["id"], to2["id"]],
            },
        )
        assert resp.status_code == 200, f"Batch match failed: {resp.text}"
        data = resp.json()
        assert data["work_order_id"] == wo["id"]
        assert len(data["results"]) == 2
        assert all(r["success"] for r in data["results"]), f"Some matches failed: {data['results']}"

        # Verify WO status is MATCHED
        wo_check = api_client.get(f"/work-orders/{wo['id']}", headers=admin_headers)
        assert wo_check.json()["status"] == "MATCHED"

        # Verify both TOs are MATCHED
        for to_id in [to1["id"], to2["id"]]:
            to_check = api_client.get(f"/trip-orders/{to_id}", headers=admin_headers)
            assert to_check.json()["status"] == "MATCHED", f"TO#{to_id} should be MATCHED"

    # ── AC-2: Partial Match (1 of N containers) ─────────────────────

    def test_ac2_partial_match_one_of_two(
        self, api_client, admin_headers, create_work_order, create_trip_order,
        create_partner, create_location,
    ):
        """WO with 2 containers, only 1 matching TO — single match succeeds."""
        partner, pickup, dropoff = self._create_shared_context(create_partner, create_location)
        c1 = _container_number()
        c2 = _container_number()

        wo = create_work_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[
                {"container_number": c1, "work_type": "E20"},
                {"container_number": c2, "work_type": "E20"},
            ],
        )
        to1 = create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c1, "work_type": "E20"}],
        )

        resp = api_client.post(
            "/reconcile/batch-for-wo",
            headers=admin_headers,
            json={
                "work_order_id": wo["id"],
                "trip_order_ids": [to1["id"]],
            },
        )
        assert resp.status_code == 200, f"Partial match failed: {resp.text}"
        data = resp.json()
        assert data["results"][0]["success"]

        # WO is MATCHED, TO is MATCHED, other container still unmatched
        wo_check = api_client.get(f"/work-orders/{wo['id']}", headers=admin_headers)
        assert wo_check.json()["status"] == "MATCHED"

    # ── AC-3: Unmatch One of Many ────────────────────────────────────

    def test_ac3_unmatch_one_of_many(
        self, api_client, admin_headers, create_work_order, create_trip_order,
        create_partner, create_location,
    ):
        """Unmatching one TO from multi-matched WO — WO stays MATCHED."""
        partner, pickup, dropoff = self._create_shared_context(create_partner, create_location)
        c1 = _container_number()
        c2 = _container_number()

        wo = create_work_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[
                {"container_number": c1, "work_type": "E20"},
                {"container_number": c2, "work_type": "E20"},
            ],
        )
        to1 = create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c1, "work_type": "E20"}],
        )
        to2 = create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c2, "work_type": "E20"}],
        )

        # Batch match both
        match_resp = api_client.post(
            "/reconcile/batch-for-wo",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "trip_order_ids": [to1["id"], to2["id"]]},
        )
        assert match_resp.status_code == 200

        # Unmatch to1 only
        unmatch_resp = api_client.post(
            "/reconcile/unmatch",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "trip_order_id": to1["id"], "reason": "AC3 test"},
        )
        assert unmatch_resp.status_code == 200, f"Unmatch failed: {unmatch_resp.text}"

        # TO1 should be PENDING
        to1_check = api_client.get(f"/trip-orders/{to1['id']}", headers=admin_headers)
        assert to1_check.json()["status"] == "PENDING"

        # WO should still be MATCHED (still has TO2)
        wo_check = api_client.get(f"/work-orders/{wo['id']}", headers=admin_headers)
        assert wo_check.json()["status"] == "MATCHED"

        # TO2 should still be MATCHED
        to2_check = api_client.get(f"/trip-orders/{to2['id']}", headers=admin_headers)
        assert to2_check.json()["status"] == "MATCHED"

    # ── AC-4: Unmatch Last One ───────────────────────────────────────

    def test_ac4_unmatch_last_one(
        self, api_client, admin_headers, create_work_order, create_trip_order,
        create_partner, create_location,
    ):
        """Unmatching the last TO — WO goes to PENDING."""
        partner, pickup, dropoff = self._create_shared_context(create_partner, create_location)
        c1 = _container_number()

        wo = create_work_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c1, "work_type": "E20"}],
        )
        to1 = create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c1, "work_type": "E20"}],
        )

        # Match
        match_resp = api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "trip_order_id": to1["id"]},
        )
        assert match_resp.status_code == 200

        # Unmatch the only one
        unmatch_resp = api_client.post(
            "/reconcile/unmatch",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "trip_order_id": to1["id"], "reason": "AC4 last one"},
        )
        assert unmatch_resp.status_code == 200, f"Unmatch failed: {unmatch_resp.text}"

        # Both should be PENDING
        wo_check = api_client.get(f"/work-orders/{wo['id']}", headers=admin_headers)
        assert wo_check.json()["status"] == "PENDING"

        to_check = api_client.get(f"/trip-orders/{to1['id']}", headers=admin_headers)
        assert to_check.json()["status"] == "PENDING"

    # ── AC-5: Block Duplicate Match ──────────────────────────────────

    def test_ac5_block_duplicate_match(
        self, api_client, admin_headers, create_work_order, create_trip_order,
        create_partner, create_location,
    ):
        """TO already matched with WO-1 cannot match with WO-2."""
        partner, pickup, dropoff = self._create_shared_context(create_partner, create_location)
        c1 = _container_number()
        c2 = _container_number()

        wo1 = create_work_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c1, "work_type": "E20"}],
        )
        wo2 = create_work_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c2, "work_type": "E20"}],
        )
        to1 = create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c1, "work_type": "E20"}],
        )

        # Match TO1 with WO1
        match_resp = api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo1["id"], "trip_order_id": to1["id"]},
        )
        assert match_resp.status_code == 200

        # Try to match same TO1 with WO2 via batch endpoint
        dup_resp = api_client.post(
            "/reconcile/batch-for-wo",
            headers=admin_headers,
            json={"work_order_id": wo2["id"], "trip_order_ids": [to1["id"]]},
        )
        assert dup_resp.status_code == 200
        data = dup_resp.json()
        # The individual result should be a failure
        assert not data["results"][0]["success"], "Duplicate match should be blocked"

    # ── AC-7: Salary Accumulation ────────────────────────────────────

    def test_ac7_salary_accumulation(
        self, api_client, admin_headers, create_work_order, create_trip_order,
        create_partner, create_location,
    ):
        """Driver salary = sum of all matched TO salaries."""
        partner, pickup, dropoff = self._create_shared_context(create_partner, create_location)
        c1 = _container_number()
        c2 = _container_number()

        wo = create_work_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[
                {"container_number": c1, "work_type": "E20"},
                {"container_number": c2, "work_type": "E20"},
            ],
        )
        to1 = create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            driver_salary=500000,
            allowance=50000,
            containers=[{"container_number": c1, "work_type": "E20"}],
        )
        to2 = create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            driver_salary=500000,
            allowance=50000,
            containers=[{"container_number": c2, "work_type": "E20"}],
        )

        # Batch match
        match_resp = api_client.post(
            "/reconcile/batch-for-wo",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "trip_order_ids": [to1["id"], to2["id"]]},
        )
        assert match_resp.status_code == 200

        # WO salary should be accumulated: 500000 + 500000 = 1000000
        wo_check = api_client.get(f"/work-orders/{wo['id']}", headers=admin_headers)
        wo_data = wo_check.json()
        assert wo_data["driver_salary"] == 1000000, f"Expected salary 1000000, got {wo_data['driver_salary']}"

        # Unmatch one TO → salary should drop by that TO's amount
        unmatch_resp = api_client.post(
            "/reconcile/unmatch",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "trip_order_id": to1["id"], "reason": "AC7 salary test"},
        )
        assert unmatch_resp.status_code == 200

        wo_check2 = api_client.get(f"/work-orders/{wo['id']}", headers=admin_headers)
        wo_data2 = wo_check2.json()
        assert wo_data2["driver_salary"] == 500000, f"Expected salary 500000 after unmatch, got {wo_data2['driver_salary']}"

    # ── Batch-for-wo with N=1 (single match) ─────────────────────────

    def test_batch_for_wo_single_match(
        self, api_client, admin_headers, create_work_order, create_trip_order,
        create_partner, create_location,
    ):
        """batch-for-wo with N=1 should behave like regular reconcile."""
        partner, pickup, dropoff = self._create_shared_context(create_partner, create_location)
        c1 = _container_number()

        wo = create_work_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c1, "work_type": "E20"}],
        )
        to1 = create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c1, "work_type": "E20"}],
        )

        resp = api_client.post(
            "/reconcile/batch-for-wo",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "trip_order_ids": [to1["id"]]},
        )
        assert resp.status_code == 200
        assert resp.json()["results"][0]["success"]

        wo_check = api_client.get(f"/work-orders/{wo['id']}", headers=admin_headers)
        assert wo_check.json()["status"] == "MATCHED"

    # ── Unmatch requires both IDs ────────────────────────────────────

    def test_unmatch_requires_both_ids(
        self, api_client, admin_headers, create_work_order, create_trip_order,
    ):
        """Unmatch endpoint should require both work_order_id and trip_order_id."""
        wo = create_work_order()
        to = create_trip_order()

        # Match first
        api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "trip_order_id": to["id"]},
        )

        # Try unmatch without trip_order_id (should fail validation)
        resp = api_client.post(
            "/reconcile/unmatch",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "reason": "missing trip_order_id"},
        )
        assert resp.status_code == 422, f"Should require trip_order_id: {resp.text}"

    # ── find_link no crash with multiple results ─────────────────────

    def test_multi_match_find_link_no_crash(
        self, api_client, admin_headers, create_work_order, create_trip_order,
        create_partner, create_location,
    ):
        """After batch match, unmatch by both IDs should work (no MultipleResultsFound)."""
        partner, pickup, dropoff = self._create_shared_context(create_partner, create_location)
        c1 = _container_number()
        c2 = _container_number()

        wo = create_work_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[
                {"container_number": c1, "work_type": "E20"},
                {"container_number": c2, "work_type": "E20"},
            ],
        )
        to1 = create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c1, "work_type": "E20"}],
        )
        to2 = create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c2, "work_type": "E20"}],
        )

        # Batch match
        match_resp = api_client.post(
            "/reconcile/batch-for-wo",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "trip_order_ids": [to1["id"], to2["id"]]},
        )
        assert match_resp.status_code == 200

        # Unmatch one — should NOT crash with MultipleResultsFound
        unmatch_resp = api_client.post(
            "/reconcile/unmatch",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "trip_order_id": to1["id"], "reason": "no crash test"},
        )
        assert unmatch_resp.status_code == 200, f"Unmatch crashed: {unmatch_resp.text}"

        # Unmatch the other
        unmatch_resp2 = api_client.post(
            "/reconcile/unmatch",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "trip_order_id": to2["id"], "reason": "no crash test 2"},
        )
        assert unmatch_resp2.status_code == 200, f"Second unmatch crashed: {unmatch_resp2.text}"

        # WO should be PENDING now
        wo_check = api_client.get(f"/work-orders/{wo['id']}", headers=admin_headers)
        assert wo_check.json()["status"] == "PENDING"
