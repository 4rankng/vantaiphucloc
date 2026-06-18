"""Repository ABCs for the Operations context."""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date
from typing import Sequence

from app.contexts.operations.application.dto import (
    DuplicateCheckCandidate,
    DuplicateContainerGroup,
)
from app.contexts.operations.domain.entities import BookedTrip, DeliveredTrip
from app.contexts.operations.domain.value_objects import (
    BookedTripId,
    DeliveredTripId,
)


class BookedTripRepository(ABC):
    @abstractmethod
    async def get_by_id(self, tid: BookedTripId) -> BookedTrip | None: ...

    @abstractmethod
    async def list(
        self,
        *,
        offset: int,
        limit: int,
        client_id: int | None = None,
        matched: bool | None = None,
        trip_date_from: date | None = None,
        trip_date_to: date | None = None,
        unpriced_only: bool = False,
    ) -> tuple[Sequence[BookedTrip], int]: ...

    @abstractmethod
    async def find_duplicate(
        self,
        *,
        client_id: int,
        trip_date: date,
        container_number: str,
    ) -> BookedTrip | None: ...

    @abstractmethod
    async def add(self, t: BookedTrip) -> BookedTrip: ...

    @abstractmethod
    async def save(self, t: BookedTrip) -> BookedTrip: ...

    @abstractmethod
    async def delete(self, tid: BookedTripId) -> None: ...


class DeliveredTripRepository(ABC):
    @abstractmethod
    async def get_by_id(self, wid: DeliveredTripId) -> DeliveredTrip | None: ...

    @abstractmethod
    async def list(
        self,
        *,
        offset: int,
        limit: int,
        client_id: int | None = None,
        driver_id: int | None = None,
        vendor_id: int | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        matched: bool | None = None,
        sort_by: str | None = None,
        sort_order: str = "desc",
        search: str | None = None,
    ) -> tuple[Sequence[DeliveredTrip], int]: ...

    @abstractmethod
    async def list_by_ids(
        self, ids: Sequence[DeliveredTripId]
    ) -> Sequence[DeliveredTrip]: ...

    @abstractmethod
    async def find_duplicate_containers(
        self,
        *,
        date_from: date | None = None,
        date_to: date | None = None,
        client_id: int | None = None,
        driver_id: int | None = None,
    ) -> list[DuplicateContainerGroup]: ...

    @abstractmethod
    async def find_duplicate_candidates(
        self,
        *,
        driver_id: int,
        photo_hash: str | None = None,
        cont_number: str | None = None,
        pickup_location_id: int | None = None,
        dropoff_location_id: int | None = None,
        cont_type: str | None = None,
        since: date | None = None,
        exclude_trip_id: int | None = None,
    ) -> list[DuplicateCheckCandidate]: ...

    @abstractmethod
    async def add(self, w: DeliveredTrip) -> DeliveredTrip: ...

    @abstractmethod
    async def save(self, w: DeliveredTrip) -> DeliveredTrip: ...

    @abstractmethod
    async def delete(self, wid: DeliveredTripId) -> None: ...
