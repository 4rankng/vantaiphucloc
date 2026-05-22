from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from ._client import ClientSummaryOut
from ._location import LocationSummaryOut

__all__ = [
    "BookedTripContainerPhotoOut",
    "TripContainerCreate",
    "TripContainerOut",
    "BookedTripCreate",
    "BookedTripUpdate",
    "BookedTripOut",
]


class BookedTripContainerPhotoOut(BaseModel):
    pass  # removed


class TripContainerCreate(BaseModel):
    container_number: str
    cont_type: str


class TripContainerOut(BaseModel):
    id: int
    container_number: str
    cont_type: str

    model_config = ConfigDict(from_attributes=True)


class BookedTripCreate(BaseModel):
    trip_date: date
    client_id: int
    pickup_location_id: int
    dropoff_location_id: int
    containers: list[TripContainerCreate] = []
    vessel: str | None = None
    vehicle_plate: str | None = None
    operation_type: str | None = None
    work_type: str = ""
    revenue: int = Field(ge=0, default=0)
    matched_delivered_trip_ids: list[int] = []


class BookedTripUpdate(BaseModel):
    trip_date: date | None = None
    client_id: int | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    containers: list[TripContainerCreate] | None = None
    vessel: str | None = None
    vehicle_plate: str | None = None
    operation_type: str | None = None
    work_type: str | None = None
    revenue: int | None = None
    driver_salary: int | None = None
    allowance: int | None = None
    status: str | None = None
    matched_delivered_trip_ids: list[int] | None = None


class BookedTripOut(BaseModel):
    id: int
    trip_date: date
    client: ClientSummaryOut
    pickup_location: LocationSummaryOut
    dropoff_location: LocationSummaryOut
    containers: list[TripContainerOut] = []
    vessel: str | None = None
    vehicle_plate: str | None = None
    operation_type: str | None = None
    work_type: str = ""
    revenue: int
    status: str
    matched_delivered_trip_ids: list[int] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
