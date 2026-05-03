"""
Unit tests for ORM model field constraints.

These are structural/schema tests that inspect SQLAlchemy column definitions
directly — no database connection is required.
"""

import pytest
from sqlalchemy import Integer

from app.models.domain import (
    Client,
    Route,
    Pricing,
    PricingLine,
    WorkOrder,
    WorkOrderContainer,
    TripOrder,
    TripOrderWorkOrder,
    SalaryPeriod,
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

    @pytest.mark.parametrize("field", ["outstanding_debt"])
    def test_client_monetary_fields(self, field):
        col = _col(Client, field)
        assert isinstance(col.type, Integer)

    @pytest.mark.parametrize("field", ["type_20ft", "type_40ft"])
    def test_route_monetary_fields(self, field):
        col = _col(Route, field)
        assert isinstance(col.type, Integer)

    @pytest.mark.parametrize("field", ["unit_price", "driver_salary", "allowance"])
    def test_pricing_line_monetary_fields(self, field):
        col = _col(PricingLine, field)
        assert isinstance(col.type, Integer), (
            f"PricingLine.{field} should be Integer, got {type(col.type).__name__}"
        )

    @pytest.mark.parametrize("field", ["unit_price", "driver_salary", "allowance", "earning"])
    def test_work_order_monetary_fields(self, field):
        col = _col(WorkOrder, field)
        assert isinstance(col.type, Integer)

    @pytest.mark.parametrize("field", ["unit_price", "driver_salary", "allowance", "revenue"])
    def test_trip_order_monetary_fields(self, field):
        col = _col(TripOrder, field)
        assert isinstance(col.type, Integer)

    @pytest.mark.parametrize("field", [
        "price_per_order", "total_salary", "total_allowance", "total_deduction", "net_pay",
    ])
    def test_salary_period_monetary_fields(self, field):
        col = _col(SalaryPeriod, field)
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

    def test_work_order_container_work_order_id_cascade(self):
        col = _col(WorkOrderContainer, "work_order_id")
        ondelete = _fk_ondelete(col)
        assert ondelete is not None and ondelete.upper() == "CASCADE"

    def test_work_order_container_references_work_orders(self):
        col = _col(WorkOrderContainer, "work_order_id")
        assert _fk_target(col) == "work_orders.id"

    def test_trip_order_work_order_trip_order_id_cascade(self):
        col = _col(TripOrderWorkOrder, "trip_order_id")
        ondelete = _fk_ondelete(col)
        assert ondelete is not None and ondelete.upper() == "CASCADE"

    def test_trip_order_work_order_references_trip_orders(self):
        col = _col(TripOrderWorkOrder, "trip_order_id")
        assert _fk_target(col) == "trip_orders.id"


# ---------------------------------------------------------------------------
# 4. Non-nullable constraints
# ---------------------------------------------------------------------------

class TestColumnNullability:

    def test_work_order_unit_price_not_nullable(self):
        assert _col(WorkOrder, "unit_price").nullable is False

    def test_work_order_earning_not_nullable(self):
        assert _col(WorkOrder, "earning").nullable is False

    def test_trip_order_revenue_not_nullable(self):
        assert _col(TripOrder, "revenue").nullable is False

    def test_route_type_20ft_not_nullable(self):
        assert _col(Route, "type_20ft").nullable is False

    def test_route_type_40ft_not_nullable(self):
        assert _col(Route, "type_40ft").nullable is False
