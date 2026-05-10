"""SQLAlchemy ORM models for the Identity context.

These are NOT domain entities. The domain entity (`app.contexts.identity.
domain.entities.User`) is pure Python; mappers in `mappers.py` translate
between the two. Other contexts FK to "users.id" by table name (string
ForeignKey), so this file owns the table even though it lives under the
identity package.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
)

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserORM(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), unique=True, index=True, nullable=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    username = Column(String(100), nullable=False, index=True)
    full_name = Column(String(200), nullable=True)
    cccd = Column(String(12), unique=True, nullable=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="driver", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=_utcnow,
        onupdate=_utcnow,
        nullable=False,
    )


class PushSubscriptionORM(Base):
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    endpoint = Column(String(500), nullable=False)
    p256dh = Column(String(200), nullable=False)
    auth = Column(String(100), nullable=False)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=_utcnow,
        onupdate=_utcnow,
        nullable=False,
    )
