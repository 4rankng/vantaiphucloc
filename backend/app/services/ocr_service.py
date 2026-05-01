"""OCR service for extracting container numbers from images using Gemini API.

Driver workflow:
1. Take photo of container
2. AI attempts OCR (max 2 attempts)
3. If both fail → driver enters manually
4. Backend validates against ISO 6346
"""

import base64
import logging
import os
import re
from typing import Optional

import httpx

from app.utils.iso6346 import validate_container_number

_logger = logging.getLogger(__name__)

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta"

# Prompt for container number extraction
CONTAINER_PROMPT = """You are looking at a photo taken by a truck driver of a shipping container.

YOUR TASK: Find and return ONLY the container number painted on the container.

IMPORTANT CONTEXT:
- The photo is taken in a busy port/depot environment — there will be lots of noise: signs, labels, QR codes, truck license plates, other containers, graffiti, text on the ground, etc.
- IGNORE ALL OF THAT. Focus ONLY on the large, bold text painted directly on the container body.
- The container number is usually the biggest, most prominent text on the container — typically painted in large black or white characters.
- It may appear on the side, door, or top of the container.

FORMAT — ISO 6346 container number:
- 4 uppercase letters + 6 digits + 1 check digit = 11 characters total
- Examples: MSKU1234567, TCLU9876543, OOLU5567890
- May have hyphens like MSKU-123456-7 — remove them in your output

RULES:
1. Return ONLY the 11-character container number, uppercase, no hyphens, no spaces
2. If you can see multiple container numbers (e.g., stacked containers), return the one on the CLOSEST/largest container
3. If you cannot find a valid container number, return exactly: NONE
4. Do NOT include any explanation, reasoning, or extra text
5. Double-check: your output must be exactly 4 letters followed by 7 digits

Example outputs:
MSKU1234567
TCLU9876543
NONE"""


class OCRAttempt:
    """Track OCR attempts for rate limiting and fallback."""

    def __init__(self, max_attempts: int = 2):
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

    # Check if API key is configured
    if not GEMINI_API_KEY:
        _logger.error("OCR_GEMINI_NO_KEY", "GEMINI_API_KEY not configured", "ocr_service")
        return {
            "success": False,
            "container_number": None,
            "error": "Không nhận dạng được số cont",
            "attempts_remaining": attempt.max_attempts - attempt.attempts if attempt else 0,
        }

    # Encode image to base64
    try:
        encoded = base64.b64encode(image_bytes).decode("utf-8")
    except Exception as e:
        _logger.error("OCR_BASE64_ENCODE_FAILED", e, "ocr_service")
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
            "maxOutputTokens": 100,
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
        _logger.error("OCR_GEMINI_HTTP_ERROR", f"HTTP {e.response.status_code}", "ocr_service")
        return {
            "success": False,
            "container_number": None,
            "error": "Không nhận dạng được số cont",
            "attempts_remaining": attempt.max_attempts - attempt.attempts if attempt else 0,
        }
    except httpx.RequestError as e:
        _logger.error("OCR_GEMINI_REQUEST_ERROR", e, "ocr_service")
        return {
            "success": False,
            "container_number": None,
            "error": "Không nhận dạng được số cont",
            "attempts_remaining": attempt.max_attempts - attempt.attempts if attempt else 0,
        }
    except Exception as e:
        _logger.error("OCR_GEMINI_UNEXPECTED_ERROR", e, "ocr_service")
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
            _logger.error("OCR_GEMINI_NO_CANDIDATES", None, "ocr_service")
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
            _logger.warning("OCR_GEMINI_NONE_RESPONSE", None, "ocr_service")
            return {
                "success": False,
                "container_number": None,
                "error": "Không nhận dạng được số cont",
                "attempts_remaining": attempt.max_attempts - attempt.attempts if attempt else 0,
            }

        # Validate against ISO 6346
        is_valid, error_msg = validate_container_number(text)

        if not is_valid:
            _logger.warning(
                "OCR_GEMINI_INVALID_FORMAT",
                f"Extracted '{text}' - {error_msg}",
                "ocr_service",
            )
            return {
                "success": False,
                "container_number": text,
                "error": "Không nhận dạng được số cont",
                "attempts_remaining": attempt.max_attempts - attempt.attempts if attempt else 0,
            }

        # Success!
        if attempt:
            attempt.record_attempt(success=True)

        _logger.info(
            "OCR_GEMINI_SUCCESS",
            f"Extracted valid container number: {text}",
            "ocr_service",
        )
        return {
            "success": True,
            "container_number": text,
            "error": None,
            "attempts_remaining": attempt.max_attempts - attempt.attempts if attempt else 0,
        }

    except Exception as e:
        _logger.error("OCR_GEMINI_PARSE_ERROR", e, "ocr_service")
        return {
            "success": False,
            "container_number": None,
            "error": "Không nhận dạng được số cont",
            "attempts_remaining": attempt.max_attempts - attempt.attempts if attempt else 0,
        }
