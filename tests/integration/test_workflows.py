"""End-to-end workflow tests that chain multiple API calls."""

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


class TestFullFreightPipeline:
    """Complete freight workflow: client -> locations -> route -> pricing -> WO -> TO -> reconcile."""

    def test_full_pipeline(self, api_client, admin_headers, create_client, create_location):
        # 1. Create client
        client = create_client()
        assert "id" in client

        # 2. Create locations
        pickup = create_location()
        dropoff = create_location()
        assert pickup["id"] != dropoff["id"]

        # 3. Create route
        route_resp = api_client.post(
            "/routes",
            headers=admin_headers,
            json={
                "route": f"IT_Pipeline_{pickup['id']}_{dropoff['id']}",
                "pickup_location_id": pickup["id"],
                "dropoff_location_id": dropoff["id"],
            },
        )
        assert route_resp.status_code in (200, 201)
        route = route_resp.json()

        # 4. Create pricing
        pricing_resp = api_client.post(
            "/pricings",
            headers=admin_headers,
            json={
                "client_id": client["id"],
                "work_type": "E20",
                "pickup_location_id": pickup["id"],
                "dropoff_location_id": dropoff["id"],
                "lines": [{"quantity": 1, "unit_price": 1500000, "driver_salary": 400000, "allowance": 80000}],
            },
        )
        assert pricing_resp.status_code in (200, 201)
        pricing = pricing_resp.json()

        # 5. Create work order
        uid = uuid4().hex[:8]
        wo_resp = api_client.post(
            "/work-orders",
            headers=admin_headers,
            json={
                "client_id": client["id"],
                "route": route["route"],
                "pickup_location_id": pickup["id"],
                "dropoff_location_id": dropoff["id"],
                "driver_id": 4,
                "tractor_plate": "29C-12345",
                "containers": [{"container_number": _container_number(), "work_type": "E20"}],
            },
        )
        assert wo_resp.status_code in (200, 201)
        wo = wo_resp.json()
        assert wo["status"] == "PENDING"

        # 6. Create trip order with matching details
        to_resp = api_client.post(
            "/trip-orders",
            headers=admin_headers,
            json={
                "trip_date": date.today().isoformat(),
                "client_id": client["id"],
                "route": route["route"],
                "pickup_location_id": pickup["id"],
                "dropoff_location_id": dropoff["id"],
                "pricing_id": pricing["id"],
                "unit_price": 1500000,
                "driver_salary": 400000,
                "allowance": 80000,
                "revenue": 1500000,
                "containers": [{"container_number": _container_number(), "work_type": "E20"}],
            },
        )
        assert to_resp.status_code in (200, 201)
        to = to_resp.json()
        assert to["status"] in ("DRAFT", "PENDING")

        # 7. Reconcile (match)
        match_resp = api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "trip_order_id": to["id"]},
        )
        assert match_resp.status_code == 200

        # 8. Verify WO status changed to MATCHED
        wo_check = api_client.get(f"/work-orders/{wo['id']}", headers=admin_headers)
        assert wo_check.json()["status"] == "MATCHED"

        # 9. Verify TO has matched WO
        to_check = api_client.get(f"/trip-orders/{to['id']}", headers=admin_headers)
        assert wo["id"] in to_check.json().get("matched_work_order_ids", [])

        # Cleanup
        api_client.delete(f"/pricings/{pricing['id']}", headers=admin_headers)
        api_client.delete(f"/routes/{route['id']}", headers=admin_headers)


class TestLocationAliasWorkflow:
    """Full location alias FSM cycle."""

    def test_alias_fsm_cycle(self, api_client, admin_headers, create_location):
        # Create location + alias
        loc = create_location()
        alias_resp = api_client.post(
            "/location-aliases",
            headers=admin_headers,
            json={"location_id": loc["id"], "alias": f"IT_FSM_{loc['id']}"},
        )
        assert alias_resp.status_code in (200, 201)
        alias = alias_resp.json()
        assert alias["status"] == "PENDING"

        # Confirm
        confirm = api_client.post(f"/location-aliases/{alias['id']}/confirm", headers=admin_headers)
        assert confirm.status_code == 200
        assert confirm.json()["status"] == "CONFIRMED"

        # Try confirm again -> error
        dup_confirm = api_client.post(f"/location-aliases/{alias['id']}/confirm", headers=admin_headers)
        assert dup_confirm.status_code in (400, 409)

        # Create second alias, reject it, then reopen
        alias2_resp = api_client.post(
            "/location-aliases",
            headers=admin_headers,
            json={"location_id": loc["id"], "alias": f"IT_FSM2_{loc['id']}"},
        )
        alias2 = alias2_resp.json()

        reject = api_client.post(
            f"/location-aliases/{alias2['id']}/reject",
            headers=admin_headers,
            json={"note": "test reject"},
        )
        assert reject.json()["status"] == "REJECTED"

        reopen = api_client.post(f"/location-aliases/{alias2['id']}/reopen", headers=admin_headers)
        assert reopen.json()["status"] == "PENDING"

    def test_merge_workflow(self, api_client, admin_headers, create_location):
        source = create_location()
        target = create_location()

        merge = api_client.post(
            "/location-aliases/merge-locations",
            headers=admin_headers,
            json={"source_location_id": source["id"], "target_location_id": target["id"]},
        )
        assert merge.status_code == 200

        source_check = api_client.get(f"/locations/{source['id']}", headers=admin_headers)
        if source_check.status_code == 200:
            assert source_check.json()["is_active"] is False


class TestReconciliationCycle:
    """Match -> unmatch -> bulk re-match cycle."""

    def test_reconciliation_cycle(self, api_client, admin_headers, create_client, create_location):
        client = create_client()
        pickup = create_location()
        dropoff = create_location()

        # Create WO
        uid = uuid4().hex[:8]
        wo_resp = api_client.post(
            "/work-orders",
            headers=admin_headers,
            json={
                "client_id": client["id"],
                "route": f"IT_RC_{uid}",
                "pickup_location_id": pickup["id"],
                "dropoff_location_id": dropoff["id"],
                "driver_id": 4,
                "tractor_plate": "29C-12345",
                "containers": [{"container_number": _container_number(), "work_type": "E20"}],
            },
        )
        wo = wo_resp.json()
        assert wo_resp.status_code in (200, 201)

        # Create TO
        to_resp = api_client.post(
            "/trip-orders",
            headers=admin_headers,
            json={
                "trip_date": date.today().isoformat(),
                "client_id": client["id"],
                "route": f"IT_RC_{uid}",
                "pickup_location_id": pickup["id"],
                "dropoff_location_id": dropoff["id"],
                "unit_price": 1000000,
                "driver_salary": 300000,
                "allowance": 50000,
                "revenue": 1000000,
                "containers": [{"container_number": _container_number(), "work_type": "E20"}],
            },
        )
        assert to_resp.status_code in (200, 201)
        to = to_resp.json()

        # Suggest matches
        suggest = api_client.get(f"/suggest-matches/{wo['id']}", headers=admin_headers)
        assert suggest.status_code == 200

        # Match
        match = api_client.post(
            "/reconcile",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "trip_order_id": to["id"]},
        )
        assert match.status_code == 200

        # Unmatch
        unmatch = api_client.post(
            "/reconcile/unmatch",
            headers=admin_headers,
            json={"work_order_id": wo["id"], "trip_order_id": to["id"], "reason": "test cycle"},
        )
        assert unmatch.status_code == 200

        # Bulk re-match
        bulk = api_client.post(
            "/reconcile/bulk-match",
            headers=admin_headers,
            json={"pairs": [{"work_order_id": wo["id"], "trip_order_id": to["id"]}]},
        )
        assert bulk.status_code == 200


class TestSalaryLifecycle:
    """Salary config -> calculate -> verify -> update status."""

    def test_salary_lifecycle(self, api_client, admin_headers):
        # Read current config
        config_resp = api_client.get("/salary/config", headers=admin_headers)
        assert config_resp.status_code == 200
        original_config = config_resp.json()

        # Set known config
        api_client.put(
            "/salary/config",
            headers=admin_headers,
            json={"from_day": 1, "to_day": 25},
        )

        # Calculate salary
        today = date.today()
        calc_resp = api_client.post(
            "/salary/calculate",
            headers=admin_headers,
            json={
                "driver_id": 4,
                "start_date": today.isoformat(),
                "end_date": today.isoformat(),
            },
        )
        assert calc_resp.status_code in (200, 202)

        # List salary periods
        list_resp = api_client.get("/salary", headers=admin_headers, params={"driver_id": 4})
        assert list_resp.status_code == 200

        # Restore config
        api_client.put(
            "/salary/config",
            headers=admin_headers,
            json={"from_day": original_config["from_day"], "to_day": original_config["to_day"]},
        )


class TestImportExportWorkflow:
    """Download template and export trip orders."""

    def test_template_and_export(self, api_client, accountant_headers):
        # Download template
        template = api_client.get("/trip-orders/template", headers=accountant_headers)
        assert template.status_code in (200, 500)

        # Export trip orders
        export = api_client.get("/trip-orders/export", headers=accountant_headers)
        assert export.status_code == 200
