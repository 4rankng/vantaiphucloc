"""MiniMax vision client (OpenAI-compatible) for container-number OCR.

Mirrors ``call_gemini_vision`` so the OCR orchestrator can treat both
providers uniformly. MiniMax is the primary OCR provider; Gemini is the
fallback when MiniMax is disabled or fails.

Uses MiniMax's OpenAI-compatible Chat Completions endpoint:
    POST {MINIMAX_BASE_URL}/chat/completions  (Authorization: Bearer <key>)
with an ``image_url`` content block carrying a base64 data URI. We omit the
``thinking`` field to keep OCR latency low.
"""

import base64
import logging
import re

import httpx

from app.config import settings

_logger = logging.getLogger(__name__)

_VISION_TIMEOUT = 60.0
_http_client: httpx.AsyncClient | None = None

# MiniMax-M3 is a reasoning model and wraps its chain-of-thought in
# <think>…</think> tags before the actual answer. Strip them so downstream
# JSON/regex parsing only sees the answer.
_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)


async def _get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=_VISION_TIMEOUT)
    return _http_client


def _strip_think(text: str) -> str:
    """Remove MiniMax ``<think>`` reasoning blocks (closed and trailing)."""
    cleaned = _THINK_RE.sub("", text)
    # Drop an unclosed trailing <think> if the model was cut off mid-thought.
    cleaned = re.sub(r"<think>.*", "", cleaned, flags=re.DOTALL | re.IGNORECASE)
    return cleaned.strip()


def _extract_text(content) -> str:
    """Normalize an OpenAI-style ``message.content`` to a clean string.

    ``content`` may be a plain string or a list of typed content blocks
    (e.g. ``[{"type": "text", "text": "..."}]``). Any MiniMax ``<think>``
    reasoning embedded in the text is stripped.
    """
    if content is None:
        return ""
    if isinstance(content, str):
        raw = content
    elif isinstance(content, list):
        parts = [
            b.get("text", "")
            for b in content
            if isinstance(b, dict) and b.get("type") == "text"
        ]
        raw = "\n".join(p for p in parts if p)
    else:
        raw = str(content)
    return _strip_think(raw)


async def call_minimax_vision(
    prompt: str,
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
) -> dict:
    """Call MiniMax-M3 vision via the OpenAI-compatible endpoint.

    Returns a dict with the same shape as ``call_gemini_vision``:
    ``success``, ``text``, ``error``, ``provider`` ("minimax"), ``model``.
    """
    if not settings.MINIMAX_API_KEY:
        return {
            "success": False,
            "text": None,
            "error": "MiniMax API key not configured",
            "provider": "minimax",
            "model": None,
        }

    try:
        encoded = base64.b64encode(image_bytes).decode("utf-8")
    except Exception as e:
        _logger.error("[MiniMax] base64 encode failed: %s", e)
        return {
            "success": False,
            "text": None,
            "error": "Image encoding failed",
            "provider": "minimax",
            "model": None,
        }

    payload = {
        "model": settings.MINIMAX_MODEL,
        "temperature": 0,
        "max_tokens": 2048,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{encoded}"
                        },
                    },
                ],
            }
        ],
    }

    url = f"{settings.MINIMAX_BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.MINIMAX_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        client = await _get_http_client()
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        result = response.json()
    except Exception as e:
        _logger.warning("[MiniMax] request failed: %s: %s", type(e).__name__, e)
        return {
            "success": False,
            "text": None,
            "error": f"{type(e).__name__}: {e}",
            "provider": "minimax",
            "model": settings.MINIMAX_MODEL,
        }

    try:
        choices = result.get("choices") or []
        if not choices:
            return {
                "success": False,
                "text": None,
                "error": "No response generated",
                "provider": "minimax",
                "model": settings.MINIMAX_MODEL,
            }
        text = _extract_text(choices[0].get("message", {}).get("content"))
        if not text:
            return {
                "success": False,
                "text": None,
                "error": "Empty MiniMax response",
                "provider": "minimax",
                "model": settings.MINIMAX_MODEL,
            }
        return {
            "success": True,
            "text": text,
            "error": None,
            "provider": "minimax",
            "model": result.get("model") or settings.MINIMAX_MODEL,
        }
    except Exception as e:
        _logger.error("[MiniMax] response parse error: %s", e)
        return {
            "success": False,
            "text": None,
            "error": "Response parse failed",
            "provider": "minimax",
            "model": settings.MINIMAX_MODEL,
        }
