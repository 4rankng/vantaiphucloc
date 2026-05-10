"""Integration tests for route endpoints."""


class TestRoutes:
    def test_list_routes(self, api_client, accountant_headers):
        resp = api_client.get("/routes", headers=accountant_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert isinstance(data["items"], list)

    def test_create_route(self, api_client, create_route):
        route = create_route()
        assert "id" in route
        assert "pickup_location" in route
        assert "dropoff_location" in route

    def test_update_route(self, api_client, admin_headers, create_route):
        route = create_route()
        new_name = f"IT_Updated_Route_{route['id']}"
        resp = api_client.put(
            f"/routes/{route['id']}", headers=admin_headers, json={"route": new_name}
        )
        assert resp.status_code == 200
        assert resp.json()["route"] == new_name

    def test_update_nonexistent_route(self, api_client, admin_headers):
        resp = api_client.put("/routes/999999", headers=admin_headers, json={"route": "ghost"})
        assert resp.status_code == 404

    def test_delete_route(self, api_client, admin_headers, create_route):
        route = create_route()
        resp = api_client.delete(f"/routes/{route['id']}", headers=admin_headers)
        assert resp.status_code in (200, 204)

    def test_delete_nonexistent_route(self, api_client, admin_headers):
        resp = api_client.delete("/routes/999999", headers=admin_headers)
        assert resp.status_code == 404

    def test_driver_can_read_routes(self, api_client, driver_headers):
        resp = api_client.get("/routes", headers=driver_headers)
        assert resp.status_code == 200
