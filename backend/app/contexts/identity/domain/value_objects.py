"""Value objects for the Identity context. Pure Python, immutable."""

from __future__ import annotations

import re
from enum import Enum
from typing import NewType

UserId = NewType("UserId", int)
PushSubscriptionId = NewType("PushSubscriptionId", int)
Endpoint = NewType("Endpoint", str)


class UserRole(str, Enum):
    SUPERADMIN = "superadmin"
    DIRECTOR = "director"
    ACCOUNTANT = "accountant"
    DRIVER = "driver"

    @classmethod
    def from_str(cls, value: str) -> "UserRole":
        try:
            return cls(value)
        except ValueError as e:
            raise ValueError(f"Unknown user role: {value!r}") from e


_CCCD_RE = re.compile(r"^\d{12}$")


def validate_cccd(value: str | None) -> str | None:
    """Vietnamese citizen ID — exactly 12 digits, or None."""
    if value is None or value == "":
        return None
    if not _CCCD_RE.match(value):
        from app.contexts.identity.domain.exceptions import InvalidCccd

        raise InvalidCccd(f"CCCD must be exactly 12 digits, got {value!r}")
    return value
