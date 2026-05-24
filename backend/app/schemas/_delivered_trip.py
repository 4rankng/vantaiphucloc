from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, model_validator

from ._client import ClientSummaryOut
from ._location import DriverSummaryOut, LocationSummaryOut
from ._vendor import VendorSummaryOut

__all__ = [
    "DeliveredTripCreate",
    "DeliveredTripUpdate",
    "DeliveredTripOut",
]


class DeliveredTripCreate(BaseModel):
    client_id: int
    pickup_location_id: int
    dropoff_location_id: int
    driver_id: int | None = None
    vendor_id: int | None = None
    vehicle_plate: str | None = None
    vessel: str | None = None
    work_type: str = ""
    cont_number: str | None = None
    cont_type: str | None = None
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
    client_id: int | None = None
    pickup_location_id: int | None = None
    dropoff_location_id: int | None = None
    driver_id: int | None = None
    vendor_id: int | None = None
    vehicle_plate: str | None = None
    vessel: str | None = None
    work_type: str | None = None
    cont_number: str | None = None
    cont_type: str | None = None
    revenue: int | None = None
    driver_salary: int | None = None


class DeliveredTripOut(BaseModel):
    id: int
    client: ClientSummaryOut
    pickup_location: LocationSummaryOut
    dropoff_location: LocationSummaryOut
    driver: DriverSummaryOut | None = None
    vendor: VendorSummaryOut | None = None
    vendor_id: int | None = None
    vehicle_plate: str = ""
    vessel: str | None = None
    work_type: str = ""
    cont_number: str | None = None
    cont_type: str | None = None
    revenue: int
    driver_salary: int
    trip_date: date | None = None
    booked_trip_id: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
