"""Integration tests for client endpoints."""


class TestClients:
    def test_list_clients(self, api_client, accountant_headers):
        resp = api_client.get("/clients", headers=accountant_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)

    def test_create_client(self, api_client, create_client):
        client = create_client()
        assert "id" in client
        assert client["is_active"] is True
        assert client["type"] == "company"

    def test_create_individual_client(self, api_client, create_client):
        client = create_client(type="individual")
        assert client["type"] == "individual"

    def test_update_client(self, api_client, admin_headers, create_client):
        client = create_client()
        resp = api_client.put(
            f"/clients/{client['id']}",
            headers=admin_headers,
            json={"name": f"IT_Updated_{client['id']}"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == f"IT_Updated_{client['id']}"

    def test_update_nonexistent_client(self, api_client, admin_headers):
        resp = api_client.put("/clients/999999", headers=admin_headers, json={"name": "ghost"})
        assert resp.status_code == 404

    def test_soft_delete_client(self, api_client, admin_headers, create_client):
        client = create_client()
        resp = api_client.request(
            "DELETE", f"/clients/{client['id']}",
            headers=admin_headers,
            json={"reason": "integration test"},
        )
        assert resp.status_code in (200, 204)

    def test_list_clients_pagination(self, api_client, accountant_headers):
        resp = api_client.get(
            "/clients", headers=accountant_headers, params={"page": 1, "page_size": 1}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) <= 1

    def test_driver_cannot_create_client(self, api_client, driver_headers):
        resp = api_client.post(
            "/clients",
            headers=driver_headers,
            json={"name": "Driver Client", "type": "company", "phone": "0900000000"},
        )
        assert resp.status_code == 403

    def test_driver_can_read_clients(self, api_client, driver_headers):
        resp = api_client.get("/clients", headers=driver_headers)
        assert resp.status_code == 200
