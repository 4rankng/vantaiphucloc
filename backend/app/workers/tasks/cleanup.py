import logging

from redis.asyncio import Redis
from arq.connections import ArqRedis

logger = logging.getLogger(__name__)


async def cleanup_expired_sessions(ctx: dict) -> None:
    """Remove expired rate-limit and session entries from Redis.

    Redis TTL handles most expiration, but this sweeps stale sorted-set entries.
    """
    redis: ArqRedis = ctx["redis"]
    cursor = 0
    cleaned = 0
    while True:
        cursor, keys = await redis.scan(cursor, match="rl:*", count=100)
        if keys:
            await redis.delete(*keys)
            cleaned += len(keys)
        if cursor == 0:
            break

    if cleaned:
        logger.info("Cleaned up %d stale rate-limit keys", cleaned)


async def cleanup_old_audit_logs(ctx: dict) -> None:
    """Placeholder for cleaning up old audit logs.

    Will be implemented when audit logging is added.
    """
    logger.info("Audit log cleanup ran (no-op)")
