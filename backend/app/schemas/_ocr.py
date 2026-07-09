from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

__all__ = [
    "ContainerOCRRequest",
    "ContainerOCRJobResponse",
    "OCRJobStatusResponse",
    "OCRMetricsResponse",
]

OCRJobStatus = Literal["queued", "processing", "retrying", "succeeded", "failed"]


class ContainerOCRRequest(BaseModel):
    image_data: str
    mime_type: str = "image/jpeg"


class ContainerOCRJobResponse(BaseModel):
    job_id: int
    status: OCRJobStatus
    duplicate: bool = False
    message: str | None = None


class OCRJobStatusResponse(BaseModel):
    job_id: int
    status: OCRJobStatus
    result_text: str | None = None
    container_numbers: list[str] = []
    error_message: str | None = None
    attempt_count: int
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    next_retry_at: datetime | None = None


class OCRMetricsResponse(BaseModel):
    minutes: int
    queue_depth: int
    processing: int
    retrying: int
    succeeded: int
    failed: int
    openrouter_429_count: int
    retry_count: int
    avg_wait_ms: float | None
    avg_processing_ms: float | None
