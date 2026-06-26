"""Tests for the OCR module (single-shot container number extraction).

Verifies the single-pass extraction flow (OpenRouter primary → Gemini
fallback with round-robin key rotation → MiniMax last resort) without
making real API calls.
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
from app.contexts.operations.infrastructure.openrouter import (
    _extract_text as _openrouter_extract_text,
    call_openrouter_vision,
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
    monkeypatch.setattr(settings, "OPENROUTER_ENABLE", False)
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "")

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
    monkeypatch.setattr(settings, "OPENROUTER_ENABLE", False)
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "")

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

    async def _capture(
        prompt, image_bytes, mime_type, response_schema=None, api_key=None
    ):
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

    async def _gemini(
        prompt, image_bytes, mime_type, response_schema=None, api_key=None
    ):
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
        return {
            "success": True,
            "text": "[]",
            "error": None,
            "provider": "minimax",
            "model": "M3",
        }

    test_bytes = _make_test_image(800, 600)
    with (
        patch(
            "app.contexts.operations.infrastructure.ocr.analyze_image_with_fallback",
            new=_gemini,
        ),
        patch(
            "app.contexts.operations.infrastructure.ocr.call_minimax_vision",
            new=_minimax,
        ),
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
        "<think>The image shows MSKU1234565, 4 letters + 7 digits.</think>\n\n"
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
                {
                    "content": {
                        "parts": [{"text": '{"container_numbers": ["MSKU1234565"]}'}]
                    }
                }
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


# ---------------------------------------------------------------------------
# OpenRouter provider — gating, fallback, parsing, error handling
# ---------------------------------------------------------------------------


def test_available_providers_openrouter_enabled(monkeypatch):
    """OpenRouter alone (Gemini/MiniMax off) → single openrouter provider."""
    monkeypatch.setattr(settings, "OPENROUTER_ENABLE", True)
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "or")
    monkeypatch.setattr(settings, "GEMINI_ENABLE", False)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(settings, "GEMINI_API_KEY2", "")
    monkeypatch.setattr(settings, "MINIMAX_ENABLE", False)
    monkeypatch.setattr(settings, "MINIMAX_API_KEY", "")
    assert [n for n, _ in _available_providers()] == ["openrouter"]


def test_available_providers_openrouter_primary_when_all_enabled(monkeypatch):
    """With every provider on, OpenRouter is first; Gemini/MiniMax follow.

    OpenRouter → Gemini (one entry per key) → MiniMax. OpenRouter leads so
    a 429 (or any error) transparently falls back to Gemini.
    """
    ocr_mod._gemini_rotation_index = 0
    monkeypatch.setattr(settings, "GEMINI_ENABLE", True)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "k1")
    monkeypatch.setattr(settings, "GEMINI_API_KEY2", "k2")
    monkeypatch.setattr(settings, "MINIMAX_ENABLE", True)
    monkeypatch.setattr(settings, "MINIMAX_API_KEY", "km")
    monkeypatch.setattr(settings, "OPENROUTER_ENABLE", True)
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "or")
    assert [n for n, _ in _available_providers()] == [
        "openrouter",
        "gemini",
        "gemini",
        "minimax",
    ]


def test_available_providers_openrouter_no_key(monkeypatch):
    """Flag on but key empty → OpenRouter absent."""
    monkeypatch.setattr(settings, "OPENROUTER_ENABLE", True)
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "")
    monkeypatch.setattr(settings, "GEMINI_ENABLE", False)
    monkeypatch.setattr(settings, "MINIMAX_ENABLE", False)
    assert "openrouter" not in [n for n, _ in _available_providers()]


@pytest.mark.asyncio
async def test_extract_container_numbers_openrouter_success():
    """OpenRouter returns valid numbers → provider == openrouter."""

    async def _openrouter_provider(image_bytes, mime_type):
        return {
            "success": True,
            "text": '{"container_numbers": ["MSKU1234565"]}',
            "error": None,
            "provider": "openrouter",
            "model": "qwen/qwen3-vl-8b-instruct",
        }

    test_bytes = _make_test_image(800, 600)
    with patch(
        "app.contexts.operations.infrastructure.ocr._available_providers",
        return_value=[("openrouter", _openrouter_provider)],
    ):
        result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["success"] is True
    assert result["container_numbers"] == ["MSKU1234565"]
    assert result["provider"] == "openrouter"
    assert result["model"] == "qwen/qwen3-vl-8b-instruct"


@pytest.mark.asyncio
async def test_extract_container_numbers_openrouter_fails_back_to_gemini():
    """OpenRouter is primary; on a 429 (or any error) it falls back to Gemini."""

    async def _openrouter_fail(image_bytes, mime_type):
        return {
            "success": False,
            "text": None,
            "error": "HTTP 429: rate limit exceeded",
            "provider": "openrouter",
            "model": "qwen/qwen3-vl-8b-instruct",
        }

    async def _gemini_ok(image_bytes, mime_type):
        return {
            "success": True,
            "text": '{"container_numbers": ["MSKU1234565"]}',
            "error": None,
            "provider": "gemini",
            "model": "gemini-flash-latest",
        }

    test_bytes = _make_test_image(800, 600)
    with patch(
        "app.contexts.operations.infrastructure.ocr._available_providers",
        return_value=[("openrouter", _openrouter_fail), ("gemini", _gemini_ok)],
    ):
        result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["success"] is True
    assert result["provider"] == "gemini"
    assert result["container_numbers"] == ["MSKU1234565"]


@pytest.mark.asyncio
async def test_first_format_valid_wins_does_not_try_next_provider():
    """A format-valid answer from the first provider ends the chain — the
    next provider is never called. Locks the first-valid-wins invariant the
    one-active-at-a-time toggle design relies on."""

    calls: list[str] = []

    async def _openrouter_valid_but_wrong(image_bytes, mime_type):
        calls.append("openrouter")
        return {
            "success": True,
            "text": '{"container_numbers": ["MSKU1234565"]}',
            "error": None,
            "provider": "openrouter",
            "model": "qwen/qwen3-vl-8b-instruct",
        }

    async def _gemini_would_succeed(image_bytes, mime_type):
        calls.append("gemini")
        return {
            "success": True,
            "text": '{"container_numbers": ["TCLU9876543"]}',
            "error": None,
            "provider": "gemini",
            "model": "gemini-flash-latest",
        }

    test_bytes = _make_test_image(800, 600)
    with patch(
        "app.contexts.operations.infrastructure.ocr._available_providers",
        return_value=[
            ("openrouter", _openrouter_valid_but_wrong),
            ("gemini", _gemini_would_succeed),
        ],
    ):
        result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["provider"] == "openrouter"
    assert result["container_numbers"] == ["MSKU1234565"]
    assert calls == ["openrouter"]  # gemini never reached


# ---------------------------------------------------------------------------
# OpenRouter response parsing (mirrors MiniMax _extract_text tests)
# ---------------------------------------------------------------------------


def test_openrouter_extract_text_string():
    assert _openrouter_extract_text("plain text") == "plain text"


def test_openrouter_extract_text_blocks():
    content = [
        {"type": "thinking", "thinking": "internal reasoning"},
        {"type": "text", "text": "visible answer"},
    ]
    assert _openrouter_extract_text(content) == "visible answer"


def test_openrouter_extract_text_multiple_text_blocks():
    content = [
        {"type": "text", "text": "a"},
        {"type": "text", "text": "b"},
    ]
    assert _openrouter_extract_text(content) == "a\nb"


def test_openrouter_extract_text_none():
    assert _openrouter_extract_text(None) == ""


def test_openrouter_extract_text_strips_think_block():
    """Qwen3 can leak <think>…</think> before the answer — strip it."""
    content = (
        "<think>The image shows MSKU1234565, 4 letters + 7 digits.</think>\n\n"
        '{"container_numbers": ["MSKU1234565"]}'
    )
    assert _openrouter_extract_text(content) == '{"container_numbers": ["MSKU1234565"]}'


def test_openrouter_extract_text_strips_unclosed_think():
    assert _openrouter_extract_text("<think>reasoning that got cut off") == ""


# ---------------------------------------------------------------------------
# call_openrouter_vision — no-key guard + HTTP-status error
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_call_openrouter_vision_no_key_returns_failure(monkeypatch):
    """Missing API key → failure dict, no exception, provider tagged."""
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "")
    result = await call_openrouter_vision("p", b"img", "image/jpeg")
    assert result["success"] is False
    assert result["provider"] == "openrouter"
    assert result["error"] == "OpenRouter API key not configured"


@pytest.mark.asyncio
async def test_call_openrouter_vision_http_status_in_error(monkeypatch):
    """An HTTP error surfaces the status code + provider message so a 404
    (wrong slug) is distinguishable from 401/429 in OCR analytics."""
    import httpx

    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "or")

    request = httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions")
    response = httpx.Response(
        404, request=request, json={"error": {"message": "model not found"}}
    )
    error = httpx.HTTPStatusError("Not Found", request=request, response=response)

    class _RaisingClient:
        async def post(self, url, json=None, headers=None):
            raise error

    monkeypatch.setattr(
        "app.contexts.operations.infrastructure.openrouter._get_http_client",
        lambda: _async_return(_RaisingClient()),
    )

    result = await call_openrouter_vision("p", b"img", "image/jpeg")
    assert result["success"] is False
    assert result["provider"] == "openrouter"
    assert "HTTP 404" in result["error"]
    assert "model not found" in result["error"]
