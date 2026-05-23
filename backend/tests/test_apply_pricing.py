"""Unit tests for pricing application logic."""

from app.contexts.operations.domain.entities import BookedTrip, DeliveredTrip
from app.contexts.operations.domain.value_objects import BookedTripId, DeliveredTripId
from datetime import date


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


def test_booked_trip_has_revenue():
    bt = BookedTrip(
        id=BookedTripId(1),
        trip_date=date(2026, 5, 5),
        client_id=10,
        pickup_location_id=100,
        dropoff_location_id=200,
        revenue=2_000_000,
    )
    assert bt.revenue == 2_000_000


def test_matched_flag_default_false():
    bt = BookedTrip(
        id=None,
        trip_date=date(2026, 5, 5),
        client_id=10,
        pickup_location_id=100,
        dropoff_location_id=200,
    )
    assert bt.matched is False
