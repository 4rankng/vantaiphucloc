"""Repository ABCs for the Operations context."""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date
from typing import Sequence

from app.contexts.operations.domain.entities import BookedTrip, DeliveredTrip
from app.contexts.operations.domain.value_objects import (
    BookedTripId,
    BookedTripStatus,
    DeliveredTripId,
    DeliveredTripStatus,
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
        status: BookedTripStatus | None = None,
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
        date_from: date | None = None,
        date_to: date | None = None,
        status: DeliveredTripStatus | None = None,
    ) -> tuple[Sequence[DeliveredTrip], int]: ...

    @abstractmethod
    async def list_by_ids(
        self, ids: Sequence[DeliveredTripId]
    ) -> Sequence[DeliveredTrip]: ...

    @abstractmethod
    async def add(self, w: DeliveredTrip) -> DeliveredTrip: ...

    @abstractmethod
    async def save(self, w: DeliveredTrip) -> DeliveredTrip: ...

    @abstractmethod
    async def set_status_bulk(
        self, ids: Sequence[DeliveredTripId], status: DeliveredTripStatus
    ) -> None: ...
