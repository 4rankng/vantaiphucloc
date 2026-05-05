"""Fleet aggregates.

Driver is a thin projection on top of Identity's `User` — the underlying
row is `users` with `role='driver'`. The aggregate exists so Fleet use
cases can talk in driver-language without leaking User onto callers.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.contexts.fleet.domain.value_objects import (
    DriverId,
    normalize_tractor_plate,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class Driver:
    """Driver master record (read side).

    The login credentials and password rules belong to Identity's User
    aggregate. Here we expose only the fleet-relevant shape: who they
    are, what plate they drive, which vendor they belong to.
    """

    id: DriverId | None
    username: str
    phone: str | None
    full_name: str | None
    vendor: str | None
    tractor_plate: str | None
    is_active: bool = True
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.tractor_plate = normalize_tractor_plate(self.tractor_plate)

    def assign_tractor_plate(self, plate: str | None) -> None:
        self.tractor_plate = normalize_tractor_plate(plate)
        self.updated_at = _utcnow()

    def assign_vendor(self, vendor: str | None) -> None:
        self.vendor = (vendor or "").strip() or None
        self.updated_at = _utcnow()
