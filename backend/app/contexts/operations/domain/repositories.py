"""Repository ABCs for the Operations context.

Use cases depend on these — concrete impls live in
`infrastructure/repositories.py` and use SQLAlchemy.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date
from typing import Sequence

from app.contexts.operations.domain.entities import TripOrder, WorkOrder
from app.contexts.operations.domain.value_objects import (
    TripOrderId,
    TripOrderStatus,
    WorkOrderId,
    WorkOrderStatus,
)


class TripOrderRepository(ABC):
    @abstractmethod
    async def get_by_id(self, tid: TripOrderId) -> TripOrder | None: ...

    @abstractmethod
    async def find_by_code(self, code: str) -> TripOrder | None: ...

    @abstractmethod
    async def list(
        self,
        *,
        offset: int,
        limit: int,
        partner_id: int | None = None,
        status: TripOrderStatus | None = None,
        trip_date_from: date | None = None,
        trip_date_to: date | None = None,
        unpriced_only: bool = False,
    ) -> tuple[Sequence[TripOrder], int]: ...

    @abstractmethod
    async def find_duplicate(
        self,
        *,
        partner_id: int,
        trip_date: date,
        container_number: str,
    ) -> TripOrder | None:
        """Idempotency check used by the customer-Excel import:
        `(partner_id, trip_date, container_number)`."""

    @abstractmethod
    async def add(self, t: TripOrder) -> TripOrder: ...

    @abstractmethod
    async def save(self, t: TripOrder) -> TripOrder: ...

    @abstractmethod
    async def delete(self, tid: TripOrderId) -> None: ...


class WorkOrderRepository(ABC):
    @abstractmethod
    async def get_by_id(self, wid: WorkOrderId) -> WorkOrder | None: ...

    @abstractmethod
    async def find_by_code(self, code: str) -> WorkOrder | None: ...

    @abstractmethod
    async def list(
        self,
        *,
        offset: int,
        limit: int,
        partner_id: int | None = None,
        driver_id: int | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        status: WorkOrderStatus | None = None,
    ) -> tuple[Sequence[WorkOrder], int]: ...

    @abstractmethod
    async def list_by_ids(
        self, ids: Sequence[WorkOrderId]
    ) -> Sequence[WorkOrder]: ...

    @abstractmethod
    async def add(self, w: WorkOrder) -> WorkOrder: ...

    @abstractmethod
    async def save(self, w: WorkOrder) -> WorkOrder: ...

    @abstractmethod
    async def set_status_bulk(
        self, ids: Sequence[WorkOrderId], status: WorkOrderStatus
    ) -> None: ...
