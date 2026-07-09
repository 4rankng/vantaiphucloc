"""Invariant tests for the OCR analytics two-grain split.

The OCR worker writes:
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
import hashlib
from contextlib import asynccontextmanager
from io import BytesIO

import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy import select

from app.config import settings
from app.models.domain import OcrDriverRequest, OcrJob, OcrRequest
from app.workers.tasks import ocr as ocr_task

pytestmark = pytest.mark.asyncio

OCR_CONTAINER_URL = "/api/v1/delivered-trips/ocr-container"
OCR_STATS_URL = "/api/v1/dashboard/ocr-stats"


def _image_bytes() -> bytes:
    buf = BytesIO()
    Image.new("RGB", (8, 8), "red").save(buf, format="JPEG")
    return buf.getvalue()


def _b64_image() -> str:
    return base64.b64encode(_image_bytes()).decode()


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


async def _run_ocr_worker(
    db_session,
    monkeypatch,
    tmp_path,
    result: dict,
) -> tuple[OcrJob, dict]:
    class _FakeRedis:
        async def eval(self, *_args):
            return 1

    @asynccontextmanager
    async def _test_session():
        try:
            yield db_session
            await db_session.commit()
        except Exception:
            await db_session.rollback()
            raise

    async def _fake_extract(_image_bytes, _mime_type):
        return result

    monkeypatch.setattr(settings, "PHOTO_STORAGE_ROOT", str(tmp_path))
    monkeypatch.setattr(ocr_task, "get_session", _test_session)
    monkeypatch.setattr(ocr_task, "extract_container_numbers", _fake_extract)

    content = _image_bytes()
    image_path = tmp_path / "ocr-test.jpg"
    image_path.write_bytes(content)
    job = OcrJob(
        image_path="/photos/ocr-test.jpg",
        image_hash=hashlib.sha256(content).hexdigest(),
        status="queued",
    )
    db_session.add(job)
    await db_session.commit()

    worker_result = await ocr_task.process_ocr_job_task(
        {"redis": _FakeRedis()},
        int(job.id),
    )
    return job, worker_result


async def test_rescued_upload_counts_as_driver_success(
    async_client: AsyncClient, make_auth_headers, db_session, monkeypatch, tmp_path
):
    headers = await make_auth_headers("superadmin")
    _, worker_result = await _run_ocr_worker(db_session, monkeypatch, tmp_path, RESCUED)
    assert worker_result["status"] == "succeeded"

    driver_rows = (await db_session.execute(select(OcrDriverRequest))).scalars().all()
    assert len(driver_rows) == 1
    # Risk C: persisted success agrees with the terminal result the driver receives.
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
    async_client: AsyncClient, make_auth_headers, db_session, monkeypatch, tmp_path
):
    headers = await make_auth_headers("superadmin")
    _, worker_result = await _run_ocr_worker(
        db_session, monkeypatch, tmp_path, EXHAUSTED
    )
    assert worker_result["status"] == "failed"

    driver_rows = (await db_session.execute(select(OcrDriverRequest))).scalars().all()
    assert len(driver_rows) == 1
    assert driver_rows[0].success is False

    stats = await _stats(async_client, headers)
    totals = stats["driverExperience"]["totals"]
    assert totals["requests"] >= 1
    assert totals["requests"] - totals["success"] == 1


async def test_no_provider_configured_still_writes_driver_row(
    async_client: AsyncClient, make_auth_headers, db_session, monkeypatch, tmp_path
):
    """Risk A: empty attempts must still produce a driver-seen failure row."""
    headers = await make_auth_headers("superadmin")
    _, worker_result = await _run_ocr_worker(
        db_session,
        monkeypatch,
        tmp_path,
        NO_PROVIDER,
    )
    assert worker_result["status"] == "failed"

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


async def test_failed_ocr_persists_photo(
    async_client: AsyncClient, make_auth_headers, db_session, tmp_path, monkeypatch
):
    """A failed OCR run persists its photo so the admin can preview/download it."""
    await make_auth_headers("superadmin")
    await _run_ocr_worker(db_session, monkeypatch, tmp_path, EXHAUSTED)

    rows = (await db_session.execute(select(OcrDriverRequest))).scalars().all()
    assert len(rows) == 1
    url = rows[0].cont_photo_url
    assert url is not None and url.startswith("/photos/")
    assert rows[0].cont_photo_hash is not None
    # The image actually landed on disk under the storage root.
    stored_path = tmp_path / url.removeprefix("/photos/")
    assert stored_path.is_file()
    assert (
        rows[0].cont_photo_hash == hashlib.sha256(stored_path.read_bytes()).hexdigest()
    )


async def test_successful_ocr_does_not_persist_photo(
    async_client: AsyncClient, make_auth_headers, db_session, tmp_path, monkeypatch
):
    """Successful OCR runs do not attach the staging photo to failure analytics."""
    await make_auth_headers("superadmin")
    job, worker_result = await _run_ocr_worker(
        db_session,
        monkeypatch,
        tmp_path,
        RESCUED,
    )
    assert worker_result["status"] == "succeeded"

    rows = (await db_session.execute(select(OcrDriverRequest))).scalars().all()
    assert len(rows) == 1
    assert rows[0].cont_photo_url is None
    stored_path = tmp_path / job.image_path.removeprefix("/photos/")
    assert stored_path.is_file()
