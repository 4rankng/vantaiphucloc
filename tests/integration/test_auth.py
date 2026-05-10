"""Integration tests for authentication endpoints."""

import pytest


class TestAuth:
    def test_login_success(self, api_client):
        resp = api_client.post(
            "/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "Bearer"
        assert "user" in data
        assert data["user"]["role"] == "superadmin"

    def test_login_accountant(self, api_client):
        resp = api_client.post(
            "/auth/login",
            json={"username": "ketoan", "password": "admin123"},
        )
        assert resp.status_code == 200
        assert resp.json()["user"]["role"] == "accountant"

    def test_login_invalid_password(self, api_client):
        resp = api_client.post(
            "/auth/login",
            json={"username": "admin", "password": "wrong"},
        )
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, api_client):
        resp = api_client.post(
            "/auth/login",
            json={"username": "nonexistent_user", "password": "anything"},
        )
        assert resp.status_code == 401

    def test_refresh_token(self, api_client):
        login = api_client.post(
            "/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        refresh_token = login.json()["refresh_token"]
        resp = api_client.post(
            "/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data

    def test_refresh_invalid_token(self, api_client):
        resp = api_client.post(
            "/auth/refresh",
            json={"refresh_token": "invalid_token_xyz"},
        )
        assert resp.status_code == 401

    def test_access_without_token(self, api_client):
        resp = api_client.get("/users/me")
        assert resp.status_code == 401

    def test_access_with_invalid_token(self, api_client):
        resp = api_client.get(
            "/users/me",
            headers={"Authorization": "Bearer invalidtoken123"},
        )
        assert resp.status_code == 401
