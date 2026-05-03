import logging

from redis.asyncio import Redis
from arq.connections import ArqRedis

logger = logging.getLogger(__name__)


async def cleanup_expired_sessions(ctx: dict) -> None:
    """Remove stale rate-limit sorted-set entries that have leaked past their TTL.

    Most rate-limit keys are cleaned up by Redis TTL automatically, but
    this sweeps any entries in long-lived sorted sets that have no remaining
    members within the window.
    """
    redis: ArqRedis = ctx["redis"]
    cursor = 0
    cleaned = 0
    import time
    now = time.time()
    while True:
        cursor, keys = await redis.scan(cursor, match="rl:*", count=100)
        if keys:
            stale = []
            for key in keys:
                ttl = await redis.ttl(key)
                # TTL of -2 means key no longer exists; -1 means no expiry set (leaked)
                if ttl == -1:
                    stale.append(key)
            if stale:
                await redis.delete(*stale)
                cleaned += len(stale)
        if cursor == 0:
            break

    if cleaned:
        logger.info("Cleaned up %d stale rate-limit keys (no TTL)", cleaned)


async def cleanup_old_audit_logs(ctx: dict) -> None:
    """Delete audit_logs rows older than 1 year."""
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import delete, select, func
    from app.database import get_session
    from app.models.audit_log import AuditLog

    cutoff = datetime.now(timezone.utc) - timedelta(days=365)
    async with get_session() as db:
        result = await db.execute(
            delete(AuditLog).where(AuditLog.created_at < cutoff)
        )
        await db.commit()
        count = result.rowcount
        if count:
            logger.info("Cleaned up %d audit log entries older than 1 year", count)
