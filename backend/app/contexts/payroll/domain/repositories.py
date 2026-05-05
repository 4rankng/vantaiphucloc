"""Payroll repository ABCs."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date

from app.contexts.payroll.domain.entities import SalaryPeriod, SalaryPeriodConfig
from app.contexts.payroll.domain.value_objects import (
    DriverId,
    SalaryPeriodId,
)


@dataclass
class SalaryPeriodFilter:
    driver_id: DriverId | None = None
    active_only: bool = False
    start_date: date | None = None
    end_date: date | None = None


@dataclass
class SalaryPeriodPage:
    items: list[SalaryPeriod]
    total: int


class SalaryPeriodRepository(ABC):
    @abstractmethod
    async def get(self, period_id: SalaryPeriodId) -> SalaryPeriod | None: ...

    @abstractmethod
    async def find_by_driver_and_dates(
        self, *, driver_id: DriverId, start_date: date, end_date: date
    ) -> SalaryPeriod | None: ...

    @abstractmethod
    async def list_paged(
        self,
        *,
        filter_: SalaryPeriodFilter,
        page: int,
        page_size: int,
    ) -> SalaryPeriodPage: ...

    @abstractmethod
    async def list_for_period(
        self, *, start_date: date, end_date: date, active_only: bool = True
    ) -> list[SalaryPeriod]: ...

    @abstractmethod
    async def upsert(self, period: SalaryPeriod) -> SalaryPeriod: ...

    @abstractmethod
    async def update(self, period: SalaryPeriod) -> SalaryPeriod: ...


class SalaryPeriodConfigRepository(ABC):
    @abstractmethod
    async def get_current(self) -> SalaryPeriodConfig | None: ...

    @abstractmethod
    async def upsert(self, config: SalaryPeriodConfig) -> SalaryPeriodConfig: ...
