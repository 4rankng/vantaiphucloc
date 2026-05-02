"""Unified AI service with DeepSeek as primary provider, Gemini as fallback.

Provider priority:
1. DeepSeek (if API key available)
2. Gemini (if DeepSeek fails or no API key)

Both providers support the same text/image analysis capabilities.
"""

import base64
import io
import logging
import os
import re
from typing import Optional

import httpx
from PIL import Image, ImageEnhance

_logger = logging.getLogger(__name__)

# Configuration
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-pro")
DEEPSEEK_ENDPOINT = "https://api.deepseek.com"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta"


def preprocess_image(image_bytes: bytes) -> tuple[bytes, str]:
    """Sharpen and enhance contrast for better OCR accuracy.

    Returns (processed_bytes, mime_type).
    """
    img = Image.open(io.BytesIO(image_bytes))

    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    img = ImageEnhance.Sharpness(img).enhance(2.0)
    img = ImageEnhance.Contrast(img).enhance(1.4)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue(), "image/jpeg"


async def call_deepseek_vision(
    prompt: str,
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
) -> dict:
    """Call DeepSeek API with image input (OpenAI-compatible format).

    Args:
        prompt: The text prompt to send
        image_bytes: Raw image data
        mime_type: MIME type of the image

    Returns:
        Dict with keys:
        - success: bool
        - text: str | None
        - error: str | None
        - provider: str ("deepseek")
    """
    if not DEEPSEEK_API_KEY:
        return {
            "success": False,
            "text": None,
            "error": "DeepSeek API key not configured",
            "provider": "deepseek",
        }

    try:
        encoded = base64.b64encode(image_bytes).decode("utf-8")
    except Exception as e:
        _logger.error("[DeepSeek] base64 encode failed: %s", e)
        return {
            "success": False,
            "text": None,
            "error": "Image encoding failed",
            "provider": "deepseek",
        }

    # Build request payload (OpenAI-compatible format)
    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{encoded}"
                        }
                    },
                ]
            }
        ],
        "temperature": 0.1,
        "max_tokens": 1000,
    }

    url = f"{DEEPSEEK_ENDPOINT}/chat/completions"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                },
            )
            response.raise_for_status()
            result = response.json()

    except httpx.HTTPStatusError as e:
        _logger.error("[DeepSeek] HTTP %s: %s", e.response.status_code, e.response.text)
        return {
            "success": False,
            "text": None,
            "error": f"HTTP {e.response.status_code}",
            "provider": "deepseek",
        }
    except httpx.RequestError as e:
        _logger.error("[DeepSeek] request failed: %s", e)
        return {
            "success": False,
            "text": None,
            "error": "Request failed",
            "provider": "deepseek",
        }
    except Exception as e:
        _logger.error("[DeepSeek] unexpected error: %s", e)
        return {
            "success": False,
            "text": None,
            "error": str(e),
            "provider": "deepseek",
        }

    # Parse response
    try:
        choices = result.get("choices", [])
        if not choices:
            _logger.warning("[DeepSeek] no choices in response")
            return {
                "success": False,
                "text": None,
                "error": "No response generated",
                "provider": "deepseek",
            }

        text = choices[0].get("message", {}).get("content", "").strip()

        return {
            "success": True,
            "text": text,
            "error": None,
            "provider": "deepseek",
        }

    except Exception as e:
        _logger.error("[DeepSeek] parse error: %s", e)
        return {
            "success": False,
            "text": None,
            "error": "Response parse failed",
            "provider": "deepseek",
        }


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
        async with httpx.AsyncClient(timeout=30.0) as client:
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
    """Analyze image using AI with automatic fallback.

    Provider priority:
    1. DeepSeek (if API key available and successful)
    2. Gemini (if DeepSeek fails or no API key)

    Args:
        prompt: The text prompt to send
        image_bytes: Raw image data
        mime_type: MIME type of the image

    Returns:
        Dict with keys:
        - success: bool
        - text: str | None
        - error: str | None
        - provider: str ("deepseek" or "gemini")
        - fallback_used: bool (True if Gemini was used as fallback)
    """
    # Try DeepSeek first
    if DEEPSEEK_API_KEY:
        _logger.info("[AI] Attempting DeepSeek...")
        result = await call_deepseek_vision(prompt, image_bytes, mime_type)

        if result["success"]:
            _logger.info("[AI] DeepSeek success: %s", result.get("text", "")[:50])
            return {
                "success": True,
                "text": result["text"],
                "error": None,
                "provider": "deepseek",
                "fallback_used": False,
            }
        else:
            _logger.warning("[AI] DeepSeek failed: %s", result["error"])
    else:
        _logger.info("[AI] DeepSeek API key not configured, skipping to Gemini")

    # Fallback to Gemini
    if GEMINI_API_KEY:
        _logger.info("[AI] Fallback to Gemini...")
        result = await call_gemini_vision(prompt, image_bytes, mime_type)

        if result["success"]:
            _logger.info("[AI] Gemini success: %s", result.get("text", "")[:50])
            return {
                "success": True,
                "text": result["text"],
                "error": None,
                "provider": "gemini",
                "fallback_used": True,
            }
        else:
            _logger.error("[AI] Gemini failed: %s", result["error"])
            return {
                "success": False,
                "text": None,
                "error": result["error"],
                "provider": "gemini",
                "fallback_used": True,
            }
    else:
        _logger.error("[AI] No AI provider configured (both DeepSeek and Gemini API keys missing)")
        return {
            "success": False,
            "text": None,
            "error": "No AI provider configured",
            "provider": None,
            "fallback_used": False,
        }


async def analyze_text_with_fallback(
    prompt: str,
    messages: list[dict] | None = None,
) -> dict:
    """Analyze text using AI with automatic fallback.

    Provider priority:
    1. DeepSeek (if API key available and successful)
    2. Gemini (if DeepSeek fails or no API key)

    Args:
        prompt: System prompt
        messages: List of message dicts with 'role' and 'content'

    Returns:
        Dict with keys:
        - success: bool
        - text: str | None
        - error: str | None
        - provider: str ("deepseek" or "gemini")
        - fallback_used: bool
    """
    # Try DeepSeek first
    if DEEPSEEK_API_KEY:
        _logger.info("[AI] Attempting DeepSeek (text)...")

        payload = {
            "model": DEEPSEEK_MODEL,
            "messages": messages or [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 1000,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{DEEPSEEK_ENDPOINT}/chat/completions",
                    json=payload,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                    },
                )
                response.raise_for_status()
                result = response.json()

                choices = result.get("choices", [])
                if choices:
                    text = choices[0].get("message", {}).get("content", "").strip()
                    _logger.info("[AI] DeepSeek text success")
                    return {
                        "success": True,
                        "text": text,
                        "error": None,
                        "provider": "deepseek",
                        "fallback_used": False,
                    }

        except Exception as e:
            _logger.warning("[AI] DeepSeek text failed: %s", e)

    # Fallback to Gemini
    if GEMINI_API_KEY:
        _logger.info("[AI] Fallback to Gemini (text)...")

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
            async with httpx.AsyncClient(timeout=30.0) as client:
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
                        "fallback_used": True,
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
