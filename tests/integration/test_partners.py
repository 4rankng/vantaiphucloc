"""Integration tests for partner endpoints."""


class TestPartners:
    def test_list_partners(self, api_client, accountant_headers):
        resp = api_client.get("/partners", headers=accountant_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)

    def test_create_partner_client(self, api_client, create_partner):
        partner = create_partner()
        assert "id" in partner
        assert partner["is_active"] is True
        assert partner["partner_type"] == "client"

    def test_create_partner_vendor(self, api_client, create_partner):
        partner = create_partner(partner_type="vendor", partner_role="transport")
        assert partner["partner_type"] == "vendor"

    def test_create_partner_both(self, api_client, create_partner):
        partner = create_partner(partner_type="both", partner_role="shipping_line")
        assert partner["partner_type"] == "both"

    def test_get_partner(self, api_client, admin_headers, create_partner):
        partner = create_partner()
        resp = api_client.get(f"/partners/{partner['id']}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == partner["id"]

    def test_get_nonexistent_partner(self, api_client, admin_headers):
        resp = api_client.get("/partners/999999", headers=admin_headers)
        assert resp.status_code == 404

    def test_update_partner(self, api_client, admin_headers, create_partner):
        partner = create_partner()
        resp = api_client.put(
            f"/partners/{partner['id']}",
            headers=admin_headers,
            json={"name": f"IT_Updated_{partner['id']}"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == f"IT_Updated_{partner['id']}"

    def test_update_partner_phone(self, api_client, admin_headers, create_partner):
        partner = create_partner()
        resp = api_client.put(
            f"/partners/{partner['id']}",
            headers=admin_headers,
            json={"phone": "0909999999"},
        )
        assert resp.status_code == 200
        assert resp.json()["phone"] == "0909999999"

    def test_update_nonexistent_partner(self, api_client, admin_headers):
        resp = api_client.put("/partners/999999", headers=admin_headers, json={"name": "ghost"})
        assert resp.status_code == 404

    def test_delete_partner(self, api_client, admin_headers, create_partner):
        partner = create_partner()
        resp = api_client.request(
            "DELETE", f"/partners/{partner['id']}",
            headers=admin_headers,
            json={"reason": "integration test"},
        )
        assert resp.status_code in (200, 204)

    def test_list_partners_filter_type(self, api_client, accountant_headers, create_partner):
        create_partner(partner_type="client")
        resp = api_client.get("/partners", headers=accountant_headers, params={"type": "client"})
        assert resp.status_code == 200
        for item in resp.json()["items"]:
            assert item["partner_type"] == "client"

    def test_list_partners_pagination(self, api_client, accountant_headers):
        resp = api_client.get(
            "/partners", headers=accountant_headers, params={"page": 1, "page_size": 1}
        )
        assert resp.status_code == 200
        assert len(resp.json()["items"]) <= 1

    def test_driver_cannot_create_partner(self, api_client, driver_headers):
        resp = api_client.post(
            "/partners",
            headers=driver_headers,
            json={"name": "Driver Partner", "partner_type": "client", "partner_role": "shipping_line"},
        )
        assert resp.status_code == 403

    def test_driver_can_read_partners(self, api_client, driver_headers):
        resp = api_client.get("/partners", headers=driver_headers)
        assert resp.status_code == 200
