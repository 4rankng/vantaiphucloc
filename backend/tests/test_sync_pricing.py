from datetime import date
import pytest
from app.models.domain import Client, Location, DeliveredTrip, RoutePricing
from app.models.base import User
from app.core.security import hash_password


async def _seed_test_data(db_session):
    client = Client(
        code="PAN",
        name="PAN CFS",
        phone="0901",
        is_active=True,
    )
    pickup = Location(name="PAN", is_active=True)
    dropoff = Location(name="HICT", is_active=True)
    driver = User(
        phone="09000000002",
        username="driver_test",
        hashed_password=hash_password("p"),
        role="driver",
        is_active=True,
    )
    db_session.add_all([client, pickup, dropoff, driver])
    await db_session.flush()

    # Route pricing
    pricing = RoutePricing(
        client_id=client.id,
        pickup_location_id=pickup.id,
        dropoff_location_id=dropoff.id,
        work_type="ĐÓNG KHO",
        f20_price=998000,
        f20_driver_salary=200000,
        is_active=True,
    )
    db_session.add(pricing)
    await db_session.flush()
    await db_session.commit()
    return client, pickup, dropoff, driver


async def _accountant_headers(db_session, async_client):
    phone = "09000000001"
    user = User(
        phone=phone,
        username="Accountant Test",
        hashed_password=hash_password("p"),
        role="accountant",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    res = await async_client.post(
        "/api/v1/auth/login",
        json={"username": phone, "password": "p"},
    )
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest.mark.asyncio
async def test_sync_matched_trips_pricing(db_session, async_client):
    client, pickup, dropoff, driver = await _seed_test_data(db_session)
    headers = await _accountant_headers(db_session, async_client)

    # 1. Matched trip (has booked_trip_id) but 0 pricing
    t1 = DeliveredTrip(
        client_id=client.id,
        pickup_location_id=pickup.id,
        dropoff_location_id=dropoff.id,
        driver_id=driver.id,
        trip_date=date(2026, 6, 1),
        revenue=0,
        driver_salary=0,
        booked_trip_id=999,
        work_type="ĐÓNG KHO",
        cont_type="F20",
    )

    # 2. Unmatched trip - should NOT be updated
    t2 = DeliveredTrip(
        client_id=client.id,
        pickup_location_id=pickup.id,
        dropoff_location_id=dropoff.id,
        driver_id=driver.id,
        trip_date=date(2026, 6, 2),
        revenue=0,
        driver_salary=0,
        booked_trip_id=None,
        work_type="ĐÓNG KHO",
        cont_type="F20",
    )

    db_session.add_all([t1, t2])
    await db_session.commit()

    # Call endpoint to sync pricing
    res = await async_client.post(
        "/api/v1/auto-match/sync-pricing",
        json={"date_from": "2026-06-01", "date_to": "2026-06-03"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["updated_count"] == 1

    # Refresh trips from DB
    await db_session.refresh(t1)
    await db_session.refresh(t2)

    # Matched trip must be updated
    assert t1.revenue == 998000
    assert t1.driver_salary == 200000

    # Unmatched trip must remain 0
    assert t2.revenue == 0
    assert t2.driver_salary == 0
