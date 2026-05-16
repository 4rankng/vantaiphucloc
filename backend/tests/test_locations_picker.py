"""Tests for the GPS-aware location picker:
- GET /locations/nearby (Haversine ordering, NULL-coord fallback,
  q+distance combo, trip-id pin-to-top)
- POST /locations/pin (driver-pin: creates Location with GPS coords,
  geocode_source='driver_pin', location_review_needed=True).
"""
from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy import select

from app.models.domain import (
    Location,
    Partner,
    TripOrder,
)
from app.models.enums import TripOrderStatus


HAIPHONG = (20.8449, 106.6881)        # base point — Hải Phòng port
NEAR_2KM = (20.8589, 106.6961)        # ~2 km NE of base
NEAR_15KM = (20.9789, 106.7591)       # ~15 km NE of base
FAR_300KM = (22.3500, 103.9000)       # ~300 km away (outside default radius)


@pytest.fixture
async def three_geo_locations(db_session):
    """Seed 3 locations with known coords + 1 with no coords."""
    near = Location(name="Cảng A", lat=NEAR_2KM[0], lng=NEAR_2KM[1],
                    geocode_source="manual", pending_geocode=False, is_active=True)
    mid = Location(name="Kho B", lat=NEAR_15KM[0], lng=NEAR_15KM[1],
                   geocode_source="manual", pending_geocode=False, is_active=True)
    far = Location(name="Vùng xa", lat=FAR_300KM[0], lng=FAR_300KM[1],
                   geocode_source="manual", pending_geocode=False, is_active=True)
    nogps = Location(name="Địa điểm chưa có GPS", is_active=True, pending_geocode=True)
    db_session.add_all([near, mid, far, nogps])
    await db_session.commit()
    return {"near": near, "mid": mid, "far": far, "nogps": nogps}


@pytest.mark.asyncio
async def test_nearby_orders_by_haversine_distance(
    three_geo_locations, async_client, make_auth_headers,
):
    headers = await make_auth_headers("driver")
    res = await async_client.get(
        f"/api/v1/locations/nearby?lat={HAIPHONG[0]}&lng={HAIPHONG[1]}&radius_km=50",
        headers=headers,
    )
    assert res.status_code == 200, res.text
    items = res.json()
    coord_items = [i for i in items if i["distance_km"] is not None]
    names = [i["name"] for i in coord_items]
    assert names[0] == "Cảng A"
    assert names[1] == "Kho B"
    assert "Vùng xa" not in names
    distances = [i["distance_km"] for i in coord_items]
    assert distances == sorted(distances)


@pytest.mark.asyncio
async def test_nearby_null_coord_locations_appear_at_bottom(
    three_geo_locations, async_client, make_auth_headers,
):
    headers = await make_auth_headers("driver")
    res = await async_client.get(
        f"/api/v1/locations/nearby?lat={HAIPHONG[0]}&lng={HAIPHONG[1]}&radius_km=50",
        headers=headers,
    )
    items = res.json()
    nogps_idx = next(i for i, item in enumerate(items)
                     if item["name"] == "Địa điểm chưa có GPS")
    last_coord_idx = max(
        i for i, item in enumerate(items) if item["distance_km"] is not None
    )
    assert nogps_idx > last_coord_idx
    nogps = items[nogps_idx]
    assert nogps["distance_km"] is None
    assert nogps["lat"] is None
    assert nogps["lng"] is None


@pytest.mark.asyncio
async def test_nearby_q_filter_combined_with_distance(
    three_geo_locations, async_client, make_auth_headers,
):
    """`q` filters by name; remaining matches still get Haversine sort."""
    headers = await make_auth_headers("driver")
    res = await async_client.get(
        f"/api/v1/locations/nearby?lat={HAIPHONG[0]}&lng={HAIPHONG[1]}&q=cảng",
        headers=headers,
    )
    assert res.status_code == 200
    items = res.json()
    names = [i["name"] for i in items]
    assert "Cảng A" in names
    assert "Kho B" not in names


@pytest.mark.asyncio
async def test_nearby_trip_id_pins_pickup_and_dropoff_to_top(
    db_session, three_geo_locations, async_client, make_auth_headers,
):
    """When `trip_id` is given, the trip's pickup + dropoff appear first
    even if they are far away from the GPS point."""
    headers = await make_auth_headers("driver")
    locs = three_geo_locations
    partner = Client(
        code="ACME", name="Acme", phone="0900",
        is_active=True,
    )
    db_session.add(partner)
    await db_session.flush()
    trip = TripOrder(
        trip_date=date(2026, 5, 1),
        partner_id=partner.id,
        pickup_location_id=locs["far"].id,
        dropoff_location_id=locs["near"].id,
        unit_price=0,
        driver_salary=0,
        allowance=0,
        status=TripOrderStatus.DRAFT.value,
    )
    db_session.add(trip)
    await db_session.commit()

    res = await async_client.get(
        f"/api/v1/locations/nearby?lat={HAIPHONG[0]}&lng={HAIPHONG[1]}"
        f"&radius_km=50&trip_id={trip.id}",
        headers=headers,
    )
    assert res.status_code == 200
    items = res.json()
    names = [i["name"] for i in items]
    assert names[0] == "Vùng xa"
    assert names[1] == "Cảng A"
    assert items[0]["distance_km"] is not None and items[0]["distance_km"] > 50


@pytest.mark.asyncio
async def test_nearby_no_gps_returns_alphabetical(
    three_geo_locations, async_client, make_auth_headers,
):
    headers = await make_auth_headers("driver")
    res = await async_client.get("/api/v1/locations/nearby", headers=headers)
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 4
    assert all(i["distance_km"] is None for i in items)


@pytest.mark.asyncio
async def test_pin_creates_location_with_driver_pin_provenance(
    db_session, async_client, make_auth_headers,
):
    headers = await make_auth_headers("driver")
    res = await async_client.post(
        "/api/v1/locations/pin",
        json={
            "name": "Driver-pinned bãi xe",
            "lat": NEAR_2KM[0],
            "lng": NEAR_2KM[1],
        },
        headers=headers,
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["name"] == "Driver-pinned bãi xe"

    saved = (await db_session.execute(
        select(Location).where(Location.name == "Driver-pinned bãi xe")
    )).scalar_one()
    assert saved.lat == NEAR_2KM[0]
    assert saved.lng == NEAR_2KM[1]
    assert saved.geocode_source == "driver_pin"
    assert saved.pending_geocode is False
    assert saved.location_review_needed is True
    assert saved.created_via == "driver_pin"
    assert saved.created_by_id is not None


@pytest.mark.asyncio
async def test_pin_idempotent_on_existing_name_backfills_coords(
    db_session, async_client, make_auth_headers,
):
    headers = await make_auth_headers("driver")
    existing = Location(name="Bãi xe trùng tên", is_active=True, pending_geocode=True)
    db_session.add(existing)
    await db_session.commit()

    res = await async_client.post(
        "/api/v1/locations/pin",
        json={
            "name": "Bãi xe trùng tên",
            "lat": NEAR_2KM[0],
            "lng": NEAR_2KM[1],
        },
        headers=headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["id"] == existing.id

    await db_session.refresh(existing)
    assert existing.lat == NEAR_2KM[0]
    assert existing.lng == NEAR_2KM[1]
    assert existing.geocode_source == "driver_pin"
