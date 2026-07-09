import asyncio
import logging
import random
from datetime import timedelta, timezone
from pathlib import Path

from app.config import settings
from app.contexts.operations.infrastructure.ocr import extract_container_numbers
from app.database import get_session
from app.models.domain import OcrDriverRequest, OcrJob, OcrRequest
from app.utils.dates import utcnow

logger = logging.getLogger(__name__)

TERMINAL_STATUSES = {"succeeded", "failed"}

_ACQUIRE_SLOTS_SCRIPT = """
local global_count = tonumber(redis.call('GET', KEYS[1]) or '0')
local user_count = tonumber(redis.call('GET', KEYS[2]) or '0')
local global_limit = tonumber(ARGV[1])
local user_limit = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
if global_count >= global_limit or user_count >= user_limit then
  return 0
end
redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], ttl)
redis.call('INCR', KEYS[2])
redis.call('EXPIRE', KEYS[2], ttl)
return 1
"""

_RELEASE_SLOT_SCRIPT = """
for i, key in ipairs(KEYS) do
  local count = tonumber(redis.call('GET', key) or '0')
  if count <= 1 then
    redis.call('DEL', key)
  else
    redis.call('DECR', key)
  end
end
return 1
"""


def _slot_keys(user_id: int | None) -> tuple[str, str]:
    user_key = f"ocr:openrouter:slots:user:{user_id or 'anonymous'}"
    return "ocr:openrouter:slots:global", user_key


async def _try_acquire_slots(redis, user_id: int | None) -> bool:
    global_key, user_key = _slot_keys(user_id)
    acquired = await redis.eval(
        _ACQUIRE_SLOTS_SCRIPT,
        2,
        global_key,
        user_key,
        settings.OCR_OPENROUTER_GLOBAL_CONCURRENCY,
        settings.OCR_PER_USER_CONCURRENCY,
        settings.OCR_CONCURRENCY_SLOT_TTL_SECONDS,
    )
    return int(acquired) == 1


async def _release_slots(redis, user_id: int | None) -> None:
    global_key, user_key = _slot_keys(user_id)
    await redis.eval(_RELEASE_SLOT_SCRIPT, 2, global_key, user_key)


def _photo_url_to_path(url: str) -> Path:
    if not url.startswith("/photos/"):
        raise ValueError("OCR image path must be a local /photos URL")
    relative = url.removeprefix("/photos/")
    target = (Path(settings.PHOTO_STORAGE_ROOT) / relative).resolve()
    root = Path(settings.PHOTO_STORAGE_ROOT).resolve()
    target.relative_to(root)
    return target


def _retry_delay_seconds(
    retry_after_seconds: float | None, attempt_count: int
) -> float:
    if retry_after_seconds is not None:
        return max(1.0, retry_after_seconds)
    exponent = max(0, attempt_count - 1)
    base = settings.OCR_RETRY_INITIAL_DELAY_SECONDS * (2**exponent)
    capped = min(base, settings.OCR_RETRY_MAX_DELAY_SECONDS)
    jitter = random.uniform(0, min(2.0, capped * 0.25))
    return min(settings.OCR_RETRY_MAX_DELAY_SECONDS, capped + jitter)


def _job_age_seconds(job: OcrJob) -> float:
    created_at = job.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return (utcnow() - created_at).total_seconds()


def _job_elapsed_ms(job: OcrJob) -> int:
    created_at = job.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return max(0, int((utcnow() - created_at).total_seconds() * 1000))


def _delta_ms(start, end) -> int:
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    return max(0, int((end - start).total_seconds() * 1000))


def _result_numbers(result: dict) -> list[str]:
    numbers = result.get("container_numbers") or []
    return [str(n) for n in numbers if str(n).strip()]


async def _enqueue_retry(
    job: OcrJob,
    delay_seconds: float,
    *,
    unique: bool = True,
) -> None:
    from app.workers import enqueue_ocr_job

    await enqueue_ocr_job(
        int(job.id),
        attempt_count=job.attempt_count,
        defer_by=delay_seconds,
        unique=unique,
    )


async def _mark_failed(
    job_id: int,
    error_message: str,
    *,
    dead_letter: bool = False,
) -> dict:
    now = utcnow()
    async with get_session() as db:
        job = await db.get(OcrJob, job_id)
        if job is None:
            return {"status": "not_found"}
        job.status = "failed"
        job.error_message = error_message[:1024]
        job.finished_at = now
        job.next_retry_at = None
        if dead_letter:
            job.dead_lettered_at = now
        logger.warning(
            "[OCR] job %s failed dead_letter=%s attempts=%s error=%s",
            job_id,
            dead_letter,
            job.attempt_count,
            error_message,
        )
        return {"status": "failed", "job_id": job_id, "error": error_message}


async def _record_provider_attempts(
    job: OcrJob,
    result: dict,
) -> None:
    attempts = result.get("attempts") or []
    if not attempts:
        return
    async with get_session() as db:
        for attempt in attempts:
            db.add(
                OcrRequest(
                    provider=attempt["provider"],
                    model=attempt.get("model"),
                    success=bool(attempt.get("success")),
                    container_numbers_found=int(
                        attempt.get("container_numbers_found", 0)
                    ),
                    latency_ms=attempt.get("latency_ms"),
                    error=(attempt.get("error") or "")[:512] or None,
                    user_id=job.user_id,
                )
            )


async def _record_driver_request(
    job_id: int,
    result: dict,
    latency_ms: int | None,
) -> None:
    async with get_session() as db:
        job = await db.get(OcrJob, job_id)
        if job is None:
            return
        provider_attempts = len(result.get("attempts") or [])
        db.add(
            OcrDriverRequest(
                user_id=job.user_id,
                success=bool(result.get("success")),
                attempts=max(job.attempt_count, provider_attempts)
                if provider_attempts > 0
                else 0,
                numbers_found=len(_result_numbers(result)),
                latency_ms=latency_ms,
                provider=result.get("provider"),
                cont_photo_url=job.image_path if not result.get("success") else None,
                cont_photo_hash=job.image_hash if not result.get("success") else None,
            )
        )


async def _load_processable_job(job_id: int) -> OcrJob | None:
    async with get_session() as db:
        job = await db.get(OcrJob, job_id)
        if job is None:
            logger.warning("[OCR] job %s not found", job_id)
            return None
        if job.status in TERMINAL_STATUSES:
            return None
        if _job_age_seconds(job) > settings.OCR_QUEUE_TIMEOUT_SECONDS:
            await _mark_failed(
                job_id,
                "OCR job timed out in queue",
                dead_letter=True,
            )
            return None
        return job


async def process_ocr_job_task(ctx: dict, job_id: int) -> dict:
    redis = ctx["redis"]
    job = await _load_processable_job(job_id)
    if job is None:
        return {"status": "skipped", "job_id": job_id}

    if not await _try_acquire_slots(redis, job.user_id):
        delay = settings.OCR_QUEUE_RETRY_DELAY_SECONDS
        async with get_session() as db:
            locked = await db.get(OcrJob, job_id)
            if locked is not None and locked.status not in TERMINAL_STATUSES:
                locked.status = "queued"
                locked.error_message = "OCR queue busy"
                locked.next_retry_at = utcnow() + timedelta(seconds=delay)
        await _enqueue_retry(job, delay, unique=False)
        logger.info(
            "[OCR] job %s requeued because concurrency slots are full delay=%.2fs",
            job_id,
            delay,
        )
        return {"status": "queued", "job_id": job_id, "reason": "slots_full"}

    t_start = asyncio.get_running_loop().time()
    try:
        async with get_session() as db:
            processing = await db.get(OcrJob, job_id)
            if processing is None or processing.status in TERMINAL_STATUSES:
                return {"status": "skipped", "job_id": job_id}
            processing.status = "processing"
            processing.error_message = None
            processing.next_retry_at = None
            processing.started_at = processing.started_at or utcnow()
            processing.attempt_count += 1
            current_attempt = processing.attempt_count
            job.attempt_count = current_attempt

        image_path = _photo_url_to_path(job.image_path)
        image_bytes = image_path.read_bytes()
        result = await asyncio.wait_for(
            extract_container_numbers(image_bytes, "image/jpeg"),
            timeout=settings.OCR_JOB_TIMEOUT_SECONDS,
        )
        processing_ms = int((asyncio.get_running_loop().time() - t_start) * 1000)
        end_to_end_ms = _job_elapsed_ms(job)
        await _record_provider_attempts(job, result)

        numbers = _result_numbers(result)
        if result.get("success"):
            await _record_driver_request(job_id, result, end_to_end_ms)
            now = utcnow()
            async with get_session() as db:
                succeeded = await db.get(OcrJob, job_id)
                if succeeded is not None:
                    succeeded.status = "succeeded"
                    succeeded.result_text = "\n".join(numbers)
                    succeeded.result_payload = {
                        "success": True,
                        "container_numbers": numbers,
                        "provider": result.get("provider"),
                        "model": result.get("model"),
                    }
                    succeeded.error_message = None
                    succeeded.finished_at = now
                    succeeded.next_retry_at = None
            logger.info(
                "[OCR] job %s succeeded attempts=%s wait_ms=%s processing_ms=%s",
                job_id,
                current_attempt,
                _delta_ms(job.created_at, job.started_at) if job.started_at else None,
                processing_ms,
            )
            return {
                "status": "succeeded",
                "job_id": job_id,
                "container_numbers": numbers,
            }

        error = result.get("analytics_error") or result.get("error") or "OCR failed"
        if result.get("rate_limited") and current_attempt < settings.OCR_MAX_RETRIES:
            delay = _retry_delay_seconds(
                result.get("retry_after_seconds"),
                current_attempt,
            )
            if _job_age_seconds(job) + delay > settings.OCR_QUEUE_TIMEOUT_SECONDS:
                await _record_driver_request(job_id, result, end_to_end_ms)
                return await _mark_failed(
                    job_id,
                    "OCR retry would exceed queue timeout",
                    dead_letter=True,
                )
            next_retry_at = utcnow() + timedelta(seconds=delay)
            async with get_session() as db:
                retrying = await db.get(OcrJob, job_id)
                if retrying is not None:
                    retrying.status = "retrying"
                    retrying.error_message = str(error)[:1024]
                    retrying.next_retry_at = next_retry_at
            await _enqueue_retry(job, delay)
            logger.warning(
                "[OCR] job %s hit OpenRouter 429 attempt=%s delay=%.2fs error=%s",
                job_id,
                current_attempt,
                delay,
                error,
            )
            return {"status": "retrying", "job_id": job_id, "delay_seconds": delay}

        dead_letter = bool(result.get("rate_limited")) and (
            current_attempt >= settings.OCR_MAX_RETRIES
        )
        await _record_driver_request(job_id, result, end_to_end_ms)
        return await _mark_failed(job_id, str(error), dead_letter=dead_letter)
    except asyncio.TimeoutError:
        await _record_driver_request(
            job_id,
            {
                "success": False,
                "container_numbers": [],
                "provider": "openrouter",
            },
            None,
        )
        return await _mark_failed(job_id, "OCR job timed out", dead_letter=True)
    except Exception as exc:
        logger.exception("[OCR] job %s crashed", job_id)
        await _record_driver_request(
            job_id,
            {
                "success": False,
                "container_numbers": [],
                "provider": "openrouter",
            },
            None,
        )
        return await _mark_failed(job_id, f"{type(exc).__name__}: {exc}")
    finally:
        await _release_slots(redis, job.user_id)
