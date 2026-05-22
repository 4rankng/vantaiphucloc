from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, model_validator

from ._client import ClientSummaryOut
from ._location import DriverSummaryOut, LocationSummaryOut
from ._vehicle import VehicleSummaryOut

__all__ = [
    "ContainerCreate",
    "ContainerOut",
    "DeliveredTripCreate",
    "DeliveredTripUpdate",
    "DeliveredTripOut",
]


class ContainerCreate(BaseModel):
    container_number: str
    cont_type: str
    photo_url: str | None = None
    photo_lat: float | None = None
    photo_lng: float | None = None
    photo_timestamp: datetime | None = None


class ContainerOut(BaseModel):
    id: int
    container_number: str
    cont_type: str
    photo_url: str | None = None
    photo_lat: float | None = None
    photo_lng: float | None = None
    photo_timestamp: datetime | None = None
    photo_address: str | None = None

    model_config = ConfigDict(from_attributes=True)


class DeliveredTripCreate(BaseModel):
    containers: list[ContainerCreate]
    client_id: int
    pickup_location_id: int
    dropoff_location_id: int
    driver_id: int | None = None
    vendor_id: int | None = None
    vehicle_id: int | None = None
    vessel: str | None = None
    operation_type: str | None = None
    work_type: str = ""
    gps_lat: float | None = None
    gps_lng: float | None = None
    trip_date: date | None = None

    @model_validator(mode="after")
    def _check_driver_xor_vendor(self) -> "DeliveredTripCreate":
        has_driver = self.driver_id is not None
        has_vendor = self.vendor_id is not None
        if has_driver == has_vendor:
            raise ValueError(
                "Exactly one of driver_id or vendor_id must be provided."
            )
        return self


class DeliveredTripUpdate(BaseModel):
    containers: list[ContainerCreate] | None = None
    client_id: int | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    driver_id: int | None = None
    vendor_id: int | None = None
    vehicle_id: int | None = None
    vessel: str | None = None
    operation_type: str | None = None
    work_type: str | None = None
    gps_lat: float | None = None
    gps_lng: float | None = None
    revenue: int | None = None
    driver_salary: int | None = None
    allowance: int | None = None
    status: str | None = None


class DeliveredTripOut(BaseModel):
    id: int
    client: ClientSummaryOut
    pickup_location: LocationSummaryOut
    dropoff_location: LocationSummaryOut
    driver: DriverSummaryOut | None = None
    vendor_id: int | None = None
    vehicle: VehicleSummaryOut | None = None
    vessel: str | None = None
    operation_type: str | None = None
    work_type: str = ""
    gps_lat: float | None
    gps_lng: float | None
    gps_address: str | None
    revenue: int
    driver_salary: int
    allowance: int
    trip_date: date | None = None
    status: str
    containers: list[ContainerOut] = []
    matched_trip_count: int = 0
    booked_trip_id: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
