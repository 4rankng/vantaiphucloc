"""SQL implementations of Payroll repositories."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.payroll.domain.repositories import SettingsRepository
from app.contexts.payroll.infrastructure.orm import SettingORM


class SqlSettingsRepository(SettingsRepository):
    """Key-value settings backed by the ``settings`` table."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, key: str) -> str | None:
        row = await self.session.get(SettingORM, key)
        return row.value if row else None

    async def get_many(self, prefix: str) -> dict[str, str]:
        """Return all settings whose key starts with *prefix*."""
        rows = (
            await self.session.execute(
                select(SettingORM).where(SettingORM.key.startswith(prefix))
            )
        ).scalars().all()
        return {r.key: r.value for r in rows}

    async def set(self, key: str, value: str) -> None:
        row = await self.session.get(SettingORM, key)
        if row is None:
            self.session.add(SettingORM(key=key, value=value))
        else:
            row.value = value
        await self.session.commit()
