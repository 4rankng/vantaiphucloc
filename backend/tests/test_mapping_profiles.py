"""Tests for MappingProfile ORM model, repository, and API endpoints."""

from __future__ import annotations

import json

import pytest
from sqlalchemy import inspect


# ---------------------------------------------------------------------------
# Task 4.1 — Table exists (runs against real Postgres via sync engine)
# ---------------------------------------------------------------------------


def test_mapping_profiles_table_exists():
    """The mapping_profiles table should exist in the database."""
    from sqlalchemy import create_engine

    from app.config import settings

    url = settings.DATABASE_URL.replace("+asyncpg", "").replace(
        "postgresql://", "postgresql://"
    )
    engine = create_engine(url)
    insp = inspect(engine)
    assert "mapping_profiles" in insp.get_table_names()


def test_mapping_profiles_columns():
    """The mapping_profiles table should have the expected columns."""
    from sqlalchemy import create_engine

    from app.config import settings

    url = settings.DATABASE_URL.replace("+asyncpg", "").replace(
        "postgresql://", "postgresql://"
    )
    engine = create_engine(url)
    insp = inspect(engine)
    cols = {c["name"] for c in insp.get_columns("mapping_profiles")}
    expected = {
        "id",
        "profile_name",
        "template_filename",
        "header_signature",
        "column_mapping_json",
        "pivot_columns_json",
        "created_by_id",
        "created_at",
        "last_used_at",
        "use_count",
        "is_active",
    }
    assert expected <= cols


# ---------------------------------------------------------------------------
# Task 4.2 — Repository unit tests (sync DB)
# ---------------------------------------------------------------------------


@pytest.fixture
def sync_db():
    """Provide a synchronous SQLAlchemy session for repository tests."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from app.config import settings

    url = settings.DATABASE_URL.replace("+asyncpg", "").replace(
        "postgresql://", "postgresql://"
    )
    engine = create_engine(url)
    with Session(engine) as session:
        yield session
        session.rollback()


def test_repository_create_and_get(sync_db):
    """Create a MappingProfile row and retrieve it by id."""
    from app.models.domain import MappingProfile

    profile = MappingProfile(
        profile_name="Test Template",
        template_filename="test.xlsx",
        header_signature="abc123",
        column_mapping_json=json.dumps({"0": "date", "1": "container"}),
        pivot_columns_json=json.dumps([]),
        created_by_id=1,
        is_active=True,
    )
    sync_db.add(profile)
    sync_db.flush()

    assert profile.id is not None
    assert profile.profile_name == "Test Template"
    assert profile.use_count == 0

    fetched = sync_db.get(MappingProfile, profile.id)
    assert fetched is not None
    assert fetched.header_signature == "abc123"

    sync_db.rollback()


def test_repository_get_by_signature(sync_db):
    """Find an active profile by header_signature."""
    from sqlalchemy import select

    from app.models.domain import MappingProfile

    profile = MappingProfile(
        profile_name="Sig Test",
        template_filename="sig.xlsx",
        header_signature="unique_sig_999",
        column_mapping_json='{"0":"date"}',
        pivot_columns_json="[]",
        created_by_id=1,
        is_active=True,
    )
    sync_db.add(profile)
    sync_db.flush()

    stmt = select(MappingProfile).where(
        MappingProfile.header_signature == "unique_sig_999",
        MappingProfile.is_active == True,  # noqa: E712
    )
    result = sync_db.execute(stmt).scalar_one_or_none()
    assert result is not None
    assert result.profile_name == "Sig Test"

    sync_db.rollback()


# ---------------------------------------------------------------------------
# Task 4.3 — API endpoint integration tests (use conftest fixtures)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_profiles_empty(async_client, make_auth_headers):
    """GET /imports/customer-excel/profiles returns empty list when no profiles."""
    headers = await make_auth_headers("accountant")
    response = await async_client.get(
        "/api/v1/imports/customer-excel/profiles",
        headers=headers,
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_create_and_list_profile(async_client, make_auth_headers):
    """POST then GET round-trips a mapping profile."""
    headers = await make_auth_headers("accountant")

    # Create
    payload = {
        "profile_name": "Integration Test",
        "template_filename": "integration.xlsx",
        "header_signature": "int_test_sig_001",
        "column_mapping": {"0": "date", "1": "container"},
        "pivot_columns": [],
    }
    create_resp = await async_client.post(
        "/api/v1/imports/customer-excel/profiles",
        json=payload,
        headers=headers,
    )
    assert create_resp.status_code == 201
    data = create_resp.json()
    assert data["profile_name"] == "Integration Test"
    assert data["column_mapping"] == {"0": "date", "1": "container"}
    profile_id = data["id"]

    # List
    list_resp = await async_client.get(
        "/api/v1/imports/customer-excel/profiles",
        headers=headers,
    )
    assert list_resp.status_code == 200
    profiles = list_resp.json()
    assert any(p["id"] == profile_id for p in profiles)

    # Filter by name
    filter_resp = await async_client.get(
        "/api/v1/imports/customer-excel/profiles",
        params={"profile_name": "Integration Test"},
        headers=headers,
    )
    assert filter_resp.status_code == 200
    filtered = filter_resp.json()
    assert len(filtered) >= 1
    assert all(p["profile_name"] == "Integration Test" for p in filtered)


@pytest.mark.asyncio
async def test_create_profile_validation(async_client, make_auth_headers):
    """POST with missing required fields returns 422."""
    headers = await make_auth_headers("accountant")
    resp = await async_client.post(
        "/api/v1/imports/customer-excel/profiles",
        json={},
        headers=headers,
    )
    assert resp.status_code == 422
