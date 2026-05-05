"""HTTP routes for push subscription register/unregister + VAPID key disclosure."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.contexts.identity.application import (
    PushRegisterInput,
    RegisterPushSubscription,
    UnregisterPushSubscription,
)
from app.contexts.identity.interface.dependencies import (
    get_register_push,
    get_unregister_push,
)
from app.contexts.identity.interface.schemas import (
    PushSubscriptionCreate,
    PushSubscriptionOut,
)
from app.core.deps import get_current_user
from app.models.base import User as UserORM

router = APIRouter(prefix="/push", tags=["push"])


@router.post("/subscriptions", response_model=PushSubscriptionOut, status_code=201)
async def register_subscription(
    body: PushSubscriptionCreate,
    current_user: UserORM = Depends(get_current_user),
    use_case: RegisterPushSubscription = Depends(get_register_push),
):
    sub = await use_case.execute(
        PushRegisterInput(
            user_id=current_user.id,
            endpoint=body.endpoint,
            p256dh=body.p256dh,
            auth=body.auth,
            user_agent=body.user_agent,
        )
    )
    assert sub.id is not None
    return PushSubscriptionOut(
        id=int(sub.id),
        endpoint=str(sub.endpoint),
        created_at=str(sub.created_at),
    )


@router.delete("/subscriptions", status_code=200)
async def unregister_subscription(
    body: PushSubscriptionCreate,
    current_user: UserORM = Depends(get_current_user),
    use_case: UnregisterPushSubscription = Depends(get_unregister_push),
):
    await use_case.execute(user_id=current_user.id, endpoint=body.endpoint)
    return {"message": "Subscription removed"}


@router.get("/vapid-public-key")
async def get_vapid_public_key():
    if not settings.VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=501, detail="Push notifications not configured")
    return {"public_key": settings.VAPID_PUBLIC_KEY}
