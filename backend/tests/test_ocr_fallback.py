"""Tests for the OCR fallback module (two-pass container number extraction).

Verifies position parsing, image cropping, and the full two-pass fallback
flow without making real Gemini API calls.
"""

import io
from unittest.mock import AsyncMock, patch

import pytest
from PIL import Image

from app.contexts.operations.infrastructure.ocr import (
    _crop_to_region,
    _parse_pass1_positions,
    _POSITION_REGIONS,
    extract_container_numbers,
)


def _make_test_image(width: int = 800, height: int = 600, color: str = "red") -> bytes:
    """Create a simple JPEG image for testing."""
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# _parse_pass1_positions
# ---------------------------------------------------------------------------

def test_parse_pass1_positions_json():
    """Valid JSON with positions array returns parsed tuples."""
    text = (
        '{"positions": ['
        '  {"position": "TOP_LEFT", "text": "MSKU733?"},'
        '  {"position": "MIDDLE_CENTER", "text": "TCLU9876543"}'
        ']}'
    )
    result = _parse_pass1_positions(text)
    assert result == [
        ("TOP_LEFT", "MSKU733?"),
        ("MIDDLE_CENTER", "TCLU9876543"),
    ]


def test_parse_pass1_positions_freetext():
    """Free-text format like 'TOP_LEFT, MSKU733?' is parsed correctly."""
    text = "TOP_LEFT, MSKU733?\nMIDDLE_CENTER, NONE\nBOTTOM_RIGHT, ABCD1234567"
    result = _parse_pass1_positions(text)
    assert result == [
        ("TOP_LEFT", "MSKU733?"),
        ("BOTTOM_RIGHT", "ABCD1234567"),
    ]


def test_parse_pass1_positions_none():
    """'NONE' response returns empty list."""
    assert _parse_pass1_positions("NONE") == []
    assert _parse_pass1_positions('{"positions": []}') == []


def test_parse_pass1_positions_malformed():
    """Garbage input returns empty list."""
    assert _parse_pass1_positions("garbage!!!") == []
    assert _parse_pass1_positions("{broken json") == []
    assert _parse_pass1_positions("") == []


# ---------------------------------------------------------------------------
# _crop_to_region
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("position", list(_POSITION_REGIONS.keys()))
def test_crop_to_region_all_positions(position):
    """Cycle through all 12 positions, verify valid image with dimensions >= 200x100."""
    test_bytes = _make_test_image(800, 600)
    cropped_bytes, mime_type = _crop_to_region(test_bytes, position, "image/jpeg")

    assert mime_type == "image/jpeg"
    assert len(cropped_bytes) > 0

    img = Image.open(io.BytesIO(cropped_bytes))
    assert img.width >= 200
    assert img.height >= 100


def test_crop_to_region_unknown_position():
    """Unknown position returns original image unchanged."""
    test_bytes = _make_test_image(800, 600)
    cropped_bytes, mime_type = _crop_to_region(test_bytes, "UNKNOWN_POSITION", "image/jpeg")

    assert cropped_bytes == test_bytes
    assert mime_type == "image/jpeg"


def test_crop_to_region_minimum_dimensions():
    """150x80 image expanded to >= 200x100."""
    test_bytes = _make_test_image(150, 80)
    cropped_bytes, mime_type = _crop_to_region(test_bytes, "TOP_LEFT", "image/jpeg")

    img = Image.open(io.BytesIO(cropped_bytes))
    assert img.width >= 200
    assert img.height >= 100


def test_crop_to_region_out_of_bounds():
    """Coordinates clamped to image bounds."""
    test_bytes = _make_test_image(100, 50)
    cropped_bytes, mime_type = _crop_to_region(test_bytes, "TOP_LEFT", "image/jpeg")

    img = Image.open(io.BytesIO(cropped_bytes))
    assert img.width >= 200
    assert img.height >= 100


# ---------------------------------------------------------------------------
# extract_container_numbers — one-shot success
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_extract_container_numbers_oneshot_success():
    """Mock one-shot returns valid numbers, no fallback triggered."""
    test_bytes = _make_test_image(800, 600)

    with patch(
        "app.contexts.operations.infrastructure.ocr._single_ocr_call"
    ) as mock_single:
        mock_single.return_value = ["MSKU1234567", "TCLU9876543"]

        result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["success"] is True
    assert result["container_numbers"] == ["MSKU1234567", "TCLU9876543"]
    assert result["error"] is None
    assert result["provider"] == "gemini"


# ---------------------------------------------------------------------------
# extract_container_numbers — one-shot fail, two-pass success
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_extract_container_numbers_oneshot_fail_twopass_success():
    """Mock one-shot fail, Pass 1 returns position, Pass 2 returns valid numbers."""
    test_bytes = _make_test_image(800, 600)

    with patch(
        "app.contexts.operations.infrastructure.ocr.analyze_image_with_fallback"
    ) as mock_ai:
        pass1_response = {
            "success": True,
            "text": "TOP_LEFT, MSKU123?",
            "provider": "gemini",
        }
        pass2_response = {
            "success": True,
            "text": '{"container_numbers": ["MSKU1234567"]}',
            "provider": "gemini",
        }

        def side_effect(prompt, image_bytes, mime_type, response_schema=None):
            # call_count increments before side_effect runs, so 1-based
            n = mock_ai.call_count
            if n == 1:
                return {"success": True, "text": "NONE", "provider": "gemini"}
            if n == 2:
                return pass1_response
            return pass2_response

        mock_ai.side_effect = side_effect

        result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["success"] is True
    assert "MSKU1234567" in result["container_numbers"]
    assert result["error"] is None


# ---------------------------------------------------------------------------
# extract_container_numbers — both fail
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_extract_container_numbers_both_fail():
    """Mock all calls fail, verify error response."""
    test_bytes = _make_test_image(800, 600)

    with patch(
        "app.contexts.operations.infrastructure.ocr._single_ocr_call"
    ) as mock_single:
        mock_single.return_value = []  # one-shot fails

        with patch(
            "app.contexts.operations.infrastructure.ocr.analyze_image_with_fallback"
        ) as mock_ai:
            mock_ai.return_value = {
                "success": False,
                "error": "API error",
                "provider": "gemini",
            }

            result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["success"] is False
    assert result["container_numbers"] == []
    assert result["error"] == "Không nhận dạng được số cont"
    assert result["provider"] == "gemini"


# ---------------------------------------------------------------------------
# extract_container_numbers — max pass2 regions
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_extract_container_numbers_max_pass2_regions():
    """Mock Pass 1 returns 6 positions, verify only first 4 processed."""
    test_bytes = _make_test_image(800, 600)

    with patch(
        "app.contexts.operations.infrastructure.ocr.analyze_image_with_fallback"
    ) as mock_ai:
        pass1_text = (
            "TOP_LEFT, MSKU001?\n"
            "TOP_CENTER, MSKU002?\n"
            "TOP_RIGHT, MSKU003?\n"
            "MIDDLE_LEFT, MSKU004?\n"
            "MIDDLE_CENTER, MSKU005?\n"
            "MIDDLE_RIGHT, MSKU006?"
        )
        pass1_response = {
            "success": True,
            "text": pass1_text,
            "provider": "gemini",
        }

        pass2_response = {
            "success": True,
            "text": '{"container_numbers": ["MSKU1234567"]}',
            "provider": "gemini",
        }

        def side_effect(prompt, image_bytes, mime_type, response_schema=None):
            n = mock_ai.call_count
            if n == 1:
                return {"success": True, "text": "NONE", "provider": "gemini"}
            if n == 2:
                return pass1_response
            return pass2_response

        mock_ai.side_effect = side_effect

        result = await extract_container_numbers(test_bytes, "image/jpeg")

    # 1 (one-shot) + 1 (pass-1) + min(6, MAX_PASS2_REGIONS=4) (pass-2)
    assert mock_ai.call_count == 1 + 1 + 4
    assert result["success"] is True
    assert len(result["container_numbers"]) > 0
