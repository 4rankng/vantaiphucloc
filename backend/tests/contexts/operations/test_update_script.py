import pytest
from app.contexts.operations.application.delivered_trips import UpdateDeliveredTrip, CurrentUserContext, BatchCreateDeliveredTrips
from app.contexts.operations.application.dto import DeliveredTripUpdateInput, DeliveredTripCreateInput
from app.contexts.operations.infrastructure.repositories import SqlDeliveredTripRepository

@pytest.mark.asyncio
async def test_update_delivered_trip(db_session):
    repo = SqlDeliveredTripRepository(db_session)
    use_case = UpdateDeliveredTrip(repo, db_session)
    # create a trip first
    batch_create = BatchCreateDeliveredTrips(repo, db_session)
    res = await batch_create(
        [DeliveredTripCreateInput(client_id=1, dropoff_location_id=1, pickup_location_id=1, driver_id=1, vessel="A")],
        CurrentUserContext(id=2, role="accountant")
    )
    trip_id = res[0][1]
    
    # attempt update
    await use_case(
        trip_id,
        DeliveredTripUpdateInput(vessel="test"),
        CurrentUserContext(id=2, role="accountant")
    )
