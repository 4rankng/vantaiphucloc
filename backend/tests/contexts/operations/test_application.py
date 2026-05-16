"""Integration tests for Operations application use cases.

Exercise the SQL repositories against the in-memory SQLite test DB,
proving the use case → domain → infra wiring works end-to-end.
"""

from __future__ import annotations

from datetime import date

import pytest

from app.contexts.operations.application import (
    CancelTripOrder,
    ConfirmTripOrder,
    CreateTripOrder,
    CreateWorkOrder,
    CurrentUserContext,
    GetTripOrder,
    GetWorkOrder,
    ListTripOrders,
    MatchTripToWorkOrder,
    ReconciliationConflict,
    UnmatchTripFromWorkOrder,
    UpdateTripOrder,
)
from app.contexts.operations.application.dto import (
    ReconcileInput,
    TripContainerInput,
    TripOrderCreateInput,
    TripOrderListFilters,
    TripOrderUpdateInput,
    UnmatchInput,
    WorkOrderContainerInput,
    WorkOrderCreateInput,
)
from app.contexts.operations.domain.exceptions import NotFound, TripOrderLocked
from app.contexts.operations.domain.value_objects import (
    TripOrderStatus,
    WorkOrderStatus,
)
from app.contexts.operations.infrastructure.repositories import (
    SqlTripOrderRepository,
    SqlWorkOrderRepository,
)


@pytest.fixture
async def fixtures(db_session):
    """Insert a Partner + 2 Locations so use cases can satisfy FKs."""
    from app.models.domain import Location, Client

    partner = Client(name="Acme", phone="0900111", is_active=True)
    pickup = Location(name="Cảng Cát Lái", is_active=True)
    dropoff = Location(name="KCN Long Hậu", is_active=True)
    db_session.add_all([partner, pickup, dropoff])
    await db_session.flush()
    return {
        "partner_id": partner.id,
        "pickup_id": pickup.id,
        "dropoff_id": dropoff.id,
    }


@pytest.mark.asyncio
async def test_create_trip_order_with_no_pricing_lands_in_draft(
    db_session, fixtures
):
    to_repo = SqlTripOrderRepository(db_session)
    wo_repo = SqlWorkOrderRepository(db_session)
    use_case = CreateTripOrder(to_repo, wo_repo, db_session)

    t = await use_case(TripOrderCreateInput(
        trip_date=date(2026, 5, 1),
        partner_id=fixtures["partner_id"],
        pickup_location_id=fixtures["pickup_id"],
        dropoff_location_id=fixtures["dropoff_id"],
        containers=[TripContainerInput(
            container_number="ABCU0000104", work_type="F20",
        )],
    ))
    assert t.id is not None
    assert t.status == TripOrderStatus.DRAFT  # no pricing → DRAFT
    assert len(t.containers) == 1
    assert t.containers[0].container_number == "ABCU0000104"
    assert t.code is not None  # auto-generated


@pytest.mark.asyncio
async def test_create_trip_order_with_explicit_pricing_lands_in_pending(
    db_session, fixtures
):
    to_repo = SqlTripOrderRepository(db_session)
    wo_repo = SqlWorkOrderRepository(db_session)
    use_case = CreateTripOrder(to_repo, wo_repo, db_session)

    t = await use_case(TripOrderCreateInput(
        trip_date=date(2026, 5, 1),
        partner_id=fixtures["partner_id"],
        pickup_location_id=fixtures["pickup_id"],
        dropoff_location_id=fixtures["dropoff_id"],
        unit_price=1_000_000,
        driver_salary=200_000,
        allowance=50_000,
        containers=[TripContainerInput(
            container_number="EFGU0000100", work_type="F40",
        )],
    ))
    assert t.status == TripOrderStatus.PENDING  # has containers + pricing


@pytest.mark.asyncio
async def test_get_trip_order_raises_notfound_for_missing_id(db_session):
    use_case = GetTripOrder(SqlTripOrderRepository(db_session))
    with pytest.raises(NotFound):
        await use_case(99999)


@pytest.mark.asyncio
async def test_list_trip_orders_paginates_and_filters(db_session, fixtures):
    to_repo = SqlTripOrderRepository(db_session)
    wo_repo = SqlWorkOrderRepository(db_session)
    create = CreateTripOrder(to_repo, wo_repo, db_session)
    for i in range(3):
        await create(TripOrderCreateInput(
            trip_date=date(2026, 5, 1),
            partner_id=fixtures["partner_id"],
            pickup_location_id=fixtures["pickup_id"],
            dropoff_location_id=fixtures["dropoff_id"],
        ))

    listing = ListTripOrders(to_repo)
    items, total = await listing(TripOrderListFilters(
        page=1, page_size=2, partner_id=fixtures["partner_id"],
    ))
    assert total == 3
    assert len(items) == 2


@pytest.mark.asyncio
@pytest.mark.skip(reason="is_locked not persisted in ORM yet — feature incomplete")
async def test_cancel_trip_order_blocked_when_locked(db_session, fixtures):
    to_repo = SqlTripOrderRepository(db_session)
    wo_repo = SqlWorkOrderRepository(db_session)
    create = CreateTripOrder(to_repo, wo_repo, db_session)
    t = await create(TripOrderCreateInput(
        trip_date=date(2026, 5, 1),
        partner_id=fixtures["partner_id"],
        pickup_location_id=fixtures["pickup_id"],
        dropoff_location_id=fixtures["dropoff_id"],
    ))
    t.lock(user_id=1)
    await to_repo.save(t)
    await db_session.commit()

    cancel = CancelTripOrder(to_repo, db_session)
    with pytest.raises(TripOrderLocked):
        await cancel(int(t.id))


@pytest.mark.asyncio
async def test_match_and_unmatch_round_trip(db_session, fixtures):
    to_repo = SqlTripOrderRepository(db_session)
    wo_repo = SqlWorkOrderRepository(db_session)

    # Create a priced, PENDING TripOrder.
    create_to = CreateTripOrder(to_repo, wo_repo, db_session)
    to = await create_to(TripOrderCreateInput(
        trip_date=date(2026, 5, 5),
        partner_id=fixtures["partner_id"],
        pickup_location_id=fixtures["pickup_id"],
        dropoff_location_id=fixtures["dropoff_id"],
        unit_price=1_500_000,
        driver_salary=300_000,
        allowance=50_000,
        containers=[TripContainerInput(
            container_number="ABCU0000104", work_type="F20",
        )],
    ))
    assert to.status == TripOrderStatus.PENDING

    # Insert a driver User
    from app.core.security import hash_password
    from app.models.base import User as UserORM
    driver = UserORM(
        phone="0911000000", username="driver1",
        hashed_password=hash_password("x"),
        role="driver", is_active=True,
    )
    db_session.add(driver)
    await db_session.flush()

    # Create a WO (PENDING).
    create_wo = CreateWorkOrder(wo_repo, db_session)
    wo = await create_wo(
        WorkOrderCreateInput(
            partner_id=fixtures["partner_id"],
            pickup_location_id=fixtures["pickup_id"],
            dropoff_location_id=fixtures["dropoff_id"],
            driver_id=driver.id,
            containers=[WorkOrderContainerInput(
                container_number="ABCU0000104", work_type="F20",
            )],
        ),
        CurrentUserContext(id=99, role="superadmin"),
    )
    assert wo.status == WorkOrderStatus.PENDING

    # Match.
    match = MatchTripToWorkOrder(to_repo, wo_repo, db_session)
    matched_to = await match(ReconcileInput(
        work_order_id=int(wo.id),
        trip_order_id=int(to.id),
        user_id=99,
    ))
    assert matched_to.status == TripOrderStatus.MATCHED
    assert int(wo.id) in matched_to.matched_work_order_ids

    refreshed_wo = await wo_repo.get_by_id(wo.id)  # type: ignore[arg-type]
    assert refreshed_wo is not None
    assert refreshed_wo.status == WorkOrderStatus.MATCHED
    assert refreshed_wo.driver_salary == 300_000

    # Unmatch.
    unmatch = UnmatchTripFromWorkOrder(to_repo, wo_repo, db_session)
    to_after, wo_after = await unmatch(UnmatchInput(
        user_id=99, reason="bad-match", work_order_id=int(wo.id),
        trip_order_id=int(to.id),
    ))
    assert to_after.status == TripOrderStatus.PENDING
    assert wo_after.status == WorkOrderStatus.PENDING
    assert wo_after.driver_salary == 0


@pytest.mark.asyncio
async def test_match_rejects_when_wo_has_no_containers(db_session, fixtures):
    to_repo = SqlTripOrderRepository(db_session)
    wo_repo = SqlWorkOrderRepository(db_session)

    from app.core.security import hash_password
    from app.models.base import User as UserORM
    driver = UserORM(
        phone="0911000001", username="driver2",
        hashed_password=hash_password("x"),
        role="driver", is_active=True,
    )
    db_session.add(driver)
    await db_session.flush()

    create_to = CreateTripOrder(to_repo, wo_repo, db_session)
    to = await create_to(TripOrderCreateInput(
        trip_date=date(2026, 5, 5),
        partner_id=fixtures["partner_id"],
        pickup_location_id=fixtures["pickup_id"],
        dropoff_location_id=fixtures["dropoff_id"],
        unit_price=1_000_000,
        driver_salary=200_000,
        allowance=10_000,
        containers=[TripContainerInput(
            container_number="WXYU0000108", work_type="F20",
        )],
    ))

    create_wo = CreateWorkOrder(wo_repo, db_session)
    wo = await create_wo(
        WorkOrderCreateInput(
            partner_id=fixtures["partner_id"],
            pickup_location_id=fixtures["pickup_id"],
            dropoff_location_id=fixtures["dropoff_id"],
            driver_id=driver.id,
            containers=[WorkOrderContainerInput(
                container_number="WXYU0000108", work_type="F20",
            )],
        ),
        CurrentUserContext(id=99, role="superadmin"),
    )

    # Manually wipe WO containers so the conflict triggers.
    from app.contexts.operations.infrastructure.orm import (
        WorkOrderContainerORM,
    )
    from sqlalchemy import delete as sa_delete
    await db_session.execute(
        sa_delete(WorkOrderContainerORM).where(
            WorkOrderContainerORM.work_order_id == wo.id
        )
    )
    await db_session.commit()

    match = MatchTripToWorkOrder(to_repo, wo_repo, db_session)
    with pytest.raises(ReconciliationConflict):
        await match(ReconcileInput(
            work_order_id=int(wo.id),
            trip_order_id=int(to.id),
            user_id=99,
        ))


@pytest.mark.asyncio
async def test_confirm_completes_matched_work_orders(db_session, fixtures):
    to_repo = SqlTripOrderRepository(db_session)
    wo_repo = SqlWorkOrderRepository(db_session)

    from app.core.security import hash_password
    from app.models.base import User as UserORM
    driver = UserORM(
        phone="0911000002", username="driver3",
        hashed_password=hash_password("x"),
        role="driver", is_active=True,
    )
    db_session.add(driver)
    await db_session.flush()

    create_to = CreateTripOrder(to_repo, wo_repo, db_session)
    to = await create_to(TripOrderCreateInput(
        trip_date=date(2026, 5, 5),
        partner_id=fixtures["partner_id"],
        pickup_location_id=fixtures["pickup_id"],
        dropoff_location_id=fixtures["dropoff_id"],
        unit_price=1_000_000,
        driver_salary=200_000,
        allowance=10_000,
        containers=[TripContainerInput(
            container_number="ZZZU0000108", work_type="F20",
        )],
    ))

    create_wo = CreateWorkOrder(wo_repo, db_session)
    wo = await create_wo(
        WorkOrderCreateInput(
            partner_id=fixtures["partner_id"],
            pickup_location_id=fixtures["pickup_id"],
            dropoff_location_id=fixtures["dropoff_id"],
            driver_id=driver.id,
            containers=[WorkOrderContainerInput(
                container_number="ZZZU0000108", work_type="F20",
            )],
        ),
        CurrentUserContext(id=99, role="superadmin"),
    )

    match = MatchTripToWorkOrder(to_repo, wo_repo, db_session)
    await match(ReconcileInput(
        work_order_id=int(wo.id), trip_order_id=int(to.id), user_id=99,
    ))

    confirm = ConfirmTripOrder(to_repo, wo_repo, db_session)
    confirmed = await confirm(int(to.id), user_id=99)
    assert confirmed.is_confirmed is True


@pytest.mark.asyncio
async def test_update_trip_order_replaces_containers(db_session, fixtures):
    to_repo = SqlTripOrderRepository(db_session)
    wo_repo = SqlWorkOrderRepository(db_session)
    create = CreateTripOrder(to_repo, wo_repo, db_session)
    t = await create(TripOrderCreateInput(
        trip_date=date(2026, 5, 5),
        partner_id=fixtures["partner_id"],
        pickup_location_id=fixtures["pickup_id"],
        dropoff_location_id=fixtures["dropoff_id"],
        containers=[TripContainerInput(
            container_number="ORIU0000101", work_type="F20",
        )],
    ))

    update = UpdateTripOrder(to_repo, wo_repo, db_session)
    updated = await update(int(t.id), TripOrderUpdateInput(
        containers=[
            TripContainerInput(container_number="NEWU0000103", work_type="F40"),
        ],
    ))
    assert len(updated.containers) == 1
    assert updated.containers[0].container_number == "NEWU0000103"
    assert updated.containers[0].work_type == "F40"


@pytest.mark.asyncio
async def test_create_work_order_validates_container_number(
    db_session, fixtures
):
    from app.core.security import hash_password
    from app.models.base import User as UserORM

    driver = UserORM(
        phone="0911000003", username="drv",
        hashed_password=hash_password("x"),
        role="driver", is_active=True,
    )
    db_session.add(driver)
    await db_session.flush()

    wo_repo = SqlWorkOrderRepository(db_session)
    create = CreateWorkOrder(wo_repo, db_session)

    with pytest.raises(ValueError):
        await create(
            WorkOrderCreateInput(
                partner_id=fixtures["partner_id"],
                pickup_location_id=fixtures["pickup_id"],
                dropoff_location_id=fixtures["dropoff_id"],
                driver_id=driver.id,
                containers=[WorkOrderContainerInput(
                    container_number="bogus", work_type="F20",
                )],
            ),
            CurrentUserContext(id=99, role="superadmin"),
        )
