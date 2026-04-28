import logging

from arq import ArqRedis
from arq.connections import RedisSettings, RedisType

from app.config import settings

logger = logging.getLogger(__name__)

_arq_pool: ArqRedis | None = None


def _parse_redis_settings() -> RedisSettings:
    """Convert REDIS_URL into arq RedisSettings."""
    from urllib.parse import urlparse

    parsed = urlparse(settings.REDIS_URL)
    return RedisSettings(
        host=parsed.hostname or "localhost",
        port=parsed.port or 6379,
        database=int(parsed.path.lstrip("/") or 0),
        password=parsed.password,
    )


async def init_arq_pool() -> None:
    """Create the shared arq connection pool. Call once during app startup."""
    global _arq_pool
    redis_settings = _parse_redis_settings()
    _arq_pool = ArqRedis(
        pool_size=settings.REDIS_POOL_SIZE,
        redis_settings=redis_settings,
    )
    await _arq_pool.ping()
    logger.info("arq pool connected (%s)", settings.REDIS_URL)


async def close_arq_pool() -> None:
    """Close the arq pool. Call during app shutdown."""
    global _arq_pool
    if _arq_pool:
        await _arq_pool.aclose()
        _arq_pool = None
        logger.info("arq pool closed")


def get_arq_pool() -> ArqRedis:
    """Return the shared arq pool. Raises if not initialized."""
    if _arq_pool is None:
        raise RuntimeError(
            "arq pool not initialized — call init_arq_pool() during lifespan"
        )
    return _arq_pool
