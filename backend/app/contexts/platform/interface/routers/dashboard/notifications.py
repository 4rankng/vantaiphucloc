"""Dashboard notifications endpoint."""

import json
import logging

from fastapi import APIRouter, Depends

from app.models.base import User
from app.core.deps import get_current_user
from app.core.worker import get_arq_pool

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/notifications")
async def get_notifications(
    current_user: User = Depends(get_current_user),
):
    try:
        redis = get_arq_pool()
        key = f"notifications:user:{current_user.id}"
        raw_items = await redis.zrevrange(key, 0, 49)
        notifications = []
        for i, raw in enumerate(raw_items):
            try:
                data = json.loads(raw)
                notifications.append(
                    {
                        "id": str(i),
                        "type": data.get("channel", "general"),
                        "title": data.get("title", ""),
                        "message": data.get("message", ""),
                        "time": data.get("created_at", ""),
                        "read": data.get("read", False),
                    }
                )
            except (json.JSONDecodeError, KeyError):
                logger.warning(
                    "Malformed notification entry for user %s", current_user.id
                )
                continue
        return notifications
    except RuntimeError:
        logger.warning("arq pool unavailable, returning empty notifications")
        return []
