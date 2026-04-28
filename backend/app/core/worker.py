import logging

from arq import ArqRedis
from arq.connections import ConnectionPool

from app.config import settings

logger = logging.getLogger(__name__)

_arq_pool: ArqRedis | None = None


def _build_pool() -> ConnectionPool:
    return ConnectionPool.from_url(
        settings.REDIS_URL,
        max_connections=settings.REDIS_POOL_SIZE,
    )


async def init_arq_pool() -> None:
    global _arq_pool
    pool = _build_pool()
    _arq_pool = ArqRedis(pool_or_conn=pool)
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
