"""Tests for payroll driver system — verifies schema post-migration."""

from app.models.domain import BookedTrip, DeliveredTrip


def test_booked_trip_flat_container_fields():
    assert "cont_number" in BookedTrip.__table__.columns
    assert "cont_type" in BookedTrip.__table__.columns


def test_delivered_trip_flat_container_fields():
    assert "cont_number" in DeliveredTrip.__table__.columns
    assert "cont_type" in DeliveredTrip.__table__.columns
    assert "vehicle_plate" in DeliveredTrip.__table__.columns


def test_no_container_join_tables():
    from app.models import domain
    assert not hasattr(domain, "BookedTripContainer")
    assert not hasattr(domain, "DeliveredTripContainer")
