"""Integration tests for user management endpoints."""

from uuid import uuid4


class TestUsers:
    def test_get_own_profile(self, api_client, accountant_headers):
        resp = api_client.get("/users/me", headers=accountant_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["username"] == "ketoan"
        assert data["role"] == "accountant"
        assert data["is_active"] is True

    def test_update_own_profile(self, api_client, admin_headers):
        original = api_client.get("/users/me", headers=admin_headers)
        original_name = original.json()["full_name"]

        new_name = f"IT_Updated_{uuid4().hex[:6]}"
        resp = api_client.put(
            "/users/me",
            headers=admin_headers,
            json={"full_name": new_name},
        )
        assert resp.status_code == 200
        assert resp.json()["full_name"] == new_name

        api_client.put("/users/me", headers=admin_headers, json={"full_name": original_name})

    def test_list_users_as_admin(self, api_client, admin_headers):
        resp = api_client.get("/users", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert data["total"] >= 6

    def test_list_users_paginated(self, api_client, admin_headers):
        resp = api_client.get("/users", headers=admin_headers, params={"page_size": 2})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) <= 2
        assert data["total_pages"] >= 1

    def test_list_users_filter_by_role(self, api_client, admin_headers):
        resp = api_client.get("/users", headers=admin_headers, params={"role": "driver"})
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert all(u["role"] == "driver" for u in items)

    def test_create_and_delete_user(self, api_client, admin_headers):
        uid = uuid4().hex[:8]
        payload = {
            "username": f"it_user_{uid}",
            "password": "testpass123",
            "full_name": f"IT Test {uid}",
            "phone": f"091{uid}",
            "role": "driver",
            "tractor_plate": "29C-IT999",
        }
        resp = api_client.post("/users", json=payload, headers=admin_headers)
        assert resp.status_code in (200, 201)
        user = resp.json()
        assert user["role"] == "driver"
        assert "id" in user

        del_resp = api_client.delete(f"/users/{user['id']}", headers=admin_headers)
        assert del_resp.status_code in (200, 204)

    def test_create_duplicate_username(self, api_client, admin_headers):
        payload = {
            "username": "ketoan",
            "password": "testpass123",
            "full_name": "Duplicate",
            "phone": "0910000000",
            "role": "accountant",
        }
        resp = api_client.post("/users", json=payload, headers=admin_headers)
        assert resp.status_code in (400, 409)

    def test_update_user(self, api_client, admin_headers):
        uid = uuid4().hex[:8]
        create = api_client.post(
            "/users",
            json={
                "username": f"it_upd_{uid}",
                "password": "testpass123",
                "full_name": "ToUpdate",
                "phone": f"092{uid}",
                "role": "driver",
                "tractor_plate": "29C-IT001",
            },
            headers=admin_headers,
        )
        user_id = create.json()["id"]

        resp = api_client.put(
            f"/users/{user_id}",
            headers=admin_headers,
            json={"full_name": "IT Updated Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "IT Updated Name"

        api_client.delete(f"/users/{user_id}", headers=admin_headers)

    def test_change_password(self, api_client, admin_headers):
        uid = uuid4().hex[:8]
        create = api_client.post(
            "/users",
            json={
                "username": f"it_pwd_{uid}",
                "password": "oldpass123",
                "full_name": "PwdTest",
                "phone": f"093{uid}",
                "role": "driver",
            },
            headers=admin_headers,
        )
        user_id = create.json()["id"]

        login = api_client.post(
            "/auth/login",
            json={"username": f"it_pwd_{uid}", "password": "oldpass123"},
        )
        user_h = {"Authorization": f"Bearer {login.json()['access_token']}"}

        resp = api_client.post(
            "/change-password",
            headers=user_h,
            json={"current_password": "oldpass123", "new_password": "newpass456"},
        )
        assert resp.status_code == 200

        login2 = api_client.post(
            "/auth/login",
            json={"username": f"it_pwd_{uid}", "password": "newpass456"},
        )
        assert login2.status_code == 200

        api_client.delete(f"/users/{user_id}", headers=admin_headers)
