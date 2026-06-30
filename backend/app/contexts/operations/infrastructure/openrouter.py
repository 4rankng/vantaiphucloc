"""OpenRouter vision client (OpenAI-compatible) for container-number OCR.

OpenAI-compatible Chat Completions client for container-number OCR.
OpenRouter exposes an OpenAI-compatible endpoint similar to the Gemini
client — only the host, model, and API-key settings differ.

Uses:
    POST {OPENROUTER_BASE_URL}/chat/completions   (Authorization: Bearer <key>)
with an ``image_url`` content block carrying a base64 data URI. The default
model is Qwen3-VL-8B-Instruct (use the Instruct variant, not "Thinking" —
Thinking emits large ``<think>`` blocks that can truncate before an answer).
"""

import base64
import logging
import re

import httpx

from app.config import OPENROUTER_MODEL as _DEFAULT_MODEL, settings

_logger = logging.getLogger(__name__)

_VISION_TIMEOUT = 60.0
_http_client: httpx.AsyncClient | None = None

# Qwen reasoning models can wrap chain-of-thought in <think>…</think> tags
# before the actual answer. Strip them so downstream JSON/regex parsing only
# sees the answer.
_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)


async def _get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=_VISION_TIMEOUT)
    return _http_client


def _strip_think(text: str) -> str:
    """Remove ``<think>`` reasoning blocks (closed and trailing)."""
    cleaned = _THINK_RE.sub("", text)
    # Drop an unclosed trailing <think> if the model was cut off mid-thought.
    cleaned = re.sub(r"<think>.*", "", cleaned, flags=re.DOTALL | re.IGNORECASE)
    return cleaned.strip()


def _extract_text(content) -> str:
    """Normalize an OpenAI-style ``message.content`` to a clean string.

    ``content`` may be a plain string or a list of typed content blocks
    (e.g. ``[{"type": "text", "text": "..."}]``). Any ``<think>`` reasoning
    embedded in the text is stripped.
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


async def call_openrouter_vision(
    prompt: str,
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    model: str | None = None,
) -> dict:
    """Call an OpenRouter vision model via the OpenAI-compatible endpoint.

    Returns a dict with the same shape as the other providers:
    ``success``, ``text``, ``error``, ``provider`` ("openrouter"), ``model``.
    HTTP errors carry the status code + OpenRouter error message so a wrong
    model slug (404) is distinguishable from a bad key (401) or rate limit
    (429) in the OCR analytics.

    ``model`` overrides ``settings.OPENROUTER_MODEL`` — used to run a second
    (larger) OpenRouter model as a within-provider fallback before Gemini.
    """
    if not settings.OPENROUTER_API_KEY:
        return {
            "success": False,
            "text": None,
            "error": "OpenRouter API key not configured",
            "provider": "openrouter",
            "model": None,
        }

    try:
        encoded = base64.b64encode(image_bytes).decode("utf-8")
    except Exception as e:
        _logger.error("[OpenRouter] base64 encode failed: %s", e)
        return {
            "success": False,
            "text": None,
            "error": "Image encoding failed",
            "provider": "openrouter",
            "model": None,
        }

    model_slug = model or _DEFAULT_MODEL

    payload = {
        "model": model_slug,
        "temperature": 0,
        "max_tokens": 2048,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{encoded}"},
                    },
                ],
            }
        ],
    }

    url = f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        client = await _get_http_client()
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        result = response.json()
    except httpx.HTTPStatusError as e:
        status = e.response.status_code if e.response is not None else "?"
        detail = ""
        if e.response is not None:
            try:
                body = e.response.json()
                err = body.get("error") if isinstance(body, dict) else None
                if isinstance(err, dict):
                    detail = err.get("message", "") or ""
                elif isinstance(err, str):
                    detail = err
            except Exception:
                detail = ""
        msg = f"HTTP {status}" + (f": {detail}" if detail else "")
        _logger.warning("[OpenRouter] request failed: %s", msg)
        return {
            "success": False,
            "text": None,
            "error": msg,
            "provider": "openrouter",
            "model": model_slug,
        }
    except Exception as e:
        _logger.warning("[OpenRouter] request failed: %s: %s", type(e).__name__, e)
        return {
            "success": False,
            "text": None,
            "error": f"{type(e).__name__}: {e}",
            "provider": "openrouter",
            "model": model_slug,
        }

    try:
        choices = result.get("choices") or []
        if not choices:
            return {
                "success": False,
                "text": None,
                "error": "No response generated",
                "provider": "openrouter",
                "model": model_slug,
            }
        text = _extract_text(choices[0].get("message", {}).get("content"))
        if not text:
            return {
                "success": False,
                "text": None,
                "error": "Empty OpenRouter response",
                "provider": "openrouter",
                "model": model_slug,
            }
        return {
            "success": True,
            "text": text,
            "error": None,
            "provider": "openrouter",
            "model": result.get("model") or model_slug,
        }
    except Exception as e:
        _logger.error("[OpenRouter] response parse error: %s", e)
        return {
            "success": False,
            "text": None,
            "error": "Response parse failed",
            "provider": "openrouter",
            "model": model_slug,
        }
