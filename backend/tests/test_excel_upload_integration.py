"""Integration tests for the Excel upload → parse → commit flow.

Uploads the 4 sample files from ``docs/don-hang/`` through the actual
HTTP endpoints (preview + commit) to verify the full multipart path works
end-to-end, including auth guards and response shape validation.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from app.models.domain import Client


# ---------------------------------------------------------------------------
# Sample file paths
# ---------------------------------------------------------------------------

DON_HANG = Path(__file__).resolve().parents[2] / "docs" / "don-hang"

GLORY = DON_HANG / "2.GLORY SHANGHAI- 2612N.xlsx"
CONSCIENCE = DON_HANG / "8.CONSCIENCE 2615N.xlsx"
HAIAN_BETA = DON_HANG / "Loading list of HAIAN BETA 062S.xls"
PHUC_LOC = DON_HANG / "Phúc Lộc - Shipside T4.26 HAP.xlsx"

ALL_SAMPLES = [GLORY, CONSCIENCE, HAIAN_BETA, PHUC_LOC]

PREVIEW_URL = "/api/v1/imports/customer-excel/preview"
COMMIT_URL = "/api/v1/imports/customer-excel/commit"

VALID_WORK_TYPES = {"E20", "E40", "F20", "F40", "E45", "F45"}


@pytest.fixture
def sample_files():
    missing = [p for p in ALL_SAMPLES if not p.exists()]
    if missing:
        pytest.skip(f"sample files missing: {missing}")


@pytest.fixture
async def seeded_partner(db_session):
    partner = Client(name="Test Shipping", )
    db_session.add(partner)
    await db_session.flush()
    return partner


async def _upload_preview(
    async_client, headers, filepath: Path, trip_date: str = "2026-03-31",
):
    """Helper: POST a file to the preview endpoint and return the response."""
    content = filepath.read_bytes()
    return await async_client.post(
        PREVIEW_URL,
        files={"file": (filepath.name, content)},
        data={"default_trip_date": trip_date},
        headers=headers,
    )


def _assert_preview_ok(resp, *, min_accepted: int = 1):
    """Common assertions for a successful preview response."""
    assert resp.status_code == 200, f"Preview failed: {resp.status_code} {resp.text}"
    body = resp.json()
    assert isinstance(body["accepted"], list)
    assert len(body["accepted"]) >= min_accepted, (
        f"Expected >= {min_accepted} accepted rows, got {len(body['accepted'])}"
    )
    # Every accepted row must have container_no and work_type
    for row in body["accepted"]:
        values = row["values"]
        assert "container_no" in values
        assert values["work_type"] in VALID_WORK_TYPES
    return body


# ---------------------------------------------------------------------------
# Preview tests — one per sample file
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_preview_glory_shanghai_upload(
    sample_files, async_client, make_auth_headers,
):
    headers = await make_auth_headers("accountant")
    resp = await _upload_preview(async_client, headers, GLORY)
    body = _assert_preview_ok(resp, min_accepted=10)
    # Bay-plan pattern should detect multiple port sections
    first = body["accepted"][0]["values"]
    assert first["container_no"] != ""
    assert len(first["container_no"]) == 11


@pytest.mark.asyncio
async def test_preview_conscience_upload(
    sample_files, async_client, make_auth_headers,
):
    headers = await make_auth_headers("accountant")
    resp = await _upload_preview(async_client, headers, CONSCIENCE)
    _assert_preview_ok(resp, min_accepted=10)


@pytest.mark.asyncio
async def test_preview_haian_beta_upload(
    sample_files, async_client, make_auth_headers,
):
    headers = await make_auth_headers("accountant")
    resp = await _upload_preview(async_client, headers, HAIAN_BETA, trip_date="2026-04-19")
    body = _assert_preview_ok(resp, min_accepted=5)
    first = body["accepted"][0]["values"]
    assert first["pickup_location"] != ""


@pytest.mark.asyncio
async def test_preview_phuc_loc_upload(
    sample_files, async_client, make_auth_headers,
):
    headers = await make_auth_headers("accountant")
    resp = await _upload_preview(async_client, headers, PHUC_LOC, trip_date="2026-04-26")
    body = _assert_preview_ok(resp, min_accepted=5)
    first = body["accepted"][0]["values"]
    assert first["pickup_location"] != ""
    assert first["dropoff_location"] != ""


# ---------------------------------------------------------------------------
# Auth & validation guards
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_preview_requires_accountant_role(
    sample_files, async_client, make_auth_headers,
):
    headers = await make_auth_headers("driver")
    resp = await _upload_preview(async_client, headers, GLORY)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_preview_empty_file_rejected(
    async_client, make_auth_headers,
):
    headers = await make_auth_headers("accountant")
    resp = await async_client.post(
        PREVIEW_URL,
        files={"file": ("empty.xlsx", b"")},
        headers=headers,
    )
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Commit — full round-trip
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_commit_after_preview(
    sample_files, async_client, make_auth_headers, db_session, seeded_partner,
):
    headers = await make_auth_headers("accountant")

    # 1. Preview
    resp = await _upload_preview(async_client, headers, GLORY)
    body = _assert_preview_ok(resp, min_accepted=5)

    # 2. Build commit payload from accepted rows
    commit_rows = []
    for row in body["accepted"][:3]:
        v = row["values"]
        commit_rows.append({
            "container_no": v["container_no"],
            "container_size": v["container_size"],
            "freight_kind": v["freight_kind"],
            "work_type": v["work_type"],
            "container_type_iso": v.get("container_type_iso", ""),
            "gross_weight_kg": v.get("gross_weight_kg"),
            "seal_no": v.get("seal_no", ""),
            "pickup_location": v.get("pickup_location", ""),
            "dropoff_location": v.get("dropoff_location", ""),
            "pickup_date": v.get("pickup_date"),
            "dropoff_date": v.get("dropoff_date"),
            "trip_date": v["trip_date"],
            "customer_ref": v.get("customer_ref", ""),
            "consignee": v.get("consignee", ""),
            "commodity": v.get("commodity", ""),
            "driver_name": v.get("driver_name", ""),
            "remarks": v.get("remarks", ""),
        })

    # 3. Commit
    resp = await async_client.post(
        COMMIT_URL,
        json={
            "partner_id": seeded_partner.id,
            "rows": commit_rows,
        },
        headers=headers,
    )
    assert resp.status_code == 200, f"Commit failed: {resp.status_code} {resp.text}"
    result = resp.json()
    assert result["created"] > 0
    assert result["created"] <= 3
    assert isinstance(result["created_trip_ids"], list)
    assert len(result["created_trip_ids"]) > 0


@pytest.mark.asyncio
async def test_commit_requires_accountant_role(
    async_client, make_auth_headers, db_session, seeded_partner,
):
    headers = await make_auth_headers("driver")
    resp = await async_client.post(
        COMMIT_URL,
        json={
            "partner_id": seeded_partner.id,
            "rows": [{
                "container_no": "ABCD1234567",
                "container_size": "20",
                "freight_kind": "F",
                "work_type": "F20",
                "trip_date": "2026-04-15",
            }],
        },
        headers=headers,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_commit_rejects_unresolved_freight_kind(
    async_client, make_auth_headers, db_session, seeded_partner,
):
    """Test that commit endpoint rejects rows with unresolved freight_kind."""
    headers = await make_auth_headers("accountant")
    
    # Try to commit a row with freight_kind_unknown=True (unresolved)
    resp = await async_client.post(
       COMMIT_URL,
       json={
           "partner_id": seeded_partner.id,
           "rows": [{
               "container_no": "ABCD1234567",
               "container_size": "20",
               "freight_kind": "F",  # Defaulted, not explicitly provided
               "cont_type": "F20",
               "work_type": "CHUYỂN BÃI",
               "trip_date": "2026-04-15",
               "freight_kind_unknown": True,  # Mark as unresolved
           }],
       },
       headers=headers,
    )
    # Should reject with 400 error
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
    result = resp.json()
    assert "freight_kind" in result.get("detail", "").lower()
    assert "xác định" in result.get("detail", "")  # Vietnamese: "xác định" (resolve)
