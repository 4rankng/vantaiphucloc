"""Unified AI service using Google Gemini for text/image analysis."""

import base64
import io
import logging

import httpx
from PIL import Image, ImageEnhance

from app.config import settings

_logger = logging.getLogger(__name__)

# Configuration
GEMINI_API_KEY = settings.GEMINI_API_KEY
GEMINI_MODEL = settings.GEMINI_MODEL
GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta"

# Shared HTTP client (lazy singleton)
_http_client: httpx.AsyncClient | None = None
_VISION_TIMEOUT = 60.0


async def _get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=_VISION_TIMEOUT)
    return _http_client


def preprocess_image(image_bytes: bytes) -> tuple[bytes, str]:
    """Sharpen and enhance contrast for better OCR accuracy.

    Returns (processed_bytes, mime_type).
    """
    img = Image.open(io.BytesIO(image_bytes))

    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    # Downsize large images to reduce payload without losing OCR accuracy
    MAX_DIMENSION = 2048
    if max(img.size) > MAX_DIMENSION:
        img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)

    img = ImageEnhance.Sharpness(img).enhance(2.0)
    img = ImageEnhance.Contrast(img).enhance(1.4)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue(), "image/jpeg"


async def call_gemini_vision(
    prompt: str,
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
) -> dict:
    """Call Gemini API with image input.

    Args:
        prompt: The text prompt to send
        image_bytes: Raw image data
        mime_type: MIME type of the image

    Returns:
        Dict with keys:
        - success: bool
        - text: str | None
        - error: str | None
        - provider: str ("gemini")
    """
    if not GEMINI_API_KEY:
        return {
            "success": False,
            "text": None,
            "error": "Gemini API key not configured",
            "provider": "gemini",
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
        }

    # Build request payload (Gemini format)
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
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 1000,
        },
    }

    url = f"{GEMINI_ENDPOINT}/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

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
        _logger.error("[Gemini] HTTP %s", e.response.status_code)
        return {
            "success": False,
            "text": None,
            "error": f"HTTP {e.response.status_code}",
            "provider": "gemini",
        }
    except httpx.RequestError as e:
        _logger.error("[Gemini] request failed: %s", e)
        return {
            "success": False,
            "text": None,
            "error": "Request failed",
            "provider": "gemini",
        }
    except Exception as e:
        _logger.error("[Gemini] unexpected error: %s", e)
        return {
            "success": False,
            "text": None,
            "error": str(e),
            "provider": "gemini",
        }

    # Parse response
    try:
        candidates = result.get("candidates", [])
        if not candidates:
            _logger.warning("[Gemini] no candidates in response")
            return {
                "success": False,
                "text": None,
                "error": "No response generated",
                "provider": "gemini",
            }

        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()

        return {
            "success": True,
            "text": text,
            "error": None,
            "provider": "gemini",
        }

    except Exception as e:
        _logger.error("[Gemini] parse error: %s", e)
        return {
            "success": False,
            "text": None,
            "error": "Response parse failed",
            "provider": "gemini",
        }


async def analyze_image_with_fallback(
    prompt: str,
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
) -> dict:
    """Analyze image using Gemini AI.

    Args:
        prompt: The text prompt to send
        image_bytes: Raw image data
        mime_type: MIME type of the image

    Returns:
        Dict with keys:
        - success: bool
        - text: str | None
        - error: str | None
        - provider: str ("gemini")
        - fallback_used: bool (always False, kept for compatibility)
    """
    if not GEMINI_API_KEY:
        _logger.error("[AI] Gemini API key not configured")
        return {
            "success": False,
            "text": None,
            "error": "Gemini API key not configured",
            "provider": None,
            "fallback_used": False,
        }

    result = await call_gemini_vision(prompt, image_bytes, mime_type)

    if result["success"]:
        _logger.info("[AI] Gemini success: %s", result.get("text", "")[:50])
        return {
            "success": True,
            "text": result["text"],
            "error": None,
            "provider": "gemini",
            "fallback_used": False,
        }
    else:
        _logger.error("[AI] Gemini failed: %s", result["error"])
        return {
            "success": False,
            "text": None,
            "error": result["error"],
            "provider": "gemini",
            "fallback_used": False,
        }


async def analyze_text_with_fallback(
    prompt: str,
    messages: list[dict] | None = None,
) -> dict:
    """Analyze text using Gemini AI.

    Args:
        prompt: System prompt
        messages: List of message dicts with 'role' and 'content'

    Returns:
        Dict with keys:
        - success: bool
        - text: str | None
        - error: str | None
        - provider: str ("gemini")
        - fallback_used: bool
    """
    if not GEMINI_API_KEY:
        _logger.error("[AI] Gemini API key not configured")
        return {
            "success": False,
            "text": None,
            "error": "Gemini API key not configured",
            "provider": None,
            "fallback_used": False,
        }

    payload = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 1000,
        },
    }

    try:
        url = f"{GEMINI_ENDPOINT}/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
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
            _logger.info("[AI] Gemini text success")
            return {
                "success": True,
                "text": text,
                "error": None,
                "provider": "gemini",
                "fallback_used": False,
            }

    except Exception as e:
        _logger.error("[AI] Gemini text failed: %s", e)

    return {
        "success": False,
        "text": None,
        "error": "No AI provider available",
        "provider": None,
        "fallback_used": False,
    }
