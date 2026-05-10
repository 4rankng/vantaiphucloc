"""Payroll repository ABCs."""

from __future__ import annotations

from abc import ABC, abstractmethod


class SettingsRepository(ABC):
    """Simple key-value settings store backed by the ``settings`` table."""

    @abstractmethod
    async def get(self, key: str) -> str | None: ...

    @abstractmethod
    async def get_many(self, prefix: str) -> dict[str, str]: ...

    @abstractmethod
    async def set(self, key: str, value: str) -> None: ...
