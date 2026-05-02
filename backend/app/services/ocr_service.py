"""OCR service for extracting container numbers from images using AI.

AI Provider Priority:
1. DeepSeek (if API key available)
2. Gemini (fallback)

Driver workflow:
1. Take photo of container
2. AI attempts OCR (max MAX_OCR_ATTEMPTS attempts)
3. If all fail → driver enters manually
4. Backend validates against ISO 6346
"""

import io
import logging
import re
from typing import Optional

from PIL import Image, ImageEnhance

from app.services.ai_service import analyze_image_with_fallback, preprocess_image
from app.utils.iso6346 import validate_container_number

MAX_OCR_ATTEMPTS = 3

_logger = logging.getLogger(__name__)

# Prompt for container number extraction
CONTAINER_PROMPT = """Look at the photo and find the container number painted on the shipping container.

The container number is the large text in format: 4 letters followed by 7 digits (example: MSKU1234567). It may have hyphens.

CRITICAL: Your entire response must be EXACTLY one of these two things and NOTHING else:
- The 11-character container number in uppercase with no spaces or hyphens (e.g. MSKU1234567)
- The word NONE if you cannot find a container number

Do NOT include explanations, calculations, reasoning, or any other text. Do NOT compute check digits. Just return the raw number as printed on the container.

Examples:
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
    """Extract container number from image using AI.

    Tries DeepSeek first, falls back to Gemini.

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
        - provider: str | None - Which AI provider succeeded ("deepseek" or "gemini")
    """
    if attempt:
        attempt.record_attempt()

    # Preprocess image for better OCR
    try:
        image_bytes, mime_type = preprocess_image(image_bytes)
    except Exception as e:
        _logger.warning("[OCR] preprocess failed, using raw image: %s", e)

    # Call AI with automatic fallback (DeepSeek → Gemini)
    result = await analyze_image_with_fallback(CONTAINER_PROMPT, image_bytes, mime_type)

    if not result["success"]:
        _logger.error("[OCR] AI provider failed: %s", result["error"])
        return {
            "success": False,
            "container_number": None,
            "error": "Không nhận dạng được số cont",
            "attempts_remaining": attempt.max_attempts - attempt.attempts if attempt else 0,
            "provider": result.get("provider"),
        }

    # Parse AI response
    text = result["text"]

    # Normalize AI output: strip markdown formatting, quotes, whitespace
    text = re.sub(r"[`\"'\n\r]", "", text).strip()

    # Extract container number pattern (4 letters + 7 digits including check digit)
    match = re.search(r"[A-Z]{4}\d{7}", text.upper())
    if match:
        text = match.group(0)
    else:
        text = text.upper()

    # Handle "NONE" response (AI couldn't find a container)
    if text.upper() == "NONE":
        _logger.info("[OCR] AI (%s) could not find container number", result["provider"])
        return {
            "success": False,
            "container_number": None,
            "error": "Không nhận dạng được số cont",
            "attempts_remaining": attempt.max_attempts - attempt.attempts if attempt else 0,
            "provider": result["provider"],
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
            "provider": result["provider"],
        }

    # Success!
    if attempt:
        attempt.record_attempt(success=True)

    _logger.info("[OCR] success: %s (provider: %s, fallback: %s)", text, result["provider"], result["fallback_used"])
    return {
        "success": True,
        "container_number": text,
        "error": None,
        "attempts_remaining": attempt.max_attempts - attempt.attempts if attempt else 0,
        "provider": result["provider"],
        "fallback_used": result["fallback_used"],
    }
