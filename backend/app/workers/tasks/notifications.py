import logging

logger = logging.getLogger(__name__)


async def send_notification_task(
    ctx: dict,
    user_id: int,
    title: str,
    message: str,
    channel: str = "in_app",
) -> dict:
    """Send a notification to a user.

    Channels: in_app (default), email, sms.
    Placeholder implementation — logs the notification.
    """
    logger.info(
        "Notification sent: user=%s channel=%s title=%s",
        user_id, channel, title,
    )

    return {
        "user_id": user_id,
        "channel": channel,
        "status": "sent",
    }
