"""Pure-Python tests for Customer & Pricing domain entities.

These tests don't touch SQLAlchemy or FastAPI. They exercise business
invariants directly on the aggregate roots.
"""

from __future__ import annotations

import pytest

from app.contexts.customer_pricing.domain.entities import (
    Location,
    Partner,
    Pricing,
    PricingLine,
)
from app.contexts.customer_pricing.domain.exceptions import PricingNotMatched
from app.contexts.customer_pricing.domain.value_objects import (
    LocationId,
    PartnerId,
    PricingId,
    normalize_work_type,
)


# -- value object validation ------------------------------------------


def test_normalize_work_type_accepts_any_nonempty():
    assert normalize_work_type("f20") == "f20"
    assert normalize_work_type(" E40 ") == "E40"
    assert normalize_work_type("CHẠY SÀ LAN") == "CHẠY SÀ LAN"
    assert normalize_work_type("CHUYỂN BÃI") == "CHUYỂN BÃI"
    with pytest.raises(ValueError):
        normalize_work_type(None)
    with pytest.raises(ValueError):
        normalize_work_type("   ")


# -- Partner ----------------------------------------------------------


def test_partner_deactivate_reactivate_flips_flag():
    p = Partner(id=PartnerId(1), name="Acme", partner_type="client")
    assert p.is_active is True
    p.deactivate()
    assert p.is_active is False
    p.reactivate()
    assert p.is_active is True


# -- Location ---------------------------------------------------------


def test_location_record_gps_pin_sets_provenance_fields():
    loc = Location(id=LocationId(1), name="Bai xe X")
    assert loc.has_coords() is False
    loc.record_gps_pin(lat=20.84, lng=106.69)
    assert loc.lat == 20.84
    assert loc.lng == 106.69
    assert loc.geocode_source == "driver_pin"
    assert loc.pending_geocode is False
    assert loc.location_review_needed is True
    assert loc.has_coords() is True


def test_location_add_alias_is_idempotent_on_normalized_form():
    loc = Location(id=LocationId(1), name="Cang A")
    a1 = loc.add_alias("Cang A khu 1", "cang a khu 1", source="import")
    a2 = loc.add_alias("Cang A Khu 1 ", "cang a khu 1", source="manual")
    assert a1 is a2
    assert len(loc.aliases) == 1


def test_location_add_alias_rejects_unsaved_aggregate():
    loc = Location(id=None, name="Chua luu")
    with pytest.raises(ValueError):
        loc.add_alias("alias", "alias", source="import")


# -- Pricing ----------------------------------------------------------


def _pricing_with_tiers(*tiers: tuple[int, int]) -> Pricing:
    """tiers = (quantity, unit_price), e.g. (1, 2_000_000)."""
    p = Pricing(
        id=PricingId(1),
        client_id=PartnerId(1),
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
    # Above the top tier -- clamps to the highest defined tier
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
        id=None, client_id=PartnerId(1), work_type=" f40 ",
        pickup_location_id=LocationId(1), dropoff_location_id=LocationId(2),
    )
    assert p.work_type == "f40"


def test_pricing_construction_accepts_custom_work_type():
    p = Pricing(
        id=None, client_id=PartnerId(1), work_type="CHẠY SÀ LAN",
        pickup_location_id=LocationId(1), dropoff_location_id=LocationId(2),
    )
    assert p.work_type == "CHẠY SÀ LAN"
