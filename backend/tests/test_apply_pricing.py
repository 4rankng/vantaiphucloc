"""Integration tests for the bulk apply-pricing endpoint and the
`unpriced` filter on the booked-trips list endpoint.
"""

from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy import select

from app.models.domain import (
    Location,
    Partner,
    Pricing,
    PricingLine,
    BookedTrip,
    BookedTripContainer,
)
from app.models.enums import BookedTripStatus


@pytest.fixture
async def seeded_world(db_session):
    """One partner, two locations, one pricing rule."""
    partner = Client(
        code="ACME", name="Acme",
        phone="0900", is_active=True,
    )
    pickup = Location(name="Cảng A", is_active=True, pending_geocode=True)
    dropoff = Location(name="Kho B", is_active=True, pending_geocode=True)
    db_session.add_all([partner, pickup, dropoff])
    await db_session.flush()

    pricing = Pricing(
        partner_id=partner.id,
        work_type="F20",
        pickup_location_id=pickup.id,
        dropoff_location_id=dropoff.id,
        is_active=True,
    )
    db_session.add(pricing)
    await db_session.flush()
    db_session.add(PricingLine(
        pricing_id=pricing.id,
        quantity=1,
        unit_price=1_500_000,
        driver_salary=300_000,
        allowance=50_000,
    ))
    await db_session.commit()
    return {
        "partner": partner,
        "pickup": pickup,
        "dropoff": dropoff,
        "pricing": pricing,
    }


async def _make_trip(db, world, *, work_type="F20", unit_price=0):
    trip = BookedTrip(
        trip_date=date(2026, 4, 15),
        partner_id=world["partner"].id,
        pickup_location_id=world["pickup"].id,
        dropoff_location_id=world["dropoff"].id,
        unit_price=unit_price,
        driver_salary=0,
        allowance=0,
        status=BookedTripStatus.DRAFT.value,
    )
    db.add(trip)
    await db.flush()
    db.add(BookedTripContainer(
        booked_trip_id=trip.id,
        container_number="ABCU0000001",
        work_type=work_type,
        container_size="20",
        freight_kind="F",
    ))
    await db.commit()
    return trip


@pytest.mark.asyncio
async def test_apply_pricing_to_trip_ids_prices_unpriced_trips(
    db_session, seeded_world, async_client, make_auth_headers,
):
    headers = await make_auth_headers("accountant")
    world = seeded_world
    trip = await _make_trip(db_session, world, unit_price=0)

    res = await async_client.post(
        "/api/v1/imports/customer-excel/apply-pricing",
        json={"trip_ids": [trip.id]},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["priced"] == 1
    assert body["unpriced"] == 0
    assert body["unpriced_trip_ids"] == []

    # Trip is now priced
    refreshed = (await db_session.execute(
        select(BookedTrip).where(BookedTrip.id == trip.id)
    )).scalar_one()
    assert refreshed.unit_price == 1_500_000
    assert refreshed.driver_salary == 300_000
    assert refreshed.allowance == 50_000


@pytest.mark.asyncio
async def test_apply_pricing_idempotent_on_already_priced(
    db_session, seeded_world, async_client, make_auth_headers,
):
    """Re-running on already-priced trips is a no-op (counted as priced)."""
    headers = await make_auth_headers("accountant")
    world = seeded_world
    trip = await _make_trip(db_session, world, unit_price=999_000)

    res = await async_client.post(
        "/api/v1/imports/customer-excel/apply-pricing",
        json={"trip_ids": [trip.id]},
        headers=headers,
    )
    assert res.status_code == 200
    body = res.json()
    # Already priced → still counted as priced, but value not overwritten.
    assert body["priced"] == 1
    assert body["unpriced"] == 0

    refreshed = (await db_session.execute(
        select(BookedTrip).where(BookedTrip.id == trip.id)
    )).scalar_one()
    assert refreshed.unit_price == 999_000  # untouched


@pytest.mark.asyncio
async def test_apply_pricing_returns_unpriced_when_no_rule(
    db_session, seeded_world, async_client, make_auth_headers,
):
    """A trip with a work_type that has no Pricing rule is reported as unpriced."""
    headers = await make_auth_headers("accountant")
    world = seeded_world
    # F40 has no rule in seeded_world
    trip = await _make_trip(db_session, world, work_type="F40", unit_price=0)

    res = await async_client.post(
        "/api/v1/imports/customer-excel/apply-pricing",
        json={"trip_ids": [trip.id]},
        headers=headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["priced"] == 0
    assert body["unpriced"] == 1
    assert body["unpriced_trip_ids"] == [trip.id]


@pytest.mark.asyncio
async def test_apply_pricing_empty_list_short_circuits(
    async_client, make_auth_headers,
):
    headers = await make_auth_headers("accountant")
    res = await async_client.post(
        "/api/v1/imports/customer-excel/apply-pricing",
        json={"trip_ids": []},
        headers=headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body == {"priced": 0, "unpriced": 0, "unpriced_trip_ids": []}


@pytest.mark.asyncio
async def test_apply_pricing_requires_accountant(
    async_client, make_auth_headers,
):
    headers = await make_auth_headers("driver")
    res = await async_client.post(
        "/api/v1/imports/customer-excel/apply-pricing",
        json={"trip_ids": [1, 2]},
        headers=headers,
    )
    assert res.status_code == 403


# ── unpriced filter on booked-trips list ────────────────────────────


@pytest.mark.asyncio
async def test_booked_trips_list_unpriced_filter(
    db_session, seeded_world, async_client, make_auth_headers,
):
    headers = await make_auth_headers("accountant")
    world = seeded_world
    priced_trip = await _make_trip(db_session, world, unit_price=500_000)
    unpriced_trip = await _make_trip(db_session, world, unit_price=0)

    # unpriced=true → only the trip with unit_price=0
    res = await async_client.get(
        "/api/v1/booked-trips?unpriced=true", headers=headers,
    )
    assert res.status_code == 200
    ids = {item["id"] for item in res.json()["items"]}
    assert unpriced_trip.id in ids
    assert priced_trip.id not in ids

    # unpriced=false → only the priced trip
    res = await async_client.get(
        "/api/v1/booked-trips?unpriced=false", headers=headers,
    )
    assert res.status_code == 200
    ids = {item["id"] for item in res.json()["items"]}
    assert priced_trip.id in ids
    assert unpriced_trip.id not in ids
