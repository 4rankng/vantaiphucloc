from __future__ import annotations

from pydantic import BaseModel

__all__ = ["ContainerOCRRequest", "ContainerOCRResponse"]


class ContainerOCRRequest(BaseModel):
    image_data: str
    mime_type: str = "image/jpeg"
    container_index: int = 0


class ContainerOCRResponse(BaseModel):
    success: bool
    container_number: str | None = None
    container_numbers: list[str] = []
    error: str | None = None
    attempts_remaining: int = 0
