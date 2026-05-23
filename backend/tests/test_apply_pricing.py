"""Unit tests for pricing application logic."""

from app.contexts.operations.domain.entities import DeliveredTrip
from app.contexts.operations.domain.value_objects import DeliveredTripId


def test_delivered_trip_apply_pricing():
    dt = DeliveredTrip(
        id=DeliveredTripId(1),
        client_id=10,
        pickup_location_id=100,
        dropoff_location_id=200,
        driver_id=5,
    )
    dt.apply_pricing(revenue=1_500_000, driver_salary=300_000, allowance=50_000)
    assert dt.revenue == 1_500_000
    assert dt.driver_salary == 300_000
    assert dt.allowance == 50_000
