"""Pure-Python tests for Customer & Pricing domain entities.

These tests don't touch SQLAlchemy or FastAPI. They exercise business
invariants directly on the aggregate roots.
"""

from __future__ import annotations

import pytest

from app.contexts.customer_pricing.domain.entities import (
    Customer,
    Location,
    Pricing,
    PricingLine,
)
from app.contexts.customer_pricing.domain.exceptions import PricingNotMatched
from app.contexts.customer_pricing.domain.value_objects import (
    ClientId,
    LocationId,
    PricingId,
    normalize_client_type,
    normalize_work_type,
)


# ── value object validation ─────────────────────────────────────


def test_normalize_work_type_rejects_unknown():
    assert normalize_work_type("f20") == "F20"
    assert normalize_work_type(" E40 ") == "E40"
    with pytest.raises(ValueError):
        normalize_work_type("F30")
    with pytest.raises(ValueError):
        normalize_work_type(None)


def test_normalize_client_type_only_accepts_company_or_individual():
    assert normalize_client_type("Company") == "company"
    assert normalize_client_type("INDIVIDUAL") == "individual"
    with pytest.raises(ValueError):
        normalize_client_type("partnership")


# ── Customer ─────────────────────────────────────────────────────


def test_customer_validates_type_at_construction():
    c = Customer(id=None, name="Acme", type="Company", phone="0900")
    assert c.type == "company"


def test_customer_deactivate_reactivate_flips_flag():
    c = Customer(id=ClientId(1), name="Acme", type="company", phone="0900")
    assert c.is_active is True
    c.deactivate()
    assert c.is_active is False
    c.reactivate()
    assert c.is_active is True


def test_customer_outstanding_debt_accumulates():
    c = Customer(
        id=ClientId(1), name="Acme", type="company", phone="0900",
        outstanding_debt=100_000,
    )
    c.add_to_outstanding(250_000)
    assert c.outstanding_debt == 350_000
    c.add_to_outstanding(-100_000)
    assert c.outstanding_debt == 250_000


# ── Location ─────────────────────────────────────────────────────


def test_location_record_gps_pin_sets_provenance_fields():
    loc = Location(id=LocationId(1), name="Bãi xe X")
    assert loc.has_coords() is False
    loc.record_gps_pin(lat=20.84, lng=106.69)
    assert loc.lat == 20.84
    assert loc.lng == 106.69
    assert loc.geocode_source == "driver_pin"
    assert loc.pending_geocode is False
    assert loc.location_review_needed is True
    assert loc.has_coords() is True


def test_location_add_alias_is_idempotent_on_normalized_form():
    loc = Location(id=LocationId(1), name="Cảng A")
    a1 = loc.add_alias("Cảng A khu 1", "cang a khu 1", source="import")
    a2 = loc.add_alias("Cảng A Khu 1 ", "cang a khu 1", source="manual")
    assert a1 is a2
    assert len(loc.aliases) == 1


def test_location_add_alias_rejects_unsaved_aggregate():
    loc = Location(id=None, name="Chưa lưu")
    with pytest.raises(ValueError):
        loc.add_alias("alias", "alias", source="import")


# ── Pricing ──────────────────────────────────────────────────────


def _pricing_with_tiers(*tiers: tuple[int, int]) -> Pricing:
    """tiers = (quantity, unit_price), e.g. (1, 2_000_000)."""
    p = Pricing(
        id=PricingId(1),
        client_id=ClientId(1),
        work_type="F20",
        pickup_location_id=LocationId(10),
        dropoff_location_id=LocationId(20),
    )
    for qty, price in tiers:
        p.lines.append(PricingLine(
            id=None, pricing_id=p.id, quantity=qty, unit_price=price,
        ))
    return p


def test_pricing_line_for_quantity_matches_highest_tier_at_or_below():
    p = _pricing_with_tiers((1, 2_000_000), (2, 3_500_000), (3, 4_800_000))
    assert p.line_for_quantity(1).unit_price == 2_000_000
    assert p.line_for_quantity(2).unit_price == 3_500_000
    assert p.line_for_quantity(3).unit_price == 4_800_000
    # Above the top tier — clamps to the highest defined tier
    assert p.line_for_quantity(5).unit_price == 4_800_000


def test_pricing_line_for_quantity_raises_below_smallest_tier():
    p = _pricing_with_tiers((2, 3_500_000), (3, 4_800_000))
    with pytest.raises(PricingNotMatched):
        p.line_for_quantity(1)


def test_pricing_upsert_line_replaces_existing_quantity():
    p = _pricing_with_tiers((1, 2_000_000))
    p.upsert_line(quantity=1, unit_price=2_500_000)
    assert len(p.lines) == 1
    assert p.lines[0].unit_price == 2_500_000


def test_pricing_upsert_line_appends_new_quantity():
    p = _pricing_with_tiers((1, 2_000_000))
    p.upsert_line(quantity=3, unit_price=4_800_000, driver_salary=400_000)
    assert len(p.lines) == 2
    new = next(ln for ln in p.lines if ln.quantity == 3)
    assert new.unit_price == 4_800_000
    assert new.driver_salary == 400_000


def test_pricing_normalizes_work_type_at_construction():
    p = Pricing(
        id=None, client_id=ClientId(1), work_type=" f40 ",
        pickup_location_id=LocationId(1), dropoff_location_id=LocationId(2),
    )
    assert p.work_type == "F40"


def test_pricing_construction_rejects_unknown_work_type():
    with pytest.raises(ValueError):
        Pricing(
            id=None, client_id=ClientId(1), work_type="X10",
            pickup_location_id=LocationId(1), dropoff_location_id=LocationId(2),
        )
