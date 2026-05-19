"""
Unit tests for ORM model field constraints.

These are structural/schema tests that inspect SQLAlchemy column definitions
directly — no database connection is required.
"""

import pytest
from sqlalchemy import Integer

from app.models.domain import (
    Partner,
    Pricing,
    PricingLine,
    DeliveredTrip,
    DeliveredTripContainer,
    BookedTrip,
    Reconciliation,
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

    @pytest.mark.parametrize("field", ["unit_price", "driver_salary", "allowance"])
    def test_pricing_line_monetary_fields(self, field):
        col = _col(PricingLine, field)
        assert isinstance(col.type, Integer), (
            f"PricingLine.{field} should be Integer, got {type(col.type).__name__}"
        )

    @pytest.mark.parametrize("field", ["revenue", "driver_salary", "allowance"])
    def test_delivered_trip_monetary_fields(self, field):
        col = _col(DeliveredTrip, field)
        assert isinstance(col.type, Integer)

    @pytest.mark.parametrize("field", ["revenue"])
    def test_booked_trip_monetary_fields(self, field):
        col = _col(BookedTrip, field)
        assert isinstance(col.type, Integer)


# ---------------------------------------------------------------------------
# 2. Pricing table no longer has financial columns
# ---------------------------------------------------------------------------

class TestPricingSchemaClean:

    def test_pricing_has_no_unit_price(self):
        assert "unit_price" not in Pricing.__table__.columns, \
            "Pricing.unit_price should have been removed — financials live in pricing_lines"

    def test_pricing_has_no_driver_salary(self):
        assert "driver_salary" not in Pricing.__table__.columns

    def test_pricing_has_no_allowance(self):
        assert "allowance" not in Pricing.__table__.columns

    def test_pricing_line_has_no_work_type(self):
        assert "work_type" not in PricingLine.__table__.columns, \
            "PricingLine.work_type should have been removed — work_type is on the parent Pricing"


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

    def test_delivered_trip_container_delivered_trip_id_cascade(self):
        col = _col(DeliveredTripContainer, "delivered_trip_id")
        ondelete = _fk_ondelete(col)
        assert ondelete is not None and ondelete.upper() == "CASCADE"

    def test_delivered_trip_container_references_delivered_trips(self):
        col = _col(DeliveredTripContainer, "delivered_trip_id")
        assert _fk_target(col) == "delivered_trips.id"

    def test_reconciliation_booked_trip_id_cascade(self):
        col = _col(Reconciliation, "booked_trip_id")
        ondelete = _fk_ondelete(col)
        assert ondelete is not None and ondelete.upper() == "CASCADE"

    def test_reconciliation_references_booked_trips(self):
        col = _col(Reconciliation, "booked_trip_id")
        assert _fk_target(col) == "booked_trips.id"


# ---------------------------------------------------------------------------
# 4. Non-nullable constraints
# ---------------------------------------------------------------------------

class TestColumnNullability:

    def test_delivered_trip_revenue_not_nullable(self):
        assert _col(DeliveredTrip, "revenue").nullable is False

    def test_booked_trip_revenue_not_nullable(self):
        assert _col(BookedTrip, "revenue").nullable is False

    def test_partner_name_not_nullable(self):
        assert _col(Partner, "name").nullable is False
