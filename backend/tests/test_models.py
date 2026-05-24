"""
Unit tests for ORM model field constraints.

Structural/schema tests that inspect SQLAlchemy column definitions
directly — no database connection is required.
"""

import pytest
from sqlalchemy import Integer

from app.models.domain import (
    Client,
    Pricing,
    PricingLine,
    DeliveredTrip,
    BookedTrip,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _col(model, name):
    return model.__table__.columns[name]


def _fk_target(col):
    fks = list(col.foreign_keys)
    assert fks, f"Column {col.name!r} has no foreign keys"
    return next(iter(fks)).target_fullname


def _fk_ondelete(col):
    fks = list(col.foreign_keys)
    assert fks, f"Column {col.name!r} has no foreign keys"
    return next(iter(fks)).ondelete


# ---------------------------------------------------------------------------
# 1. Monetary fields are Integer columns
# ---------------------------------------------------------------------------

class TestMonetaryFieldsAreInteger:

    @pytest.mark.parametrize("field", ["unit_price", "driver_salary"])
    def test_pricing_line_monetary_fields(self, field):
        col = _col(PricingLine, field)
        assert isinstance(col.type, Integer), (
            f"PricingLine.{field} should be Integer, got {type(col.type).__name__}"
        )

    @pytest.mark.parametrize("field", ["revenue", "driver_salary"])
    def test_delivered_trip_monetary_fields(self, field):
        col = _col(DeliveredTrip, field)
        assert isinstance(col.type, Integer)


# ---------------------------------------------------------------------------
# 2. Pricing table no longer has financial columns
# ---------------------------------------------------------------------------

class TestPricingSchemaClean:

    def test_pricing_has_no_unit_price(self):
        assert "unit_price" not in Pricing.__table__.columns

    def test_pricing_has_no_driver_salary(self):
        assert "driver_salary" not in Pricing.__table__.columns

    def test_pricing_has_no_allowance(self):
        assert "allowance" not in Pricing.__table__.columns

    def test_pricing_line_has_no_allowance(self):
        assert "allowance" not in PricingLine.__table__.columns

    def test_delivered_trip_has_no_allowance(self):
        assert "allowance" not in DeliveredTrip.__table__.columns

    def test_pricing_line_has_no_work_type(self):
        assert "work_type" not in PricingLine.__table__.columns


# ---------------------------------------------------------------------------
# 3. Cascade delete on child table FKs
# ---------------------------------------------------------------------------

class TestCascadeDeleteConstraints:

    def test_pricing_line_pricing_id_cascade(self):
        col = _col(PricingLine, "pricing_id")
        ondelete = _fk_ondelete(col)
        assert ondelete is not None and ondelete.upper() == "CASCADE"

    def test_pricing_line_references_pricings(self):
        col = _col(PricingLine, "pricing_id")
        assert _fk_target(col) == "pricings.id"


# ---------------------------------------------------------------------------
# 4. Non-nullable constraints
# ---------------------------------------------------------------------------

class TestColumnNullability:

    def test_delivered_trip_revenue_not_nullable(self):
        assert _col(DeliveredTrip, "revenue").nullable is False

    def test_client_name_not_nullable(self):
        assert _col(Client, "name").nullable is False


# ---------------------------------------------------------------------------
# 5. Container fields are flat on trip tables
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
