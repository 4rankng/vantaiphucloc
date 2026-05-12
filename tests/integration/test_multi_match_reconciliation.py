"""Integration tests for TO-centric multi-match reconciliation (1 TripOrder → N WorkOrders).

Validates the TO-centric acceptance criteria:
  AC-1: TO with 1 container matches 1 WO; 2nd WO rejected (capacity)
  AC-2: TO with 2 containers matches 2 WOs; 3rd WO rejected (capacity)
  AC-3: Unmatch one of two WOs — TO stays MATCHED, capacity reopens
  AC-4: Unmatch last WO — both TO and WO return to PENDING
  AC-5: Already-matched WO rejected when matching to another TO
  AC-6: After match, status is MATCHED (not COMPLETED)
  AC-7: Pricing snapshot on WO (1:1 overwrite, not accumulation)
  AC-batch: batch-for-to validates capacity at endpoint level
"""

from datetime import date


def _container_number() -> str:
    """Generate a valid ISO 6346 container number."""
    import random
    import string
    _ISO_LETTER_MAP = {
        "A": 10, "B": 12, "C": 13, "D": 14, "E": 15, "F": 16, "G": 17, "H": 18, "I": 19,
        "J": 20, "K": 21, "L": 23, "M": 24, "N": 25, "O": 26, "P": 27, "Q": 28, "R": 29,
        "S": 30, "T": 31, "U": 32, "V": 34, "W": 35, "X": 36, "Y": 37, "Z": 38,
    }
    _ISO_POWERS = [2**i for i in range(10)]
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


class TestTOCentricReconciliation:
    """Test 1 TO → N WOs matching flows (TO-centric model)."""

    def _create_shared_context(self, create_partner, create_location):
        """Create shared partner + locations for tests."""
        partner = create_partner()
        pickup = create_location()
        dropoff = create_location()
        return partner, pickup, dropoff

    # ── AC-1: TO with 1 container, match 1 WO, 2nd rejected ────────

    def test_ac1_to_with_1_container_capacity_enforced(
        self, api_client, admin_headers, create_work_order, create_trip_order,
        create_partner, create_location,
    ):
        """TO with 1 container can match 1 WO. Attempting 2nd WO fails."""
        partner, pickup, dropoff = self._create_shared_context(create_partner, create_location)
        c1 = _container_number()
        c2 = _container_number()

        to1 = create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c1, "work_type": "E20"}],
        )
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

        # Match WO1 to TO1 — should succeed
        resp1 = api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo1["id"], "trip_order_id": to1["id"]},
        )
        assert resp1.status_code == 200, f"First match failed: {resp1.text}"

        # Verify statuses
        to_check = api_client.get(f"/trip-orders/{to1['id']}", headers=admin_headers)
        assert to_check.json()["status"] == "MATCHED"
        wo_check = api_client.get(f"/work-orders/{wo1['id']}", headers=admin_headers)
        assert wo_check.json()["status"] == "MATCHED"

        # Try to match WO2 to same TO1 — should fail (capacity exceeded)
        resp2 = api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo2["id"], "trip_order_id": to1["id"]},
        )
        assert resp2.status_code in (409, 422), (
            f"Second match should fail with capacity error: {resp2.text}"
        )

    # ── AC-2: TO with 2 containers matches 2 WOs ───────────────────

    def test_ac2_to_with_2_containers_matches_2_wos(
        self, api_client, admin_headers, create_work_order, create_trip_order,
        create_partner, create_location,
    ):
        """TO with 2 containers matches 2 WOs. 3rd WO rejected."""
        partner, pickup, dropoff = self._create_shared_context(create_partner, create_location)
        c1 = _container_number()
        c2 = _container_number()
        c3 = _container_number()

        to1 = create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[
                {"container_number": c1, "work_type": "E20"},
                {"container_number": c2, "work_type": "E20"},
            ],
        )
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
        wo3 = create_work_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c3, "work_type": "E20"}],
        )

        # Use batch-for-to endpoint
        resp = api_client.post(
            "/reconcile/batch-for-to",
            headers=admin_headers,
            json={
                "trip_order_id": to1["id"],
                "work_order_ids": [wo1["id"], wo2["id"]],
            },
        )
        assert resp.status_code == 200, f"Batch match failed: {resp.text}"
        data = resp.json()
        assert data["trip_order_id"] == to1["id"]
        assert len(data["results"]) == 2
        assert all(r["success"] for r in data["results"]), f"Some matches failed: {data['results']}"

        # TO should be MATCHED
        to_check = api_client.get(f"/trip-orders/{to1['id']}", headers=admin_headers)
        assert to_check.json()["status"] == "MATCHED"

        # Both WOs should be MATCHED
        for wo_id in [wo1["id"], wo2["id"]]:
            wo_check = api_client.get(f"/work-orders/{wo_id}", headers=admin_headers)
            assert wo_check.json()["status"] == "MATCHED"

        # 3rd WO should be rejected (capacity)
        resp3 = api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo3["id"], "trip_order_id": to1["id"]},
        )
        assert resp3.status_code in (409, 422), (
            f"3rd WO should be rejected: {resp3.text}"
        )

    # ── AC-3: Unmatch one of two WOs, capacity reopens ──────────────

    def test_ac3_unmatch_one_reopens_capacity(
        self, api_client, admin_headers, create_work_order, create_trip_order,
        create_partner, create_location,
    ):
        """Unmatch 1 of 2 WOs — TO stays MATCHED, new WO can fill the slot."""
        partner, pickup, dropoff = self._create_shared_context(create_partner, create_location)
        c1 = _container_number()
        c2 = _container_number()
        c3 = _container_number()

        to1 = create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[
                {"container_number": c1, "work_type": "E20"},
                {"container_number": c2, "work_type": "E20"},
            ],
        )
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
        wo3 = create_work_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c3, "work_type": "E20"}],
        )

        # Match both WO1 and WO2 to TO1
        batch_resp = api_client.post(
            "/reconcile/batch-for-to",
            headers=admin_headers,
            json={"trip_order_id": to1["id"], "work_order_ids": [wo1["id"], wo2["id"]]},
        )
        assert batch_resp.status_code == 200

        # Unmatch WO1
        unmatch_resp = api_client.post(
            "/reconcile/unmatch",
            headers=admin_headers,
            json={"work_order_id": wo1["id"], "trip_order_id": to1["id"], "reason": "AC3 test"},
        )
        assert unmatch_resp.status_code == 200, f"Unmatch failed: {unmatch_resp.text}"

        # WO1 should be PENDING
        wo1_check = api_client.get(f"/work-orders/{wo1['id']}", headers=admin_headers)
        assert wo1_check.json()["status"] == "PENDING"

        # TO should still be MATCHED (still has WO2)
        to_check = api_client.get(f"/trip-orders/{to1['id']}", headers=admin_headers)
        assert to_check.json()["status"] == "MATCHED"

        # WO3 should now be able to match (capacity reopened)
        match3_resp = api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo3["id"], "trip_order_id": to1["id"]},
        )
        assert match3_resp.status_code == 200, f"3rd match after unmatch should succeed: {match3_resp.text}"

    # ── AC-4: Unmatch last WO resets both to PENDING ────────────────

    def test_ac4_unmatch_last_resets_to_pending(
        self, api_client, admin_headers, create_work_order, create_trip_order,
        create_partner, create_location,
    ):
        """Unmatching the last WO — both TO and WO go to PENDING."""
        partner, pickup, dropoff = self._create_shared_context(create_partner, create_location)
        c1 = _container_number()

        to1 = create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c1, "work_type": "E20"}],
        )
        wo1 = create_work_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c1, "work_type": "E20"}],
        )

        # Match
        match_resp = api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo1["id"], "trip_order_id": to1["id"]},
        )
        assert match_resp.status_code == 200

        # Unmatch
        unmatch_resp = api_client.post(
            "/reconcile/unmatch",
            headers=admin_headers,
            json={"work_order_id": wo1["id"], "trip_order_id": to1["id"], "reason": "AC4 last one"},
        )
        assert unmatch_resp.status_code == 200, f"Unmatch failed: {unmatch_resp.text}"

        # Both PENDING
        wo_check = api_client.get(f"/work-orders/{wo1['id']}", headers=admin_headers)
        assert wo_check.json()["status"] == "PENDING"
        to_check = api_client.get(f"/trip-orders/{to1['id']}", headers=admin_headers)
        assert to_check.json()["status"] == "PENDING"

        # TO can be re-matched
        re_match = api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo1["id"], "trip_order_id": to1["id"]},
        )
        assert re_match.status_code == 200, f"Re-match should succeed: {re_match.text}"

    # ── AC-5: Already-matched WO rejected ───────────────────────────

    def test_ac5_already_matched_wo_rejected(
        self, api_client, admin_headers, create_work_order, create_trip_order,
        create_partner, create_location,
    ):
        """WO already matched to TO-1 cannot match with TO-2."""
        partner, pickup, dropoff = self._create_shared_context(create_partner, create_location)
        c1 = _container_number()
        c2 = _container_number()

        wo1 = create_work_order(
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
        to2 = create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c2, "work_type": "E20"}],
        )

        # Match WO1 to TO1
        match_resp = api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo1["id"], "trip_order_id": to1["id"]},
        )
        assert match_resp.status_code == 200

        # Try to match same WO1 to TO2
        dup_resp = api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo1["id"], "trip_order_id": to2["id"]},
        )
        assert dup_resp.status_code in (409, 422), (
            f"Already-matched WO should be rejected: {dup_resp.text}"
        )

    # ── AC-6: Status is MATCHED, not COMPLETED ─────────────────────

    def test_ac6_status_is_matched_not_completed(
        self, api_client, admin_headers, create_work_order, create_trip_order,
        create_partner, create_location,
    ):
        """After match, TO and WO status must be MATCHED (not COMPLETED)."""
        partner, pickup, dropoff = self._create_shared_context(create_partner, create_location)
        c1 = _container_number()

        to1 = create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c1, "work_type": "E20"}],
        )
        wo1 = create_work_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c1, "work_type": "E20"}],
        )

        resp = api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo1["id"], "trip_order_id": to1["id"]},
        )
        assert resp.status_code == 200

        to_check = api_client.get(f"/trip-orders/{to1['id']}", headers=admin_headers)
        assert to_check.json()["status"] == "MATCHED", (
            f"TO status should be MATCHED, got {to_check.json()['status']}"
        )

        wo_check = api_client.get(f"/work-orders/{wo1['id']}", headers=admin_headers)
        assert wo_check.json()["status"] == "MATCHED", (
            f"WO status should be MATCHED, got {wo_check.json()['status']}"
        )

    # ── AC-7: Pricing snapshot on WO (1:1 overwrite) ───────────────

    def test_ac7_pricing_snapshot_on_wo(
        self, api_client, admin_headers, create_work_order, create_trip_order,
        create_partner, create_location,
    ):
        """WO gets pricing snapshot from TO (overwrite, not accumulation)."""
        partner, pickup, dropoff = self._create_shared_context(create_partner, create_location)
        c1 = _container_number()

        to1 = create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            driver_salary=500000,
            allowance=50000,
            unit_price=1000000,
            containers=[{"container_number": c1, "work_type": "E20"}],
        )
        wo1 = create_work_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c1, "work_type": "E20"}],
        )

        resp = api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo1["id"], "trip_order_id": to1["id"]},
        )
        assert resp.status_code == 200

        wo_check = api_client.get(f"/work-orders/{wo1['id']}", headers=admin_headers)
        wo_data = wo_check.json()
        assert wo_data["driver_salary"] == 500000, (
            f"Expected salary 500000, got {wo_data['driver_salary']}"
        )
        assert wo_data["allowance"] == 50000
        assert wo_data["unit_price"] == 1000000

        # Unmatch → pricing should reset to 0
        unmatch_resp = api_client.post(
            "/reconcile/unmatch",
            headers=admin_headers,
            json={"work_order_id": wo1["id"], "trip_order_id": to1["id"], "reason": "AC7 pricing reset"},
        )
        assert unmatch_resp.status_code == 200

        wo_check2 = api_client.get(f"/work-orders/{wo1['id']}", headers=admin_headers)
        wo_data2 = wo_check2.json()
        assert wo_data2["driver_salary"] == 0, (
            f"Salary should reset to 0 after unmatch, got {wo_data2['driver_salary']}"
        )

    # ── Batch-for-TO validates capacity at endpoint level ───────────

    def test_batch_for_to_validates_capacity(
        self, api_client, admin_headers, create_work_order, create_trip_order,
        create_partner, create_location,
    ):
        """batch-for-to with 3 WOs to a 2-container TO should be rejected."""
        partner, pickup, dropoff = self._create_shared_context(create_partner, create_location)
        c1 = _container_number()
        c2 = _container_number()
        c3 = _container_number()

        to1 = create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[
                {"container_number": c1, "work_type": "E20"},
                {"container_number": c2, "work_type": "E20"},
            ],
        )
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
        wo3 = create_work_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[{"container_number": c3, "work_type": "E20"}],
        )

        # Try to batch match 3 WOs to a 2-container TO
        resp = api_client.post(
            "/reconcile/batch-for-to",
            headers=admin_headers,
            json={
                "trip_order_id": to1["id"],
                "work_order_ids": [wo1["id"], wo2["id"], wo3["id"]],
            },
        )
        assert resp.status_code == 422, (
            f"Should reject over-capacity batch: {resp.text}"
        )

    # ── Batch-for-to happy path ─────────────────────────────────────

    def test_batch_for_to_happy_path(
        self, api_client, admin_headers, create_work_order, create_trip_order,
        create_partner, create_location,
    ):
        """batch-for-to with exactly matching capacity succeeds."""
        partner, pickup, dropoff = self._create_shared_context(create_partner, create_location)
        c1 = _container_number()
        c2 = _container_number()

        to1 = create_trip_order(
            partner_id=partner["id"],
            pickup_location_id=pickup["id"],
            dropoff_location_id=dropoff["id"],
            containers=[
                {"container_number": c1, "work_type": "E20"},
                {"container_number": c2, "work_type": "E20"},
            ],
        )
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

        resp = api_client.post(
            "/reconcile/batch-for-to",
            headers=admin_headers,
            json={
                "trip_order_id": to1["id"],
                "work_order_ids": [wo1["id"], wo2["id"]],
            },
        )
        assert resp.status_code == 200, f"Batch match failed: {resp.text}"
        data = resp.json()
        assert len(data["results"]) == 2
        assert all(r["success"] for r in data["results"])

        # Unmatch both — should work cleanly
        unmatch1 = api_client.post(
            "/reconcile/unmatch",
            headers=admin_headers,
            json={"work_order_id": wo1["id"], "trip_order_id": to1["id"], "reason": "cleanup"},
        )
        assert unmatch1.status_code == 200
        unmatch2 = api_client.post(
            "/reconcile/unmatch",
            headers=admin_headers,
            json={"work_order_id": wo2["id"], "trip_order_id": to1["id"], "reason": "cleanup"},
        )
        assert unmatch2.status_code == 200

        # Both should be PENDING
        wo1_check = api_client.get(f"/work-orders/{wo1['id']}", headers=admin_headers)
        assert wo1_check.json()["status"] == "PENDING"
        to_check = api_client.get(f"/trip-orders/{to1['id']}", headers=admin_headers)
        assert to_check.json()["status"] == "PENDING"

    # ── Unmatch requires both IDs ───────────────────────────────────

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

        # Try unmatch without trip_order_id
        resp = api_client.post(
            "/reconcile/unmatch",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "reason": "missing trip_order_id"},
        )
        assert resp.status_code == 422, f"Should require trip_order_id: {resp.text}"

    # ── Matched WO not in PENDING pool ──────────────────────────────

    def test_matched_wo_not_in_pending_pool(
        self, api_client, admin_headers, create_work_order, create_trip_order,
        create_partner, create_location,
    ):
        """After matching a WO, it must not appear in the PENDING list."""
        partner, pickup, dropoff = self._create_shared_context(create_partner, create_location)
        c1 = _container_number()

        wo1 = create_work_order(
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
            json={"work_order_id": wo1["id"], "trip_order_id": to1["id"]},
        )
        assert match_resp.status_code == 200

        # Check WO not in PENDING list
        pending_wos = api_client.get(
            "/work-orders?status=PENDING", headers=admin_headers
        )
        wo_ids = [w["id"] for w in pending_wos.json().get("items", pending_wos.json())]
        assert wo1["id"] not in wo_ids, "Matched WO should not be in PENDING pool"
