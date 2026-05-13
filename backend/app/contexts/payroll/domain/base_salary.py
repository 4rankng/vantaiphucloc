"""Base-salary domain primitives for the Payroll context.

Append-only history: each rate change is a new ``DriverSalaryConfig`` row
with an ``effective_from`` date. The "effective" rate at any target date
is the row whose ``effective_from`` is the greatest value ``<= target_date``.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass
class DriverSalaryConfig:
    """Immutable snapshot of a driver's base salary starting on a date."""

    id: int
    driver_id: int
    base_salary: int  # VND
    effective_from: date
    note: str | None = None


def effective_base_salary(
    history: list[DriverSalaryConfig], at: date
) -> int:
    """Return the base salary in effect on *at* given the full history.

    Picks the entry with the greatest ``effective_from`` that is still
    ``<= at``. Returns 0 when there is no applicable entry (driver has
    never had a base salary configured by *at*).
    """
    applicable = [c for c in history if c.effective_from <= at]
    if not applicable:
        return 0
    latest = max(applicable, key=lambda c: c.effective_from)
    return latest.base_salary
