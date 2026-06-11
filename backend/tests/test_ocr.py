"""Tests for the OCR module (single-shot container number extraction).

Verifies the single-pass extraction flow without making real Gemini API calls.
"""

import io
from unittest.mock import patch

import pytest
from PIL import Image

from app.contexts.operations.infrastructure.ocr import (
    extract_container_numbers,
)


def _make_test_image(width: int = 800, height: int = 600, color: str = "red") -> bytes:
    """Create a simple JPEG image for testing."""
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# extract_container_numbers — success
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_extract_container_numbers_success():
    """Mock single-shot returns valid numbers."""
    test_bytes = _make_test_image(800, 600)

    with patch(
        "app.contexts.operations.infrastructure.ocr._single_ocr_call"
    ) as mock_single:
        mock_single.return_value = ["MSKU1234565", "TCLU9876543"]

        result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["success"] is True
    assert result["container_numbers"] == ["MSKU1234565", "TCLU9876543"]
    assert result["error"] is None
    assert result["provider"] == "gemini"


# ---------------------------------------------------------------------------
# extract_container_numbers — fail
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_extract_container_numbers_fail():
    """Mock call fails, verify error response."""
    test_bytes = _make_test_image(800, 600)

    with patch(
        "app.contexts.operations.infrastructure.ocr._single_ocr_call"
    ) as mock_single:
        mock_single.return_value = []  # one-shot fails

        result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["success"] is False
    assert result["container_numbers"] == []
    assert result["error"] == "Không nhận dạng được số cont"
    assert result["provider"] == "gemini"
