import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.push import PushSubscription
from app.schemas.push import PushSubscriptionCreate, PushSubscriptionOut
from app.core.deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/push", tags=["push"])


@router.post("/subscriptions", response_model=PushSubscriptionOut, status_code=201)
async def register_subscription(
    body: PushSubscriptionCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PushSubscription).where(PushSubscription.endpoint == body.endpoint)
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.p256dh = body.p256dh
        existing.auth = body.auth
        existing.user_agent = body.user_agent
        await db.commit()
        await db.refresh(existing)
        return PushSubscriptionOut(id=existing.id, endpoint=existing.endpoint, created_at=str(existing.created_at))

    sub = PushSubscription(
        user_id=current_user.id,
        endpoint=body.endpoint,
        p256dh=body.p256dh,
        auth=body.auth,
        user_agent=body.user_agent,
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return PushSubscriptionOut(id=sub.id, endpoint=sub.endpoint, created_at=str(sub.created_at))


@router.delete("/subscriptions", status_code=200)
async def unregister_subscription(
    body: PushSubscriptionCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        sa_delete(PushSubscription).where(
            PushSubscription.user_id == current_user.id,
            PushSubscription.endpoint == body.endpoint,
        )
    )
    await db.commit()
    return {"message": "Subscription removed"}


@router.get("/vapid-public-key")
async def get_vapid_public_key():
    from app.config import settings
    if not settings.VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=501, detail="Push notifications not configured")
    return {"public_key": settings.VAPID_PUBLIC_KEY}
