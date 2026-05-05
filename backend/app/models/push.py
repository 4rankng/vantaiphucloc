"""Compatibility shim — see app.contexts.identity.infrastructure.orm."""

from app.contexts.identity.infrastructure.orm import (
    PushSubscriptionORM as PushSubscription,
)

__all__ = ["PushSubscription"]
