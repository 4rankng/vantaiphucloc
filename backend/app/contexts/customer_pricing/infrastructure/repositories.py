"""Concrete repository implementations for the Customer & Pricing context.

Backed by SQLAlchemy AsyncSession. Use cases see only the ABCs from
`domain.repositories`.
"""

from __future__ import annotations

from typing import Sequence

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.customer_pricing.domain.entities import (
    Location,
    Partner,
)
from app.contexts.customer_pricing.domain.repositories import (
    LocationRepository,
    PartnerRepository,
)
from app.contexts.customer_pricing.domain.value_objects import (
    LocationId,
    PartnerId,
)
from app.contexts.customer_pricing.infrastructure.mappers import (
    alias_to_orm,
    client_to_domain,
    client_to_orm,
    location_to_domain,
    location_to_orm,
)
from app.contexts.customer_pricing.infrastructure.orm import (
    LocationAliasORM,
    LocationORM,
    ClientORM,
)


# -- Partner ---------------------------------------------------------


class SqlClientRepository(PartnerRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, pid: PartnerId) -> Partner | None:
        orm = (
            await self.session.execute(
                select(ClientORM).where(ClientORM.id == int(pid))
            )
        ).scalar_one_or_none()
        return client_to_domain(orm) if orm else None

    async def find_by_code(self, code: str) -> Partner | None:
        orm = (
            await self.session.execute(select(ClientORM).where(ClientORM.code == code))
        ).scalar_one_or_none()
        return client_to_domain(orm) if orm else None

    async def find_by_name(self, name: str) -> Partner | None:
        orm = (
            await self.session.execute(select(ClientORM).where(ClientORM.name == name))
        ).scalar_one_or_none()
        return client_to_domain(orm) if orm else None

    async def list(
        self,
        *,
        offset: int,
        limit: int,
        partner_type: str | None = None,
        active_only: bool = True,
        search: str | None = None,
        sort_by: str | None = None,
        sort_order: str = "asc",
    ) -> tuple[Sequence[Partner], int]:
        from sqlalchemy import or_

        q = select(ClientORM)
        if active_only:
            q = q.where(ClientORM.is_active.is_(True))
        if search:
            from app.core.vi_search import vi_ilike

            q = q.where(
                or_(
                    vi_ilike(ClientORM.name, search),
                    vi_ilike(ClientORM.code, search),
                    vi_ilike(ClientORM.phone, search),
                    vi_ilike(ClientORM.tax_code, search),
                    vi_ilike(ClientORM.address, search),
                    vi_ilike(ClientORM.contact_person, search),
                )
            )
        total = (
            await self.session.scalar(select(func.count()).select_from(q.subquery()))
            or 0
        )
        _SORTABLE = {
            "name": ClientORM.name,
            "code": ClientORM.code,
            "created_at": ClientORM.id,  # proxy; no created_at column on clients
        }
        sort_col = _SORTABLE.get(sort_by or "")
        if sort_col is not None:
            order_expr = sort_col.asc() if sort_order == "asc" else sort_col.desc()
            q = q.order_by(order_expr, ClientORM.id.asc())
        else:
            q = q.order_by(ClientORM.name.asc())
        q = q.offset(offset).limit(limit)
        rows = list((await self.session.execute(q)).scalars().all())
        return [client_to_domain(r) for r in rows], int(total)

    async def add(self, p: Partner) -> Partner:
        orm = client_to_orm(p)
        self.session.add(orm)
        await self.session.flush()
        return client_to_domain(orm)

    async def save(self, p: Partner) -> Partner:
        existing = (
            await self.session.execute(
                select(ClientORM).where(ClientORM.id == int(p.id))
            )
        ).scalar_one()
        client_to_orm(p, existing)
        await self.session.flush()
        return client_to_domain(existing)


# -- Location --------------------------------------------------------


class SqlLocationRepository(LocationRepository):
    # Historical trip rows — detaching the location (NULL FK) is safe: the
    # trip record survives and simply loses its endpoint name.
    _TRIP_REFS = (
        ("booked_trips", "pickup_location_id"),
        ("booked_trips", "dropoff_location_id"),
        ("delivered_trips", "pickup_location_id"),
        ("delivered_trips", "dropoff_location_id"),
    )
    # Pricing rules lose their meaning without both endpoints, so a row that
    # still references the location blocks deletion (409).
    _PRICING_REFS = (
        ("route_pricings", "pickup_location_id"),
        ("route_pricings", "dropoff_location_id"),
        ("vendor_route_pricings", "pickup_location_id"),
        ("vendor_route_pricings", "dropoff_location_id"),
    )

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _aliases_for(self, lid: int) -> list[LocationAliasORM]:
        rows = (
            (
                await self.session.execute(
                    select(LocationAliasORM).where(LocationAliasORM.location_id == lid)
                )
            )
            .scalars()
            .all()
        )
        return list(rows)

    async def get_by_id(self, lid: LocationId) -> Location | None:
        orm = (
            await self.session.execute(
                select(LocationORM).where(LocationORM.id == int(lid))
            )
        ).scalar_one_or_none()
        if orm is None:
            return None
        aliases = await self._aliases_for(orm.id)
        return location_to_domain(orm, aliases)

    async def find_by_name(self, name: str) -> Location | None:
        orm = (
            await self.session.execute(
                select(LocationORM).where(LocationORM.name == name)
            )
        ).scalar_one_or_none()
        if orm is None:
            return None
        aliases = await self._aliases_for(orm.id)
        return location_to_domain(orm, aliases)

    async def list_active(self, *, limit: int = 10000) -> Sequence[Location]:
        rows = list(
            (
                await self.session.execute(
                    select(LocationORM)
                    .where(LocationORM.is_active.is_(True))
                    .order_by(LocationORM.name.asc())
                    .limit(limit)
                )
            )
            .scalars()
            .all()
        )
        return [location_to_domain(r) for r in rows]

    async def list(
        self, *, offset: int, limit: int, active_only: bool = True
    ) -> tuple[Sequence[Location], int]:
        q = select(LocationORM)
        if active_only:
            q = q.where(LocationORM.is_active.is_(True))
        total = (
            await self.session.scalar(select(func.count()).select_from(q.subquery()))
            or 0
        )
        q = q.order_by(LocationORM.name.asc()).offset(offset).limit(limit)
        rows = list((await self.session.execute(q)).scalars().all())
        return [location_to_domain(r) for r in rows], int(total)

    async def add(self, loc: Location) -> Location:
        orm = location_to_orm(loc)
        self.session.add(orm)
        await self.session.flush()
        # Persist aliases tied to the new id
        new_aliases: list[LocationAliasORM] = []
        for a in loc.aliases:
            a_orm = alias_to_orm(a)
            a_orm.location_id = orm.id
            self.session.add(a_orm)
            new_aliases.append(a_orm)
        if new_aliases:
            await self.session.flush()
        return location_to_domain(orm, new_aliases)

    async def save(self, loc: Location) -> Location:
        existing = (
            await self.session.execute(
                select(LocationORM).where(LocationORM.id == int(loc.id))
            )
        ).scalar_one()
        location_to_orm(loc, existing)
        # Reconcile aliases by alias_normalized
        existing_aliases = await self._aliases_for(existing.id)
        existing_by_norm = {a.alias_normalized: a for a in existing_aliases}
        for a in loc.aliases:
            if a.alias_normalized in existing_by_norm:
                continue
            a_orm = alias_to_orm(a)
            a_orm.location_id = existing.id
            self.session.add(a_orm)
        await self.session.flush()
        refreshed = await self._aliases_for(existing.id)
        return location_to_domain(existing, refreshed)

    async def has_pricing_references(self, lid: LocationId) -> tuple[str, str] | None:
        for table, col in self._PRICING_REFS:
            row = await self.session.execute(
                text(f"SELECT 1 FROM {table} WHERE {col} = :lid LIMIT 1"),
                {"lid": int(lid)},
            )
            if row.scalar():
                return (table, col)
        return None

    async def clear_trip_references(self, lid: LocationId) -> None:
        """Detach the location from historical trip rows by NULLing their
        pickup/dropoff FKs. No-op when no trips reference it."""
        for table, col in self._TRIP_REFS:
            await self.session.execute(
                text(f"UPDATE {table} SET {col} = NULL WHERE {col} = :lid"),
                {"lid": int(lid)},
            )
