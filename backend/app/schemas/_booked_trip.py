from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from ._client import ClientSummaryOut
from ._location import LocationSummaryOut

__all__ = [
    "BookedTripCreate",
    "BookedTripUpdate",
    "BookedTripOut",
]


class BookedTripCreate(BaseModel):
    trip_date: date
    client_id: int
    pickup_location_id: int
    dropoff_location_id: int
    cont_number: str | None = None
    cont_type: str | None = None
    vessel: str | None = None
    vehicle_plate: str | None = None
    work_type: str = ""


class BookedTripUpdate(BaseModel):
    trip_date: date | None = None
    client_id: int | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    cont_number: str | None = None
    cont_type: str | None = None
    vessel: str | None = None
    vehicle_plate: str | None = None
    work_type: str | None = None


class BookedTripOut(BaseModel):
    id: int
    trip_date: date
    client: ClientSummaryOut
    pickup_location: LocationSummaryOut
    dropoff_location: LocationSummaryOut
    cont_number: str | None = None
    cont_type: str | None = None
    vessel: str | None = None
    vehicle_plate: str | None = None
    work_type: str = ""
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
