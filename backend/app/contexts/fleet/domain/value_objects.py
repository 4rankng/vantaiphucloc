"""Fleet value objects.

`TractorPlate` is intentionally permissive — Vietnamese plate formats vary
by year and a strict regex would reject legitimate entries. Trim and upper
only. Future tightening lives here.
"""

from __future__ import annotations

DriverId = int


def normalize_tractor_plate(raw: str | None) -> str | None:
    if raw is None:
        return None
    cleaned = raw.strip().upper()
    return cleaned or None


class TractorPlate(str):
    """Marker subclass so the type system can flag plates explicitly."""

    __slots__ = ()

    def __new__(cls, value: str) -> "TractorPlate":
        return str.__new__(cls, normalize_tractor_plate(value) or "")
