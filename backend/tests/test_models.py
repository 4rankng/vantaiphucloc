"""
Unit tests for ORM model field constraints.

These are structural/schema tests that inspect SQLAlchemy column definitions
directly — no database connection is required.

Validates: Requirements 1.1, 1.5
"""

import pytest
from sqlalchemy import Integer, ForeignKey
from sqlalchemy.orm import RelationshipProperty

# Import all domain models (triggers metadata registration)
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
    SalaryPeriodConfig,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _col(model, name):
    """Return the Column object for *name* on *model*."""
    return model.__table__.columns[name]


def _fk_target(col):
    """Return the 'table.column' string for the first FK on *col*."""
    fks = list(col.foreign_keys)
    assert fks, f"Column {col.name!r} has no foreign keys"
    return next(iter(fks)).target_fullname


def _fk_ondelete(col):
    """Return the ondelete rule for the first FK on *col*, or None."""
    fks = list(col.foreign_keys)
    assert fks, f"Column {col.name!r} has no foreign keys"
    return next(iter(fks)).ondelete


# ---------------------------------------------------------------------------
# 1. Monetary fields are Integer columns
# ---------------------------------------------------------------------------

class TestMonetaryFieldsAreInteger:
    """All VND monetary fields must be stored as Integer (no decimals)."""

    @pytest.mark.parametrize("field", ["outstanding_debt"])
    def test_client_monetary_fields(self, field):
        col = _col(Client, field)
        assert isinstance(col.type, Integer), (
            f"Client.{field} should be Integer, got {type(col.type).__name__}"
        )

    @pytest.mark.parametrize("field", ["type_20ft", "type_40ft"])
    def test_route_monetary_fields(self, field):
        col = _col(Route, field)
        assert isinstance(col.type, Integer), (
            f"Route.{field} should be Integer, got {type(col.type).__name__}"
        )

    @pytest.mark.parametrize("field", ["unit_price", "driver_salary", "allowance"])
    def test_pricing_monetary_fields(self, field):
        col = _col(Pricing, field)
        assert isinstance(col.type, Integer), (
            f"Pricing.{field} should be Integer, got {type(col.type).__name__}"
        )

    @pytest.mark.parametrize(
        "field",
        ["unit_price", "driver_salary", "allowance", "earning"],
    )
    def test_work_order_monetary_fields(self, field):
        col = _col(WorkOrder, field)
        assert isinstance(col.type, Integer), (
            f"WorkOrder.{field} should be Integer, got {type(col.type).__name__}"
        )

    @pytest.mark.parametrize(
        "field",
        ["unit_price", "driver_salary", "allowance", "revenue"],
    )
    def test_trip_order_monetary_fields(self, field):
        col = _col(TripOrder, field)
        assert isinstance(col.type, Integer), (
            f"TripOrder.{field} should be Integer, got {type(col.type).__name__}"
        )

    @pytest.mark.parametrize(
        "field",
        [
            "price_per_order",
            "total_salary",
            "total_allowance",
            "total_deduction",
            "net_pay",
        ],
    )
    def test_salary_period_monetary_fields(self, field):
        col = _col(SalaryPeriod, field)
        assert isinstance(col.type, Integer), (
            f"SalaryPeriod.{field} should be Integer, got {type(col.type).__name__}"
        )


# ---------------------------------------------------------------------------
# 2. company_id is present and non-nullable on all domain models
# ---------------------------------------------------------------------------

DOMAIN_MODELS_WITH_COMPANY_ID = [
    Client,
    Route,
    Pricing,
    WorkOrder,
    TripOrder,
    SalaryPeriod,
    SalaryPeriodConfig,
]


class TestCompanyIdConstraints:
    """company_id must exist, be non-nullable, and reference companies.id."""

    @pytest.mark.parametrize("model", DOMAIN_MODELS_WITH_COMPANY_ID)
    def test_company_id_exists(self, model):
        assert "company_id" in model.__table__.columns, (
            f"{model.__name__} is missing company_id column"
        )

    @pytest.mark.parametrize("model", DOMAIN_MODELS_WITH_COMPANY_ID)
    def test_company_id_is_not_nullable(self, model):
        col = _col(model, "company_id")
        assert col.nullable is False, (
            f"{model.__name__}.company_id should be non-nullable"
        )

    @pytest.mark.parametrize("model", DOMAIN_MODELS_WITH_COMPANY_ID)
    def test_company_id_references_companies(self, model):
        col = _col(model, "company_id")
        target = _fk_target(col)
        assert target == "companies.id", (
            f"{model.__name__}.company_id FK target should be 'companies.id', "
            f"got {target!r}"
        )

    @pytest.mark.parametrize("model", DOMAIN_MODELS_WITH_COMPANY_ID)
    def test_company_id_is_integer(self, model):
        col = _col(model, "company_id")
        assert isinstance(col.type, Integer), (
            f"{model.__name__}.company_id should be Integer"
        )


# ---------------------------------------------------------------------------
# 3. Cascade delete on child table FKs
# ---------------------------------------------------------------------------

class TestCascadeDeleteConstraints:
    """Child tables must configure ON DELETE CASCADE on their parent FK."""

    def test_pricing_line_pricing_id_cascade(self):
        col = _col(PricingLine, "pricing_id")
        ondelete = _fk_ondelete(col)
        assert ondelete is not None and ondelete.upper() == "CASCADE", (
            f"PricingLine.pricing_id FK should have ondelete='CASCADE', "
            f"got {ondelete!r}"
        )

    def test_work_order_container_work_order_id_cascade(self):
        col = _col(WorkOrderContainer, "work_order_id")
        ondelete = _fk_ondelete(col)
        assert ondelete is not None and ondelete.upper() == "CASCADE", (
            f"WorkOrderContainer.work_order_id FK should have ondelete='CASCADE', "
            f"got {ondelete!r}"
        )

    def test_trip_order_work_order_trip_order_id_cascade(self):
        col = _col(TripOrderWorkOrder, "trip_order_id")
        ondelete = _fk_ondelete(col)
        assert ondelete is not None and ondelete.upper() == "CASCADE", (
            f"TripOrderWorkOrder.trip_order_id FK should have ondelete='CASCADE', "
            f"got {ondelete!r}"
        )

    def test_pricing_line_references_pricings(self):
        col = _col(PricingLine, "pricing_id")
        assert _fk_target(col) == "pricings.id"

    def test_work_order_container_references_work_orders(self):
        col = _col(WorkOrderContainer, "work_order_id")
        assert _fk_target(col) == "work_orders.id"

    def test_trip_order_work_order_references_trip_orders(self):
        col = _col(TripOrderWorkOrder, "trip_order_id")
        assert _fk_target(col) == "trip_orders.id"


# ---------------------------------------------------------------------------
# 4. Additional structural sanity checks
# ---------------------------------------------------------------------------

class TestColumnNullability:
    """Key non-monetary fields that must also be non-nullable."""

    def test_pricing_unit_price_not_nullable(self):
        assert _col(Pricing, "unit_price").nullable is False

    def test_pricing_driver_salary_not_nullable(self):
        assert _col(Pricing, "driver_salary").nullable is False

    def test_pricing_allowance_not_nullable(self):
        assert _col(Pricing, "allowance").nullable is False

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
