"""Tests for the OCR module (single-shot container number extraction).

Verifies the single-pass extraction flow (Gemini primary with round-robin
key rotation, MiniMax last-resort fallback) without making real API calls.
"""

import io
from unittest.mock import patch

import pytest
from PIL import Image

from app.config import settings
from app.contexts.operations.infrastructure import ocr as ocr_mod
from app.contexts.operations.infrastructure.ocr import (
    extract_container_numbers,
    _parse_numbers_from_response,
    _auto_correct_numbers,
    _available_providers,
    _available_gemini_keys,
    _rotate_gemini_keys,
)
from app.contexts.operations.infrastructure.minimax import _extract_text


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
    """Mock primary provider returns valid numbers."""

    async def _fake_provider(image_bytes, mime_type):
        return {
            "success": True,
            "text": '{"container_numbers": ["MSKU1234565", "TCLU9876543"]}',
            "error": None,
            "provider": "minimax",
            "model": "MiniMax-M3",
        }

    test_bytes = _make_test_image(800, 600)
    with patch(
        "app.contexts.operations.infrastructure.ocr._available_providers",
        return_value=[("minimax", _fake_provider)],
    ):
        result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["success"] is True
    assert result["container_numbers"] == ["MSKU1234565", "TCLU9876543"]
    assert result["error"] is None
    assert result["provider"] == "minimax"
    assert result["model"] == "MiniMax-M3"
    assert isinstance(result["latency_ms"], int)


# ---------------------------------------------------------------------------
# extract_container_numbers — fail / fallback
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_extract_container_numbers_fail():
    """All providers fail, verify error response."""

    async def _failing_provider(image_bytes, mime_type):
        return {
            "success": False,
            "text": None,
            "error": "boom",
            "provider": "minimax",
            "model": "MiniMax-M3",
        }

    test_bytes = _make_test_image(800, 600)
    with patch(
        "app.contexts.operations.infrastructure.ocr._available_providers",
        return_value=[("minimax", _failing_provider)],
    ):
        result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["success"] is False
    assert result["container_numbers"] == []
    assert result["error"] == "Không nhận dạng được số cont"
    assert result["provider"] == "minimax"


@pytest.mark.asyncio
async def test_extract_container_numbers_falls_back_to_minimax():
    """Every Gemini key fails, MiniMax (last resort) wins."""

    async def _gemini_fail(image_bytes, mime_type):
        return {
            "success": False,
            "text": None,
            "error": "429 Too Many Requests",
            "provider": "gemini",
            "model": "gemini-flash-latest",
        }

    async def _minimax_ok(image_bytes, mime_type):
        return {
            "success": True,
            "text": '{"container_numbers": ["MSKU1234565"]}',
            "error": None,
            "provider": "minimax",
            "model": "MiniMax-M3",
        }

    test_bytes = _make_test_image(800, 600)
    with patch(
        "app.contexts.operations.infrastructure.ocr._available_providers",
        return_value=[
            ("gemini", _gemini_fail),
            ("gemini", _gemini_fail),
            ("minimax", _minimax_ok),
        ],
    ):
        result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["success"] is True
    assert result["container_numbers"] == ["MSKU1234565"]
    assert result["provider"] == "minimax"


@pytest.mark.asyncio
async def test_extract_container_numbers_no_provider_configured(monkeypatch):
    """No provider enabled → clear configuration error (not an exception)."""
    monkeypatch.setattr(settings, "MINIMAX_ENABLE", False)
    monkeypatch.setattr(settings, "MINIMAX_API_KEY", "")
    monkeypatch.setattr(settings, "GEMINI_ENABLE", False)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    test_bytes = _make_test_image(800, 600)
    result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["success"] is False
    assert result["container_numbers"] == []
    assert result["error"] == "OCR chưa được cấu hình"
    assert result["provider"] is None


# ---------------------------------------------------------------------------
# _available_providers — ordering + gating (Gemini first, MiniMax last)
# ---------------------------------------------------------------------------


def test_available_gemini_keys(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "k1")
    monkeypatch.setattr(settings, "GEMINI_API_KEY2", "k2")
    assert _available_gemini_keys() == ["k1", "k2"]

    monkeypatch.setattr(settings, "GEMINI_API_KEY2", "")
    assert _available_gemini_keys() == ["k1"]

    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    assert _available_gemini_keys() == []


def test_rotate_gemini_keys_alternates():
    ocr_mod._gemini_rotation_index = 0
    keys = ["k1", "k2"]
    # Round-robin: start index advances by one each call.
    assert _rotate_gemini_keys(keys) == ["k1", "k2"]
    assert _rotate_gemini_keys(keys) == ["k2", "k1"]
    assert _rotate_gemini_keys(keys) == ["k1", "k2"]
    assert _rotate_gemini_keys(keys) == ["k2", "k1"]

    # Single key is returned unchanged (no rotation needed).
    assert _rotate_gemini_keys(["only"]) == ["only"]


def test_available_providers_order_and_gating(monkeypatch):
    ocr_mod._gemini_rotation_index = 0
    monkeypatch.setattr(settings, "GEMINI_ENABLE", True)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "k1")
    monkeypatch.setattr(settings, "GEMINI_API_KEY2", "k2")
    monkeypatch.setattr(settings, "MINIMAX_ENABLE", True)
    monkeypatch.setattr(settings, "MINIMAX_API_KEY", "km")

    # Gemini first (one entry per key), MiniMax last.
    assert [n for n, _ in _available_providers()] == ["gemini", "gemini", "minimax"]

    # Only one Gemini key configured → one gemini entry.
    monkeypatch.setattr(settings, "GEMINI_API_KEY2", "")
    assert [n for n, _ in _available_providers()] == ["gemini", "minimax"]

    # Gemini disabled → only MiniMax.
    monkeypatch.setattr(settings, "GEMINI_API_KEY2", "k2")
    monkeypatch.setattr(settings, "GEMINI_ENABLE", False)
    assert [n for n, _ in _available_providers()] == ["minimax"]

    # MiniMax disabled → only Gemini entries.
    monkeypatch.setattr(settings, "GEMINI_ENABLE", True)
    monkeypatch.setattr(settings, "MINIMAX_ENABLE", False)
    assert [n for n, _ in _available_providers()] == ["gemini", "gemini"]

    # No keys at all → nothing enabled.
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(settings, "GEMINI_API_KEY2", "")
    assert [n for n, _ in _available_providers()] == []


@pytest.mark.asyncio
async def test_gemini_keys_round_robin_across_requests(monkeypatch):
    """Consecutive OCR requests start on alternating Gemini keys."""
    monkeypatch.setattr(settings, "GEMINI_ENABLE", True)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "k1")
    monkeypatch.setattr(settings, "GEMINI_API_KEY2", "k2")
    monkeypatch.setattr(settings, "MINIMAX_ENABLE", False)
    monkeypatch.setattr(settings, "MINIMAX_API_KEY", "")
    ocr_mod._gemini_rotation_index = 0

    seen_keys: list[str | None] = []

    async def _capture(prompt, image_bytes, mime_type, response_schema=None, api_key=None):
        seen_keys.append(api_key)
        return {
            "success": True,
            "text": '{"container_numbers": ["MSKU1234565"]}',
            "error": None,
            "provider": "gemini",
            "model": "gemini-flash-latest",
        }

    test_bytes = _make_test_image(800, 600)
    with patch(
        "app.contexts.operations.infrastructure.ocr.analyze_image_with_fallback",
        new=_capture,
    ):
        for _ in range(4):
            await extract_container_numbers(test_bytes, "image/jpeg")

    assert seen_keys == ["k1", "k2", "k1", "k2"]


@pytest.mark.asyncio
async def test_gemini_second_key_tried_before_minimax(monkeypatch):
    """First Gemini key fails, the other Gemini key wins (no MiniMax used)."""
    monkeypatch.setattr(settings, "GEMINI_ENABLE", True)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "k1")
    monkeypatch.setattr(settings, "GEMINI_API_KEY2", "k2")
    monkeypatch.setattr(settings, "MINIMAX_ENABLE", True)
    monkeypatch.setattr(settings, "MINIMAX_API_KEY", "km")
    ocr_mod._gemini_rotation_index = 0  # first request starts on k1

    calls: list[tuple] = []

    async def _gemini(prompt, image_bytes, mime_type, response_schema=None, api_key=None):
        calls.append(("gemini", api_key))
        if api_key == "k1":
            return {
                "success": False,
                "text": None,
                "error": "429 Too Many Requests",
                "provider": "gemini",
                "model": "gemini-flash-latest",
            }
        return {
            "success": True,
            "text": '{"container_numbers": ["MSKU1234565"]}',
            "error": None,
            "provider": "gemini",
            "model": "gemini-flash-latest",
        }

    async def _minimax(prompt, image_bytes, mime_type):
        calls.append(("minimax", None))
        return {"success": True, "text": "[]", "error": None, "provider": "minimax", "model": "M3"}

    test_bytes = _make_test_image(800, 600)
    with patch(
        "app.contexts.operations.infrastructure.ocr.analyze_image_with_fallback",
        new=_gemini,
    ), patch(
        "app.contexts.operations.infrastructure.ocr.call_minimax_vision",
        new=_minimax,
    ):
        result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["provider"] == "gemini"
    assert ("minimax", None) not in calls  # MiniMax never reached
    assert ("gemini", "k1") in calls and ("gemini", "k2") in calls


# ---------------------------------------------------------------------------
# MiniMax response parsing
# ---------------------------------------------------------------------------


def test_minimax_extract_text_string():
    assert _extract_text("plain text") == "plain text"


def test_minimax_extract_text_blocks():
    content = [
        {"type": "thinking", "thinking": "internal reasoning"},
        {"type": "text", "text": "visible answer"},
    ]
    assert _extract_text(content) == "visible answer"


def test_minimax_extract_text_multiple_text_blocks():
    content = [
        {"type": "text", "text": "a"},
        {"type": "text", "text": "b"},
    ]
    assert _extract_text(content) == "a\nb"


def test_minimax_extract_text_none():
    assert _extract_text(None) == ""


def test_minimax_extract_text_strips_think_block():
    """MiniMax-M3 emits <think>…</think> before the answer — it must be stripped."""
    content = (
        '<think>The image shows MSKU1234565, 4 letters + 7 digits.</think>\n\n'
        '{"container_numbers": ["MSKU1234565"]}'
    )
    assert _extract_text(content) == '{"container_numbers": ["MSKU1234565"]}'


def test_minimax_extract_text_strips_unclosed_think():
    content = "<think>reasoning that got cut off"
    assert _extract_text(content) == ""


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


# ---------------------------------------------------------------------------
# call_gemini_vision — api_key override lands in the request URL
# ---------------------------------------------------------------------------


class _FakeGeminiResponse:
    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return {
            "candidates": [
                {"content": {"parts": [{"text": '{"container_numbers": ["MSKU1234565"]}'}]}}
            ]
        }


class _FakeGeminiClient:
    def __init__(self) -> None:
        self.posted_url: str | None = None

    async def post(self, url, json=None, headers=None):
        self.posted_url = url
        return _FakeGeminiResponse()


@pytest.mark.asyncio
async def test_call_gemini_vision_uses_api_key_override(monkeypatch):
    """The ``api_key`` param is what ends up in the request URL."""
    from app.contexts.operations.infrastructure import ai as ai_mod

    fake = _FakeGeminiClient()
    monkeypatch.setattr(ai_mod, "_get_http_client", lambda: _async_return(fake))
    monkeypatch.setattr(ai_mod, "GEMINI_API_KEY", "DEFAULT-KEY")

    await ai_mod.call_gemini_vision("p", b"img", "image/jpeg", api_key="OVERRIDE-KEY")
    assert fake.posted_url is not None
    assert "key=OVERRIDE-KEY" in fake.posted_url
    assert "DEFAULT-KEY" not in fake.posted_url


@pytest.mark.asyncio
async def test_call_gemini_vision_falls_back_to_module_key(monkeypatch):
    """Without an override, the module-level key is used."""
    from app.contexts.operations.infrastructure import ai as ai_mod

    fake = _FakeGeminiClient()
    monkeypatch.setattr(ai_mod, "_get_http_client", lambda: _async_return(fake))
    monkeypatch.setattr(ai_mod, "GEMINI_API_KEY", "DEFAULT-KEY")

    await ai_mod.call_gemini_vision("p", b"img", "image/jpeg")
    assert fake.posted_url is not None
    assert "key=DEFAULT-KEY" in fake.posted_url


async def _async_return(value):
    return value
