"""Tests for ``original_cont_number`` — the raw OCR snapshot.

``original_cont_number`` holds the container string exactly as the OCR engine
read it, BEFORE the driver or ISO-6346 auto-correct edits it. The OCR-accuracy
metric compares it against the matched ``BookedTrip.cont_number``, so it must:

1. Store the *submitted* raw value on create — NOT be derived from
   ``cont_number`` (the post-correction value). Deriving it from ``cont_number``
   made the metric structurally always 100%.
2. Stay NULL when no raw OCR value is supplied (manual entry / spreadsheet
   import), so non-OCR trips are excluded from the accuracy denominator.
3. Survive ``confirm_matches`` untouched — ``cont_number`` IS in
   ``SYNCABLE_FIELDS`` and may be overwritten from the booked (chủ hàng) side,
   but ``original_cont_number`` is not, so the frozen snapshot is preserved.

Mirrors ``test_original_trip_date.py`` (same snapshot-across-match-lifecycle
shape). These are the first tests to drive the write paths for this field; the
existing ``test_ocr_stats_accuracy_uses_original_container_snapshot`` sets the
column directly on the ORM and so never exercised the (previously buggy) write
paths.
"""

from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy import select

from app.contexts.operations.application.delivered_trips import (
    CreateDeliveredTrip,
    CurrentUserContext,
)
from app.contexts.operations.application.dto import DeliveredTripCreateInput
from app.contexts.operations.infrastructure.auto_match_service import confirm_matches
from app.contexts.operations.infrastructure.repositories import (
    SqlDeliveredTripRepository,
)
from app.models.domain import BookedTrip, Client, DeliveredTrip, Location


@pytest.fixture
async def seeded(db_session):
    client = Client(name="Khach OCR", is_active=True)
    pickup = Location(name="Cang OCR", is_active=True)
    dropoff = Location(name="Kho OCR", is_active=True)
    db_session.add_all([client, pickup, dropoff])
    await db_session.flush()
    return {
        "client_id": client.id,
        "pickup_id": pickup.id,
        "dropoff_id": dropoff.id,
    }


def _accountant(user_id: int = 1) -> CurrentUserContext:
    return CurrentUserContext(id=user_id, role="accountant")


def _booked(
    *,
    client_id: int,
    trip_date: date,
    cont_number: str,
    pickup_id: int | None = None,
    dropoff_id: int | None = None,
) -> BookedTrip:
    return BookedTrip(
        trip_date=trip_date,
        client_id=client_id,
        work_type="CHUYEN_BAI",
        cont_number=cont_number,
        pickup_location_id=pickup_id,
        dropoff_location_id=dropoff_id,
    )


class TestOriginalContNumberSnapshot:
    async def test_create_stores_submitted_original_not_cont_number(
        self, db_session, seeded
    ):
        """The snapshot must hold the raw OCR value, not the corrected cont_number.

        Driver OCR'd ABCU1234565, ISO/driver corrected to MSKU1234565 before
        submit. Pre-fix this stored cont_number (→ metric always 100%).
        """
        repo = SqlDeliveredTripRepository(db_session)
        saved = await CreateDeliveredTrip(repo, db_session)(
            DeliveredTripCreateInput(
                client_id=seeded["client_id"],
                pickup_location_id=seeded["pickup_id"],
                dropoff_location_id=seeded["dropoff_id"],
                cont_number="MSKU1234565",
                original_cont_number="ABCU1234565",
            ),
            _accountant(),
        )
        assert saved.cont_number == "MSKU1234565"
        assert saved.original_cont_number == "ABCU1234565"  # raw OCR, not cont

    async def test_create_without_original_leaves_null(self, db_session, seeded):
        """Manual entry (no OCR) → NULL, so the trip is excluded from the
        accuracy denominator via the query's IS NOT NULL gate."""
        repo = SqlDeliveredTripRepository(db_session)
        saved = await CreateDeliveredTrip(repo, db_session)(
            DeliveredTripCreateInput(
                client_id=seeded["client_id"],
                pickup_location_id=seeded["pickup_id"],
                dropoff_location_id=seeded["dropoff_id"],
                cont_number="MSKU1234565",
                # original_cont_number intentionally omitted (manual entry)
            ),
            _accountant(),
        )
        assert saved.original_cont_number is None

    # NOTE: the batch driver-create path (BatchCreateDeliveredTrips) uses the
    # SAME DeliveredTripCreateInput and the SAME ``=item.original_cont_number``
    # assignment as the single path above (delivered_trips.py, batch branch).
    # It is not driven here because the db_session fixture already holds an
    # outer transaction, which conflicts with the batch use case's savepoints
    # — the same known limitation documented by the xfail on
    # test_update_script.test_update_delivered_trip. The single-create test
    # above covers the shared DTO→entity field contract.


class TestConfirmMatchPreservesOriginalContNumber:
    """``confirm_matches`` may overwrite ``cont_number`` from the booked side
    (it is in ``SYNCABLE_FIELDS``), but ``original_cont_number`` is NOT syncable,
    so the frozen raw-OCR snapshot survives reconciliation."""

    async def test_confirm_booked_cont_overwrites_cont_keeps_original(
        self, db_session, seeded
    ):
        repo = SqlDeliveredTripRepository(db_session)
        wo = await CreateDeliveredTrip(repo, db_session)(
            DeliveredTripCreateInput(
                client_id=seeded["client_id"],
                pickup_location_id=seeded["pickup_id"],
                dropoff_location_id=seeded["dropoff_id"],
                cont_number="MSKU1234565",  # driver-corrected
                original_cont_number="ABCU1234565",  # raw OCR
            ),
            _accountant(),
        )
        # Booked trip carries a DIFFERENT cont; syncing from booked must
        # overwrite wo.cont_number but leave the snapshot frozen.
        to = _booked(
            client_id=seeded["client_id"],
            trip_date=date(2026, 7, 1),
            cont_number="MSKU7654321",
            pickup_id=seeded["pickup_id"],
            dropoff_id=seeded["dropoff_id"],
        )
        db_session.add(to)
        await db_session.flush()

        result = await confirm_matches(
            db_session, [(wo.id, to.id, None, {"contNumber": "booked"}, None)]
        )
        assert result["matched_count"] == 1
        assert result["errors"] == []

        row = (
            await db_session.execute(
                select(
                    DeliveredTrip.cont_number,
                    DeliveredTrip.original_cont_number,
                    DeliveredTrip.booked_trip_id,
                ).where(DeliveredTrip.id == wo.id)
            )
        ).one()
        assert row.cont_number == "MSKU7654321"  # overwritten from chủ hàng side
        assert row.original_cont_number == "ABCU1234565"  # raw OCR frozen
        assert row.booked_trip_id == to.id

    async def test_confirm_sync_source_booked_fallback_preserves_original(
        self, db_session, seeded
    ):
        """The bulk/vendor-import match path (field_choices=None → sync_source
        fallback) must also spare the snapshot."""
        repo = SqlDeliveredTripRepository(db_session)
        wo = await CreateDeliveredTrip(repo, db_session)(
            DeliveredTripCreateInput(
                client_id=seeded["client_id"],
                pickup_location_id=seeded["pickup_id"],
                dropoff_location_id=seeded["dropoff_id"],
                cont_number="MSKU1234565",
                original_cont_number="ABCU1234565",
            ),
            _accountant(),
        )
        to = _booked(
            client_id=seeded["client_id"],
            trip_date=date(2026, 7, 1),
            cont_number="MSKU7654321",
            pickup_id=seeded["pickup_id"],
            dropoff_id=seeded["dropoff_id"],
        )
        db_session.add(to)
        await db_session.flush()

        result = await confirm_matches(
            db_session, [(wo.id, to.id, "booked", None, None)]
        )
        assert result["matched_count"] == 1

        row = (
            await db_session.execute(
                select(
                    DeliveredTrip.cont_number, DeliveredTrip.original_cont_number
                ).where(DeliveredTrip.id == wo.id)
            )
        ).one()
        assert row.cont_number == "MSKU7654321"
        assert row.original_cont_number == "ABCU1234565"
