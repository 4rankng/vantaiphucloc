"""Tests for vendor reconciliation vessel propagation.

Bug: "Số tàu" (vessel) is always empty in the created DeliveredTrip because
the commit step drops the vessel value. SYNONYMS correctly maps
"hãng khai thác" → vessel at the preview stage, but
``commit_reconciliation_rows`` does not copy ``vessel`` into the
``ImportRow`` it builds, and ``_create_reconciliation_trip`` only
recovers vessel from ``row.notes`` (which is also empty).
"""

from __future__ import annotations

import pytest
from sqlalchemy import select

from app.contexts.operations.application.bulk_import_types import ImportRow
from app.contexts.operations.infrastructure import vendor_import_service as svc_mod
from app.contexts.operations.infrastructure.vendor_import_service import (
    ReconciliationImportService,
)
from app.models.domain import Client, DeliveredTrip, Location


@pytest.fixture
def sqlite_vi_ilike(monkeypatch):
    """Replace the Postgres-only ``unaccent`` based search with a plain
    case-insensitive LIKE so the test can run against the in-memory
    SQLite engine provided by conftest.py."""
    from sqlalchemy import func

    def fake_vi_ilike(column, value: str):
        return func.lower(column).like(f"%{value.strip().lower()}%")

    monkeypatch.setattr(svc_mod, "_vi_ilike", fake_vi_ilike)


@pytest.fixture
async def seeded(db_session):
    client = Client(name="Khach Hang Test", is_active=True)
    pickup = Location(name="Cang Dinh Vu", is_active=True)
    dropoff = Location(name="Bai Chua", is_active=True)
    db_session.add_all([client, pickup, dropoff])
    await db_session.flush()
    return {
        "client_id": client.id,
        "pickup_id": pickup.id,
        "dropoff_id": dropoff.id,
    }


def _row_dict(vessel: str | None = None) -> dict:
    """Build a minimal valid row dict as the frontend would send it.

    The frontend maps ``r.values`` straight through to the commit payload,
    so this dict has the same canonical field names the import pipeline
    emits (e.g. ``container_no``, ``pickup_location``).
    """
    return {
        "container_no": "MSKU1234567",
        "trip_date": "2026-06-12",
        "consignee": "Khach Hang Test",
        "pickup_location": "Cang Dinh Vu",
        "dropoff_location": "Bai Chua",
        "freight_charge": 1500000,
        "cont_type": "E40",
        "vehicle_plate": "15C-123.45",
        "vessel": vessel,
    }


class TestVesselFieldOnImportRow:
    """The ImportRow dataclass must carry vessel end-to-end."""

    def test_importrow_has_vessel_field(self):
        row = ImportRow(row_number=1, vessel="MAERSK HONG KONG")
        assert row.vessel == "MAERSK HONG KONG"

    def test_importrow_vessel_defaults_to_none(self):
        row = ImportRow(row_number=1)
        assert row.vessel is None


class TestCommitPropagatesVessel:
    """commit_reconciliation_rows must persist vessel on the DeliveredTrip."""

    async def test_vessel_is_set_when_row_has_vessel(
        self,
        db_session,
        seeded,
        sqlite_vi_ilike,
    ):
        svc = ReconciliationImportService(db_session)
        rows = [_row_dict(vessel="MAERSK HONG KONG")]

        result = await svc.commit_reconciliation_rows(rows, vendor_id=None)

        assert result.created == 1, (
            f"commit failed before vessel could be persisted: {result.errors}"
        )

        wo = (
            await db_session.execute(
                select(DeliveredTrip).where(DeliveredTrip.cont_number == "MSKU1234567")
            )
        ).scalar_one()

        assert wo.vessel == "MAERSK HONG KONG", (
            f"vessel dropped during commit — got {wo.vessel!r}, "
            "expected 'MAERSK HONG KONG'"
        )

    async def test_vessel_is_none_when_row_omits_vessel(
        self,
        db_session,
        seeded,
        sqlite_vi_ilike,
    ):
        svc = ReconciliationImportService(db_session)
        rows = [_row_dict(vessel=None)]

        result = await svc.commit_reconciliation_rows(rows, vendor_id=None)

        assert result.created == 1, f"commit failed: {result.errors}"

        wo = (
            await db_session.execute(
                select(DeliveredTrip).where(DeliveredTrip.cont_number == "MSKU1234567")
            )
        ).scalar_one()

        assert wo.vessel is None
