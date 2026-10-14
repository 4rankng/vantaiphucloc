"""Tests for the OpenRouter-backed Excel AI fallback extractor (ai_extractor.py).

All tests mock the OpenRouter HTTP layer (same pattern as the
call_openrouter_vision tests in test_ocr.py) — no network, no real keys.
"""

import httpx
import pytest

from app.config import settings


async def _async_return(value):
    return value


def _make_sheet():
    from app.contexts.operations.infrastructure.import_pipeline.workbook import (
        SheetView,
    )

    return SheetView(
        name="Sheet1",
        state="visible",
        n_rows=4,
        n_cols=5,
        rows=[
            ["STT", "SỐ CONT", "LOẠI", "ĐIỂM ĐÓN", "ĐIỂM TRẢ"],
            ["1", "TCNU2473728", "F20", "NFC", "YMC"],
            ["2", "HCVT0002", "E40", "Bãi bóng", "NFC"],
            [None, None, None, None, None],
        ],
    )


_ROWS_JSON = (
    '{"rows": ['
    '{"container_number": "TCNU2473728", "cont_type": "F20", "pickup": "NFC", '
    '"dropoff": "YMC", "vessel_name": "ONE HARBOUR", "consignee": "Công ty A", '
    '"vehicle_plate": "51C-12345", "freight_charge": 1200000, "source_row": 1}, '
    '{"container_number": "HCVT0002", "cont_type": "E40", "pickup": "Bãi bóng", '
    '"dropoff": "NFC", "vessel_name": "", "consignee": "", "vehicle_plate": "", '
    '"freight_charge": null, "source_row": 2}'
    "]}"
)

_BARE_ARRAY_JSON = (
    '[{"container_number": "TCNU2473728", "cont_type": "F20", "pickup": "NFC", '
    '"dropoff": "YMC", "source_row": 1}]'
)


class _CapturingClient:
    """Fake httpx client that records every POST and replays one response."""

    def __init__(self, response=None):
        self.response = response
        self.calls = []

    async def post(self, url, json=None, headers=None):
        self.calls.append({"url": url, "json": json, "headers": headers})
        return self.response


def _openrouter_response(content: str) -> httpx.Response:
    request = httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions")
    return httpx.Response(
        200,
        request=request,
        json={"choices": [{"message": {"content": content}}], "model": "m"},
    )


def _patch_openrouter_client(monkeypatch, client):
    monkeypatch.setattr(
        "app.contexts.operations.infrastructure.openrouter._get_http_client",
        lambda: _async_return(client),
    )


async def _extract(sheets):
    from app.contexts.operations.infrastructure.import_pipeline.ai_extractor import (
        extract_with_ai,
    )

    return await extract_with_ai(sheets, "bai-xep.xlsx")


# ---------------------------------------------------------------------------
# Happy path — rows parsed from an OpenRouter chat/completions response
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_extract_with_ai_parses_rows_via_openrouter(monkeypatch):
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "test-or-key")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "gemini-sentinel")
    client = _CapturingClient(response=_openrouter_response(_ROWS_JSON))
    _patch_openrouter_client(monkeypatch, client)

    rows = await _extract([_make_sheet()])

    assert len(rows) == 2
    assert rows[0].container_number == "TCNU2473728"
    assert rows[0].cont_type == "F20"
    assert rows[0].pickup == "NFC"
    assert rows[0].dropoff == "YMC"
    assert rows[0].freight_charge == 1200000.0
    assert rows[1].container_number == "HCVT0002"
    assert rows[1].cont_type == "E40"
    assert rows[1].source_row_index == 2


@pytest.mark.asyncio
async def test_extract_with_ai_targets_openrouter_not_gemini(monkeypatch):
    """With a Gemini key present, extraction still goes to OpenRouter with
    Bearer auth — never generativelanguage.googleapis.com with ?key=."""
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "test-or-key")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "gemini-sentinel")
    client = _CapturingClient(response=_openrouter_response(_ROWS_JSON))
    _patch_openrouter_client(monkeypatch, client)

    rows = await _extract([_make_sheet()])

    assert rows, "extraction must succeed via OpenRouter"
    assert len(client.calls) == 1
    call = client.calls[0]
    url = str(call["url"])
    assert url.startswith(settings.OPENROUTER_BASE_URL.rstrip("/"))
    assert url.endswith("/chat/completions")
    assert "generativelanguage.googleapis.com" not in url
    assert "key=" not in url
    assert call["headers"]["Authorization"] == "Bearer test-or-key"
    assert call["json"]["model"] == settings.OPENROUTER_MODEL


@pytest.mark.asyncio
async def test_extract_with_ai_accepts_fenced_bare_array(monkeypatch):
    """Models that ignore json_object mode and wrap a bare array in markdown
    fences must still parse (lenient fallback)."""
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "test-or-key")
    fenced = f"```json\n{_BARE_ARRAY_JSON}\n```"
    _patch_openrouter_client(
        monkeypatch, _CapturingClient(response=_openrouter_response(fenced))
    )

    rows = await _extract([_make_sheet()])

    assert len(rows) == 1
    assert rows[0].container_number == "TCNU2473728"


# ---------------------------------------------------------------------------
# Failure contract — empty list, never raises
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_extract_with_ai_returns_empty_on_api_failure(monkeypatch):
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "test-or-key")
    request = httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions")
    response = httpx.Response(
        500, request=request, json={"error": {"message": "upstream boom"}}
    )
    _patch_openrouter_client(monkeypatch, _CapturingClient(response=response))

    rows = await _extract([_make_sheet()])

    assert rows == []


@pytest.mark.asyncio
async def test_extract_with_ai_returns_empty_on_unparseable_json(monkeypatch):
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "test-or-key")
    _patch_openrouter_client(
        monkeypatch, _CapturingClient(response=_openrouter_response("not json"))
    )

    rows = await _extract([_make_sheet()])

    assert rows == []


# ---------------------------------------------------------------------------
# Gemini key must never drive extraction
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_extract_with_ai_requires_openrouter_key_not_gemini(monkeypatch):
    """With only a Gemini key configured the extractor stays off. If the old
    Gemini-direct path were still live it would return rows from the stubbed
    Gemini client below — so this test pins the OpenRouter-only gate."""
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "gemini-sentinel")

    class _FakeGeminiClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def post(self, url, json=None):
            request = httpx.Request("POST", url)
            return httpx.Response(
                200,
                request=request,
                json={
                    "candidates": [{"content": {"parts": [{"text": _BARE_ARRAY_JSON}]}}]
                },
            )

    monkeypatch.setattr(httpx, "AsyncClient", _FakeGeminiClient)

    rows = await _extract([_make_sheet()])

    assert rows == []


# ---------------------------------------------------------------------------
# call_openrouter_completion — text-only OpenRouter call
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_call_openrouter_completion_no_key_returns_failure(monkeypatch):
    from app.contexts.operations.infrastructure.openrouter import (
        call_openrouter_completion,
    )

    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "")
    result = await call_openrouter_completion("prompt")

    assert result["success"] is False
    assert result["provider"] == "openrouter"
    assert result["error"] == "OpenRouter API key not configured"


@pytest.mark.asyncio
async def test_call_openrouter_completion_builds_payload_and_strips_think(
    monkeypatch,
):
    from app.contexts.operations.infrastructure.openrouter import (
        call_openrouter_completion,
    )

    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "test-or-key")
    client = _CapturingClient(
        response=_openrouter_response('<think>reasoning</think>{"rows": []}')
    )
    _patch_openrouter_client(monkeypatch, client)

    result = await call_openrouter_completion(
        "prompt", max_tokens=8192, response_format={"type": "json_object"}
    )

    assert result["success"] is True
    assert result["text"] == '{"rows": []}'
    assert result["provider"] == "openrouter"
    payload = client.calls[0]["json"]
    assert payload["model"] == settings.OPENROUTER_MODEL
    assert payload["temperature"] == 0
    assert payload["max_tokens"] == 8192
    assert payload["response_format"] == {"type": "json_object"}
    assert payload["messages"] == [{"role": "user", "content": "prompt"}]
