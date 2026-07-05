"""Tests for GET /dashboard/ocr-failures.

Superadmin-only endpoint surfacing failed-OCR uploads that have a captured
photo, for the admin failure-image viewer. Pins three invariants:
- superadmin receives only failed rows that carry a photo, newest first;
- director/accountant are denied (photos are sensitive driver captures);
- successful runs and pre-feature failures (photo still null) are excluded.
"""

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient

from app.models.domain import OcrDriverRequest

pytestmark = pytest.mark.asyncio

OCR_FAILURES_URL = "/api/v1/dashboard/ocr-failures"


async def _add_row(
    db_session,
    *,
    success: bool,
    photo_url: str | None,
    age_seconds: int = 0,
) -> None:
    db_session.add(
        OcrDriverRequest(
            created_at=datetime.now(timezone.utc) - timedelta(seconds=age_seconds),
            user_id=None,
            success=success,
            attempts=2,
            numbers_found=0,
            latency_ms=1100,
            provider="gemini",
            cont_photo_url=photo_url,
        )
    )
    await db_session.flush()


async def test_superadmin_sees_only_failed_rows_with_photo(
    async_client: AsyncClient, make_auth_headers, db_session
):
    # Failed with photo — should appear.
    await _add_row(
        db_session, success=False, photo_url="/photos/2026/07/05/a.jpg", age_seconds=10
    )
    # Successful with photo (hypothetical) — excluded by success filter.
    await _add_row(
        db_session, success=True, photo_url="/photos/2026/07/05/b.jpg", age_seconds=20
    )
    # Failed without photo (pre-feature or save-error) — excluded by photo filter.
    await _add_row(db_session, success=False, photo_url=None, age_seconds=30)

    headers = await make_auth_headers("superadmin")
    resp = await async_client.get(
        OCR_FAILURES_URL, params={"days": 30}, headers=headers
    )
    assert resp.status_code == 200, resp.text
    items = resp.json()["items"]
    assert len(items) == 1
    item = items[0]
    assert item["contPhotoUrl"] == "/photos/2026/07/05/a.jpg"
    assert "success" not in item  # success is the filter, not surfaced per-item
    # user_id is null in this fixture → LEFT JOIN yields null driver name.
    assert item["userId"] is None
    assert item["driverName"] is None
    # Newest first.
    await _add_row(
        db_session, success=False, photo_url="/photos/2026/07/05/c.jpg", age_seconds=1
    )
    resp2 = await async_client.get(
        OCR_FAILURES_URL, params={"days": 30}, headers=headers
    )
    items2 = resp2.json()["items"]
    assert [i["contPhotoUrl"] for i in items2] == [
        "/photos/2026/07/05/c.jpg",
        "/photos/2026/07/05/a.jpg",
    ]


async def test_director_and_accountant_forbidden(
    async_client: AsyncClient, make_auth_headers, db_session
):
    await _add_row(db_session, success=False, photo_url="/photos/2026/07/05/a.jpg")
    for role in ("director", "accountant"):
        headers = await make_auth_headers(role)
        resp = await async_client.get(OCR_FAILURES_URL, headers=headers)
        assert resp.status_code == 403, f"{role} should be denied"


async def test_window_excludes_old_failures(
    async_client: AsyncClient, make_auth_headers, db_session
):
    # 2 days old — outside a 1-day window.
    await _add_row(
        db_session,
        success=False,
        photo_url="/photos/2026/07/05/old.jpg",
        age_seconds=60 * 60 * 24 * 2,
    )
    headers = await make_auth_headers("superadmin")
    resp = await async_client.get(OCR_FAILURES_URL, params={"days": 1}, headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["items"] == []
