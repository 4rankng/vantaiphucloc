# OCR Job Queue

Container-photo OCR runs asynchronously to protect OpenRouter from burst traffic.

## Flow

1. `POST /api/v1/delivered-trips/ocr-container` validates the base64 image, stores it under `/photos`, creates an `ocr_jobs` row with `status=queued`, and enqueues `process_ocr_job_task` in arq.
2. The upload response returns `{ job_id, status, duplicate }` immediately. It does not call OpenRouter.
3. The frontend polls `GET /api/v1/ocr/jobs/{job_id}` until `succeeded` or `failed`.
4. The worker reads the stored image, acquires Redis concurrency slots, calls OpenRouter, writes provider-attempt analytics, and updates the `ocr_jobs` row.

## Limits

Defaults live in `backend/app/config.py`:

- Global OpenRouter OCR concurrency: `OCR_OPENROUTER_GLOBAL_CONCURRENCY=3`
- Per-user OCR concurrency: `OCR_PER_USER_CONCURRENCY=1`
- Max retries: `OCR_MAX_RETRIES=3`
- Retry delay: exponential backoff from `OCR_RETRY_INITIAL_DELAY_SECONDS=2.0`, capped at `OCR_RETRY_MAX_DELAY_SECONDS=30.0`
- `Retry-After` from OpenRouter 429 responses overrides the computed backoff
- Queue timeout: `OCR_QUEUE_TIMEOUT_SECONDS=900`
- Worker attempt timeout: `OCR_JOB_TIMEOUT_SECONDS=90`

## Statuses

- `queued`
- `processing`
- `retrying`
- `succeeded`
- `failed`

`failed` jobs with `dead_lettered_at` set are terminal and will not be retried.

## Metrics

`GET /api/v1/ocr/metrics?minutes=60` returns queue depth, processing/retry counts, success/failure counts, OpenRouter 429 count, retry count, average wait time, and average processing time.
