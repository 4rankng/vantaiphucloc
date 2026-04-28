import logging

from arq import create_pool
from arq.connections import RedisSettings, ArqRedis

from app.config import settings

logger = logging.getLogger(__name__)

_pool: ArqRedis | None = None


async def enqueue(function_name: str, **kwargs) -> str:
    """Enqueue a background job. Returns the job ID."""
    global _pool
    if _pool is None:
        _pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    job = await _pool.enqueue_job(function_name, **kwargs)
    if job is None:
        raise RuntimeError(f"Failed to enqueue job '{function_name}' — worker may not be running")
    logger.info("Enqueued job %s (id=%s)", function_name, job.job_id)
    return job.job_id
