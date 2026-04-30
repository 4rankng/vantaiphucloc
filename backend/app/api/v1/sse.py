"""
SSE endpoint for real-time notifications.

Each connected client subscribes to a Redis channel `sse:user:{user_id}`.
When the notification worker publishes to that channel, the event is
forwarded to the client instantly via Server-Sent Events.

Authentication: token passed as query param (EventSource API can't send headers).
"""

import asyncio
import json
import logging

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.redis import get_redis
from app.database import get_db
from app.models.base import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sse", tags=["sse"])

HEARTBEAT_INTERVAL = 30  # seconds
MAX_CONNECTION_TIME = 300  # 5 min — client auto-reconnects


async def _event_stream(user_id: int):
    """Generate SSE events from Redis pub/sub for a specific user."""
    redis = await get_redis()
    pubsub = redis.pubsub()

    try:
        await pubsub.subscribe(f"sse:user:{user_id}")
        logger.info("SSE connected: user=%s", user_id)

        payload = json.dumps({"user_id": user_id})
        yield f"event: connected\ndata: {payload}\n\n"

        elapsed = 0
        while elapsed < MAX_CONNECTION_TIME:
            try:
                message = await asyncio.wait_for(
                    pubsub.get_message(ignore_subscribe_messages=True),
                    timeout=HEARTBEAT_INTERVAL,
                )
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"
                elapsed += HEARTBEAT_INTERVAL
                continue

            if message and message["type"] == "message":
                data = message["data"]
                if isinstance(data, bytes):
                    data = data.decode("utf-8")
                yield f"event: notification\ndata: {data}\n\n"
                elapsed = 0

    except asyncio.CancelledError:
        logger.info("SSE disconnected: user=%s", user_id)
    except Exception:
        logger.exception("SSE error for user=%s", user_id)
    finally:
        await pubsub.unsubscribe(f"sse:user:{user_id}")
        await pubsub.aclose()


@router.get("/notifications")
async def sse_notifications(
    current_user: User = Depends(get_current_user),
):
    """
    SSE stream for real-time notifications.

    Since EventSource doesn't support custom headers, we also support
    token via query param. The dependency `get_current_user` handles
    Bearer token from the Authorization header (set by the fetch polyfill).
    """
    return StreamingResponse(
        _event_stream(current_user.id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
