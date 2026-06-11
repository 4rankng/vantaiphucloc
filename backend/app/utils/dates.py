"""Shared date/time utilities."""

from datetime import datetime, timezone


def utcnow() -> datetime:
    """Return the current UTC time (timezone-aware).

    Single definition to replace the 12 scattered ``_utcnow()`` copies.
    """
    return datetime.now(timezone.utc)
