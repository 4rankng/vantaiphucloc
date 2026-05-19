"""Integration tests for Operations application use cases.

Exercise the SQL repositories against the in-memory SQLite test DB,
proving the use case → domain → infra wiring works end-to-end.
"""

from __future__ import annotations

from datetime import date

import pytest

from app.contexts.operations.application import (
    CancelBookedTrip,
    ConfirmBookedTrip,
    CreateBookedTrip,
    CreateDeliveredTrip,
    CurrentUserContext,
    GetBookedTrip,
    GetDeliveredTrip,
    ListBookedTrips,
    MatchTripToDeliveredTrip,
    ReconciliationConflict,
    UnmatchTripFromDeliveredTrip,
    UpdateBookedTrip,
)
from app.contexts.operations.application.dto import (
    ReconcileInput,
    TripContainerInput,
    BookedTripCreateInput,
    BookedTripListFilters,
    BookedTripUpdateInput,
    UnmatchInput,
    DeliveredTripContainerInput,
    DeliveredTripCreateInput,
)
from app.contexts.operations.domain.exceptions import NotFound, BookedTripLocked
from app.contexts.operations.domain.value_objects import (
    BookedTripStatus,
    DeliveredTripStatus,
)
from app.contexts.operations.infrastructure.repositories import (
    SqlBookedTripRepository,
    SqlDeliveredTripRepository,
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
async def test_create_booked_trip_with_no_pricing_lands_in_draft(
    db_session, fixtures
):
    booked_trip_repo = SqlBookedTripRepository(db_session)
    delivered_trip_repo = SqlDeliveredTripRepository(db_session)
    use_case = CreateBookedTrip(booked_trip_repo, delivered_trip_repo, db_session)

    t = await use_case(BookedTripCreateInput(
        trip_date=date(2026, 5, 1),
        partner_id=fixtures["partner_id"],
        pickup_location_id=fixtures["pickup_id"],
        dropoff_location_id=fixtures["dropoff_id"],
        containers=[TripContainerInput(
            container_number="ABCU0000104", work_type="F20",
        )],
    ))
    assert t.id is not None
    assert t.status == BookedTripStatus.DRAFT  # no pricing → DRAFT
    assert len(t.containers) == 1
    assert t.containers[0].container_number == "ABCU0000104"
    assert t.code is not None  # auto-generated


@pytest.mark.asyncio
async def test_create_booked_trip_with_explicit_pricing_lands_in_pending(
    db_session, fixtures
):
    booked_trip_repo = SqlBookedTripRepository(db_session)
    delivered_trip_repo = SqlDeliveredTripRepository(db_session)
    use_case = CreateBookedTrip(booked_trip_repo, delivered_trip_repo, db_session)

    t = await use_case(BookedTripCreateInput(
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
    assert t.status == BookedTripStatus.PENDING  # has containers + pricing


@pytest.mark.asyncio
async def test_get_booked_trip_raises_notfound_for_missing_id(db_session):
    use_case = GetBookedTrip(SqlBookedTripRepository(db_session))
    with pytest.raises(NotFound):
        await use_case(99999)


@pytest.mark.asyncio
async def test_list_booked_trips_paginates_and_filters(db_session, fixtures):
    booked_trip_repo = SqlBookedTripRepository(db_session)
    delivered_trip_repo = SqlDeliveredTripRepository(db_session)
    create = CreateBookedTrip(booked_trip_repo, delivered_trip_repo, db_session)
    for i in range(3):
        await create(BookedTripCreateInput(
            trip_date=date(2026, 5, 1),
            partner_id=fixtures["partner_id"],
            pickup_location_id=fixtures["pickup_id"],
            dropoff_location_id=fixtures["dropoff_id"],
        ))

    listing = ListBookedTrips(booked_trip_repo)
    items, total = await listing(BookedTripListFilters(
        page=1, page_size=2, partner_id=fixtures["partner_id"],
    ))
    assert total == 3
    assert len(items) == 2


@pytest.mark.asyncio
@pytest.mark.skip(reason="is_locked not persisted in ORM yet — feature incomplete")
async def test_cancel_booked_trip_blocked_when_locked(db_session, fixtures):
    booked_trip_repo = SqlBookedTripRepository(db_session)
    delivered_trip_repo = SqlDeliveredTripRepository(db_session)
    create = CreateBookedTrip(booked_trip_repo, delivered_trip_repo, db_session)
    t = await create(BookedTripCreateInput(
        trip_date=date(2026, 5, 1),
        partner_id=fixtures["partner_id"],
        pickup_location_id=fixtures["pickup_id"],
        dropoff_location_id=fixtures["dropoff_id"],
    ))
    t.lock(user_id=1)
    await booked_trip_repo.save(t)
    await db_session.commit()

    cancel = CancelBookedTrip(booked_trip_repo, db_session)
    with pytest.raises(BookedTripLocked):
        await cancel(int(t.id))


@pytest.mark.asyncio
async def test_match_and_unmatch_round_trip(db_session, fixtures):
    booked_trip_repo = SqlBookedTripRepository(db_session)
    delivered_trip_repo = SqlDeliveredTripRepository(db_session)

    # Create a priced, PENDING BookedTrip.
    create_to = CreateBookedTrip(booked_trip_repo, delivered_trip_repo, db_session)
    to = await create_to(BookedTripCreateInput(
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
    assert to.status == BookedTripStatus.PENDING

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
    create_wo = CreateDeliveredTrip(delivered_trip_repo, db_session)
    wo = await create_wo(
        DeliveredTripCreateInput(
            partner_id=fixtures["partner_id"],
            pickup_location_id=fixtures["pickup_id"],
            dropoff_location_id=fixtures["dropoff_id"],
            driver_id=driver.id,
            containers=[DeliveredTripContainerInput(
                container_number="ABCU0000104", work_type="F20",
            )],
        ),
        CurrentUserContext(id=99, role="superadmin"),
    )
    assert wo.status == DeliveredTripStatus.PENDING

    # Match.
    match = MatchTripToDeliveredTrip(booked_trip_repo, delivered_trip_repo, db_session)
    matched_to = await match(ReconcileInput(
        delivered_trip_id=int(wo.id),
        booked_trip_id=int(to.id),
        user_id=99,
    ))
    assert matched_to.status == BookedTripStatus.MATCHED
    assert int(wo.id) in matched_to.matched_delivered_trip_ids

    refreshed_wo = await delivered_trip_repo.get_by_id(wo.id)  # type: ignore[arg-type]
    assert refreshed_wo is not None
    assert refreshed_wo.status == DeliveredTripStatus.MATCHED
    assert refreshed_wo.driver_salary == 300_000

    # Unmatch.
    unmatch = UnmatchTripFromDeliveredTrip(booked_trip_repo, delivered_trip_repo, db_session)
    to_after, wo_after = await unmatch(UnmatchInput(
        user_id=99, reason="bad-match", delivered_trip_id=int(wo.id),
        booked_trip_id=int(to.id),
    ))
    assert to_after.status == BookedTripStatus.PENDING
    assert wo_after.status == DeliveredTripStatus.PENDING
    assert wo_after.driver_salary == 0


@pytest.mark.asyncio
async def test_match_rejects_when_wo_has_no_containers(db_session, fixtures):
    booked_trip_repo = SqlBookedTripRepository(db_session)
    delivered_trip_repo = SqlDeliveredTripRepository(db_session)

    from app.core.security import hash_password
    from app.models.base import User as UserORM
    driver = UserORM(
        phone="0911000001", username="driver2",
        hashed_password=hash_password("x"),
        role="driver", is_active=True,
    )
    db_session.add(driver)
    await db_session.flush()

    create_to = CreateBookedTrip(booked_trip_repo, delivered_trip_repo, db_session)
    to = await create_to(BookedTripCreateInput(
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

    create_wo = CreateDeliveredTrip(delivered_trip_repo, db_session)
    wo = await create_wo(
        DeliveredTripCreateInput(
            partner_id=fixtures["partner_id"],
            pickup_location_id=fixtures["pickup_id"],
            dropoff_location_id=fixtures["dropoff_id"],
            driver_id=driver.id,
            containers=[DeliveredTripContainerInput(
                container_number="WXYU0000108", work_type="F20",
            )],
        ),
        CurrentUserContext(id=99, role="superadmin"),
    )

    # Manually wipe WO containers so the conflict triggers.
    from app.contexts.operations.infrastructure.orm import (
        DeliveredTripContainerORM,
    )
    from sqlalchemy import delete as sa_delete
    await db_session.execute(
        sa_delete(DeliveredTripContainerORM).where(
            DeliveredTripContainerORM.delivered_trip_id == wo.id
        )
    )
    await db_session.commit()

    match = MatchTripToDeliveredTrip(booked_trip_repo, delivered_trip_repo, db_session)
    with pytest.raises(ReconciliationConflict):
        await match(ReconcileInput(
            delivered_trip_id=int(wo.id),
            booked_trip_id=int(to.id),
            user_id=99,
        ))


@pytest.mark.asyncio
async def test_confirm_completes_matched_delivered_trips(db_session, fixtures):
    booked_trip_repo = SqlBookedTripRepository(db_session)
    delivered_trip_repo = SqlDeliveredTripRepository(db_session)

    from app.core.security import hash_password
    from app.models.base import User as UserORM
    driver = UserORM(
        phone="0911000002", username="driver3",
        hashed_password=hash_password("x"),
        role="driver", is_active=True,
    )
    db_session.add(driver)
    await db_session.flush()

    create_to = CreateBookedTrip(booked_trip_repo, delivered_trip_repo, db_session)
    to = await create_to(BookedTripCreateInput(
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

    create_wo = CreateDeliveredTrip(delivered_trip_repo, db_session)
    wo = await create_wo(
        DeliveredTripCreateInput(
            partner_id=fixtures["partner_id"],
            pickup_location_id=fixtures["pickup_id"],
            dropoff_location_id=fixtures["dropoff_id"],
            driver_id=driver.id,
            containers=[DeliveredTripContainerInput(
                container_number="ZZZU0000108", work_type="F20",
            )],
        ),
        CurrentUserContext(id=99, role="superadmin"),
    )

    match = MatchTripToDeliveredTrip(booked_trip_repo, delivered_trip_repo, db_session)
    await match(ReconcileInput(
        delivered_trip_id=int(wo.id), booked_trip_id=int(to.id), user_id=99,
    ))

    confirm = ConfirmBookedTrip(booked_trip_repo, delivered_trip_repo, db_session)
    confirmed = await confirm(int(to.id), user_id=99)
    assert confirmed.is_confirmed is True


@pytest.mark.asyncio
async def test_update_booked_trip_replaces_containers(db_session, fixtures):
    booked_trip_repo = SqlBookedTripRepository(db_session)
    delivered_trip_repo = SqlDeliveredTripRepository(db_session)
    create = CreateBookedTrip(booked_trip_repo, delivered_trip_repo, db_session)
    t = await create(BookedTripCreateInput(
        trip_date=date(2026, 5, 5),
        partner_id=fixtures["partner_id"],
        pickup_location_id=fixtures["pickup_id"],
        dropoff_location_id=fixtures["dropoff_id"],
        containers=[TripContainerInput(
            container_number="ORIU0000101", work_type="F20",
        )],
    ))

    update = UpdateBookedTrip(booked_trip_repo, delivered_trip_repo, db_session)
    updated = await update(int(t.id), BookedTripUpdateInput(
        containers=[
            TripContainerInput(container_number="NEWU0000103", work_type="F40"),
        ],
    ))
    assert len(updated.containers) == 1
    assert updated.containers[0].container_number == "NEWU0000103"
    assert updated.containers[0].work_type == "F40"


@pytest.mark.asyncio
async def test_create_delivered_trip_validates_container_number(
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

    delivered_trip_repo = SqlDeliveredTripRepository(db_session)
    create = CreateDeliveredTrip(delivered_trip_repo, db_session)

    with pytest.raises(ValueError):
        await create(
            DeliveredTripCreateInput(
                partner_id=fixtures["partner_id"],
                pickup_location_id=fixtures["pickup_id"],
                dropoff_location_id=fixtures["dropoff_id"],
                driver_id=driver.id,
                containers=[DeliveredTripContainerInput(
                    container_number="bogus", work_type="F20",
                )],
            ),
            CurrentUserContext(id=99, role="superadmin"),
        )
