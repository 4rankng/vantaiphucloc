"""Tests for location-picker helpers."""

from app.models.domain import Location, LocationAlias


def test_location_has_name():
    assert "name" in Location.__table__.columns
    assert Location.__table__.columns["name"].nullable is False


def test_location_alias_has_location_id_fk():
    col = LocationAlias.__table__.columns["location_id"]
    fks = list(col.foreign_keys)
    assert len(fks) == 1
    assert "locations.id" in next(iter(fks)).target_fullname
