"""Fleet aggregates.

Driver is a thin projection on top of Identity's `User` — the underlying
row is `users` with `role='driver'`. The aggregate exists so Fleet use
cases can talk in driver-language without leaking User onto callers.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from app.utils.dates import utcnow



@dataclass
class Driver:
    """Driver master record (read side).

    The login credentials and password rules belong to Identity's User
    aggregate. Vehicle assignment is handled through the Vehicle ORM
    model (Vehicle.driver_id → users.id).
    """

    id: int | None
    username: str
    phone: str | None
    full_name: str | None
    is_active: bool = True
    created_at: datetime = field(default_factory=utcnow)
    updated_at: datetime = field(default_factory=utcnow)
