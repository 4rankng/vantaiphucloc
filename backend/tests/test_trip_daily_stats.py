from datetime import date
import pytest
from app.models.domain import Client, Location, DeliveredTrip
from app.models.base import User
from app.core.security import hash_password


async def _seed_partner_locations_driver(db_session):
    partner = Client(
        code="ACME",
        name="Acme Corp",
        phone="0900",
        is_active=True,
    )
    pickup = Location(name="Cang Cat Lai", is_active=True)
    dropoff = Location(name="Kho Dong Nai", is_active=True)
    driver = User(
        phone="09000000002",
        username="driver_test",
        hashed_password=hash_password("p"),
        role="driver",
        is_active=True,
    )
    db_session.add_all([partner, pickup, dropoff, driver])
    await db_session.flush()
    await db_session.commit()
    return partner, pickup, dropoff, driver


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
async def test_get_trip_daily_stats_revenue(db_session, async_client):
    partner, pickup, dropoff, driver = await _seed_partner_locations_driver(db_session)
    headers = await _accountant_headers(db_session, async_client)

    # Create test trips with statuses and revenues
    t1 = DeliveredTrip(
        client_id=partner.id,
        pickup_location_id=pickup.id,
        dropoff_location_id=dropoff.id,
        driver_id=driver.id,
        trip_date=date(2026, 5, 10),
        revenue=1200000,
        booked_trip_id=1,
        work_type="F20",
    )
    t2 = DeliveredTrip(
        client_id=partner.id,
        pickup_location_id=pickup.id,
        dropoff_location_id=dropoff.id,
        driver_id=driver.id,
        trip_date=date(2026, 5, 11),
        revenue=800000,
        work_type="F20",
    )
    db_session.add_all([t1, t2])
    await db_session.commit()

    res = await async_client.get(
        "/api/v1/dashboard/trip-daily-stats",
        params={"date_from": "2026-05-01", "date_to": "2026-05-31"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total"] == 2
    assert data["matched"] == 1
    assert data["pending"] == 1
    assert data["total_revenue"] == 2000000  # 1.2M + 800K

    # Test with valid client filter
    res = await async_client.get(
        "/api/v1/dashboard/trip-daily-stats",
        params={
            "date_from": "2026-05-01",
            "date_to": "2026-05-31",
            "client_id": partner.id,
        },
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["total"] == 2

    # Test with invalid client filter
    res = await async_client.get(
        "/api/v1/dashboard/trip-daily-stats",
        params={"date_from": "2026-05-01", "date_to": "2026-05-31", "client_id": 99999},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["total"] == 0


async def _director_headers(db_session, async_client):
    phone = "09000000003"
    user = User(
        phone=phone,
        username="Director Test",
        hashed_password=hash_password("p"),
        role="director",
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
async def test_get_director_dashboard_revenue(db_session, async_client):
    from app.models.domain import Vehicle

    partner, pickup, dropoff, driver = await _seed_partner_locations_driver(db_session)
    headers = await _director_headers(db_session, async_client)

    driver.full_name = "Driver Test"
    db_session.add(driver)
    await db_session.commit()

    # Active vehicle to ensure _compute_vehicle_pnl_rows handles it
    veh = Vehicle(plate="15C12345", is_active=True)
    db_session.add(veh)
    await db_session.commit()

    # Create test trips with statuses and revenues:
    # 1. Unmatched (booked_trip_id is None)
    t1 = DeliveredTrip(
        client_id=partner.id,
        pickup_location_id=pickup.id,
        dropoff_location_id=dropoff.id,
        driver_id=driver.id,
        trip_date=date(2026, 5, 10),
        revenue=1200000,
        vehicle_plate="15C12345",
        work_type="F20",
    )
    # 2. Matched (booked_trip_id is not None)
    t2 = DeliveredTrip(
        client_id=partner.id,
        pickup_location_id=pickup.id,
        dropoff_location_id=dropoff.id,
        driver_id=driver.id,
        trip_date=date(2026, 5, 11),
        revenue=800000,
        vehicle_plate="15C12345",
        booked_trip_id=1,
        work_type="F20",
    )
    db_session.add_all([t1, t2])
    await db_session.commit()

    res = await async_client.get(
        "/api/v1/dashboard/director",
        params={"date_from": "2026-05-01", "date_to": "2026-05-31"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    # High-level counters
    assert data["total"] == 2
    assert data["matched"] == 1
    assert data["pending"] == 1
    assert data["revenue"] == 2000000
    assert data["avg_revenue_per_trip"] == 1000000


@pytest.mark.asyncio
async def test_get_director_dashboard_drilldown_groups_by_client_and_vehicle(
    db_session, async_client
):
    partner, pickup, dropoff, driver = await _seed_partner_locations_driver(db_session)
    headers = await _director_headers(db_session, async_client)

    driver.full_name = "Driver Test"
    db_session.add(driver)

    db_session.add_all(
        [
            DeliveredTrip(
                client_id=partner.id,
                pickup_location_id=pickup.id,
                dropoff_location_id=dropoff.id,
                driver_id=driver.id,
                trip_date=date(2026, 5, 10),
                revenue=1200000,
                driver_salary=300000,
                vehicle_plate="15C12345",
                booked_trip_id=1,
                work_type="F20",
            ),
            DeliveredTrip(
                client_id=partner.id,
                pickup_location_id=pickup.id,
                dropoff_location_id=dropoff.id,
                driver_id=driver.id,
                trip_date=date(2026, 5, 11),
                revenue=800000,
                driver_salary=200000,
                vehicle_plate="15C12345",
                booked_trip_id=None,
                work_type="F20",
            ),
        ]
    )
    await db_session.commit()

    res = await async_client.get(
        "/api/v1/dashboard/director/drilldown",
        params={"date_from": "2026-05-01", "date_to": "2026-05-31"},
        headers=headers,
    )

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["totals"]["total"] == 2
    assert data["totals"]["matched"] == 1
    assert data["totals"]["pending"] == 1
    assert data["totals"]["revenue"] == 2000000
    assert data["totals"]["cost"] == 500000
    assert data["totals"]["profit"] == 1500000

    assert data["clients"][0]["client_id"] == partner.id
    assert data["clients"][0]["client_name"] == "Acme Corp"
    assert data["clients"][0]["revenue"] == 2000000
    assert data["clients"][0]["cost"] == 500000
    assert data["clients"][0]["profit"] == 1500000
    assert data["clients"][0]["vehicles"] == [
        {
            "vehicle_plate": "15C12345",
            "trip_count": 2,
            "matched": 1,
            "pending": 1,
            "revenue": 2000000,
            "cost": 500000,
            "profit": 1500000,
        }
    ]
