"""Invariant tests for the OCR analytics two-grain split.

The ``/delivered-trips/ocr-container`` endpoint writes:
- ONE ``OcrDriverRequest`` per photo upload (the driver-seen grain), ALWAYS —
  even when no provider ran — so the driver-seen failure count is faithful.
- ONE ``OcrRequest`` per provider attempt (the provider-error grain), only when
  at least one provider actually ran.

These tests pin the reliability invariants of the driver-seen error count:
rescued uploads count as success, all-exhausted uploads count as failure, the
no-provider-configured edge case still writes a row, and the persisted
``success`` always equals what the endpoint returned to the driver.
"""

import base64
from io import BytesIO
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy import select

from app.models.domain import OcrDriverRequest, OcrRequest

pytestmark = pytest.mark.asyncio

OCR_CONTAINER_URL = "/api/v1/delivered-trips/ocr-container"
OCR_STATS_URL = "/api/v1/dashboard/ocr-stats"


def _b64_image() -> str:
    buf = BytesIO()
    Image.new("RGB", (8, 8), "red").save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode()


def _patch_ocr(result: dict):
    """Patch the OCR call imported into the delivered_trips router module."""
    return patch(
        "app.contexts.operations.interface.routers.delivered_trips"
        ".extract_container_numbers",
        new=AsyncMock(return_value=result),
    )


# OpenRouter fails ("no valid numbers") but Gemini rescues the upload.
RESCUED = {
    "success": True,
    "container_numbers": ["ABCU1234567"],
    "error": None,
    "provider": "gemini",
    "model": "gemini-2.5-flash",
    "latency_ms": 1200,
    "attempts": [
        {
            "provider": "openrouter",
            "model": "qwen3-vl",
            "success": False,
            "latency_ms": 900,
            "error": "no valid numbers",
            "container_numbers_found": 0,
        },
        {
            "provider": "gemini",
            "model": "gemini-2.5-flash",
            "success": True,
            "latency_ms": 1200,
            "error": None,
            "container_numbers_found": 1,
        },
    ],
}

# Every provider tried, none produced a valid number — driver sees a failure.
EXHAUSTED = {
    "success": False,
    "container_numbers": [],
    "error": "Không nhận dạng được số cont",
    "analytics_error": "no valid numbers",
    "provider": "gemini",
    "model": "gemini-2.5-flash",
    "latency_ms": 1100,
    "attempts": [
        {
            "provider": "openrouter",
            "model": "qwen3-vl",
            "success": False,
            "latency_ms": 850,
            "error": "no valid numbers",
            "container_numbers_found": 0,
        },
        {
            "provider": "gemini",
            "model": "gemini-2.5-flash",
            "success": False,
            "latency_ms": 1100,
            "error": "no valid numbers",
            "container_numbers_found": 0,
        },
    ],
}

# No provider enabled — empty attempts. Previously wrote NO row (undercount).
NO_PROVIDER = {
    "success": False,
    "container_numbers": [],
    "error": "OCR chưa được cấu hình",
    "provider": None,
    "model": None,
    "latency_ms": None,
    "attempts": [],
}


async def _stats(async_client: AsyncClient, headers: dict) -> dict:
    resp = await async_client.get(OCR_STATS_URL, params={"days": 30}, headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


async def test_rescued_upload_counts_as_driver_success(
    async_client: AsyncClient, make_auth_headers, db_session
):
    headers = await make_auth_headers("superadmin")
    with _patch_ocr(RESCUED):
        resp = await async_client.post(
            OCR_CONTAINER_URL,
            json={"image_data": _b64_image()},
            headers=headers,
        )
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True

    driver_rows = (await db_session.execute(select(OcrDriverRequest))).scalars().all()
    assert len(driver_rows) == 1
    # Risk C: persisted success agrees with the response the driver received.
    assert driver_rows[0].success is True

    # One provider-error row per attempt (the rescued OR failure is still logged).
    attempt_rows = (await db_session.execute(select(OcrRequest))).scalars().all()
    assert len(attempt_rows) == 2

    stats = await _stats(async_client, headers)
    # Renamed key present; the rescued OR attempt surfaces as a provider error...
    assert "providerErrors" in stats
    assert any(b["category"] == "no_detection" for b in stats["providerErrors"])
    # ...but the driver saw a success, so driver-seen failures stay 0.
    totals = stats["driverExperience"]["totals"]
    assert totals["requests"] - totals["success"] == 0


async def test_all_exhausted_counts_as_driver_failure(
    async_client: AsyncClient, make_auth_headers, db_session
):
    headers = await make_auth_headers("superadmin")
    with _patch_ocr(EXHAUSTED):
        resp = await async_client.post(
            OCR_CONTAINER_URL,
            json={"image_data": _b64_image()},
            headers=headers,
        )
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is False

    driver_rows = (await db_session.execute(select(OcrDriverRequest))).scalars().all()
    assert len(driver_rows) == 1
    assert driver_rows[0].success is False

    stats = await _stats(async_client, headers)
    totals = stats["driverExperience"]["totals"]
    assert totals["requests"] >= 1
    assert totals["requests"] - totals["success"] == 1


async def test_no_provider_configured_still_writes_driver_row(
    async_client: AsyncClient, make_auth_headers, db_session
):
    """Risk A: empty attempts must still produce a driver-seen failure row."""
    headers = await make_auth_headers("superadmin")
    with _patch_ocr(NO_PROVIDER):
        resp = await async_client.post(
            OCR_CONTAINER_URL,
            json={"image_data": _b64_image()},
            headers=headers,
        )
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is False

    driver_rows = (await db_session.execute(select(OcrDriverRequest))).scalars().all()
    assert len(driver_rows) == 1, "no-provider failure must still be recorded"
    assert driver_rows[0].success is False
    assert driver_rows[0].attempts == 0

    # No provider ran → no per-attempt rows.
    attempt_rows = (await db_session.execute(select(OcrRequest))).scalars().all()
    assert attempt_rows == []

    stats = await _stats(async_client, headers)
    totals = stats["driverExperience"]["totals"]
    assert totals["requests"] - totals["success"] >= 1
