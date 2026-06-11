from __future__ import annotations

from pydantic import BaseModel

__all__ = ["ContainerOCRRequest"]


class ContainerOCRRequest(BaseModel):
    image_data: str
    mime_type: str = "image/jpeg"
