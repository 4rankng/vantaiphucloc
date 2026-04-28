import logging

from app.core.worker import get_arq_pool

logger = logging.getLogger(__name__)


async def enqueue(function_name: str, **kwargs) -> str:
    """Enqueue a background job using the shared arq pool. Returns the job ID."""
    pool = get_arq_pool()
    job = await pool.enqueue_job(function_name, **kwargs)
    if job is None:
        raise RuntimeError(
            f"Failed to enqueue job '{function_name}' — worker may not be running"
        )
    logger.info("Enqueued job %s (id=%s)", function_name, job.job_id)
    return job.job_id
