from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from ._vehicle import VehicleSummaryOut

__all__ = [
    "LocationCreate",
    "LocationUpdate",
    "LocationSummaryOut",
    "DriverSummaryOut",
    "LocationOut",
    "LocationNearbyOut",
    "LocationPinRequest",
    "LocationAliasOut",
    "CreateAliasRequest",
    "MergeLocationsRequest",
    "MergeLocationsResponse",
]


class LocationCreate(BaseModel):
    name: str


class LocationUpdate(BaseModel):
    name: str | None = None


class LocationSummaryOut(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class DriverSummaryOut(BaseModel):
    id: int
    name: str
    phone: str | None = None
    vehicle: VehicleSummaryOut | None = None

    model_config = ConfigDict(from_attributes=True)


class LocationOut(BaseModel):
    id: int
    name: str
    is_active: bool = True
    lat: float | None = None
    lng: float | None = None
    geocoded_at: datetime | None = None
    geocode_source: str | None = None
    pending_geocode: bool = True
    created_via: str | None = None
    location_review_needed: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LocationNearbyOut(BaseModel):
    id: int
    name: str
    lat: float | None = None
    lng: float | None = None
    distance_km: float | None = None

    model_config = ConfigDict(from_attributes=True)


class LocationPinRequest(BaseModel):
    name: str
    lat: float
    lng: float
    note: str | None = None


# ---------------------------------------------------------------------------
# LocationAlias
# ---------------------------------------------------------------------------


class LocationAliasOut(BaseModel):
    id: int
    location_id: int
    location_name: str | None = None
    alias: str
    alias_normalized: str
    source: str
    created_at: datetime
    created_by_id: int | None = None

    model_config = ConfigDict(from_attributes=True)


class CreateAliasRequest(BaseModel):
    location_id: int
    alias: str


class MergeLocationsRequest(BaseModel):
    source_location_id: int
    target_location_id: int


class MergeLocationsResponse(BaseModel):
    source_location_id: int
    target_location_id: int
    aliases_moved: int
    fk_updates: dict[str, int]
