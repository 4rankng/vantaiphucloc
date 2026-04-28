import hashlib
import logging

from app.core.worker import get_arq_pool

logger = logging.getLogger(__name__)


async def enqueue(function_name: str, _job_id: str | None = None, **kwargs) -> str:
    """Enqueue a background job using the shared arq pool. Returns the job ID."""
    pool = get_arq_pool()
    job = await pool.enqueue_job(function_name, _job_id=_job_id, **kwargs)
    if job is None:
        if _job_id:
            logger.info("Job %s already queued (id=%s)", function_name, _job_id)
            return _job_id
        raise RuntimeError(
            f"Failed to enqueue job '{function_name}' — worker may not be running"
        )
    logger.info("Enqueued job %s (id=%s)", function_name, job.job_id)
    return job.job_id


def salary_recalc_job_id(company_id: int, driver_id: int, start_date: str, end_date: str) -> str:
    """Deterministic job ID to prevent duplicate salary recalculation enqueues."""
    raw = f"salary_recalc:{company_id}:{driver_id}:{start_date}:{end_date}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]
