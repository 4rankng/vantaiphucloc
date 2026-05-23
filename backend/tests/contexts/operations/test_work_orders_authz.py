"""Tests for work-order authorization on delivered trips."""

from app.models.domain import DeliveredTrip


def test_delivered_trip_has_vendor_id():
    assert "vendor_id" in DeliveredTrip.__table__.columns


def test_delivered_trip_vendor_id_is_nullable():
    assert DeliveredTrip.__table__.columns["vendor_id"].nullable is True
