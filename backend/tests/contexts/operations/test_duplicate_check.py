"""Tests for driver submit-time duplicate detection.

Covers the two-tier matching (photo content hash, then container + route +
type) used to warn a driver that the trip they are about to submit may
already exist.
"""

from __future__ import annotations

import base64
import hashlib
from datetime import date

import pytest
from sqlalchemy import select

from app.contexts.operations.application.delivered_trips import (
    CheckDeliveredTripDuplicate,
)
from app.contexts.operations.application.dto import DuplicateCheckRequest
from app.contexts.operations.infrastructure.repositories import (
    SqlDeliveredTripRepository,
)
from app.models.base import User
from app.models.domain import Client, DeliveredTrip, Location

# PHOTO_A is a REAL sha256 so the endpoint (which recomputes the hash from
# image_data) can reproduce it; PHOTO_B is an opaque distinct hash.
IMAGE_BYTES = b"duplicate-photo-bytes"
PHOTO_A = hashlib.sha256(IMAGE_BYTES).hexdigest()
PHOTO_B = "b" * 64


@pytest.fixture
async def seeded(db_session):
    client = Client(name="Khach A", is_active=True)
    pickup = Location(name="Cang Dinh Vu", is_active=True)
    dropoff = Location(name="Bai Chua", is_active=True)
    other_pickup = Location(name="Cang Lach Huyen", is_active=True)
    db_session.add_all([client, pickup, dropoff, other_pickup])
    await db_session.flush()
    return {
        "client_id": client.id,
        "pickup_id": pickup.id,
        "dropoff_id": dropoff.id,
        "other_pickup_id": other_pickup.id,
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
    cont_type: str = "F20",
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
        cont_type=cont_type,
        cont_photo_hash=cont_photo_hash,
        revenue=0,
        driver_salary=0,
        trip_date=trip_date,
    )


class TestFindDuplicateCandidatesRepo:
    async def test_same_photo_hash_flagged_as_photo(self, db_session, seeded):
        repo = SqlDeliveredTripRepository(db_session)
        db_session.add_all(
            [
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date(2026, 6, 10),
                    driver_id=7,
                    cont_photo_hash=PHOTO_A,
                    work_type="XUAT_NHAP_TAU",
                ),
            ]
        )
        await db_session.flush()

        candidates = await repo.find_duplicate_candidates(
            driver_id=7,
            photo_hash=PHOTO_A,
            cont_number="HACU1234567",
            pickup_location_id=seeded["pickup_id"],
            dropoff_location_id=seeded["dropoff_id"],
            cont_type="F20",
            since=date(2026, 6, 4),
        )
        assert len(candidates) == 1
        assert candidates[0].reason == "photo"
        assert candidates[0].photo_match is True

    async def test_same_cont_route_type_flagged_as_fields(self, db_session, seeded):
        repo = SqlDeliveredTripRepository(db_session)
        db_session.add_all(
            [
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date(2026, 6, 10),
                    driver_id=7,
                    cont_photo_hash=PHOTO_B,
                ),
            ]
        )
        await db_session.flush()

        # Different photo, but same container + route + type → Tier 2.
        candidates = await repo.find_duplicate_candidates(
            driver_id=7,
            photo_hash=PHOTO_A,
            cont_number="HACU1234567",
            pickup_location_id=seeded["pickup_id"],
            dropoff_location_id=seeded["dropoff_id"],
            cont_type="F20",
            since=date(2026, 6, 4),
        )
        assert len(candidates) == 1
        assert candidates[0].reason == "fields"
        assert candidates[0].photo_match is False

    async def test_work_type_ignored_so_retagged_trip_still_matches(
        self, db_session, seeded
    ):
        """The reported duplicate differs only in tác nghiệp; dedup ignores it."""
        repo = SqlDeliveredTripRepository(db_session)
        db_session.add_all(
            [
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date(2026, 6, 10),
                    driver_id=7,
                    cont_photo_hash=PHOTO_B,
                    work_type="XUAT_NHAP_TAU",
                ),
            ]
        )
        await db_session.flush()

        candidates = await repo.find_duplicate_candidates(
            driver_id=7,
            cont_number="HACU1234567",
            pickup_location_id=seeded["pickup_id"],
            dropoff_location_id=seeded["dropoff_id"],
            cont_type="F20",
            since=date(2026, 6, 4),
        )
        assert len(candidates) == 1

    async def test_different_driver_not_flagged(self, db_session, seeded):
        repo = SqlDeliveredTripRepository(db_session)
        db_session.add_all(
            [
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date(2026, 6, 10),
                    driver_id=999,
                    cont_photo_hash=PHOTO_A,
                ),
            ]
        )
        await db_session.flush()

        candidates = await repo.find_duplicate_candidates(
            driver_id=7,
            photo_hash=PHOTO_A,
            cont_number="HACU1234567",
            pickup_location_id=seeded["pickup_id"],
            dropoff_location_id=seeded["dropoff_id"],
            cont_type="F20",
            since=date(2026, 6, 4),
        )
        assert candidates == []

    async def test_older_than_window_not_flagged(self, db_session, seeded):
        repo = SqlDeliveredTripRepository(db_session)
        db_session.add_all(
            [
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date(2026, 5, 1),
                    driver_id=7,
                    cont_photo_hash=PHOTO_A,
                ),
            ]
        )
        await db_session.flush()

        candidates = await repo.find_duplicate_candidates(
            driver_id=7,
            photo_hash=PHOTO_A,
            cont_number="HACU1234567",
            pickup_location_id=seeded["pickup_id"],
            dropoff_location_id=seeded["dropoff_id"],
            cont_type="F20",
            since=date(2026, 6, 4),
        )
        assert candidates == []

    async def test_same_cont_different_route_not_flagged(self, db_session, seeded):
        repo = SqlDeliveredTripRepository(db_session)
        db_session.add_all(
            [
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["other_pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date(2026, 6, 10),
                    driver_id=7,
                    cont_photo_hash=PHOTO_B,
                ),
            ]
        )
        await db_session.flush()

        candidates = await repo.find_duplicate_candidates(
            driver_id=7,
            photo_hash=PHOTO_A,
            cont_number="HACU1234567",
            pickup_location_id=seeded["pickup_id"],
            dropoff_location_id=seeded["dropoff_id"],
            cont_type="F20",
            since=date(2026, 6, 4),
        )
        assert candidates == []

    async def test_exclude_trip_id_omits_self(self, db_session, seeded):
        repo = SqlDeliveredTripRepository(db_session)
        existing = _trip(
            client_id=seeded["client_id"],
            pickup_id=seeded["pickup_id"],
            dropoff_id=seeded["dropoff_id"],
            cont_number="HACU1234567",
            trip_date=date(2026, 6, 10),
            driver_id=7,
            cont_photo_hash=PHOTO_A,
        )
        db_session.add_all([existing])
        await db_session.flush()

        candidates = await repo.find_duplicate_candidates(
            driver_id=7,
            photo_hash=PHOTO_A,
            cont_number="HACU1234567",
            pickup_location_id=seeded["pickup_id"],
            dropoff_location_id=seeded["dropoff_id"],
            cont_type="F20",
            since=date(2026, 6, 4),
            exclude_trip_id=existing.id,
        )
        assert candidates == []


class TestCheckDeliveredTripDuplicateUseCase:
    async def test_use_case_flags_recent_same_photo(self, db_session, seeded):
        db_session.add_all(
            [
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date.today(),
                    driver_id=7,
                    cont_photo_hash=PHOTO_A,
                ),
            ]
        )
        await db_session.flush()

        uc = CheckDeliveredTripDuplicate(SqlDeliveredTripRepository(db_session))
        candidates = await uc(
            DuplicateCheckRequest(
                driver_id=7,
                photo_hash=PHOTO_A,
                cont_number="HACU1234567",
                pickup_location_id=seeded["pickup_id"],
                dropoff_location_id=seeded["dropoff_id"],
                cont_type="F20",
            )
        )
        assert len(candidates) == 1
        assert candidates[0].photo_match is True


class TestDuplicateCheckEndpoint:
    async def test_endpoint_returns_photo_candidate_for_driver(
        self,
        async_client,
        db_session,
        seeded,
        make_auth_headers,
    ):
        headers = await make_auth_headers("driver")
        # Resolve the driver user created by the helper to bind the seeded trip.
        driver = (
            await db_session.execute(select(User).where(User.phone == "09driver00"))
        ).scalar_one()

        db_session.add_all(
            [
                _trip(
                    client_id=seeded["client_id"],
                    pickup_id=seeded["pickup_id"],
                    dropoff_id=seeded["dropoff_id"],
                    cont_number="HACU1234567",
                    trip_date=date.today(),
                    driver_id=driver.id,
                    cont_photo_hash=PHOTO_A,
                ),
            ]
        )
        await db_session.flush()

        # image_data whose decoded bytes hash to PHOTO_A.
        image_data = base64.b64encode(IMAGE_BYTES).decode()

        response = await async_client.post(
            "/api/v1/delivered-trips/duplicate-check",
            json={
                "cont_number": "HACU1234567",
                "cont_type": "F20",
                "pickup_location_id": seeded["pickup_id"],
                "dropoff_location_id": seeded["dropoff_id"],
                "image_data": image_data,
            },
            headers=headers,
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert len(body["candidates"]) == 1
        assert body["candidates"][0]["reason"] == "photo"
        assert body["candidates"][0]["photo_match"] is True

    async def test_endpoint_returns_empty_when_no_match(
        self,
        async_client,
        db_session,
        seeded,
        make_auth_headers,
    ):
        headers = await make_auth_headers("driver")

        response = await async_client.post(
            "/api/v1/delivered-trips/duplicate-check",
            json={
                "cont_number": "HACU9999999",
                "cont_type": "F20",
                "pickup_location_id": seeded["pickup_id"],
                "dropoff_location_id": seeded["dropoff_id"],
            },
            headers=headers,
        )
        assert response.status_code == 200, response.text
        assert response.json()["candidates"] == []
