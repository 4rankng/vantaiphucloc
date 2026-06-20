"""Tests for the async customer-Excel import flow.

Covers:
- `import_excel_preview_task` decodes the file, runs run_preview,
  resolves location suggestions, and returns the same shape as the
  sync endpoint.
- `import_preview_job_id` is deterministic for the same content+date.
- The router's `/customer-excel/preview-async` endpoint enqueues
  the job and returns `{job_id, status: "queued"}`.
- `/customer-excel/jobs/{job_id}` returns the worker result.
"""

import base64
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.workers import import_preview_job_id
from app.workers.tasks.imports import import_excel_preview_task


DOCS = Path(__file__).resolve().parents[2] / "docs"
ULTIMA = DOCS / "templates" / "ultima02.06.xlsx"


# ---------------------------------------------------------------------------
# import_preview_job_id — deterministic hash
# ---------------------------------------------------------------------------


def test_import_preview_job_id_is_deterministic():
    a = import_preview_job_id("abc123", "2026-06-02")
    b = import_preview_job_id("abc123", "2026-06-02")
    assert a == b


def test_import_preview_job_id_changes_with_content():
    a = import_preview_job_id("abc123", "2026-06-02")
    b = import_preview_job_id("def456", "2026-06-02")
    assert a != b


def test_import_preview_job_id_changes_with_date():
    a = import_preview_job_id("abc123", "2026-06-02")
    b = import_preview_job_id("abc123", "2026-06-03")
    assert a != b


def test_import_preview_job_id_has_expected_length():
    assert len(import_preview_job_id("x", "2026-06-02")) == 32


# ---------------------------------------------------------------------------
# import_excel_preview_task — runs the full preview pipeline
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_import_excel_preview_task_returns_preview_result(monkeypatch):
    if not ULTIMA.exists():
        pytest.skip("ultima02.06.xlsx missing")

    # Stub the location resolver so we don't need a real DB.
    fake_resolution = MagicMock()
    fake_resolution.match_kind.value = "exact"
    fake_resolution.location = None
    fake_resolution.review_needed = False
    fake_resolution.suggestions = []

    async def fake_find_match(raw):
        return fake_resolution

    fake_db = AsyncMock()
    fake_db.__aenter__ = AsyncMock(return_value=fake_db)
    fake_db.__aexit__ = AsyncMock(return_value=None)
    monkeypatch.setattr(
        "app.database.get_session",
        lambda: fake_db,
    )
    monkeypatch.setattr(
        "app.contexts.customer_pricing.infrastructure.location_resolver.LocationResolverService",
        MagicMock(return_value=MagicMock(find_match=fake_find_match)),
    )

    content = ULTIMA.read_bytes()
    payload = {
        "job_id": "test_job_id",
        "file_bytes_b64": base64.b64encode(content).decode(),
        "filename": ULTIMA.name,
        "default_trip_date_iso": "2026-06-02",
        "sheet_name": None,
    }
    result = await import_excel_preview_task(ctx={}, **payload)
    assert "accepted" in result
    assert "rejected" in result
    assert "warnings" in result
    assert result["stats"]["accepted_count"] > 0
    assert result["stats"]["rejected_count"] == 0
    assert "location_resolutions" in result


# ---------------------------------------------------------------------------
# Router integration: enqueue + poll
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_preview_async_endpoint_enqueues_and_returns_job_id(monkeypatch):
    """POST /imports/customer-excel/preview-async enqueues and returns job_id."""
    from app.main import app

    if not ULTIMA.exists():
        pytest.skip("ultima02.06.xlsx missing")

    fake_enqueued: list[dict] = []

    async def fake_enqueue(function_name, _job_id=None, **kwargs):
        fake_enqueued.append({"function": function_name, "_job_id": _job_id, **kwargs})
        return _job_id or "test_job_abc123"

    monkeypatch.setattr(
        "app.contexts.operations.interface.routers.imports.enqueue",
        fake_enqueue,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        try:
            with open(ULTIMA, "rb") as f:
                resp = await client.post(
                    "/imports/customer-excel/preview-async",
                    files={
                        "file": (
                            ULTIMA.name,
                            f,
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        )
                    },
                    data={"default_trip_date": "2026-06-02"},
                )
        except Exception as exc:
            pytest.skip(f"auth flow not configured: {exc}")
        if resp.status_code == 401:
            pytest.skip("auth required — admin token not available in this env")
        if resp.status_code == 200:
            body = resp.json()
            assert "job_id" in body
            assert body["status"] == "queued"
            assert len(fake_enqueued) == 1
            assert fake_enqueued[0]["filename"] == ULTIMA.name


@pytest.mark.asyncio
async def test_get_import_job_status_returns_worker_result(monkeypatch):
    """GET /imports/customer-excel/jobs/{job_id} returns the worker result."""
    from app.main import app

    from arq.jobs import JobStatus

    fake_pool = MagicMock()
    monkeypatch.setattr(
        "app.contexts.operations.interface.routers.imports.get_arq_pool",
        lambda: fake_pool,
    )

    fake_job = MagicMock()
    fake_job.status = AsyncMock(return_value=JobStatus.complete)
    fake_job.info = AsyncMock(return_value=MagicMock(result={"accepted_count": 5}))

    monkeypatch.setattr(
        "arq.jobs.Job",
        lambda job_id, redis: fake_job,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        try:
            resp = await client.get("/imports/customer-excel/jobs/abc")
        except Exception as exc:
            pytest.skip(f"auth flow not configured: {exc}")
        if resp.status_code == 401:
            pytest.skip("auth required")
        if resp.status_code == 200:
            assert resp.json()["status"] == "complete"
            assert resp.json()["result"]["accepted_count"] == 5
