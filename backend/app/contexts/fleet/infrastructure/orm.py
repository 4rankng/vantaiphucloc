"""ORM re-exports for Fleet.

Drivers are physically `users` rows with `role='driver'`; the table is
owned by Identity's ORM, re-exported here under a Fleet-flavored alias so
mappers/repositories don't import Identity internals directly.
"""

from __future__ import annotations

from app.contexts.identity.infrastructure.orm import UserORM as DriverORM

__all__ = ["DriverORM"]
