"""
Unit tests for ORM model field constraints.

Structural/schema tests that inspect SQLAlchemy column definitions
directly — no database connection is required.
"""

import pytest
from sqlalchemy import Integer

from app.models.domain import (
    Client,
    DeliveredTrip,
    BookedTrip,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _col(model, name):
    return model.__table__.columns[name]


# ---------------------------------------------------------------------------
# 1. Monetary fields are Integer columns
# ---------------------------------------------------------------------------


class TestMonetaryFieldsAreInteger:
    @pytest.mark.parametrize("field", ["revenue", "driver_salary"])
    def test_delivered_trip_monetary_fields(self, field):
        col = _col(DeliveredTrip, field)
        assert isinstance(col.type, Integer)


# ---------------------------------------------------------------------------
# 2. Non-nullable constraints
# ---------------------------------------------------------------------------


class TestColumnNullability:
    def test_delivered_trip_revenue_not_nullable(self):
        assert _col(DeliveredTrip, "revenue").nullable is False

    def test_client_name_not_nullable(self):
        assert _col(Client, "name").nullable is False


# ---------------------------------------------------------------------------
# 3. Container fields are flat on trip tables
# ---------------------------------------------------------------------------


class TestFlatContainerFields:
    def test_booked_trip_has_cont_number(self):
        assert "cont_number" in BookedTrip.__table__.columns

    def test_booked_trip_has_cont_type(self):
        assert "cont_type" in BookedTrip.__table__.columns

    def test_delivered_trip_has_cont_number(self):
        assert "cont_number" in DeliveredTrip.__table__.columns

    def test_delivered_trip_has_cont_type(self):
        assert "cont_type" in DeliveredTrip.__table__.columns

    def test_delivered_trip_has_vehicle_plate(self):
        assert "vehicle_plate" in DeliveredTrip.__table__.columns

    def test_delivered_trip_no_vehicle_id(self):
        assert "vehicle_id" not in DeliveredTrip.__table__.columns

    def test_booked_trip_no_status(self):
        assert "status" not in BookedTrip.__table__.columns

    def test_delivered_trip_no_status(self):
        assert "status" not in DeliveredTrip.__table__.columns
