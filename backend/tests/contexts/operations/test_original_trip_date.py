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
from app.contexts.operations.infrastructure.auto_match_service import confirm_matches
from app.contexts.operations.infrastructure.repositories import (
    SqlDeliveredTripRepository,
)
from app.models.domain import BookedTrip, Client, DeliveredTrip, Location


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


def _booked(
    *,
    client_id: int,
    trip_date: date,
    cont_number: str = "HACU1234567",
    work_type: str = "CHUYEN_BAI",
    pickup_id: int | None = None,
    dropoff_id: int | None = None,
) -> BookedTrip:
    """Build an ORM BookedTrip (customer/chủ-hàng order) for match tests.

    ``trip_date``, ``client_id`` and ``work_type`` are NOT NULL on the model.
    """
    return BookedTrip(
        trip_date=trip_date,
        client_id=client_id,
        work_type=work_type,
        cont_number=cont_number,
        pickup_location_id=pickup_id,
        dropoff_location_id=dropoff_id,
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


class TestConfirmMatchPreservesOriginalTripDate:
    """``confirm_matches`` may overwrite ``trip_date`` from the booked (chủ hàng)
    side via ``SYNCABLE_FIELDS``, but it must NEVER touch ``original_trip_date`` —
    that frozen snapshot is what ``unmatch_endpoint`` restores from. These are the
    first tests to drive the match step itself; the existing unmatch tests seed
    matched state by hand instead.
    """

    @staticmethod
    def _pair(wo_id, to_id, sync_source=None, field_choices=None):
        # confirm_matches pair shape: (wo_id, to_id, sync_source, field_choices, score)
        return (wo_id, to_id, sync_source, field_choices, None)

    @staticmethod
    async def _fetch_wo(db_session, wo_id):
        return (
            await db_session.execute(
                select(
                    DeliveredTrip.trip_date,
                    DeliveredTrip.original_trip_date,
                    DeliveredTrip.booked_trip_id,
                ).where(DeliveredTrip.id == wo_id)
            )
        ).one()

    async def _seed_pair(self, db_session, seeded):
        """A delivered trip (driver date 06-10) + a booked trip (chủ hàng date 06-01)."""
        repo = SqlDeliveredTripRepository(db_session)
        wo = await CreateDeliveredTrip(repo, db_session)(
            DeliveredTripCreateInput(
                client_id=seeded["client_id"],
                pickup_location_id=seeded["pickup_id"],
                dropoff_location_id=seeded["dropoff_id"],
                trip_date=date(2026, 6, 10),
            ),
            _accountant(),
        )
        assert wo.original_trip_date == date(2026, 6, 10)  # snapshot captured
        to = _booked(
            client_id=seeded["client_id"],
            trip_date=date(2026, 6, 1),
            pickup_id=seeded["pickup_id"],
            dropoff_id=seeded["dropoff_id"],
        )
        db_session.add(to)
        await db_session.flush()
        return wo, to

    async def test_confirm_booked_date_overwrites_trip_date_keeps_original(
        self, db_session, seeded
    ):
        wo, to = await self._seed_pair(db_session, seeded)

        result = await confirm_matches(
            db_session, [self._pair(wo.id, to.id, None, {"tripDate": "booked"})]
        )

        assert result["matched_count"] == 1
        assert result["errors"] == []
        row = await self._fetch_wo(db_session, wo.id)
        assert row.trip_date == date(2026, 6, 1)  # overwritten from chủ hàng side
        assert row.original_trip_date == date(2026, 6, 10)  # snapshot frozen
        assert row.booked_trip_id == to.id

    async def test_confirm_delivered_date_keeps_delivered_trip_date(
        self, db_session, seeded
    ):
        wo, to = await self._seed_pair(db_session, seeded)

        result = await confirm_matches(
            db_session, [self._pair(wo.id, to.id, None, {"tripDate": "delivered"})]
        )

        assert result["matched_count"] == 1
        wo_row = await self._fetch_wo(db_session, wo.id)
        assert wo_row.trip_date == date(2026, 6, 10)  # delivered (lái xe) unchanged
        assert wo_row.original_trip_date == date(2026, 6, 10)
        to_row = (
            await db_session.execute(
                select(BookedTrip.trip_date).where(BookedTrip.id == to.id)
            )
        ).one()
        assert to_row.trip_date == date(2026, 6, 10)  # booked adopted the driver date

    async def test_confirm_no_choice_does_not_overwrite_when_both_present(
        self, db_session, seeded
    ):
        wo, to = await self._seed_pair(db_session, seeded)

        # No field_choices, no sync_source → fill-empty branch. Both sides have a
        # date, so neither is overwritten.
        result = await confirm_matches(db_session, [self._pair(wo.id, to.id)])

        assert result["matched_count"] == 1
        row = await self._fetch_wo(db_session, wo.id)
        assert row.trip_date == date(2026, 6, 10)
        assert row.original_trip_date == date(2026, 6, 10)

    async def test_confirm_sync_source_booked_fallback_overwrites_keeps_original(
        self, db_session, seeded
    ):
        wo, to = await self._seed_pair(db_session, seeded)

        # field_choices is None → confirm_matches falls back to sync_source for
        # every syncable field (the path used by bulk/vendor import).
        result = await confirm_matches(
            db_session, [self._pair(wo.id, to.id, "booked", None)]
        )

        assert result["matched_count"] == 1
        row = await self._fetch_wo(db_session, wo.id)
        assert row.trip_date == date(2026, 6, 1)  # overwritten from chủ hàng side
        assert row.original_trip_date == date(2026, 6, 10)  # snapshot still frozen


class TestMatchThenUnmatchLifecycle:
    """End-to-end: the driver's date must survive a match (booked-side date
    written via ``confirm_matches``) and be restored on a subsequent unmatch —
    the full reconciliation flow, driven through the real use-cases/endpoint
    rather than seeded matched state.
    """

    async def test_full_lifecycle_match_booked_then_unmatch_restores_driver_date(
        self, db_session, async_client, make_auth_headers, seeded
    ):
        # 1. Driver submits with their own date → snapshot captured.
        repo = SqlDeliveredTripRepository(db_session)
        wo = await CreateDeliveredTrip(repo, db_session)(
            DeliveredTripCreateInput(
                client_id=seeded["client_id"],
                pickup_location_id=seeded["pickup_id"],
                dropoff_location_id=seeded["dropoff_id"],
                trip_date=date(2026, 6, 10),
            ),
            _accountant(),
        )

        # 2. Match against a booked trip whose date differs; pick the chủ hàng
        #    date → trip_date is overwritten, original_trip_date is not.
        to = _booked(
            client_id=seeded["client_id"],
            trip_date=date(2026, 6, 1),
            pickup_id=seeded["pickup_id"],
            dropoff_id=seeded["dropoff_id"],
        )
        db_session.add(to)
        await db_session.flush()

        match_result = await confirm_matches(
            db_session, [(wo.id, to.id, None, {"tripDate": "booked"}, None)]
        )
        assert match_result["matched_count"] == 1

        matched = (
            await db_session.execute(
                select(DeliveredTrip.trip_date, DeliveredTrip.original_trip_date).where(
                    DeliveredTrip.id == wo.id
                )
            )
        ).one()
        assert matched.trip_date == date(2026, 6, 1)
        assert matched.original_trip_date == date(2026, 6, 10)

        # 3. Bỏ ghép → trip_date reverts to the driver's original.
        headers = await make_auth_headers("accountant")
        resp = await async_client.post(
            "/api/v1/auto-match/unmatch",
            json={"delivered_trip_id": wo.id},
            headers=headers,
        )
        assert resp.status_code == 200, resp.text

        final = (
            await db_session.execute(
                select(DeliveredTrip.trip_date, DeliveredTrip.booked_trip_id).where(
                    DeliveredTrip.id == wo.id
                )
            )
        ).one()
        assert final.trip_date == date(2026, 6, 10)  # restored to lái-xe date
        assert final.booked_trip_id is None
