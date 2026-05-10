"""Map between the Identity domain entities and the ORM rows.

Keep the domain entity free of SQLAlchemy. Apply changes from the entity
back to the same managed ORM instance so the audit listener fires on
UPDATE rather than seeing a fresh INSERT.
"""

from __future__ import annotations

from app.contexts.identity.domain.entities import PushSubscription, User
from app.contexts.identity.domain.value_objects import (
    Endpoint,
    PushSubscriptionId,
    UserId,
    UserRole,
)
from app.contexts.identity.infrastructure.orm import (
    PushSubscriptionORM,
    UserORM,
)


# ── User ────────────────────────────────────────────────────────────


def user_orm_to_entity(orm: UserORM) -> User:
    return User(
        id=UserId(orm.id) if orm.id is not None else None,
        username=orm.username,
        hashed_password=orm.hashed_password,
        role=UserRole.from_str(orm.role),
        is_active=bool(orm.is_active),
        phone=orm.phone,
        email=orm.email,
        full_name=orm.full_name,
        cccd=orm.cccd,
        vendor=None,
        tractor_plate=None,
        created_at=orm.created_at,
        updated_at=orm.updated_at,
    )


def user_entity_to_orm(entity: User) -> UserORM:
    return UserORM(
        username=entity.username,
        hashed_password=entity.hashed_password,
        role=entity.role.value,
        is_active=entity.is_active,
        phone=entity.phone,
        email=entity.email,
        full_name=entity.full_name,
        cccd=entity.cccd,
    )


def apply_entity_to_orm(entity: User, orm: UserORM) -> None:
    """Mutate a managed ORM row in-place from the entity (for UPDATE)."""
    orm.username = entity.username
    orm.hashed_password = entity.hashed_password
    orm.role = entity.role.value
    orm.is_active = entity.is_active
    orm.phone = entity.phone
    orm.email = entity.email
    orm.full_name = entity.full_name
    orm.cccd = entity.cccd


# ── PushSubscription ────────────────────────────────────────────────


def push_orm_to_entity(orm: PushSubscriptionORM) -> PushSubscription:
    return PushSubscription(
        id=PushSubscriptionId(orm.id) if orm.id is not None else None,
        user_id=UserId(orm.user_id),
        endpoint=Endpoint(orm.endpoint),
        p256dh=orm.p256dh,
        auth=orm.auth,
        user_agent=orm.user_agent,
        created_at=orm.created_at,
        updated_at=orm.updated_at,
    )


def push_entity_to_orm(entity: PushSubscription) -> PushSubscriptionORM:
    return PushSubscriptionORM(
        user_id=int(entity.user_id),
        endpoint=str(entity.endpoint),
        p256dh=entity.p256dh,
        auth=entity.auth,
        user_agent=entity.user_agent,
    )


def apply_push_entity_to_orm(
    entity: PushSubscription, orm: PushSubscriptionORM
) -> None:
    orm.p256dh = entity.p256dh
    orm.auth = entity.auth
    orm.user_agent = entity.user_agent
