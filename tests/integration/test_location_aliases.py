"""Integration tests for location alias endpoints and FSM transitions."""


class TestLocationAliases:
    def test_list_aliases(self, api_client, accountant_headers):
        resp = api_client.get("/location-aliases", headers=accountant_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list) or "items" in data

    def test_list_aliases_by_status(self, api_client, accountant_headers):
        resp = api_client.get(
            "/location-aliases", headers=accountant_headers, params={"status": "PENDING"}
        )
        assert resp.status_code == 200

    def test_create_alias(self, api_client, admin_headers, create_location):
        loc = create_location()
        resp = api_client.post(
            "/location-aliases",
            headers=admin_headers,
            json={"location_id": loc["id"], "alias": f"IT_Alias_{loc['id']}"},
        )
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert data["status"] == "PENDING"
        assert data["alias"] == f"IT_Alias_{loc['id']}"

    def test_confirm_alias(self, api_client, admin_headers, create_location):
        loc = create_location()
        alias_resp = api_client.post(
            "/location-aliases",
            headers=admin_headers,
            json={"location_id": loc["id"], "alias": f"IT_Confirm_{loc['id']}"},
        )
        alias_id = alias_resp.json()["id"]

        resp = api_client.post(
            f"/location-aliases/{alias_id}/confirm", headers=admin_headers
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "CONFIRMED"
        assert resp.json()["confirmed_by_id"] is not None

    def test_confirm_already_confirmed(self, api_client, admin_headers, create_location):
        loc = create_location()
        alias_resp = api_client.post(
            "/location-aliases",
            headers=admin_headers,
            json={"location_id": loc["id"], "alias": f"IT_Conf2_{loc['id']}"},
        )
        alias_id = alias_resp.json()["id"]

        api_client.post(f"/location-aliases/{alias_id}/confirm", headers=admin_headers)
        resp = api_client.post(f"/location-aliases/{alias_id}/confirm", headers=admin_headers)
        assert resp.status_code in (400, 409)

    def test_reject_alias(self, api_client, admin_headers, create_location):
        loc = create_location()
        alias_resp = api_client.post(
            "/location-aliases",
            headers=admin_headers,
            json={"location_id": loc["id"], "alias": f"IT_Reject_{loc['id']}"},
        )
        alias_id = alias_resp.json()["id"]

        resp = api_client.post(
            f"/location-aliases/{alias_id}/reject",
            headers=admin_headers,
            json={"note": "test rejection"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "REJECTED"
        assert resp.json()["rejected_by_id"] is not None

    def test_reopen_alias(self, api_client, admin_headers, create_location):
        loc = create_location()
        alias_resp = api_client.post(
            "/location-aliases",
            headers=admin_headers,
            json={"location_id": loc["id"], "alias": f"IT_Reopen_{loc['id']}"},
        )
        alias_id = alias_resp.json()["id"]

        api_client.post(
            f"/location-aliases/{alias_id}/reject",
            headers=admin_headers,
            json={"note": "reject to reopen"},
        )

        resp = api_client.post(f"/location-aliases/{alias_id}/reopen", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "PENDING"

    def test_reopen_non_rejected(self, api_client, admin_headers, create_location):
        loc = create_location()
        alias_resp = api_client.post(
            "/location-aliases",
            headers=admin_headers,
            json={"location_id": loc["id"], "alias": f"IT_ReopenNR_{loc['id']}"},
        )
        alias_id = alias_resp.json()["id"]

        api_client.post(f"/location-aliases/{alias_id}/confirm", headers=admin_headers)

        resp = api_client.post(f"/location-aliases/{alias_id}/reopen", headers=admin_headers)
        assert resp.status_code in (400, 409)

    def test_merge_locations(self, api_client, admin_headers, create_location):
        source = create_location()
        target = create_location()

        resp = api_client.post(
            "/location-aliases/merge-locations",
            headers=admin_headers,
            json={"source_location_id": source["id"], "target_location_id": target["id"]},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "fk_updates" in data
        assert data["source_location_id"] == source["id"]

    def test_merge_same_location(self, api_client, admin_headers, create_location):
        loc = create_location()
        resp = api_client.post(
            "/location-aliases/merge-locations",
            headers=admin_headers,
            json={"source_location_id": loc["id"], "target_location_id": loc["id"]},
        )
        assert resp.status_code in (400, 422)

    def test_merge_nonexistent(self, api_client, admin_headers):
        resp = api_client.post(
            "/location-aliases/merge-locations",
            headers=admin_headers,
            json={"source_location_id": 999999, "target_location_id": 888888},
        )
        assert resp.status_code in (404, 400)

    def test_pending_review_locations(self, api_client, admin_headers, create_location):
        loc = create_location()
        api_client.post(
            "/location-aliases",
            headers=admin_headers,
            json={"location_id": loc["id"], "alias": f"IT_Review_{loc['id']}"},
        )
        resp = api_client.get("/locations/pending-review", headers=admin_headers)
        assert resp.status_code == 200
