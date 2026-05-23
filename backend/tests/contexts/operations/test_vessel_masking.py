"""Tests for vessel masking in delivered trips."""

from app.models.domain import DeliveredTrip


def test_delivered_trip_has_vessel_field():
    assert "vessel" in DeliveredTrip.__table__.columns


def test_delivered_trip_vessel_is_nullable():
    assert DeliveredTrip.__table__.columns["vessel"].nullable is True
