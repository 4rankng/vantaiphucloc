import hashlib
import logging

from app.core.worker import get_arq_pool
from app.config import settings

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


def ocr_worker_job_id(job_id: int, attempt_count: int) -> str:
    return f"ocr:{job_id}:attempt:{attempt_count}"


async def enqueue_ocr_job(
    job_id: int,
    *,
    attempt_count: int = 0,
    defer_by: float = 0,
    unique: bool = True,
) -> str:
    pool = get_arq_pool()
    worker_job_id = ocr_worker_job_id(job_id, attempt_count) if unique else None
    job = await pool.enqueue_job(
        "process_ocr_job_task",
        job_id,
        _job_id=worker_job_id,
        _defer_by=defer_by if defer_by > 0 else None,
        _expires=settings.OCR_QUEUE_TIMEOUT_SECONDS,
    )
    if job is None:
        if worker_job_id is not None:
            return worker_job_id
        raise RuntimeError(f"Failed to enqueue OCR job '{job_id}'")
    logger.info(
        "Enqueued OCR job %s (worker_id=%s defer_by=%.2fs)",
        job_id,
        job.job_id,
        defer_by,
    )
    return job.job_id


def salary_recalc_job_id(driver_id: int, start_date: str, end_date: str) -> str:
    """Deterministic job ID to prevent duplicate salary recalculation enqueues."""
    raw = f"salary_recalc:{driver_id}:{start_date}:{end_date}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def import_preview_job_id(content_sha_prefix: str, default_trip_date_iso: str) -> str:
    """Deterministic job ID for a customer-Excel preview.

    Re-uploading the exact same file (sha256 of content) on the same
    day returns the same job id, so the second enqueue is a no-op and
    the user gets the previous result via polling.
    """
    raw = f"import_preview:{content_sha_prefix}:{default_trip_date_iso}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]
