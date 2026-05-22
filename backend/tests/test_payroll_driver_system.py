"""Integration tests for the driver payroll system (2026-05-13).

Covers three new features added in this PR:
  1. Driver base salary (DriverSalaryConfig append-only history)
  2. Monthly P&L (revenue, total wages, profit)
  3. Customer reconciliation imports (parsed-row scaffolding)

All tests use the in-memory SQLite test DB from ``conftest.py``.
"""

from __future__ import annotations

from datetime import date

import pytest

from app.core.security import hash_password
from app.models.base import User
from app.models.domain import (
    Client,
    Location,
    Partner,
    BookedTrip,
    BookedTripContainer,
    Vehicle,
    DeliveredTrip,
    DeliveredTripContainer,
)

pytestmark = pytest.mark.asyncio


async def _seed_partner_locations_driver(db_session):
    partner = Client(name="ACME Co.", is_active=True)
    pickup = Location(name="Cảng Cát Lái", is_active=True)
    dropoff = Location(name="KCN Long Hậu", is_active=True)
    driver = User(
        phone="0911111111",
        username="Driver A",
        hashed_password=hash_password("p"),
        role="driver",
        is_active=True,
    )
    db_session.add_all([partner, pickup, dropoff, driver])
    await db_session.flush()
    vehicle = Vehicle(plate="51C-12345", driver_id=driver.id, is_active=True)
    db_session.add(vehicle)
    await db_session.commit()
    return partner, pickup, dropoff, driver


async def _accountant_headers(db_session, async_client, suffix: str = "1"):
    phone = f"0900{suffix.rjust(7, '0')}"
    user = User(
        phone=phone,
        username=f"Accountant {suffix}",
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
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}, user.id


# ---------------------------------------------------------------------------
# Phase 1 — Base salary CRUD + earnings integration
# ---------------------------------------------------------------------------


async def test_set_and_list_driver_base_salary(db_session, async_client):
    _, _, _, driver = await _seed_partner_locations_driver(db_session)
    headers, _ = await _accountant_headers(db_session, async_client)

    # Initially: empty history
    res = await async_client.get(
        f"/api/v1/salary/drivers/{driver.id}/base-salary", headers=headers
    )
    assert res.status_code == 200
    assert res.json() == []

    # Set first rate
    res = await async_client.post(
        f"/api/v1/salary/drivers/{driver.id}/base-salary",
        json={
            "base_salary": 8_000_000,
            "effective_from": "2026-01-01",
            "note": "Mức khởi điểm",
        },
        headers=headers,
    )
    assert res.status_code == 201, res.text
    first = res.json()
    assert first["base_salary"] == 8_000_000
    assert first["effective_from"] == "2026-01-01"

    # Raise effective 2026-04-01
    res = await async_client.post(
        f"/api/v1/salary/drivers/{driver.id}/base-salary",
        json={"base_salary": 9_500_000, "effective_from": "2026-04-01"},
        headers=headers,
    )
    assert res.status_code == 201, res.text

    # History returns latest first
    res = await async_client.get(
        f"/api/v1/salary/drivers/{driver.id}/base-salary", headers=headers
    )
    assert res.status_code == 200
    history = res.json()
    assert len(history) == 2
    assert history[0]["effective_from"] == "2026-04-01"
    assert history[0]["base_salary"] == 9_500_000
    assert history[1]["base_salary"] == 8_000_000


async def test_set_base_salary_is_idempotent_on_effective_date(
    db_session, async_client
):
    _, _, _, driver = await _seed_partner_locations_driver(db_session)
    headers, _ = await _accountant_headers(db_session, async_client)

    await async_client.post(
        f"/api/v1/salary/drivers/{driver.id}/base-salary",
        json={"base_salary": 8_000_000, "effective_from": "2026-01-01"},
        headers=headers,
    )
    # Re-post same effective_from: should overwrite not duplicate
    res = await async_client.post(
        f"/api/v1/salary/drivers/{driver.id}/base-salary",
        json={"base_salary": 8_500_000, "effective_from": "2026-01-01"},
        headers=headers,
    )
    assert res.status_code == 201

    res = await async_client.get(
        f"/api/v1/salary/drivers/{driver.id}/base-salary", headers=headers
    )
    history = res.json()
    assert len(history) == 1
    assert history[0]["base_salary"] == 8_500_000


async def test_driver_earnings_includes_base_salary_effective_at_end_date(
    db_session, async_client
):
    partner, pickup, dropoff, driver = await _seed_partner_locations_driver(
        db_session
    )
    headers, _ = await _accountant_headers(db_session, async_client)

    # Base salary 8M from Jan 1, then 10M from May 1.
    for amount, eff in [(8_000_000, "2026-01-01"), (10_000_000, "2026-05-01")]:
        await async_client.post(
            f"/api/v1/salary/drivers/{driver.id}/base-salary",
            json={"base_salary": amount, "effective_from": eff},
            headers=headers,
        )

    # Period ending 2026-04-30 → still 8M
    res = await async_client.get(
        f"/api/v1/salary/earnings/{driver.id}",
        params={"start_date": "2026-04-01", "end_date": "2026-04-30"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["base_salary"] == 8_000_000

    # Period ending 2026-05-15 → 10M is now effective
    res = await async_client.get(
        f"/api/v1/salary/earnings/{driver.id}",
        params={"start_date": "2026-04-26", "end_date": "2026-05-25"},
        headers=headers,
    )
    body = res.json()
    assert body["base_salary"] == 10_000_000
    # total_earnings adds base on top of salary/allowance (all 0 here)
    assert body["total_earnings"] == 10_000_000


async def test_driver_earnings_base_salary_is_zero_when_unconfigured(
    db_session, async_client
):
    _, _, _, driver = await _seed_partner_locations_driver(db_session)
    headers, _ = await _accountant_headers(db_session, async_client)

    res = await async_client.get(
        f"/api/v1/salary/earnings/{driver.id}",
        params={"start_date": "2026-01-01", "end_date": "2026-01-31"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["base_salary"] == 0


# ---------------------------------------------------------------------------
# Phase 2 — Monthly P&L (revenue, wages, profit)
# ---------------------------------------------------------------------------


async def _create_matched_trip(
    db_session,
    *,
    client_id: int,
    pickup_id: int,
    dropoff_id: int,
    trip_date: date,
    revenue: int,
    container_numbers: list[str],
    cont_type: str = "F20",
):
    to = BookedTrip(
        client_id=client_id,
        pickup_location_id=pickup_id,
        dropoff_location_id=dropoff_id,
        trip_date=trip_date,
        work_type=cont_type,
        revenue=revenue,
        status="MATCHED",
    )
    db_session.add(to)
    await db_session.flush()
    for cn in container_numbers:
        db_session.add(
            BookedTripContainer(
                booked_trip_id=to.id,
                container_number=cn,
                cont_type=cont_type,
            )
        )
    await db_session.commit()
    return to


async def _create_matched_wo(
    db_session,
    *,
    client_id: int,
    pickup_id: int,
    dropoff_id: int,
    driver_id: int,
    trip_date: date,
    driver_salary: int,
    allowance: int,
    revenue: int = 0,
    container_number: str,
    cont_type: str = "F20",
):
    wo = DeliveredTrip(
        client_id=client_id,
        pickup_location_id=pickup_id,
        dropoff_location_id=dropoff_id,
        driver_id=driver_id,
        trip_date=trip_date,
        work_type=cont_type,
        revenue=revenue,
        driver_salary=driver_salary,
        allowance=allowance,
        status="MATCHED",
    )
    db_session.add(wo)
    await db_session.flush()
    db_session.add(
        DeliveredTripContainer(
            delivered_trip_id=wo.id, container_number=container_number, cont_type=cont_type
        )
    )
    await db_session.commit()
    return wo


async def test_monthly_pnl_revenue_uses_unit_price_times_container_count(
    db_session, async_client
):
    partner, pickup, dropoff, driver = await _seed_partner_locations_driver(
        db_session
    )
    headers, _ = await _accountant_headers(db_session, async_client)

    # 5,000,000 + 3,000,000 = 8,000,000
    await _create_matched_trip(
        db_session,
        client_id=partner.id,
        pickup_id=pickup.id,
        dropoff_id=dropoff.id,
        trip_date=date(2026, 5, 5),
        revenue=5_000_000,
        container_numbers=["ABCU1000001", "ABCU1000002"],
    )
    await _create_matched_trip(
        db_session,
        client_id=partner.id,
        pickup_id=pickup.id,
        dropoff_id=dropoff.id,
        trip_date=date(2026, 5, 10),
        revenue=3_000_000,
        container_numbers=["ABCU1000003"],
    )
    # A PENDING TO must not contribute
    await _create_matched_trip(
        db_session,
        client_id=partner.id,
        pickup_id=pickup.id,
        dropoff_id=dropoff.id,
        trip_date=date(2026, 5, 12),
        revenue=9_999_999,
        container_numbers=["ABCU1000099"],
    )
    pending_to = (
        await db_session.execute(
            __import__("sqlalchemy").select(BookedTrip).where(
                BookedTrip.revenue == 9_999_999
            )
        )
    ).scalar_one()
    pending_to.status = "PENDING"
    await db_session.commit()

    res = await async_client.get(
        "/api/v1/salary/pnl",
        params={"start_date": "2026-05-01", "end_date": "2026-05-31"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["revenue"] == 8_000_000
    assert body["matched_trip_count"] == 2
    assert len(body["client_breakdown"]) == 1
    assert body["client_breakdown"][0]["revenue"] == 8_000_000


async def test_monthly_pnl_subtracts_base_productivity_allowance(
    db_session, async_client
):
    partner, pickup, dropoff, driver = await _seed_partner_locations_driver(
        db_session
    )
    headers, _ = await _accountant_headers(db_session, async_client)

    # Revenue: 1 container × 10M
    await _create_matched_trip(
        db_session,
        client_id=partner.id,
        pickup_id=pickup.id,
        dropoff_id=dropoff.id,
        trip_date=date(2026, 5, 10),
        revenue=10_000_000,
        container_numbers=["XYZU2000001"],
    )

    # Driver had a MATCHED WO with 2M productivity + 200k allowance
    await _create_matched_wo(
        db_session,
        client_id=partner.id,
        pickup_id=pickup.id,
        dropoff_id=dropoff.id,
        driver_id=driver.id,
        trip_date=date(2026, 5, 10),
        driver_salary=2_000_000,
        allowance=200_000,
        container_number="XYZU2000001",
    )

    # Base salary 8M effective Jan 1
    await async_client.post(
        f"/api/v1/salary/drivers/{driver.id}/base-salary",
        json={"base_salary": 8_000_000, "effective_from": "2026-01-01"},
        headers=headers,
    )

    res = await async_client.get(
        "/api/v1/salary/pnl",
        params={"start_date": "2026-05-01", "end_date": "2026-05-31"},
        headers=headers,
    )
    body = res.json()
    assert body["revenue"] == 10_000_000
    assert body["total_productivity_salary"] == 2_000_000
    assert body["total_allowance"] == 200_000
    assert body["total_base_salary"] == 8_000_000
    # Profit = 10M − (8M + 2M + 200k) = −200,000
    assert body["profit"] == -200_000


async def test_monthly_pnl_partner_breakdown_sorted_by_revenue(
    db_session, async_client
):
    _, pickup, dropoff, driver = await _seed_partner_locations_driver(db_session)
    headers, _ = await _accountant_headers(db_session, async_client)

    # Two partners, partner B has higher revenue
    partner_a = Client(name="A Corp", is_active=True)
    partner_b = Client(name="B Corp", is_active=True)
    db_session.add_all([partner_a, partner_b])
    await db_session.commit()

    await _create_matched_trip(
        db_session,
        client_id=partner_a.id,
        pickup_id=pickup.id,
        dropoff_id=dropoff.id,
        trip_date=date(2026, 5, 5),
        revenue=2_000_000,
        container_numbers=["AAAU0000001"],
    )
    await _create_matched_trip(
        db_session,
        client_id=partner_b.id,
        pickup_id=pickup.id,
        dropoff_id=dropoff.id,
        trip_date=date(2026, 5, 8),
        revenue=5_000_000,
        container_numbers=["BBBU0000001", "BBBU0000002"],
    )

    res = await async_client.get(
        "/api/v1/salary/pnl",
        params={"start_date": "2026-05-01", "end_date": "2026-05-31"},
        headers=headers,
    )
    body = res.json()
    names = [p["client_name"] for p in body["client_breakdown"]]
    assert names == ["B Corp", "A Corp"]
    assert body["client_breakdown"][0]["revenue"] == 5_000_000
    assert body["client_breakdown"][1]["revenue"] == 2_000_000


# ---------------------------------------------------------------------------
# Phase 3 — Customer reconciliation imports
# ---------------------------------------------------------------------------


async def _seed_trip_for_recon(db_session, client_id, pickup_id, dropoff_id):
    """Create one BookedTrip we can resolve against in recon tests."""
    to = await _create_matched_trip(
        db_session,
        client_id=client_id,
        pickup_id=pickup_id,
        dropoff_id=dropoff_id,
        trip_date=date(2026, 5, 10),
        revenue=5_000_000,
        container_numbers=["HLBU1234567"],
    )
    return to


async def test_customer_recon_preview_resolves_rows_against_booked_trips(
    db_session, async_client
):
    partner, pickup, dropoff, _ = await _seed_partner_locations_driver(db_session)
    headers, _ = await _accountant_headers(db_session, async_client)
    to = await _seed_trip_for_recon(db_session, partner.id, pickup.id, dropoff.id)

    res = await async_client.post(
        "/api/v1/reconcile/customer-files/preview",
        json={
            "client_id": partner.id,
            "period_start": "2026-05-01",
            "period_end": "2026-05-31",
            "source_filename": "khachA-thang5.xlsx",
            "rows": [
                {
                    "container_number": "HLBU1234567",
                    "trip_date": "2026-05-10",
                    "customer_status": "MATCHED",
                },
                {
                    "container_number": "UNKNOWN9999",
                    "trip_date": "2026-05-10",
                    "customer_status": "REJECTED",
                    "customer_note": "Không nhận chuyến này",
                },
            ],
        },
        headers=headers,
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["status"] == "PARSED"
    assert body["client_name"] == "ACME Co."
    assert body["summary"]["total"] == 2
    assert body["summary"]["matched"] == 1
    assert body["summary"]["rejected"] == 1
    assert body["summary"]["resolved"] == 1
    assert body["summary"]["unresolved"] == 1

    rows = body["rows"]
    assert len(rows) == 2
    resolved = next(r for r in rows if r["container_number"] == "HLBU1234567")
    assert resolved["resolved_booked_trip_id"] == to.id
    assert resolved["apply_status"] == "PENDING"
    unresolved = next(r for r in rows if r["container_number"] == "UNKNOWN9999")
    assert unresolved["resolved_booked_trip_id"] is None
    assert unresolved["apply_status"] == "UNRESOLVED"


async def test_customer_recon_preview_rejects_invalid_status(
    db_session, async_client
):
    partner, _, _, _ = await _seed_partner_locations_driver(db_session)
    headers, _ = await _accountant_headers(db_session, async_client)

    res = await async_client.post(
        "/api/v1/reconcile/customer-files/preview",
        json={
            "client_id": partner.id,
            "period_start": "2026-05-01",
            "period_end": "2026-05-31",
            "rows": [
                {
                    "container_number": "AAAU0000001",
                    "customer_status": "INVALID_VALUE",
                }
            ],
        },
        headers=headers,
    )
    assert res.status_code == 422  # pydantic regex validation


async def test_customer_recon_commit_marks_import_applied(
    db_session, async_client
):
    partner, pickup, dropoff, _ = await _seed_partner_locations_driver(db_session)
    headers, _ = await _accountant_headers(db_session, async_client)
    await _seed_trip_for_recon(db_session, partner.id, pickup.id, dropoff.id)

    res = await async_client.post(
        "/api/v1/reconcile/customer-files/preview",
        json={
            "client_id": partner.id,
            "period_start": "2026-05-01",
            "period_end": "2026-05-31",
            "rows": [
                {
                    "container_number": "HLBU1234567",
                    "trip_date": "2026-05-10",
                    "customer_status": "MATCHED",
                }
            ],
        },
        headers=headers,
    )
    import_id = res.json()["id"]

    res = await async_client.post(
        f"/api/v1/reconcile/customer-files/{import_id}/commit",
        headers=headers,
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["status"] == "APPLIED"
    assert body["applied_at"] is not None
    assert body["rows"][0]["apply_status"] == "APPLIED"

    # Second commit must 409
    res = await async_client.post(
        f"/api/v1/reconcile/customer-files/{import_id}/commit",
        headers=headers,
    )
    assert res.status_code == 409


async def test_customer_recon_list_and_get(db_session, async_client):
    partner, pickup, dropoff, _ = await _seed_partner_locations_driver(db_session)
    headers, _ = await _accountant_headers(db_session, async_client)
    await _seed_trip_for_recon(db_session, partner.id, pickup.id, dropoff.id)

    # Create two imports
    for fname in ("imp1.xlsx", "imp2.xlsx"):
        await async_client.post(
            "/api/v1/reconcile/customer-files/preview",
            json={
                "client_id": partner.id,
                "period_start": "2026-05-01",
                "period_end": "2026-05-31",
                "source_filename": fname,
                "rows": [
                    {
                        "container_number": "HLBU1234567",
                        "trip_date": "2026-05-10",
                        "customer_status": "MATCHED",
                    }
                ],
            },
            headers=headers,
        )

    res = await async_client.get(
        "/api/v1/reconcile/customer-files", headers=headers
    )
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 2
    # Latest first
    assert items[0]["source_filename"] == "imp2.xlsx"
    # List view doesn't include row detail
    assert items[0]["rows"] == []

    # Detail endpoint returns rows
    detail = await async_client.get(
        f"/api/v1/reconcile/customer-files/{items[0]['id']}", headers=headers
    )
    assert detail.status_code == 200
    assert len(detail.json()["rows"]) == 1


async def test_customer_recon_404_on_missing_import(db_session, async_client):
    headers, _ = await _accountant_headers(db_session, async_client)
    res = await async_client.get(
        "/api/v1/reconcile/customer-files/99999", headers=headers
    )
    assert res.status_code == 404
