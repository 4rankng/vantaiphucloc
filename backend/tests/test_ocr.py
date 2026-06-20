"""Tests for the OCR module (single-shot container number extraction).

Verifies the single-pass extraction flow without making real Gemini API calls.
"""

import io
from unittest.mock import patch

import pytest
from PIL import Image

from app.contexts.operations.infrastructure.ocr import (
    extract_container_numbers,
    _parse_numbers_from_response,
    _auto_correct_numbers,
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


# ---------------------------------------------------------------------------
# _parse_numbers_from_response
# ---------------------------------------------------------------------------


def test_parse_json_with_container_numbers():
    text = '{"container_numbers": ["MSKU1234565", "TCLU9876543"]}'
    assert _parse_numbers_from_response(text) == ["MSKU1234565", "TCLU9876543"]


def test_parse_json_with_mixed_types():
    """Integer values are converted to strings and filtered by format regex."""
    text = '{"container_numbers": ["MSKU1234565", 999]}'
    assert _parse_numbers_from_response(text) == ["MSKU1234565"]


def test_parse_json_filters_invalid_format():
    text = '{"container_numbers": ["MSKU1234565", "BAD", "AB123"]}'
    assert _parse_numbers_from_response(text) == ["MSKU1234565"]


def test_parse_regex_fallback():
    text = "Found MSKU1234565 and TCLU9876543 in the image"
    assert _parse_numbers_from_response(text) == ["MSKU1234565", "TCLU9876543"]


def test_parse_none_response():
    assert _parse_numbers_from_response("NONE") == []


def test_parse_garbage_input():
    assert _parse_numbers_from_response("no numbers here at all") == []


def test_parse_regex_deduplicates():
    text = "MSKU1234565 MSKU1234565"
    assert _parse_numbers_from_response(text) == ["MSKU1234565"]


# ---------------------------------------------------------------------------
# _auto_correct_numbers
# ---------------------------------------------------------------------------


def test_auto_correct_valid_pass_through():
    numbers = ["MSKU1234565", "TCLU9876543"]
    assert _auto_correct_numbers(numbers) == ["MSKU1234565", "TCLU9876543"]


def test_auto_correct_fixes_check_digit():
    # MSKU1234567 has wrong check digit (7), should correct to MSKU1234565
    result = _auto_correct_numbers(["MSKU1234567"])
    assert len(result) == 1
    assert result[0] == "MSKU1234565"


def test_auto_correct_deduplicates_after_correction():
    # Both misreads correct to the same valid number
    result = _auto_correct_numbers(["MSKU1234567", "MSKU1234568"])
    # Both should be corrected to MSKU1234565 (same valid number), deduped to 1
    assert len(result) == 1
    assert result[0] == "MSKU1234565"
