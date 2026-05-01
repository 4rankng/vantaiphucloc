"""OCR service for extracting container numbers from images using Gemini API.

Driver workflow:
1. Take photo of container
2. AI attempts OCR (max MAX_OCR_ATTEMPTS attempts)
3. If all fail → driver enters manually
4. Backend validates against ISO 6346
"""

import base64
import io
import logging
import os
import re
from typing import Optional

import httpx
from PIL import Image, ImageEnhance

from app.utils.iso6346 import validate_container_number

MAX_OCR_ATTEMPTS = 3

_logger = logging.getLogger(__name__)

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta"


def preprocess_image(image_bytes: bytes) -> tuple[bytes, str]:
    """Sharpen and enhance contrast only. Gemini handles the rest.

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

# Prompt for container number extraction
CONTAINER_PROMPT = """You are analyzing a photo of a shipping container taken at a port/depot.

TASK: Find the container number — the large text painted on the container body (side, door, or top). It is the biggest, most prominent marking on the container.

FORMAT: ISO 6346 — 4 uppercase letters + 7 digits (e.g. MSKU1234567). Hyphens may be present (MSKU-123456-7).

RULES:
- Ignore everything else: signs, QR codes, license plates, labels, other containers
- Return ONLY the 11-character number, uppercase, no spaces or hyphens
- If multiple numbers visible, return the one on the closest/largest container
- If no valid container number found, return NONE

Example outputs:
MSKU1234567
TCLU9876543
NONE"""


class OCRAttempt:
    """Track OCR attempts for rate limiting and fallback."""

    def __init__(self, max_attempts: int = MAX_OCR_ATTEMPTS):
        self.max_attempts = max_attempts
        self.attempts = 0
        self.success = False

    def can_attempt(self) -> bool:
        """Check if another attempt is allowed."""
        return self.attempts < self.max_attempts and not self.success

    def record_attempt(self, success: bool = False):
        """Record an OCR attempt."""
        self.attempts += 1
        if success:
            self.success = True

    def is_exhausted(self) -> bool:
        """Check if all attempts are exhausted."""
        return self.attempts >= self.max_attempts


async def extract_container_number(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    attempt: Optional[OCRAttempt] = None,
) -> dict:
    """Extract container number from image using Gemini API.

    Args:
        image_bytes: Raw image data
        mime_type: MIME type of the image (image/jpeg, image/png, etc.)
        attempt: OCRAttempt instance to track attempts (optional)

    Returns:
        Dict with keys:
        - success: bool - True if extraction and validation succeeded
        - container_number: str | None - Extracted container number
        - error: str | None - Error message if failed
        - attempts_remaining: int - Number of attempts left
    """
    if attempt:
        attempt.record_attempt()

    if not GEMINI_API_KEY:
        _logger.error("[OCR] GEMINI_API_KEY not configured")
        return {
            "success": False,
            "container_number": None,
            "error": "Không nhận dạng được số cont",
            "attempts_remaining": attempt.max_attempts - attempt.attempts if attempt else 0,
        }

    try:
        image_bytes, mime_type = preprocess_image(image_bytes)
    except Exception as e:
        _logger.warning("[OCR] preprocess failed, using raw image: %s", e)

    try:
        encoded = base64.b64encode(image_bytes).decode("utf-8")
    except Exception as e:
        _logger.error("[OCR] base64 encode failed: %s", e)
        return {
            "success": False,
            "container_number": None,
            "error": "Không nhận dạng được số cont",
            "attempts_remaining": attempt.max_attempts - attempt.attempts if attempt else 0,
        }

    # Build request payload
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": CONTAINER_PROMPT},
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

    # Make request to Gemini API
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
        _logger.error("[OCR] Gemini HTTP %s", e.response.status_code)
        return {
            "success": False,
            "container_number": None,
            "error": "Không nhận dạng được số cont",
            "attempts_remaining": attempt.max_attempts - attempt.attempts if attempt else 0,
        }
    except httpx.RequestError as e:
        _logger.error("[OCR] Gemini request failed: %s", e)
        return {
            "success": False,
            "container_number": None,
            "error": "Không nhận dạng được số cont",
            "attempts_remaining": attempt.max_attempts - attempt.attempts if attempt else 0,
        }
    except Exception as e:
        _logger.error("[OCR] Gemini unexpected error: %s", e)
        return {
            "success": False,
            "container_number": None,
            "error": "Không nhận dạng được số cont",
            "attempts_remaining": attempt.max_attempts - attempt.attempts if attempt else 0,
        }

    # Parse response
    try:
        candidates = result.get("candidates", [])
        if not candidates:
            _logger.warning("[OCR] Gemini returned no candidates")
            return {
                "success": False,
                "container_number": None,
                "error": "Không nhận dạng được số cont",
                "attempts_remaining": attempt.max_attempts - attempt.attempts if attempt else 0,
            }

        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()

        # Normalize AI output: strip markdown formatting, quotes, whitespace
        text = re.sub(r"[`\"'\n\r]", "", text).strip()

        # Extract container number pattern (4 letters + 6 digits + 1 check digit)
        match = re.search(r"[A-Z]{4}\d{7}", text.upper())
        if match:
            text = match.group(0)
        else:
            text = text.upper()

        # Handle "NONE" response (AI couldn't find a container)
        if text.upper() == "NONE":
            _logger.info("[OCR] Gemini could not find container number")
            return {
                "success": False,
                "container_number": None,
                "error": "Không nhận dạng được số cont",
                "attempts_remaining": attempt.max_attempts - attempt.attempts if attempt else 0,
            }

        # Validate against ISO 6346
        is_valid, error_msg = validate_container_number(text)

        if not is_valid:
            _logger.warning("[OCR] invalid format: raw='%s' reason=%s", text, error_msg)
            return {
                "success": False,
                "container_number": text,
                "error": "Không nhận dạng được số cont",
                "attempts_remaining": attempt.max_attempts - attempt.attempts if attempt else 0,
            }

        # Success!
        if attempt:
            attempt.record_attempt(success=True)

        _logger.info("[OCR] success: %s", text)
        return {
            "success": True,
            "container_number": text,
            "error": None,
            "attempts_remaining": attempt.max_attempts - attempt.attempts if attempt else 0,
        }

    except Exception as e:
        _logger.error("[OCR] parse error: %s", e)
        return {
            "success": False,
            "container_number": None,
            "error": "Không nhận dạng được số cont",
            "attempts_remaining": attempt.max_attempts - attempt.attempts if attempt else 0,
        }
