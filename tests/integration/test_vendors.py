"""Integration tests for vendor endpoints."""


class TestVendors:
    def test_list_vendors(self, api_client, accountant_headers):
        resp = api_client.get("/vendors", headers=accountant_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert isinstance(data["items"], list)

    def test_create_vendor(self, api_client, create_vendor):
        vendor = create_vendor()
        assert "id" in vendor
        assert vendor["is_active"] is True

    def test_create_vendor_individual(self, api_client, create_vendor):
        vendor = create_vendor(type="individual")
        assert vendor["type"] == "individual"

    def test_update_vendor(self, api_client, admin_headers, create_vendor):
        vendor = create_vendor()
        resp = api_client.put(
            f"/vendors/{vendor['id']}",
            headers=admin_headers,
            json={"phone": "0909999999"},
        )
        assert resp.status_code == 200
        assert resp.json()["phone"] == "0909999999"

    def test_update_nonexistent_vendor(self, api_client, admin_headers):
        resp = api_client.put("/vendors/999999", headers=admin_headers, json={"name": "ghost"})
        assert resp.status_code == 404

    def test_delete_vendor(self, api_client, admin_headers, create_vendor):
        vendor = create_vendor()
        resp = api_client.delete(f"/vendors/{vendor['id']}", headers=admin_headers)
        assert resp.status_code in (200, 204)

    def test_delete_nonexistent_vendor(self, api_client, admin_headers):
        resp = api_client.delete("/vendors/999999", headers=admin_headers)
        assert resp.status_code == 404

    def test_driver_can_read_vendors(self, api_client, driver_headers):
        resp = api_client.get("/vendors", headers=driver_headers)
        assert resp.status_code == 200
