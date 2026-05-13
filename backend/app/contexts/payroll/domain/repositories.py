"""Payroll repository ABCs."""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date

from app.contexts.payroll.domain.base_salary import DriverSalaryConfig


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
