"""Payroll repository ABCs."""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date

from app.contexts.payroll.domain.base_salary import DriverSalaryConfig
from app.contexts.payroll.domain.driver_salary import DriverSalaryRecord


class SettingsRepository(ABC):
    """Simple key-value settings store backed by the ``settings`` table."""

    @abstractmethod
    async def get(self, key: str) -> str | None: ...

    @abstractmethod
    async def get_many(self, prefix: str) -> dict[str, str]: ...

    @abstractmethod
    async def set(self, key: str, value: str) -> None: ...


class DriverSalaryConfigRepository(ABC):
    """Append-only store of per-driver base salary history."""

    @abstractmethod
    async def list_for_driver(self, driver_id: int) -> list[DriverSalaryConfig]: ...

    @abstractmethod
    async def latest_at_or_before(
        self, driver_id: int, target_date: date
    ) -> DriverSalaryConfig | None: ...

    @abstractmethod
    async def add(
        self,
        *,
        driver_id: int,
        base_salary: int,
        effective_from: date,
        note: str | None,
        created_by: int | None,
    ) -> DriverSalaryConfig: ...

    @abstractmethod
    async def list_history_for_drivers(
        self, driver_ids: list[int]
    ) -> dict[int, list[DriverSalaryConfig]]:
        """Batch-load full history for many drivers. Used by P&L dashboard."""
        ...


class DriverSalaryRepository(ABC):
    """Per-driver, per-period salary records."""

    @abstractmethod
    async def get_for_period(
        self, driver_id: int, from_date: date, to_date: date
    ) -> DriverSalaryRecord | None: ...

    @abstractmethod
    async def list_for_period(
        self, from_date: date, to_date: date
    ) -> list[DriverSalaryRecord]: ...

    @abstractmethod
    async def upsert(self, record: DriverSalaryRecord) -> DriverSalaryRecord: ...
