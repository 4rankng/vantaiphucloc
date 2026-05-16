"""HTTP-level driver isolation tests on work-orders read endpoints.

A driver must only ever see their own WorkOrders, regardless of any
caller-supplied driver_id filter. Cross-driver GET must surface as 404
to avoid leaking the existence of another driver's record.
"""

from __future__ import annotations

import pytest

from app.core.security import hash_password
from app.models.base import User
from app.models.domain import Location, Client


async def _seed_two_drivers_with_wos(db_session, async_client):
    """Create driver A + driver B, each owning one WorkOrder.

    Returns (driver_a_headers, driver_b_headers, wo_a_id, wo_b_id).
    """
    partner = Client(name="Acme", phone="0900111", is_active=True)
    pickup = Location(name="Cảng Cát Lái", is_active=True)
    dropoff = Location(name="KCN Long Hậu", is_active=True)
    drv_a = User(
        phone="0911111111", username="drv_a",
        hashed_password=hash_password("p"),
        role="driver", is_active=True,
    )
    drv_b = User(
        phone="0922222222", username="drv_b",
        hashed_password=hash_password("p"),
        role="driver", is_active=True,
    )
    db_session.add_all([partner, pickup, dropoff, drv_a, drv_b])
    await db_session.commit()

    from app.contexts.operations.application.dto import (
        WorkOrderContainerInput, WorkOrderCreateInput,
    )
    from app.contexts.operations.application.work_orders import (
        CreateWorkOrder, CurrentUserContext,
    )
    from app.contexts.operations.infrastructure.repositories import (
        SqlWorkOrderRepository,
    )

    repo = SqlWorkOrderRepository(db_session)
    create = CreateWorkOrder(repo, db_session)

    wo_a = await create(
        WorkOrderCreateInput(
            partner_id=partner.id,
            pickup_location_id=pickup.id, dropoff_location_id=dropoff.id,
            driver_id=drv_a.id,
            containers=[WorkOrderContainerInput(
                container_number="ABCU0000104", work_type="F20",
            )],
        ),
        CurrentUserContext(id=99, role="superadmin"),
    )
    wo_b = await create(
        WorkOrderCreateInput(
            partner_id=partner.id,
            pickup_location_id=pickup.id, dropoff_location_id=dropoff.id,
            driver_id=drv_b.id,
            containers=[WorkOrderContainerInput(
                container_number="EFGU0000100", work_type="F40",
            )],
        ),
        CurrentUserContext(id=99, role="superadmin"),
    )

    async def _login(phone):
        res = await async_client.post(
            "/api/v1/auth/login",
            json={"username": phone, "password": "p"},
        )
        assert res.status_code == 200, res.text
        return {"Authorization": f"Bearer {res.json()['access_token']}"}

    return (
        await _login("0911111111"),
        await _login("0922222222"),
        int(wo_a.id),
        int(wo_b.id),
    )


@pytest.mark.asyncio
async def test_driver_listing_with_other_driver_filter_returns_only_own(
    db_session, async_client,
):
    a_headers, b_headers, wo_a_id, wo_b_id = (
        await _seed_two_drivers_with_wos(db_session, async_client)
    )

    # Driver A asks for driver B's WOs explicitly — server must override
    # the filter back to A and return only A's WO.
    res = await async_client.get(
        f"/api/v1/work-orders?driver_id={wo_b_id}",
        headers=a_headers,
    )
    assert res.status_code == 200, res.text
    body = res.json()
    ids = [item["id"] for item in body["items"]]
    assert wo_a_id in ids
    assert wo_b_id not in ids


@pytest.mark.asyncio
async def test_driver_get_other_driver_work_order_returns_404(
    db_session, async_client,
):
    a_headers, _b_headers, _wo_a_id, wo_b_id = (
        await _seed_two_drivers_with_wos(db_session, async_client)
    )

    res = await async_client.get(
        f"/api/v1/work-orders/{wo_b_id}",
        headers=a_headers,
    )
    assert res.status_code == 404, res.text
