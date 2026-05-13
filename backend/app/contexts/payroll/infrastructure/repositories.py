"""SQL implementations of Payroll repositories."""

from __future__ import annotations

from collections import defaultdict
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.payroll.domain.base_salary import DriverSalaryConfig
from app.contexts.payroll.domain.repositories import (
    DriverSalaryConfigRepository,
    SettingsRepository,
)
from app.contexts.payroll.infrastructure.orm import (
    DriverSalaryConfigORM,
    SettingORM,
)


def _to_domain(row: DriverSalaryConfigORM) -> DriverSalaryConfig:
    return DriverSalaryConfig(
        id=row.id,
        driver_id=row.driver_id,
        base_salary=row.base_salary,
        effective_from=row.effective_from,
        note=row.note,
    )


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


class SqlDriverSalaryConfigRepository(DriverSalaryConfigRepository):
    """Append-only base-salary history backed by ``driver_salary_configs``."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_driver(self, driver_id: int) -> list[DriverSalaryConfig]:
        rows = (
            await self.session.execute(
                select(DriverSalaryConfigORM)
                .where(DriverSalaryConfigORM.driver_id == driver_id)
                .order_by(DriverSalaryConfigORM.effective_from.desc())
            )
        ).scalars().all()
        return [_to_domain(r) for r in rows]

    async def latest_at_or_before(
        self, driver_id: int, target_date: date
    ) -> DriverSalaryConfig | None:
        row = (
            await self.session.execute(
                select(DriverSalaryConfigORM)
                .where(
                    DriverSalaryConfigORM.driver_id == driver_id,
                    DriverSalaryConfigORM.effective_from <= target_date,
                )
                .order_by(DriverSalaryConfigORM.effective_from.desc())
                .limit(1)
            )
        ).scalars().first()
        return _to_domain(row) if row else None

    async def add(
        self,
        *,
        driver_id: int,
        base_salary: int,
        effective_from: date,
        note: str | None,
        created_by: int | None,
    ) -> DriverSalaryConfig:
        # Idempotent on (driver_id, effective_from): update the existing row
        # rather than violating the unique constraint.
        existing = (
            await self.session.execute(
                select(DriverSalaryConfigORM).where(
                    DriverSalaryConfigORM.driver_id == driver_id,
                    DriverSalaryConfigORM.effective_from == effective_from,
                )
            )
        ).scalars().first()

        if existing is not None:
            existing.base_salary = base_salary
            existing.note = note
            row = existing
        else:
            row = DriverSalaryConfigORM(
                driver_id=driver_id,
                base_salary=base_salary,
                effective_from=effective_from,
                note=note,
                created_by=created_by,
            )
            self.session.add(row)

        await self.session.commit()
        await self.session.refresh(row)
        return _to_domain(row)

    async def list_history_for_drivers(
        self, driver_ids: list[int]
    ) -> dict[int, list[DriverSalaryConfig]]:
        if not driver_ids:
            return {}
        rows = (
            await self.session.execute(
                select(DriverSalaryConfigORM)
                .where(DriverSalaryConfigORM.driver_id.in_(driver_ids))
                .order_by(
                    DriverSalaryConfigORM.driver_id,
                    DriverSalaryConfigORM.effective_from.desc(),
                )
            )
        ).scalars().all()
        out: dict[int, list[DriverSalaryConfig]] = defaultdict(list)
        for r in rows:
            out[r.driver_id].append(_to_domain(r))
        return dict(out)
