"""Pure-Python tests for Customer & Pricing domain entities.

These tests don't touch SQLAlchemy or FastAPI. They exercise business
invariants directly on the aggregate roots.
"""

from __future__ import annotations

import pytest

from app.contexts.customer_pricing.domain.entities import (
    Location,
    Partner,
)
from app.contexts.customer_pricing.domain.value_objects import (
    LocationId,
    PartnerId,
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
