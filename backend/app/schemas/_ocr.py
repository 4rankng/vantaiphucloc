from __future__ import annotations

from pydantic import BaseModel

__all__ = ["ContainerOCRRequest", "ContainerOCRResponse"]


class ContainerOCRRequest(BaseModel):
    image_data: str
    mime_type: str = "image/jpeg"


class ContainerOCRResponse(BaseModel):
    success: bool
    container_numbers: list[str] = []
    error: str | None = None
    provider: str | None = None
