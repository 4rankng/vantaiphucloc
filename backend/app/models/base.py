"""Compatibility shim.

The User ORM model lives in the Identity bounded context at
`app.contexts.identity.infrastructure.orm`. This module re-exports it so
existing imports (`from app.models.base import User`) continue to work
while the rest of the codebase is refactored into bounded contexts.
"""

from app.contexts.identity.infrastructure.orm import UserORM as User

__all__ = ["User"]
