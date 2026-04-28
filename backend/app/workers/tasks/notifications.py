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
    """Send a notification to a user. Stores in Redis sorted set for polling."""
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

    key = f"notifications:user:{user_id}"
    await redis.zadd(key, {json.dumps(notification, ensure_ascii=False): now.timestamp()})
    await redis.zremrangebyrank(key, 0, -(101))

    logger.info("Notification stored: user=%s channel=%s title=%s", user_id, channel, title)
    return {"user_id": user_id, "channel": channel, "status": "stored"}
