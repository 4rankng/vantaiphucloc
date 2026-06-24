"""Tests for ``original_trip_date`` snapshot/restore across the match lifecycle.

The driver's original trip date must survive matching (which may overwrite
``trip_date`` from the booked side via ``SYNCABLE_FIELDS``) and be restored on
unmatch. ``original_trip_date`` is captured at CREATE, kept in sync while the
trip is unmatched, left untouched while matched, and ``trip_date`` is restored
from it on UNMATCH (with a NULL guard for legacy rows).

These are the first tests covering the ``unmatch_endpoint`` restore path.
"""

from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy import select

from app.contexts.operations.application.delivered_trips import (
    CreateDeliveredTrip,
    CurrentUserContext,
    UpdateDeliveredTrip,
)
from app.contexts.operations.application.dto import (
    DeliveredTripCreateInput,
    DeliveredTripUpdateInput,
)
from app.contexts.operations.infrastructure.repositories import (
    SqlDeliveredTripRepository,
)
from app.models.domain import Client, DeliveredTrip, Location


@pytest.fixture
async def seeded(db_session):
    client = Client(name="Khach A", is_active=True)
    pickup = Location(name="Cang Dinh Vu", is_active=True)
    dropoff = Location(name="Bai Chua", is_active=True)
    db_session.add_all([client, pickup, dropoff])
    await db_session.flush()
    return {
        "client_id": client.id,
        "pickup_id": pickup.id,
        "dropoff_id": dropoff.id,
    }


def _trip(
    *,
    client_id: int,
    pickup_id: int,
    dropoff_id: int,
    trip_date: date | None,
    original_trip_date: date | None = None,
    booked_trip_id: int | None = None,
    cont_number: str = "HACU1234567",
) -> DeliveredTrip:
    """Build an ORM DeliveredTrip directly (mirrors test_duplicate_check)."""
    return DeliveredTrip(
        client_id=client_id,
        pickup_location_id=pickup_id,
        dropoff_location_id=dropoff_id,
        work_type="CHUYEN_BAI",
        cont_number=cont_number,
        cont_type="F20",
        revenue=0,
        driver_salary=0,
        trip_date=trip_date,
        original_trip_date=original_trip_date,
        booked_trip_id=booked_trip_id,
    )


def _accountant(user_id: int = 1) -> CurrentUserContext:
    # Accountant clears both the use-case's inline role gate and the Polar
    # "reconcile"/"Reconciliation" permission used by the unmatch endpoint.
    return CurrentUserContext(id=user_id, role="accountant")


class TestOriginalTripDateSnapshot:
    async def test_create_sets_original_trip_date_from_input(self, db_session, seeded):
        repo = SqlDeliveredTripRepository(db_session)
        saved = await CreateDeliveredTrip(repo, db_session)(
            DeliveredTripCreateInput(
                client_id=seeded["client_id"],
                pickup_location_id=seeded["pickup_id"],
                dropoff_location_id=seeded["dropoff_id"],
                trip_date=date(2026, 6, 15),
            ),
            _accountant(),
        )
        assert saved.original_trip_date == date(2026, 6, 15)
        assert saved.trip_date == date(2026, 6, 15)

    async def test_create_without_trip_date_defaults_original_to_today(
        self, db_session, seeded
    ):
        repo = SqlDeliveredTripRepository(db_session)
        saved = await CreateDeliveredTrip(repo, db_session)(
            DeliveredTripCreateInput(
                client_id=seeded["client_id"],
                pickup_location_id=seeded["pickup_id"],
                dropoff_location_id=seeded["dropoff_id"],
                trip_date=None,
            ),
            _accountant(),
        )
        assert saved.original_trip_date == date.today()
        assert saved.trip_date == date.today()

    async def test_update_trip_date_syncs_original_when_unmatched(
        self, db_session, seeded
    ):
        repo = SqlDeliveredTripRepository(db_session)
        created = await CreateDeliveredTrip(repo, db_session)(
            DeliveredTripCreateInput(
                client_id=seeded["client_id"],
                pickup_location_id=seeded["pickup_id"],
                dropoff_location_id=seeded["dropoff_id"],
                trip_date=date(2026, 6, 10),
            ),
            _accountant(),
        )
        # Unmatched → editing trip_date keeps the snapshot in sync.
        refreshed = await UpdateDeliveredTrip(repo, db_session)(
            created.id,
            DeliveredTripUpdateInput(trip_date=date(2026, 6, 20)),
            _accountant(),
        )
        assert refreshed.trip_date == date(2026, 6, 20)
        assert refreshed.original_trip_date == date(2026, 6, 20)

    async def test_update_trip_date_does_not_touch_original_when_matched(
        self, db_session, seeded
    ):
        # Seed a matched trip: trip_date already overwritten to the booked-side
        # date, original_trip_date holds the driver's true date.
        t = _trip(
            client_id=seeded["client_id"],
            pickup_id=seeded["pickup_id"],
            dropoff_id=seeded["dropoff_id"],
            trip_date=date(2026, 6, 1),  # synced from booked side
            original_trip_date=date(2026, 6, 10),  # driver's original
            booked_trip_id=999,  # matched (SQLite does not enforce FK in tests)
            cont_number="HACU0000001",
        )
        db_session.add(t)
        await db_session.flush()

        repo = SqlDeliveredTripRepository(db_session)
        # Accountant can edit a matched trip's trip_date, but the snapshot
        # must be preserved so unmatch can still restore the driver's date.
        refreshed = await UpdateDeliveredTrip(repo, db_session)(
            t.id,
            DeliveredTripUpdateInput(trip_date=date(2026, 6, 5)),
            _accountant(),
        )
        assert refreshed.trip_date == date(2026, 6, 5)
        assert refreshed.original_trip_date == date(2026, 6, 10)


class TestUnmatchRestoresTripDate:
    async def test_unmatch_restores_trip_date_from_original(
        self, db_session, async_client, make_auth_headers, seeded
    ):
        t = _trip(
            client_id=seeded["client_id"],
            pickup_id=seeded["pickup_id"],
            dropoff_id=seeded["dropoff_id"],
            trip_date=date(2026, 6, 1),  # overwritten at match time
            original_trip_date=date(2026, 6, 10),  # driver's original
            booked_trip_id=999,
            cont_number="HACU0000002",
        )
        db_session.add(t)
        await db_session.flush()

        headers = await make_auth_headers("accountant")
        resp = await async_client.post(
            "/api/v1/auto-match/unmatch",
            json={"delivered_trip_id": t.id},
            headers=headers,
        )
        assert resp.status_code == 200, resp.text

        row = (
            await db_session.execute(
                select(
                    DeliveredTrip.trip_date,
                    DeliveredTrip.original_trip_date,
                    DeliveredTrip.booked_trip_id,
                ).where(DeliveredTrip.id == t.id)
            )
        ).one()
        assert row.trip_date == date(2026, 6, 10)  # restored to driver's original
        assert row.booked_trip_id is None

    async def test_unmatch_with_null_original_leaves_trip_date_unchanged(
        self, db_session, async_client, make_auth_headers, seeded
    ):
        # Legacy row with no snapshot — the guard must NOT null out trip_date.
        t = _trip(
            client_id=seeded["client_id"],
            pickup_id=seeded["pickup_id"],
            dropoff_id=seeded["dropoff_id"],
            trip_date=date(2026, 6, 1),
            original_trip_date=None,
            booked_trip_id=999,
            cont_number="HACU0000003",
        )
        db_session.add(t)
        await db_session.flush()

        headers = await make_auth_headers("accountant")
        resp = await async_client.post(
            "/api/v1/auto-match/unmatch",
            json={"delivered_trip_id": t.id},
            headers=headers,
        )
        assert resp.status_code == 200, resp.text

        row = (
            await db_session.execute(
                select(DeliveredTrip.trip_date).where(DeliveredTrip.id == t.id)
            )
        ).one()
        assert row.trip_date == date(2026, 6, 1)  # unchanged (guard skipped)
