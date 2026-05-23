"""Concrete SQLAlchemy implementations of the identity-context repositories."""

from __future__ import annotations

from typing import Sequence

from sqlalchemy import delete as sa_delete
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.identity.domain.entities import PushSubscription, User
from app.contexts.identity.domain.repositories import (
    PushSubscriptionRepository,
    UserRepository,
)
from app.contexts.identity.domain.value_objects import Endpoint, UserId, UserRole
from app.contexts.identity.infrastructure.mappers import (
    apply_entity_to_orm,
    apply_push_entity_to_orm,
    push_entity_to_orm,
    push_orm_to_entity,
    user_entity_to_orm,
    user_orm_to_entity,
)
from app.contexts.identity.infrastructure.orm import (
    PushSubscriptionORM,
    UserORM,
)


class SqlUserRepository(UserRepository):
    """SQLAlchemy-backed UserRepository.

    Caller (use case orchestrator / interface layer) owns commit. We flush
    so IDs are assigned and the audit listener can fire.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    @property
    def session(self) -> AsyncSession:  # exposed for the unit-of-work commit
        return self._session

    # ── reads ───────────────────────────────────────────────────────

    async def _find_orm(self, **filters) -> UserORM | None:
        q = select(UserORM)
        for k, v in filters.items():
            q = q.where(getattr(UserORM, k) == v)
        result = await self._session.execute(q.limit(1))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: UserId) -> User | None:
        orm = await self._find_orm(id=int(user_id))
        return user_orm_to_entity(orm) if orm else None

    async def find_by_phone(self, phone: str) -> User | None:
        orm = await self._find_orm(phone=phone)
        return user_orm_to_entity(orm) if orm else None

    async def find_by_email(self, email: str) -> User | None:
        orm = await self._find_orm(email=email)
        return user_orm_to_entity(orm) if orm else None

    async def find_by_username(self, username: str) -> User | None:
        orm = await self._find_orm(username=username)
        return user_orm_to_entity(orm) if orm else None

    async def find_by_cccd(self, cccd: str) -> User | None:
        orm = await self._find_orm(cccd=cccd)
        return user_orm_to_entity(orm) if orm else None

    async def find_by_identifier(self, identifier: str) -> User | None:
        result = await self._session.execute(
            select(UserORM).where(
                or_(
                    UserORM.phone == identifier,
                    UserORM.email == identifier,
                    UserORM.username == identifier,
                )
            )
        )
        orm = result.scalar_one_or_none()
        return user_orm_to_entity(orm) if orm else None

    async def list(
        self,
        *,
        offset: int,
        limit: int,
        role_filter: UserRole | None,
        exclude_role: UserRole | None,
        search: str | None = None,
        sort_by: str | None = None,
        sort_order: str = 'asc',
    ) -> tuple[Sequence[User], int]:
        q = select(UserORM)
        cq = select(func.count(UserORM.id))
        if role_filter is not None:
            q = q.where(UserORM.role == role_filter.value)
            cq = cq.where(UserORM.role == role_filter.value)
        if exclude_role is not None:
            q = q.where(UserORM.role != exclude_role.value)
            cq = cq.where(UserORM.role != exclude_role.value)
        if search:
            pattern = f"%{search}%"
            search_cond = or_(
                UserORM.username.ilike(pattern),
                UserORM.full_name.ilike(pattern),
                UserORM.phone.ilike(pattern),
                UserORM.email.ilike(pattern),
                UserORM.cccd.ilike(pattern),
            )
            q = q.where(search_cond)
            cq = cq.where(search_cond)
        _SORTABLE = {
            'username': UserORM.username,
            'full_name': UserORM.full_name,
            'role': UserORM.role,
            'phone': UserORM.phone,
        }
        sort_col = _SORTABLE.get(sort_by or '')
        if sort_col is not None:
            order_expr = sort_col.asc() if sort_order == 'asc' else sort_col.desc()
            q = q.order_by(order_expr, UserORM.id.asc())
        else:
            q = q.order_by(UserORM.username.asc())
        q = q.offset(offset).limit(limit)

        rows = (await self._session.execute(q)).scalars().all()
        total = (await self._session.execute(cq)).scalar() or 0
        entities = [user_orm_to_entity(r) for r in rows]
        return entities, int(total)

    # ── writes ──────────────────────────────────────────────────────

    async def add(self, user: User) -> User:
        orm = user_entity_to_orm(user)
        self._session.add(orm)
        await self._session.flush()
        return user_orm_to_entity(orm)

    async def save(self, user: User) -> User:
        if user.id is None:
            return await self.add(user)
        orm = await self._find_orm(id=int(user.id))
        if orm is None:
            return await self.add(user)
        apply_entity_to_orm(user, orm)
        await self._session.flush()
        return user_orm_to_entity(orm)

    async def has_active_unmatched_delivered_trips(self, user_id: UserId) -> bool:
        # Cross-context read by raw SQL — keeps Operations import out of
        # this file's signature surface. We import the ORM lazily so the
        # Identity domain is unaffected.
        from app.models.domain import DeliveredTrip  # noqa: WPS433 (lazy)

        result = await self._session.execute(
            select(func.count(DeliveredTrip.id))
            .where(DeliveredTrip.driver_id == int(user_id))
            .where(DeliveredTrip.booked_trip_id.is_(None))
        )
        return (result.scalar() or 0) > 0


class SqlPushSubscriptionRepository(PushSubscriptionRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_endpoint(self, endpoint: Endpoint) -> PushSubscription | None:
        result = await self._session.execute(
            select(PushSubscriptionORM).where(
                PushSubscriptionORM.endpoint == str(endpoint)
            )
        )
        orm = result.scalar_one_or_none()
        return push_orm_to_entity(orm) if orm else None

    async def add(self, sub: PushSubscription) -> PushSubscription:
        orm = push_entity_to_orm(sub)
        self._session.add(orm)
        await self._session.flush()
        return push_orm_to_entity(orm)

    async def save(self, sub: PushSubscription) -> PushSubscription:
        if sub.id is None:
            return await self.add(sub)
        result = await self._session.execute(
            select(PushSubscriptionORM).where(
                PushSubscriptionORM.id == int(sub.id)
            )
        )
        orm = result.scalar_one_or_none()
        if orm is None:
            return await self.add(sub)
        apply_push_entity_to_orm(sub, orm)
        await self._session.flush()
        return push_orm_to_entity(orm)

    async def delete_by_user_and_endpoint(
        self, user_id: UserId, endpoint: Endpoint
    ) -> None:
        await self._session.execute(
            sa_delete(PushSubscriptionORM).where(
                PushSubscriptionORM.user_id == int(user_id),
                PushSubscriptionORM.endpoint == str(endpoint),
            )
        )
