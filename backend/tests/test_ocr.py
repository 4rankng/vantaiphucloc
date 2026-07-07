"""Tests for the OCR module (single-shot container number extraction).

Verifies the single-pass extraction flow (OpenRouter model chain: 32B →
Qwen3.7-Plus, bounded by a wall-clock SLA deadline and a per-call timeout)
without making real API calls, plus the /dashboard/ocr-stats aggregation logic.
"""

import asyncio
import io
import statistics
from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from PIL import Image

from app.config import settings
from app.contexts.operations.infrastructure import ocr as ocr_mod
from app.contexts.operations.infrastructure.ocr import (
    extract_container_numbers,
    _parse_numbers_from_response,
    _salvage_container_numbers,
    _auto_correct_numbers,
    _available_openrouter_models,
    _available_providers,
)
from app.contexts.operations.infrastructure.openrouter import (
    _extract_text as _openrouter_extract_text,
    call_openrouter_vision,
)
from app.models.base import User
from app.models.domain import (
    BookedTrip,
    Client,
    DeliveredTrip,
    Location,
    OcrDriverRequest,
    OcrRequest,
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
            "provider": "openrouter",
            "model": "qwen/qwen3-vl-32b-instruct",
        }

    test_bytes = _make_test_image(800, 600)
    with patch(
        "app.contexts.operations.infrastructure.ocr._available_providers",
        return_value=[("openrouter", "qwen/qwen3-vl-32b-instruct", 30.0, _fake_provider)],
    ):
        result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["success"] is True
    assert result["container_numbers"] == ["MSKU1234565", "TCLU9876543"]
    assert result["error"] is None
    assert result["provider"] == "openrouter"
    assert result["model"] == "qwen/qwen3-vl-32b-instruct"
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
            "provider": "openrouter",
            "model": "qwen/qwen3-vl-32b-instruct",
        }

    test_bytes = _make_test_image(800, 600)
    with patch(
        "app.contexts.operations.infrastructure.ocr._available_providers",
        return_value=[("openrouter", "qwen/qwen3-vl-32b-instruct", 30.0, _failing_provider)],
    ):
        result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["success"] is False
    assert result["container_numbers"] == []
    assert result["error"] == "Không nhận diện được số cont"
    assert result["analytics_error"] == "boom"
    assert result["provider"] == "openrouter"


@pytest.mark.asyncio
async def test_extract_container_numbers_no_provider_configured(monkeypatch):
    """No provider enabled → clear configuration error (not an exception)."""
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
# _available_providers — OpenRouter-only ordering + gating
# ---------------------------------------------------------------------------


def test_available_providers_order_and_gating(monkeypatch):
    """OpenRouter is the sole provider: one entry per configured model, in sequence."""
    monkeypatch.setattr(settings, "OPENROUTER_ENABLE", True)
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "or")
    monkeypatch.setattr(
        ocr_mod,
        "OPENROUTER_MODELS",
        [
            ("Qwen3-VL-32B", "qwen/qwen3-vl-32b-instruct", 15.0),
            ("Qwen3.7-Plus", "qwen/qwen3.7-plus", 55.0),
        ],
    )

    providers = _available_providers()
    assert [name for name, _, _, _ in providers] == ["openrouter", "openrouter"]
    assert [model for _, model, _, _ in providers] == [
        "qwen/qwen3-vl-32b-instruct",
        "qwen/qwen3.7-plus",
    ]
    assert [timeout for _, _, timeout, _ in providers] == [15.0, 55.0]

    # Flag on but key empty → no providers.
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "")
    assert _available_providers() == []

    # Flag off → no providers.
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "or")
    monkeypatch.setattr(settings, "OPENROUTER_ENABLE", False)
    assert _available_providers() == []


# ---------------------------------------------------------------------------
# OpenRouter response parsing
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
    """Qwen reasoning models emit <think>…</think> before the answer — it must be stripped."""
    content = (
        "<think>The image shows MSKU1234565, 4 letters + 7 digits.</think>\n\n"
        '{"container_numbers": ["MSKU1234565"]}'
    )
    assert _openrouter_extract_text(content) == '{"container_numbers": ["MSKU1234565"]}'


def test_openrouter_extract_text_strips_unclosed_think():
    content = "<think>reasoning that got cut off"
    assert _openrouter_extract_text(content) == ""


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
# _salvage_container_numbers — last-resort stub-pad of partial reads
# ---------------------------------------------------------------------------


def test_salvage_pads_missing_owner_letters_from_array():
    # Only the category letter survived (occluded owner code); digits are kept,
    # missing leading letters stub-padded with 'A'.
    assert _salvage_container_numbers('["U7735411"]') == ["AAAU7735411"]


def test_salvage_pads_missing_owner_letters_from_object():
    assert (
        _salvage_container_numbers('{"container_numbers": ["U7735411"]}')
        == ["AAAU7735411"]
    )


def test_salvage_keeps_partial_owner_letters():
    # Two of four owner letters visible -> stub only the missing leading ones.
    assert _salvage_container_numbers('["AU7735411"]') == ["AAAU7735411"]


def test_salvage_truncates_overread_digits():
    # Owner code complete but the VLM over-read extra digits -> keep first 7.
    assert _salvage_container_numbers('["OOCU9217154561"]') == ["OOCU9217154"]


def test_salvage_handles_two_numbers_in_one_response():
    assert _salvage_container_numbers('["U7735411", "OOCU9217154561"]') == [
        "AAAU7735411",
        "OOCU9217154",
    ]


def test_salvage_returns_empty_without_digit_run():
    assert _salvage_container_numbers("nothing here") == []
    # A 4-digit weight is not a container serial.
    assert _salvage_container_numbers('["TARE2280"]') == []


def test_salvage_dedupes():
    assert _salvage_container_numbers('["U7735411", "U7735411"]') == ["AAAU7735411"]


@pytest.mark.asyncio
async def test_extract_salvages_when_no_clean_read():
    """All providers return only a partial read (occluded owner code). No clean
    4-letter+7-digit number is found, so the last-resort salvage stub-pads the
    missing letters and returns success — the driver gets an editable candidate
    instead of a blank field."""

    async def _partial(image_bytes, mime_type):
        return {
            "success": True,
            "text": '["U7735411"]',
            "error": None,
            "provider": "openrouter",
            "model": "qwen/qwen3-vl-32b-instruct",
        }

    test_bytes = _make_test_image(800, 600)
    with patch(
        "app.contexts.operations.infrastructure.ocr._available_providers",
        return_value=[("openrouter", "qwen/qwen3-vl-32b-instruct", 30.0, _partial)],
    ):
        result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["success"] is True
    assert result["container_numbers"] == ["AAAU7735411"]


@pytest.mark.asyncio
async def test_extract_strict_read_wins_over_salvage():
    """A clean read from the first provider wins immediately; salvage is a
    last resort only when no provider returns a clean number."""

    async def _clean(image_bytes, mime_type):
        return {
            "success": True,
            "text": '{"container_numbers": ["MSKU1234565"]}',
            "error": None,
            "provider": "openrouter",
            "model": "qwen/qwen3-vl-32b-instruct",
        }

    test_bytes = _make_test_image(800, 600)
    with patch(
        "app.contexts.operations.infrastructure.ocr._available_providers",
        return_value=[("openrouter", "qwen/qwen3-vl-32b-instruct", 30.0, _clean)],
    ):
        result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["success"] is True
    assert result["container_numbers"] == ["MSKU1234565"]  # not stub-padded


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


def test_available_openrouter_models_in_sequence(monkeypatch):
    """Configured OpenRouter models are listed in their defined sequence."""
    monkeypatch.setattr(
        ocr_mod,
        "OPENROUTER_MODELS",
        [
            ("Qwen3-VL-32B", "qwen/qwen3-vl-32b-instruct", 15.0),
            ("Qwen3.7-Plus", "qwen/qwen3.7-plus", 55.0),
        ],
    )
    assert _available_openrouter_models() == [
        ("Qwen3-VL-32B", "qwen/qwen3-vl-32b-instruct", 15.0),
        ("Qwen3.7-Plus", "qwen/qwen3.7-plus", 55.0),
    ]


def test_available_providers_openrouter_no_key(monkeypatch):
    """Flag on but key empty → OpenRouter absent."""
    monkeypatch.setattr(settings, "OPENROUTER_ENABLE", True)
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "")
    assert _available_providers() == []


@pytest.mark.asyncio
async def test_openrouter_provider_uses_multi_container_prompt(monkeypatch):
    """Every OpenRouter model is called with the same MULTI_CONTAINER_PROMPT."""
    captured: list[str] = []

    async def _capture(prompt, image_bytes, mime_type, model=None):
        captured.append(prompt)
        return {
            "success": True,
            "text": '{"container_numbers": ["MSKU1234565"]}',
            "error": None,
            "provider": "openrouter",
            "model": model,
        }

    monkeypatch.setattr(ocr_mod, "call_openrouter_vision", _capture)

    for slug in ("qwen/qwen3-vl-32b-instruct", "qwen/qwen3.7-plus"):
        provider = ocr_mod._make_openrouter_provider(slug)
        await provider(b"img", "image/jpeg")

    assert len(captured) == 2
    for prompt in captured:
        assert prompt is ocr_mod.MULTI_CONTAINER_PROMPT


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
        return_value=[("openrouter", "qwen/qwen3-vl-8b-instruct", 30.0, _openrouter_provider)],
    ):
        result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["success"] is True
    assert result["container_numbers"] == ["MSKU1234565"]
    assert result["provider"] == "openrouter"
    assert result["model"] == "qwen/qwen3-vl-8b-instruct"


@pytest.mark.asyncio
async def test_extract_container_numbers_openrouter_falls_back_to_second_model():
    """32B failing (e.g. 429) falls through to the next OpenRouter model."""

    async def _32b_fail(image_bytes, mime_type):
        return {
            "success": False,
            "text": None,
            "error": "HTTP 429: rate limit exceeded",
            "provider": "openrouter",
            "model": "qwen/qwen3-vl-32b-instruct",
        }

    async def _plus_ok(image_bytes, mime_type):
        return {
            "success": True,
            "text": '{"container_numbers": ["MSKU1234565"]}',
            "error": None,
            "provider": "openrouter",
            "model": "qwen/qwen3.7-plus",
        }

    test_bytes = _make_test_image(800, 600)
    with patch(
        "app.contexts.operations.infrastructure.ocr._available_providers",
        return_value=[
            ("openrouter", "qwen/qwen3-vl-32b-instruct", 30.0, _32b_fail),
            ("openrouter", "qwen/qwen3.7-plus", 30.0, _plus_ok),
        ],
    ):
        result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["success"] is True
    assert result["provider"] == "openrouter"
    assert result["model"] == "qwen/qwen3.7-plus"
    assert result["container_numbers"] == ["MSKU1234565"]


@pytest.mark.asyncio
async def test_first_format_valid_wins_does_not_try_next_provider():
    """A format-valid answer from the first model ends the chain — the next
    model is never called. Locks the first-valid-wins invariant."""

    calls: list[str] = []

    async def _32b_valid(image_bytes, mime_type):
        calls.append("32b")
        return {
            "success": True,
            "text": '{"container_numbers": ["MSKU1234565"]}',
            "error": None,
            "provider": "openrouter",
            "model": "qwen/qwen3-vl-32b-instruct",
        }

    async def _plus_would_succeed(image_bytes, mime_type):
        calls.append("plus")
        return {
            "success": True,
            "text": '{"container_numbers": ["TCLU9876543"]}',
            "error": None,
            "provider": "openrouter",
            "model": "qwen/qwen3.7-plus",
        }

    test_bytes = _make_test_image(800, 600)
    with patch(
        "app.contexts.operations.infrastructure.ocr._available_providers",
        return_value=[
            ("openrouter", "qwen/qwen3-vl-32b-instruct", 30.0, _32b_valid),
            ("openrouter", "qwen/qwen3.7-plus", 30.0, _plus_would_succeed),
        ],
    ):
        result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["provider"] == "openrouter"
    assert result["model"] == "qwen/qwen3-vl-32b-instruct"
    assert result["container_numbers"] == ["MSKU1234565"]
    assert calls == ["32b"]  # second model never reached


# ---------------------------------------------------------------------------
# SLA — per-call timeout + wall-clock deadline keep the endpoint under 60s
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_extract_per_call_timeout_counts_as_failed_attempt(monkeypatch):
    """A model exceeding OCR_PER_CALL_TIMEOUT_SECONDS is recorded as a timed-out
    attempt and the chain moves on; with no model answering, the overall result
    is the no-answer error (never an unbounded hang past the axios SLA)."""
    monkeypatch.setattr(settings, "OCR_DEADLINE_SECONDS", 50.0)

    async def _slow(image_bytes, mime_type):
        await asyncio.sleep(5)  # far exceeds the 0.1s per-model cap below
        return {
            "success": True,
            "text": '{"container_numbers": ["MSKU1234565"]}',
            "error": None,
            "provider": "openrouter",
            "model": "slow",
        }

    test_bytes = _make_test_image(800, 600)
    with patch(
        "app.contexts.operations.infrastructure.ocr._available_providers",
        return_value=[
            ("openrouter", "qwen/qwen3-vl-32b-instruct", 0.1, _slow),
            ("openrouter", "qwen/qwen3.7-plus", 0.1, _slow),
        ],
    ):
        result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["success"] is False
    assert result["error"] == "Không nhận diện được số cont"
    assert len(result["attempts"]) == 2
    for attempt in result["attempts"]:
        assert attempt["success"] is False
        assert attempt["error"].startswith("timeout")
        assert isinstance(attempt["latency_ms"], int)


@pytest.mark.asyncio
async def test_extract_deadline_stops_chain_before_later_models(monkeypatch):
    """When the wall-clock deadline has already elapsed before a model's turn,
    that model (and the rest) are skipped entirely — no provider call is made."""
    monkeypatch.setattr(settings, "OCR_DEADLINE_SECONDS", -1.0)

    calls: list[str] = []

    async def _provider(image_bytes, mime_type):
        calls.append("called")
        return {
            "success": True,
            "text": "[]",
            "error": None,
            "provider": "openrouter",
            "model": "m",
        }

    test_bytes = _make_test_image(800, 600)
    with patch(
        "app.contexts.operations.infrastructure.ocr._available_providers",
        return_value=[("openrouter", "m", 30.0, _provider)],
    ):
        result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert calls == []  # never reached because the deadline already expired
    assert result["success"] is False
    assert result["error"] == "Không nhận diện được số cont"
    assert result["attempts"] == []


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


# ---------------------------------------------------------------------------
# /dashboard/ocr-stats — latency aggregation
# ---------------------------------------------------------------------------


def _utc_midnight(days_ago: int) -> datetime:
    """UTC midnight ``days_ago`` days before today — keeps tests deterministic
    regardless of when they run."""
    today = datetime.now(timezone.utc).date()
    target = today - timedelta(days=days_ago)
    return datetime(target.year, target.month, target.day, tzinfo=timezone.utc)


@pytest.mark.asyncio
async def test_ocr_stats_latency_aggregation(
    db_session, async_client, make_auth_headers
):
    """Seed a deterministic fixture and verify avg/p95 + zero-fill behaviour."""
    # Day 0: 10 samples with latencies 100..1000 ms in steps of 100
    # Day 1: 4 samples — avg uses available samples, p95 stays null
    # Day 2: no rows — should yield null but total=0
    # Legacy rows: latency_ms IS NULL — excluded from latency stats, counted in total
    # Today: high-latency outlier to verify p95 placement
    today = datetime.now(timezone.utc).replace(microsecond=0)
    yesterday = today - timedelta(days=1)
    two_days_ago = today - timedelta(days=2)

    rows = []
    # Day 0 — 10 samples, evenly spaced
    for i, latency in enumerate(range(100, 1100, 100)):
        rows.append(
            OcrRequest(
                created_at=yesterday + timedelta(milliseconds=i),
                provider="gemini",
                model="gemini-flash-latest",
                success=True,
                container_numbers_found=1,
                latency_ms=latency,
                error=None,
                user_id=None,
            )
        )
    # Day 1 — only 4 samples: avg present, p95 hidden
    for i, latency in enumerate([200, 400, 600, 800]):
        rows.append(
            OcrRequest(
                created_at=two_days_ago + timedelta(milliseconds=i),
                provider="gemini",
                success=True,
                container_numbers_found=1,
                latency_ms=latency,
                error=None,
                user_id=None,
            )
        )
    # Today — single high outlier to drive p95 placement
    rows.append(
        OcrRequest(
            created_at=today,
            provider="openrouter",
            success=True,
            container_numbers_found=2,
            latency_ms=5000,
            error=None,
            user_id=None,
        )
    )
    # Legacy rows: NULL latency must be excluded from latency stats but counted in total
    for i in range(3):
        rows.append(
            OcrRequest(
                created_at=yesterday + timedelta(seconds=i + 30),
                provider="gemini",
                success=False,
                container_numbers_found=0,
                latency_ms=None,
                error="legacy",
                user_id=None,
            )
        )
    db_session.add_all(rows)
    await db_session.commit()

    headers = await make_auth_headers("superadmin")
    response = await async_client.get(
        "/api/v1/dashboard/ocr-stats", params={"days": 30}, headers=headers
    )
    assert response.status_code == 200, response.text
    payload = response.json()

    # 15 latency samples overall: yesterday (10) + two_days_ago (4) + today (1)
    # Bucket averages and the overall latency aggregate include every non-null
    # sample in the window.
    latency_samples = list(range(100, 1100, 100)) + [200, 400, 600, 800] + [5000]
    expected_avg = sum(latency_samples) / len(latency_samples)
    expected_p95 = statistics.quantiles(latency_samples, n=20, method="inclusive")[18]

    assert payload["days"] == 30
    assert payload["totals"]["total"] == 18  # 10 + 4 + 1 latency + 3 null
    assert payload["totals"]["success"] == 15
    assert payload["totals"]["latencyAvgMs"] == pytest.approx(expected_avg, abs=0.01)
    assert payload["totals"]["latencyP95Ms"] == pytest.approx(expected_p95, abs=0.5)
    # Backward-compatible fields still present
    assert "success" in payload["totals"]

    daily_by_date = {p["date"]: p for p in payload["daily"]}
    today_iso = today.date().isoformat()
    yesterday_iso = yesterday.date().isoformat()
    two_days_iso = two_days_ago.date().isoformat()

    # Day 0 (yesterday) — 10 latency samples + 3 null = 13 total
    assert daily_by_date[yesterday_iso]["total"] == 13
    assert daily_by_date[yesterday_iso]["success"] == 10
    assert daily_by_date[yesterday_iso]["failed"] == 3
    assert daily_by_date[yesterday_iso]["latencyAvgMs"] == pytest.approx(
        sum(range(100, 1100, 100)) / 10, abs=0.01
    )
    assert daily_by_date[yesterday_iso]["latencyP95Ms"] is not None

    # Day 1 (two_days_ago) — 4 latency samples: avg present, p95 hidden
    assert daily_by_date[two_days_iso]["total"] == 4
    assert daily_by_date[two_days_iso]["success"] == 4
    assert daily_by_date[two_days_iso]["failed"] == 0
    assert daily_by_date[two_days_iso]["latencyAvgMs"] == pytest.approx(500, abs=0.01)
    assert daily_by_date[two_days_iso]["latencyP95Ms"] is None

    # Today — 1 latency sample: avg is that bucket's only sample, p95 hidden
    assert daily_by_date[today_iso]["total"] == 1
    assert daily_by_date[today_iso]["success"] == 1
    assert daily_by_date[today_iso]["failed"] == 0
    assert daily_by_date[today_iso]["latencyAvgMs"] == pytest.approx(5000, abs=0.01)
    assert daily_by_date[today_iso]["latencyP95Ms"] is None


@pytest.mark.asyncio
async def test_ocr_stats_latency_hidden_for_non_admin(
    db_session, async_client, make_auth_headers
):
    today = datetime.now(timezone.utc).replace(microsecond=0)
    db_session.add_all(
        [
            OcrRequest(
                created_at=today + timedelta(milliseconds=i),
                provider="gemini",
                success=True,
                container_numbers_found=1,
                latency_ms=latency,
                error=None,
                user_id=None,
            )
            for i, latency in enumerate([100, 200, 300, 400, 500])
        ]
    )
    await db_session.commit()

    headers = await make_auth_headers("accountant")
    response = await async_client.get(
        "/api/v1/dashboard/ocr-stats", params={"days": 7}, headers=headers
    )
    assert response.status_code == 200, response.text
    payload = response.json()

    assert payload["totals"]["total"] == 5
    assert payload["totals"]["success"] == 5
    assert payload["providerErrors"] == []
    assert sum(d["success"] for d in payload["daily"]) == 5
    assert sum(d["failed"] for d in payload["daily"]) == 0
    assert payload["totals"]["latencyAvgMs"] is None
    assert payload["totals"]["latencyP95Ms"] is None
    assert all(d["latencyAvgMs"] is None for d in payload["daily"])
    assert all(d["latencyP95Ms"] is None for d in payload["daily"])
    assert payload["monthly"] == [] or all(
        m["latencyAvgMs"] is None for m in payload["monthly"]
    )


@pytest.mark.asyncio
async def test_ocr_stats_error_breakdown_for_admin(
    db_session, async_client, make_auth_headers
):
    today = datetime.now(timezone.utc).replace(microsecond=0)
    errors = [
        "HTTP 429: rate limit exceeded",
        "HTTP 429: quota exhausted",
        "HTTP 500: provider unavailable",
        "HTTP 400: invalid image payload",
        "TimeoutError: request timed out",
        "no valid numbers",
    ]
    db_session.add_all(
        [
            OcrRequest(
                created_at=today + timedelta(milliseconds=i),
                provider="openrouter",
                success=False,
                container_numbers_found=0,
                latency_ms=1000 + i,
                error=error,
                user_id=None,
            )
            for i, error in enumerate(errors)
        ]
    )
    await db_session.commit()

    headers = await make_auth_headers("superadmin")
    response = await async_client.get(
        "/api/v1/dashboard/ocr-stats", params={"days": 7}, headers=headers
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    by_category = {item["category"]: item for item in payload["providerErrors"]}

    assert by_category["http_429"]["label"] == "HTTP 429"
    assert by_category["http_429"]["statusCode"] == 429
    assert by_category["http_429"]["total"] == 2
    assert "rate limit" in by_category["http_429"]["action"]
    assert by_category["http_500"]["total"] == 1
    assert by_category["http_400"]["total"] == 1
    assert by_category["timeout"]["total"] == 1
    assert by_category["no_detection"]["total"] == 1


@pytest.mark.asyncio
async def test_ocr_stats_empty_window(db_session, async_client, make_auth_headers):
    """No rows in the window → totals.latencyAvgMs / latencyP95Ms are null,
    monthly list may be empty, but the response shape stays intact."""
    headers = await make_auth_headers("accountant")
    response = await async_client.get(
        "/api/v1/dashboard/ocr-stats", params={"days": 7}, headers=headers
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["days"] == 7
    assert payload["providerErrors"] == []
    assert payload["totals"]["total"] == 0
    assert payload["totals"]["success"] == 0
    assert payload["totals"]["latencyAvgMs"] is None
    assert payload["totals"]["latencyP95Ms"] is None
    assert all(d["latencyAvgMs"] is None for d in payload["daily"])
    assert all(d["latencyP95Ms"] is None for d in payload["daily"])
    # monthly may be empty
    assert payload["monthly"] == [] or all(
        m["latencyAvgMs"] is None for m in payload["monthly"]
    )


@pytest.mark.asyncio
async def test_ocr_stats_hourly_window_covers_last_seven_days(
    db_session, async_client, make_auth_headers
):
    six_days_ago = datetime.now(timezone.utc).replace(
        minute=0, second=0, microsecond=0
    ) - timedelta(days=6)
    db_session.add_all(
        [
            OcrRequest(
                created_at=six_days_ago,
                provider="gemini",
                success=True,
                container_numbers_found=1,
                latency_ms=800,
                user_id=None,
            ),
            OcrDriverRequest(
                created_at=six_days_ago,
                success=True,
                attempts=1,
                numbers_found=1,
                latency_ms=900,
                provider="gemini",
                user_id=None,
            ),
        ]
    )
    await db_session.commit()

    headers = await make_auth_headers("superadmin")
    response = await async_client.get(
        "/api/v1/dashboard/ocr-stats",
        params={"days": 7, "include_hourly": True},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    payload = response.json()

    assert len(payload["hourly"]) == 7 * 24
    assert len(payload["driverExperience"]["hourly"]) == 7 * 24
    hour_key = six_days_ago.strftime("%Y-%m-%dT%H:00:00Z")
    provider_by_hour = {point["hour"]: point for point in payload["hourly"]}
    driver_by_hour = {
        point["hour"]: point for point in payload["driverExperience"]["hourly"]
    }
    assert provider_by_hour[hour_key]["total"] == 1
    assert provider_by_hour[hour_key]["success"] == 1
    assert provider_by_hour[hour_key]["latencyAvgMs"] == 800
    assert provider_by_hour[hour_key]["latencyP95Ms"] is None
    assert driver_by_hour[hour_key]["requests"] == 1
    assert driver_by_hour[hour_key]["success"] == 1
    assert driver_by_hour[hour_key]["latencyAvgMs"] == 900
    assert driver_by_hour[hour_key]["latencyP95Ms"] is None


@pytest.mark.asyncio
async def test_ocr_stats_backward_compatible_field_names(
    db_session, async_client, make_auth_headers
):
    """Existing fields (days, endDate, daily, monthly, totals.total, totals.success)
    are still present with the same names. Daily/monthly still keep the existing
    'date'/'month'/'total' keys."""
    today = datetime.now(timezone.utc)
    db_session.add(
        OcrRequest(
            created_at=today,
            provider="gemini",
            success=True,
            container_numbers_found=1,
            latency_ms=800,
        )
    )
    await db_session.commit()

    headers = await make_auth_headers("accountant")
    response = await async_client.get(
        "/api/v1/dashboard/ocr-stats", params={"days": 30}, headers=headers
    )
    assert response.status_code == 200
    payload = response.json()
    assert set(payload.keys()) >= {
        "days",
        "endDate",
        "daily",
        "monthly",
        "providerErrors",
        "totals",
    }
    assert set(payload["totals"].keys()) >= {
        "total",
        "success",
        "latencyAvgMs",
        "latencyP95Ms",
    }
    for d in payload["daily"]:
        assert set(d.keys()) >= {
            "date",
            "total",
            "success",
            "failed",
            "latencyAvgMs",
            "latencyP95Ms",
        }
    for m in payload["monthly"]:
        assert set(m.keys()) >= {"month", "total", "success", "failed", "latencyAvgMs"}


@pytest.mark.asyncio
async def test_ocr_stats_accuracy_uses_original_container_snapshot(
    db_session, async_client, make_auth_headers
):
    client = Client(code="OCRACC", name="OCR Accuracy Client", is_active=True)
    pickup = Location(name="Cang OCR Accuracy", is_active=True)
    dropoff = Location(name="Kho OCR Accuracy", is_active=True)
    driver = User(
        phone="0900123456",
        username="ocr_accuracy_driver",
        hashed_password="unused",
        role="driver",
        is_active=True,
    )
    db_session.add_all([client, pickup, dropoff, driver])
    await db_session.flush()

    today = datetime.now(timezone.utc).replace(microsecond=0)
    trip_day = date.today()
    pairs = [
        ("MSKU1234565", "MSKU1234565"),
        ("MSKU1234564", "MSKU1234565"),
        ("XXXX1234565", "MSKU1234565"),
        ("ABCD1111111", "MSKU1234565"),
    ]
    delivered_rows = []
    for idx, (original_cont, truth_cont) in enumerate(pairs):
        booked = BookedTrip(
            trip_date=trip_day,
            client_id=client.id,
            pickup_location_id=pickup.id,
            dropoff_location_id=dropoff.id,
            work_type="F20",
            cont_number=truth_cont,
            cont_type="F20",
            created_at=today + timedelta(seconds=idx),
        )
        db_session.add(booked)
        await db_session.flush()
        delivered_rows.append(
            DeliveredTrip(
                client_id=client.id,
                pickup_location_id=pickup.id,
                dropoff_location_id=dropoff.id,
                driver_id=driver.id,
                work_type="F20",
                cont_number=truth_cont,
                original_cont_number=original_cont,
                cont_type="F20",
                trip_date=trip_day,
                booked_trip_id=booked.id,
                created_at=today + timedelta(seconds=idx),
            )
        )
    db_session.add_all(delivered_rows)
    await db_session.commit()

    headers = await make_auth_headers("superadmin")
    response = await async_client.get(
        "/api/v1/dashboard/ocr-stats", params={"days": 7}, headers=headers
    )
    assert response.status_code == 200, response.text
    accuracy = response.json()["accuracy"]

    assert accuracy["totals"] == {
        "evaluated": 4,
        "exact": 1,
        "near": 1,
        "partial": 1,
        "mismatch": 1,
        "accuracyPct": 25.0,
        "acceptedPct": 75.0,
    }
    today_bucket = {
        point["date"]: point for point in accuracy["daily"]
    }[today.date().isoformat()]
    assert today_bucket == {
        "date": today.date().isoformat(),
        "evaluated": 4,
        "exact": 1,
        "near": 1,
        "partial": 1,
        "mismatch": 1,
        "accuracyPct": 25.0,
        "rollingAccuracyPct": 25.0,
    }


@pytest.mark.asyncio
async def test_ocr_stats_accuracy_rolling_window_uses_last_100_matched_trips(
    db_session, async_client, make_auth_headers
):
    client = Client(code="OCRROLL", name="OCR Rolling Client", is_active=True)
    pickup = Location(name="Cang OCR Rolling", is_active=True)
    dropoff = Location(name="Kho OCR Rolling", is_active=True)
    driver = User(
        phone="0900999888",
        username="ocr_rolling_driver",
        hashed_password="unused",
        role="driver",
        is_active=True,
    )
    db_session.add_all([client, pickup, dropoff, driver])
    await db_session.flush()

    now = datetime.now(timezone.utc).replace(microsecond=0)
    trip_day = date.today()
    delivered_rows = []
    for idx in range(101):
        truth_cont = "MSKU1234565" if idx == 0 else f"MSKU{idx:07d}"
        original_cont = truth_cont if idx == 0 else f"ABCD{9000000 + idx:07d}"
        created_at = now + timedelta(seconds=idx)
        booked = BookedTrip(
            trip_date=trip_day,
            client_id=client.id,
            pickup_location_id=pickup.id,
            dropoff_location_id=dropoff.id,
            work_type="F20",
            cont_number=truth_cont,
            cont_type="F20",
            created_at=created_at,
        )
        db_session.add(booked)
        await db_session.flush()
        delivered_rows.append(
            DeliveredTrip(
                client_id=client.id,
                pickup_location_id=pickup.id,
                dropoff_location_id=dropoff.id,
                driver_id=driver.id,
                work_type="F20",
                cont_number=truth_cont,
                original_cont_number=original_cont,
                cont_type="F20",
                trip_date=trip_day,
                booked_trip_id=booked.id,
                created_at=created_at,
            )
        )
    db_session.add_all(delivered_rows)
    await db_session.commit()

    headers = await make_auth_headers("superadmin")
    response = await async_client.get(
        "/api/v1/dashboard/ocr-stats", params={"days": 7}, headers=headers
    )
    assert response.status_code == 200, response.text
    today_bucket = {
        point["date"]: point for point in response.json()["accuracy"]["daily"]
    }[now.date().isoformat()]

    assert today_bucket["evaluated"] == 101
    assert today_bucket["exact"] == 1
    assert today_bucket["mismatch"] == 100
    assert today_bucket["accuracyPct"] == 1.0
    assert today_bucket["rollingAccuracyPct"] == 0.0


# ---------------------------------------------------------------------------
# Per-attempt analytics — each provider LLM call recorded, incl. rescued 429s
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_extract_container_numbers_returns_attempt_per_provider_call():
    """Each model LLM call yields one entry in ``attempts``.

    A 429 on 32B rescued by Qwen3.7-Plus produces 2 attempts (32B fail, Plus
    success), so the 429 is visible to analytics even though the request
    overall succeeded — the undercounting that the per-attempt refactor fixes.
    """

    async def _32b_429(image_bytes, mime_type):
        return {
            "success": False,
            "text": None,
            "error": "HTTP 429: rate limit exceeded",
            "provider": "openrouter",
            "model": "qwen/qwen3-vl-32b-instruct",
        }

    async def _plus_ok(image_bytes, mime_type):
        return {
            "success": True,
            "text": '{"container_numbers": ["MSKU1234565"]}',
            "error": None,
            "provider": "openrouter",
            "model": "qwen/qwen3.7-plus",
        }

    test_bytes = _make_test_image(800, 600)
    with patch(
        "app.contexts.operations.infrastructure.ocr._available_providers",
        return_value=[
            ("openrouter", "qwen/qwen3-vl-32b-instruct", 30.0, _32b_429),
            ("openrouter", "qwen/qwen3.7-plus", 30.0, _plus_ok),
        ],
    ):
        result = await extract_container_numbers(test_bytes, "image/jpeg")

    assert result["success"] is True
    assert result["provider"] == "openrouter"
    attempts = result["attempts"]
    assert len(attempts) == 2

    first, second = attempts
    assert first["provider"] == "openrouter"
    assert first["model"] == "qwen/qwen3-vl-32b-instruct"
    assert first["success"] is False
    assert first["error"] == "HTTP 429: rate limit exceeded"
    assert first["container_numbers_found"] == 0
    assert isinstance(first["latency_ms"], int)

    assert second["provider"] == "openrouter"
    assert second["model"] == "qwen/qwen3.7-plus"
    assert second["success"] is True
    assert second["error"] is None
    assert second["container_numbers_found"] == 1


@pytest.mark.asyncio
async def test_ocr_container_logs_driver_request_and_per_attempt_rows(
    db_session, async_client, make_auth_headers
):
    """ocr_container writes ONE ocr_driver_requests row (the photo upload) plus
    one ocr_requests row per model attempt. A 429 on 32B rescued by
    Qwen3.7-Plus is captured as a failed ocr_requests row."""
    from sqlalchemy import select

    async def _32b_429(image_bytes, mime_type):
        return {
            "success": False,
            "text": None,
            "error": "HTTP 429: rate limit exceeded",
            "provider": "openrouter",
            "model": "qwen/qwen3-vl-32b-instruct",
        }

    async def _plus_ok(image_bytes, mime_type):
        return {
            "success": True,
            "text": '{"container_numbers": ["MSKU1234565"]}',
            "error": None,
            "provider": "openrouter",
            "model": "qwen/qwen3.7-plus",
        }

    img_b64 = __import__("base64").b64encode(_make_test_image(200, 200)).decode()
    headers = await make_auth_headers("superadmin")
    with patch(
        "app.contexts.operations.infrastructure.ocr._available_providers",
        return_value=[
            ("openrouter", "qwen/qwen3-vl-32b-instruct", 30.0, _32b_429),
            ("openrouter", "qwen/qwen3.7-plus", 30.0, _plus_ok),
        ],
    ):
        response = await async_client.post(
            "/api/v1/delivered-trips/ocr-container",
            json={"image_data": img_b64, "mime_type": "image/jpeg"},
            headers=headers,
        )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["success"] is True
    assert body["provider"] == "openrouter"

    driver_rows = (await db_session.execute(select(OcrDriverRequest))).scalars().all()
    attempt_rows = (await db_session.execute(select(OcrRequest))).scalars().all()

    assert len(driver_rows) == 1
    driver = driver_rows[0]
    assert driver.success is True
    assert driver.attempts == 2  # 32B + Plus
    assert driver.numbers_found == 1
    assert driver.provider == "openrouter"
    assert driver.latency_ms is not None and driver.latency_ms >= 0

    assert len(attempt_rows) == 2
    by_model = {r.model: r for r in attempt_rows}
    assert by_model["qwen/qwen3-vl-32b-instruct"].success is False
    assert "HTTP 429" in by_model["qwen/qwen3-vl-32b-instruct"].error
    assert by_model["qwen/qwen3.7-plus"].success is True
    assert by_model["qwen/qwen3.7-plus"].container_numbers_found == 1


@pytest.mark.asyncio
async def test_ocr_container_no_provider_records_driver_failure(
    db_session, async_client, make_auth_headers, monkeypatch
):
    """OCR unconfigured → no provider ran, but the upload still counts as a
    driver-seen failure: one ``OcrDriverRequest`` row, zero per-attempt rows."""
    from sqlalchemy import select

    monkeypatch.setattr(settings, "OPENROUTER_ENABLE", False)
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "")
    monkeypatch.setattr(settings, "GEMINI_ENABLE", False)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(settings, "GEMINI_API_KEY2", "")

    img_b64 = __import__("base64").b64encode(_make_test_image(100, 100)).decode()
    headers = await make_auth_headers("superadmin")
    response = await async_client.post(
        "/api/v1/delivered-trips/ocr-container",
        json={"image_data": img_b64, "mime_type": "image/jpeg"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["success"] is False

    driver_rows = (await db_session.execute(select(OcrDriverRequest))).scalars().all()
    attempt_rows = (await db_session.execute(select(OcrRequest))).scalars().all()
    assert len(driver_rows) == 1
    assert driver_rows[0].success is False
    assert driver_rows[0].attempts == 0
    assert attempt_rows == []


@pytest.mark.asyncio
async def test_ocr_stats_driver_experience(db_session, async_client, make_auth_headers):
    """driverExperience reports photo-upload counts + e2e latency from
    ocr_driver_requests, separate from the per-attempt ocr_requests grain."""
    today = datetime.now(timezone.utc).replace(microsecond=0)
    rows = []
    for i, lat in enumerate([800, 900, 1000, 1100, 1200, 1300]):
        rows.append(
            OcrDriverRequest(
                created_at=today + timedelta(milliseconds=i),
                success=True,
                attempts=1,
                numbers_found=1,
                latency_ms=lat,
                provider="openrouter",
                user_id=None,
            )
        )
    # one failed upload with no latency → counted in requests, excluded from latency
    rows.append(
        OcrDriverRequest(
            created_at=today + timedelta(seconds=5),
            success=False,
            attempts=2,
            numbers_found=0,
            latency_ms=None,
            provider="openrouter",
            user_id=None,
        )
    )
    db_session.add_all(rows)
    await db_session.commit()

    headers = await make_auth_headers("superadmin")
    response = await async_client.get(
        "/api/v1/dashboard/ocr-stats", params={"days": 7}, headers=headers
    )
    assert response.status_code == 200, response.text
    dx = response.json()["driverExperience"]

    assert dx["totals"]["requests"] == 7
    assert dx["totals"]["success"] == 6
    assert dx["totals"]["latencyAvgMs"] == pytest.approx(
        sum([800, 900, 1000, 1100, 1200, 1300]) / 6, abs=0.01
    )
    assert dx["totals"]["latencyP95Ms"] is not None

    today_iso = today.date().isoformat()
    by_date = {d["date"]: d for d in dx["daily"]}
    assert by_date[today_iso]["requests"] == 7
    assert by_date[today_iso]["success"] == 6
    assert by_date[today_iso]["failed"] == 1
    assert by_date[today_iso]["latencyAvgMs"] == pytest.approx(
        sum([800, 900, 1000, 1100, 1200, 1300]) / 6, abs=0.01
    )


@pytest.mark.asyncio
async def test_ocr_stats_driver_experience_latency_hidden_for_non_admin(
    db_session, async_client, make_auth_headers
):
    """Driver-experience counts are visible to all roles; the e2e latency is
    superadmin-only (mirrors the provider-call latency gating)."""
    today = datetime.now(timezone.utc).replace(microsecond=0)
    db_session.add_all(
        [
            OcrDriverRequest(
                created_at=today + timedelta(milliseconds=i),
                success=True,
                attempts=1,
                numbers_found=1,
                latency_ms=lat,
                provider="openrouter",
                user_id=None,
            )
            for i, lat in enumerate([100, 200, 300, 400, 500])
        ]
    )
    await db_session.commit()

    headers = await make_auth_headers("accountant")
    response = await async_client.get(
        "/api/v1/dashboard/ocr-stats", params={"days": 7}, headers=headers
    )
    assert response.status_code == 200
    dx = response.json()["driverExperience"]
    assert dx["totals"]["requests"] == 5
    assert dx["totals"]["latencyAvgMs"] is None
    assert dx["totals"]["latencyP95Ms"] is None
    assert all(d["latencyAvgMs"] is None for d in dx["daily"])
