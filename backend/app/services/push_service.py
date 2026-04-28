import json
import logging
import asyncio

from pywebpush import webpush, WebPushException

from app.config import settings
from app.database import async_session
from app.models.push import PushSubscription
from sqlalchemy import select, delete as sa_delete

logger = logging.getLogger(__name__)


def _get_vapid_claims() -> dict:
    return {"sub": f"mailto:{settings.VAPID_CLAIMS_EMAIL}"}


async def send_push_to_user(user_id: int, title: str, body: str) -> int:
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_PUBLIC_KEY:
        return 0

    async with async_session() as db:
        result = await db.execute(
            select(PushSubscription).where(PushSubscription.user_id == user_id)
        )
        subscriptions = result.scalars().all()

    sent = 0
    for sub in subscriptions:
        try:
            await asyncio.to_thread(
                webpush,
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=json.dumps({"title": title, "body": body}),
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims=_get_vapid_claims(),
                ttl=86400,
            )
            sent += 1
        except WebPushException as e:
            logger.warning("Push failed for sub %s: %s", sub.id, e)
            if e.response and e.response.status_code == 410:
                async with async_session() as db:
                    await db.execute(sa_delete(PushSubscription).where(PushSubscription.id == sub.id))
                    await db.commit()
        except Exception as e:
            logger.error("Unexpected push error for sub %s: %s", sub.id, e)

    return sent
