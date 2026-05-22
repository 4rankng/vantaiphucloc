from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass
class ImportRow:
    row_number: int
    container_number: str | None = None
    trip_date: date | None = None
    client_name: str | None = None
    pickup_location: str | None = None
    dropoff_location: str | None = None
    amount: int | None = None
    work_type: str | None = None
    operation_type: str | None = None
    notes: str | None = None
    vehicle_plate: str | None = None
    parse_error: str | None = None
