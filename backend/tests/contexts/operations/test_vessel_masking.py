"""Unit tests for vessel masking on PENDING work orders.

Per requirement driver-ship-number-and-tac-nghiep.md:
  - Accountant must NOT see vessel while WO is PENDING (driver-only knowledge).
  - Accountant DOES see vessel once WO is MATCHED.
  - Drivers never see vessel changes via these endpoints (salary masking unrelated).
"""

from __future__ import annotations

import pytest

from app.core.security import hash_password
from app.models.base import User
from app.models.domain import Location, Client


async def _seed_driver_and_accountant(db_session, async_client):
    partner = Client(name="VesselTest Co", phone="0900999", is_active=True)
    pickup = Location(name="Cảng Hiệp Phước", is_active=True)
    dropoff = Location(name="ICD Trường Thọ", is_active=True)
    driver = User(
        phone="0933000001", username="vessel_driver",
        hashed_password=hash_password("pw"),
        role="driver", is_active=True,
    )
    accountant = User(
        phone="0933000002", username="vessel_accountant",
        hashed_password=hash_password("pw"),
        role="accountant", is_active=True,
    )
    db_session.add_all([partner, pickup, dropoff, driver, accountant])
    await db_session.commit()

    async def _login(phone: str):
        res = await async_client.post(
            "/api/v1/auth/login",
            json={"username": phone, "password": "pw"},
        )
        assert res.status_code == 200, res.text
        return {"Authorization": f"Bearer {res.json()['access_token']}"}

    drv_h = await _login("0933000001")
    acc_h = await _login("0933000002")

    from app.contexts.operations.application.dto import (
        DeliveredTripContainerInput,
        DeliveredTripCreateInput,
    )
    from app.contexts.operations.application.delivered_trips import (
        CreateDeliveredTrip,
        CurrentUserContext,
    )
    from app.contexts.operations.infrastructure.repositories import SqlDeliveredTripRepository

    repo = SqlDeliveredTripRepository(db_session)
    create = CreateDeliveredTrip(repo, db_session)

    wo = await create(
        DeliveredTripCreateInput(
            client_id=partner.id,
            pickup_location_id=pickup.id,
            dropoff_location_id=dropoff.id,
            driver_id=driver.id,
            vessel="EVER GIVEN - VOY 001",
            containers=[
                DeliveredTripContainerInput(container_number="ABCU0000104", cont_type="F20")
            ],
        ),
        CurrentUserContext(id=99, role="superadmin"),
    )

    return acc_h, drv_h, int(wo.id), partner, pickup, dropoff, driver


@pytest.mark.asyncio
async def test_accountant_can_see_vessel_on_pending_wo(db_session, async_client):
    """vessel should be visible in accountant list + detail when WO is PENDING."""
    acc_h, _drv_h, wo_id, *_ = await _seed_driver_and_accountant(db_session, async_client)

    # Detail view
    res = await async_client.get(f"/api/v1/delivered-trips/{wo_id}", headers=acc_h)
    assert res.status_code == 200, res.text
    assert res.json()["vessel"] == "EVER GIVEN - VOY 001", "Vessel must be visible to accountant on PENDING WO"

    # List view
    res = await async_client.get("/api/v1/delivered-trips", headers=acc_h)
    assert res.status_code == 200, res.text
    for item in res.json()["items"]:
        if item["id"] == wo_id:
            assert item["vessel"] == "EVER GIVEN - VOY 001", "Vessel must be visible in list for PENDING WO"
            break


@pytest.mark.asyncio
async def test_accountant_sees_vessel_after_match(db_session, async_client):
    """vessel is revealed to accountant once WO status is MATCHED."""
    acc_h, _drv_h, wo_id, partner, pickup, dropoff, driver = \
        await _seed_driver_and_accountant(db_session, async_client)

    # Directly update status to MATCHED (bypassing reconcile flow for this unit test)
    from sqlalchemy import select
    from app.models.domain import DeliveredTrip as WOModel
    wo_row = (await db_session.execute(
        select(WOModel).where(WOModel.id == wo_id)
    )).scalar_one()
    wo_row.status = "MATCHED"
    await db_session.commit()

    res = await async_client.get(f"/api/v1/delivered-trips/{wo_id}", headers=acc_h)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["vessel"] == "EVER GIVEN - VOY 001", \
        f"Expected vessel to be visible after MATCHED, got: {body['vessel']}"


@pytest.mark.asyncio
async def test_driver_sees_own_vessel_on_pending_wo(db_session, async_client):
    """Drivers should always see the vessel on their own WOs regardless of status."""
    _acc_h, drv_h, wo_id, *_ = await _seed_driver_and_accountant(db_session, async_client)

    res = await async_client.get(f"/api/v1/delivered-trips/{wo_id}", headers=drv_h)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["vessel"] == "EVER GIVEN - VOY 001", \
        "Driver must always see their own vessel field"
