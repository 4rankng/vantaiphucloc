"""Unified AI service using Google Gemini for text/image analysis.

Uses a hard-coded model fallback chain: tries each model in order
until one succeeds. This avoids single-model outages (503 overload).
"""

import base64
import io
import logging
from pathlib import Path

import httpx
from dotenv import dotenv_values
from PIL import Image

from app.config import settings

_logger = logging.getLogger(__name__)

# Configuration — read API key from project .env to avoid stale shell env-var overrides
_PROJECT_ENV = dotenv_values(Path(__file__).resolve().parents[4] / ".env")
GEMINI_API_KEY = _PROJECT_ENV.get("GEMINI_API_KEY") or settings.GEMINI_API_KEY
GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta"

# Hard-coded fallback chain — fastest/cheapest first, then more capable
_GEMINI_MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"]

# Shared HTTP client (lazy singleton)
_http_client: httpx.AsyncClient | None = None
_VISION_TIMEOUT = 60.0


async def _get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=_VISION_TIMEOUT)
    return _http_client


def preprocess_image(image_bytes: bytes) -> tuple[bytes, str]:
    """Lightweight preprocessing — downsize only, preserve natural pixels.

    Modern VLMs (Vision Transformers) are trained on unmanipulated photos.
    Aggressive sharpening/contrast blows out metallic surfaces and degrades
    semantic context.  We keep only the resolution gate to stay within API
    payload limits.

    Returns (processed_bytes, mime_type).
    """
    img = Image.open(io.BytesIO(image_bytes))

    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    # Downsize large images to reduce payload without losing OCR accuracy
    MAX_DIMENSION = 2048
    if max(img.size) > MAX_DIMENSION:
        img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue(), "image/jpeg"


async def call_gemini_vision(
    prompt: str,
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    model: str | None = None,
    response_schema: dict | None = None,
) -> dict:
    """Call Gemini API with image input.

    Args:
        prompt: The text prompt to send
        image_bytes: Raw image data
        mime_type: MIME type of the image
        model: Specific model to use (None = try fallback chain)
        response_schema: Optional JSON schema dict for structured output.
            When provided, forces JSON response via responseMimeType.

    Returns:
        Dict with keys:
        - success: bool
        - text: str | None
        - error: str | None
        - provider: str ("gemini")
        - model: str — which model was used
    """
    if not GEMINI_API_KEY:
        return {
            "success": False,
            "text": None,
            "error": "Gemini API key not configured",
            "provider": "gemini",
            "model": None,
        }

    try:
        encoded = base64.b64encode(image_bytes).decode("utf-8")
    except Exception as e:
        _logger.error("[Gemini] base64 encode failed: %s", e)
        return {
            "success": False,
            "text": None,
            "error": "Image encoding failed",
            "provider": "gemini",
            "model": None,
        }

    # Build request payload (Gemini format)
    generation_config: dict = {
        "temperature": 0.0,
        "maxOutputTokens": 4096,
    }
    if response_schema:
        generation_config["responseMimeType"] = "application/json"
        generation_config["responseSchema"] = response_schema

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": encoded,
                        }
                    },
                ]
            }
        ],
        "generationConfig": generation_config,
    }

    models_to_try = [model] if model else _GEMINI_MODELS
    last_error = None

    for m in models_to_try:
        url = f"{GEMINI_ENDPOINT}/models/{m}:generateContent?key={GEMINI_API_KEY}"

        try:
            client = await _get_http_client()
            response = await client.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            result = response.json()

        except httpx.HTTPStatusError as e:
            last_error = f"HTTP {e.response.status_code}"
            _logger.warning("[Gemini] %s failed: %s", m, last_error)
            continue  # try next model
        except httpx.RequestError as e:
            last_error = "Request failed"
            _logger.warning("[Gemini] %s request failed: %s", m, e)
            continue
        except Exception as e:
            last_error = str(e)
            _logger.warning("[Gemini] %s unexpected: %s", m, e)
            continue

        # Parse response
        try:
            candidates = result.get("candidates", [])
            if not candidates:
                last_error = "No response generated"
                _logger.warning("[Gemini] %s: no candidates", m)
                continue

            text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()

            return {
                "success": True,
                "text": text,
                "error": None,
                "provider": "gemini",
                "model": m,
            }

        except Exception as e:
            last_error = "Response parse failed"
            _logger.error("[Gemini] %s parse error: %s", m, e)
            continue

    return {
        "success": False,
        "text": None,
        "error": last_error or "All models failed",
        "provider": "gemini",
        "model": None,
    }


async def analyze_image_with_fallback(
    prompt: str,
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    response_schema: dict | None = None,
) -> dict:
    """Analyze image using Gemini AI with automatic model fallback.

    Args:
        prompt: The text prompt to send
        image_bytes: Raw image data
        mime_type: MIME type of the image
        response_schema: Optional JSON schema for structured output

    Returns:
        Dict with keys:
        - success: bool
        - text: str | None
        - error: str | None
        - provider: str ("gemini")
        - model: str — which model succeeded
        - fallback_used: bool
    """
    if not GEMINI_API_KEY:
        _logger.error("[AI] Gemini API key not configured")
        return {
            "success": False,
            "text": None,
            "error": "Gemini API key not configured",
            "provider": None,
            "model": None,
            "fallback_used": False,
        }

    result = await call_gemini_vision(prompt, image_bytes, mime_type, response_schema=response_schema)

    if result["success"]:
        used_model = result.get("model", _GEMINI_MODELS[0])
        fallback_used = used_model != _GEMINI_MODELS[0]
        _logger.info("[AI] Gemini %s success: %s", used_model, result.get("text", "")[:50])
        return {
            "success": True,
            "text": result["text"],
            "error": None,
            "provider": "gemini",
            "model": used_model,
            "fallback_used": fallback_used,
        }
    else:
        _logger.error("[AI] All Gemini models failed: %s", result["error"])
        return {
            "success": False,
            "text": None,
            "error": result["error"],
            "provider": "gemini",
            "model": None,
            "fallback_used": False,
        }


async def analyze_text_with_fallback(
    prompt: str,
    messages: list[dict] | None = None,
) -> dict:
    """Analyze text using Gemini AI with automatic model fallback.

    Args:
        prompt: System prompt
        messages: List of message dicts with 'role' and 'content'

    Returns:
        Dict with keys:
        - success: bool
        - text: str | None
        - error: str | None
        - provider: str ("gemini")
        - model: str
        - fallback_used: bool
    """
    if not GEMINI_API_KEY:
        _logger.error("[AI] Gemini API key not configured")
        return {
            "success": False,
            "text": None,
            "error": "Gemini API key not configured",
            "provider": None,
            "model": None,
            "fallback_used": False,
        }

    payload = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.0,
            "maxOutputTokens": 4096,
        },
    }

    last_error = None

    for m in _GEMINI_MODELS:
        try:
            url = f"{GEMINI_ENDPOINT}/models/{m}:generateContent?key={GEMINI_API_KEY}"
            client = await _get_http_client()
            response = await client.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            result = response.json()

            candidates = result.get("candidates", [])
            if candidates:
                text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
                _logger.info("[AI] Gemini %s text success", m)
                return {
                    "success": True,
                    "text": text,
                    "error": None,
                    "provider": "gemini",
                    "model": m,
                    "fallback_used": m != _GEMINI_MODELS[0],
                }

        except Exception as e:
            last_error = str(e)
            _logger.warning("[AI] Gemini %s text failed: %s", m, e)
            continue

    return {
        "success": False,
        "text": None,
        "error": last_error or "No AI provider available",
        "provider": None,
        "model": None,
        "fallback_used": False,
    }
