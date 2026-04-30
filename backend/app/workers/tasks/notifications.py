import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


async def send_notification_task(
    ctx: dict,
    user_id: int,
    title: str,
    message: str,
    channel: str = "in_app",
) -> dict:
    """Send a notification to a user. Stores in Redis sorted set + publishes to SSE channel."""
    redis = ctx["redis"]
    now = datetime.now(timezone.utc)

    notification = {
        "user_id": user_id,
        "title": title,
        "message": message,
        "channel": channel,
        "created_at": now.isoformat(),
        "read": False,
    }

    # Store in sorted set for polling fallback
    key = f"notifications:user:{user_id}"
    await redis.zadd(key, {json.dumps(notification, ensure_ascii=False): now.timestamp()})
    await redis.zremrangebyrank(key, 0, -(101))

    # Publish to SSE channel so connected clients get it instantly
    sse_payload = json.dumps({
        "type": "notification",
        "data": {
            "title": title,
            "message": message,
            "channel": channel,
            "created_at": now.isoformat(),
        },
    }, ensure_ascii=False)
    await redis.publish(f"sse:user:{user_id}", sse_payload)

    logger.info("Notification stored+published: user=%s channel=%s title=%s", user_id, channel, title)

    try:
        from app.services.push_service import send_push_to_user
        push_count = await send_push_to_user(user_id, title, message)
        logger.info("Push sent to %d devices for user %s", push_count, user_id)
    except Exception as e:
        logger.error("Failed to send push for user %s: %s", user_id, e)

    return {"user_id": user_id, "channel": channel, "status": "stored"}
