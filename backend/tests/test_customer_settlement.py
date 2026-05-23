"""Tests for customer settlement — verifies schema post-migration."""

from app.models.domain import BookedTrip, DeliveredTrip


def test_booked_trip_matched_column():
    col = BookedTrip.__table__.columns["matched"]
    assert col.nullable is False


def test_delivered_trip_matched_column():
    col = DeliveredTrip.__table__.columns["matched"]
    assert col.nullable is False


def test_no_reconciliation_table():
    from app.models import domain
    assert not hasattr(domain, "Reconciliation")
