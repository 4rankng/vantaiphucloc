"""Mappers between Fleet domain and persistence."""

from __future__ import annotations

from app.contexts.fleet.domain.entities import Driver
from app.contexts.fleet.infrastructure.orm import DriverORM


def to_domain(row: DriverORM) -> Driver:
    return Driver(
        id=row.id,
        username=row.username,
        phone=row.phone,
        full_name=row.full_name,
        vendor=row.vendor,
        tractor_plate=row.tractor_plate,
        is_active=row.is_active,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )
