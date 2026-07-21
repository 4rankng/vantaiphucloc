"""Tests for finding duplicate container numbers in DeliveredTrips."""

from __future__ import annotations

from datetime import date

import pytest

from app.contexts.operations.application.dto import DuplicateContainersFilters
from app.contexts.operations.application.delivered_trips import FindDuplicateContainers
from app.contexts.operations.infrastructure.repositories import (
    SqlDeliveredTripRepository,
)
from app.models.domain import Client, DeliveredTrip, Location


@pytest.fixture
async def seeded(db_session):
    client = Client(name="Khach A", is_active=True)
    other_client = Client(name="Khach B", is_active=True)
    pickup = Location(name="Cang Dinh Vu", is_active=True)
    dropoff = Location(name="Bai Chua", is_active=True)
    db_session.add_all([client, other_client, pickup, dropoff])
    await db_session.flush()
    return {
        "client_id": client.id,
        "other_client_id": other_client.id,
        "pickup_id": pickup.id,
        "dropoff_id": dropoff.id,
    }


def _trip(
    *,
    client_id: int,
    pickup_id: int,
    dropoff_id: int,
    cont_number: str | None,
    trip_date: date | None,
    driver_id: int | None = None,
    work_type: str = "CHUYEN_BAI",
    cont_photo_hash: str | None = None,
) -> DeliveredTrip:
    return DeliveredTrip(
        client_id=client_id,
        pickup_location_id=pickup_id,
        dropoff_location_id=dropoff_id,
        driver_id=driver_id,
        vendor_id=None,
        work_type=work_type,
        cont_number=cont_number,
        cont_type="F20",
        revenue=0,
        driver_salary=0,
        trip_date=trip_date,
        cont_photo_hash=cont_photo_hash,
    )


class TestFindDuplicateContainersRepo:
    async def test_two_trips_same_cont_yields_one_group(self, db_session, seeded):
        repo = SqlDeliveredTripRepository(db_session)
        db_session.add_all(
            [
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date(2026, 6, 10),
                    cont_photo_hash="hash-a",
                ),
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date(2026, 6, 12),
                    cont_photo_hash="hash-a",
                ),
            ]
        )
        await db_session.flush()

        groups = await repo.find_duplicate_containers(
            date_from=date(2026, 6, 1),
            date_to=date(2026, 6, 30),
        )
        assert len(groups) == 1
        assert groups[0].cont_number == "HACU1234567"
        assert groups[0].count == 2
        assert len(groups[0].trip_ids) == 2
        assert sorted(groups[0].trip_ids) == sorted(groups[0].trip_ids)

    async def test_round_trip_reversed_direction_not_duplicate(
        self, db_session, seeded
    ):
        """Regression: same container, same driver, but reversed direction
        (A->B outbound, B->A return) is a legitimate round-trip, NOT a
        duplicate. Mirrors the MSDU4258210 case from production."""
        repo = SqlDeliveredTripRepository(db_session)
        db_session.add_all(
            [
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="MSDU4258210",
                    trip_date=date(2026, 7, 2),
                    driver_id=17,
                    cont_photo_hash="hash-outbound",
                ),
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["dropoff_id"],
                    dropoff_id=seeded["pickup_id"],
                    cont_number="MSDU4258210",
                    trip_date=date(2026, 7, 7),
                    driver_id=17,
                    cont_photo_hash="hash-return",
                ),
            ]
        )
        await db_session.flush()

        groups = await repo.find_duplicate_containers(
            date_from=date(2026, 7, 1),
            date_to=date(2026, 7, 31),
        )
        assert groups == []

    async def test_same_direction_different_photos_not_duplicate(
        self, db_session, seeded
    ):
        """Same container, same direction, but distinct photo hashes are two
        distinct physical trips — not duplicates."""
        repo = SqlDeliveredTripRepository(db_session)
        db_session.add_all(
            [
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date(2026, 6, 10),
                    cont_photo_hash="hash-a",
                ),
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date(2026, 6, 12),
                    cont_photo_hash="hash-b",
                ),
            ]
        )
        await db_session.flush()

        groups = await repo.find_duplicate_containers(
            date_from=date(2026, 6, 1),
            date_to=date(2026, 6, 30),
        )
        assert groups == []

    async def test_photo_less_trips_still_group(self, db_session, seeded):
        """Trips without a photo hash cannot be disambiguated, so they keep
        grouping with each other (original catch-all behavior preserved)."""
        repo = SqlDeliveredTripRepository(db_session)
        db_session.add_all(
            [
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date(2026, 6, 10),
                    cont_photo_hash=None,
                ),
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date(2026, 6, 12),
                    cont_photo_hash=None,
                ),
            ]
        )
        await db_session.flush()

        groups = await repo.find_duplicate_containers(
            date_from=date(2026, 6, 1),
            date_to=date(2026, 6, 30),
        )
        assert len(groups) == 1
        assert groups[0].count == 2

    async def test_case_and_whitespace_normalize_into_one_group(
        self, db_session, seeded
    ):
        repo = SqlDeliveredTripRepository(db_session)
        db_session.add_all(
            [
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="hacu1234567",
                    trip_date=date(2026, 6, 10),
                ),
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567 ",
                    trip_date=date(2026, 6, 11),
                ),
            ]
        )
        await db_session.flush()

        groups = await repo.find_duplicate_containers(
            date_from=date(2026, 6, 1),
            date_to=date(2026, 6, 30),
        )
        assert len(groups) == 1
        assert groups[0].count == 2

    async def test_unique_trips_yield_no_groups(self, db_session, seeded):
        repo = SqlDeliveredTripRepository(db_session)
        db_session.add_all(
            [
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1111111",
                    trip_date=date(2026, 6, 10),
                ),
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU2222222",
                    trip_date=date(2026, 6, 11),
                ),
            ]
        )
        await db_session.flush()

        groups = await repo.find_duplicate_containers(
            date_from=date(2026, 6, 1),
            date_to=date(2026, 6, 30),
        )
        assert groups == []

    async def test_null_and_empty_cont_numbers_ignored(self, db_session, seeded):
        repo = SqlDeliveredTripRepository(db_session)
        db_session.add_all(
            [
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number=None,
                    trip_date=date(2026, 6, 10),
                ),
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="",
                    trip_date=date(2026, 6, 11),
                ),
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="  ",
                    trip_date=date(2026, 6, 12),
                ),
            ]
        )
        await db_session.flush()

        groups = await repo.find_duplicate_containers(
            date_from=date(2026, 6, 1),
            date_to=date(2026, 6, 30),
        )
        assert groups == []

    async def test_date_window_excludes_out_of_range(self, db_session, seeded):
        repo = SqlDeliveredTripRepository(db_session)
        db_session.add_all(
            [
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date(2026, 5, 28),
                ),
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date(2026, 7, 2),
                ),
            ]
        )
        await db_session.flush()

        groups = await repo.find_duplicate_containers(
            date_from=date(2026, 6, 1),
            date_to=date(2026, 6, 30),
        )
        assert groups == []

    async def test_client_filter_excludes_single_in_scope(self, db_session, seeded):
        repo = SqlDeliveredTripRepository(db_session)
        db_session.add_all(
            [
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date(2026, 6, 10),
                ),
                _trip(
                    client_id=seeded["other_client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date(2026, 6, 11),
                ),
            ]
        )
        await db_session.flush()

        groups = await repo.find_duplicate_containers(
            date_from=date(2026, 6, 1),
            date_to=date(2026, 6, 30),
            client_id=seeded["client_id"],
        )
        # The container appears once for this client (and once for another),
        # so within this client's scope it is NOT a duplicate → no group.
        assert groups == []


class TestFindDuplicateContainersUseCase:
    async def test_use_case_returns_groups(self, db_session, seeded):
        db_session.add_all(
            [
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date(2026, 6, 10),
                ),
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date(2026, 6, 12),
                ),
            ]
        )
        await db_session.flush()

        uc = FindDuplicateContainers(SqlDeliveredTripRepository(db_session))
        groups = await uc(
            DuplicateContainersFilters(
                date_from=date(2026, 6, 1),
                date_to=date(2026, 6, 30),
            )
        )
        assert len(groups) == 1
        assert groups[0].cont_number == "HACU1234567"


class TestDuplicateContainersEndpoint:
    async def test_endpoint_returns_groups_for_accountant(
        self,
        async_client,
        db_session,
        seeded,
        make_auth_headers,
    ):
        db_session.add_all(
            [
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date(2026, 6, 10),
                ),
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date(2026, 6, 12),
                ),
            ]
        )
        await db_session.flush()

        headers = await make_auth_headers("accountant")
        response = await async_client.get(
            "/api/v1/delivered-trips/duplicate-containers",
            params={
                "date_from": "2026-06-01",
                "date_to": "2026-06-30",
            },
            headers=headers,
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["total_groups"] == 1
        assert body["total_extra_rows"] == 1
        assert body["groups"][0]["cont_number"] == "HACU1234567"
        assert body["groups"][0]["count"] == 2
        assert len(body["groups"][0]["trip_ids"]) == 2
        assert len(body["groups"][0]["trip_dates"]) == 2

    async def test_endpoint_returns_empty_when_no_duplicates(
        self,
        async_client,
        db_session,
        seeded,
        make_auth_headers,
    ):
        db_session.add_all(
            [
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1111111",
                    trip_date=date(2026, 6, 10),
                ),
            ]
        )
        await db_session.flush()

        headers = await make_auth_headers("accountant")
        response = await async_client.get(
            "/api/v1/delivered-trips/duplicate-containers",
            params={
                "date_from": "2026-06-01",
                "date_to": "2026-06-30",
            },
            headers=headers,
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["total_groups"] == 0
        assert body["total_extra_rows"] == 0
        assert body["groups"] == []
