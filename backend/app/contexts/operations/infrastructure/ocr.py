"""OCR service for extracting container numbers from images using Gemini AI.

Driver workflow:
1. Take photo of container
2. AI attempts OCR (max MAX_OCR_ATTEMPTS attempts)
3. If all fail → driver enters manually
4. Backend validates against ISO 6346
"""

import logging
import re

from app.contexts.operations.infrastructure.ai import analyze_image_with_fallback, preprocess_image
from app.utils.iso6346 import validate_container_number

MAX_OCR_ATTEMPTS = 10

_logger = logging.getLogger(__name__)

# Prompt for container number extraction
CONTAINER_PROMPT = """Look at the photo and find the PRIMARY container number painted on the shipping container.

The container number follows ISO 6346 format: 4 uppercase letters followed by 7 digits (e.g., MSKU1234567).

Guidelines:
- The number is usually the LARGEST text on the container side
- Ignore smaller text like weight capacity codes, customs marks, or owner logos
- May be white on colored background, or black on white background
- Hyphens may appear between groups (e.g., MSKU-123456-7) — ignore them
- If weathered or partially obscured, extract the visible portion only if highly confident

CRITICAL: Your entire response must be EXACTLY one of these two things and NOTHING else:
- The 11-character container number in uppercase with no spaces or hyphens (e.g. MSKU1234567)
- The word NONE if you cannot find a container number

Do NOT include explanations, calculations, reasoning, or any other text. Do NOT compute check digits. Just return the raw number as printed on the container.

Examples:
MSKU1234567
TCLU9876543
NONE"""


async def extract_container_number(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
) -> dict:
    """Extract container number from image using Gemini AI.

    Args:
        image_bytes: Raw image data
        mime_type: MIME type of the image (image/jpeg, image/png, etc.)

    Returns:
        Dict with keys:
        - success: bool - True if extraction and validation succeeded
        - container_number: str | None - Extracted container number
        - error: str | None - Error message if failed
        - provider: str | None - Which AI provider succeeded ("gemini")
    """
    # Preprocess image for better OCR
    try:
        image_bytes, mime_type = preprocess_image(image_bytes)
    except Exception as e:
        _logger.warning("[OCR] preprocess failed, using raw image: %s", e)

    # Call Gemini AI
    result = await analyze_image_with_fallback(CONTAINER_PROMPT, image_bytes, mime_type)

    if not result["success"]:
        _logger.error("[OCR] AI provider failed: %s", result["error"])
        return {
            "success": False,
            "container_number": None,
            "error": "Không nhận dạng được số cont",
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
            "provider": result["provider"],
        }

    _logger.info("[OCR] success: %s (provider: %s, fallback: %s)", text, result["provider"], result["fallback_used"])
    return {
        "success": True,
        "container_number": text,
        "error": None,
        "provider": result["provider"],
        "fallback_used": result["fallback_used"],
    }


# ---------------------------------------------------------------------------
# Multi-container OCR
# ---------------------------------------------------------------------------

MAX_DETECT = 10

MULTI_CONTAINER_PROMPT = """Look at the photo and find ALL container numbers painted on the shipping containers.

The container number follows ISO 6346 format: 4 uppercase letters followed by 7 digits (e.g., MSKU1234567).

Guidelines:
- There may be MULTIPLE containers visible in the photo
- Each container number is usually the LARGEST text on that container's side
- Ignore smaller text like weight capacity codes, customs marks, or owner logos
- Numbers may be white on colored background, or black on white background
- Hyphens may appear between groups (e.g., MSKU-123456-7) — ignore them
- If weathered or partially obscured, include only if highly confident

CRITICAL: Your entire response must be EXACTLY a comma-separated list of container numbers and NOTHING else:
- Each number: 11 characters, uppercase, no spaces or hyphens (e.g. MSKU1234567)
- Multiple numbers separated by commas: MSKU1234567,TCLU9876543,OOLU1122334
- If no containers found: NONE

Do NOT include explanations, calculations, reasoning, or any other text.

Examples:
MSKU1234567,TCLU9876543
TRUL1234567
NONE"""


async def extract_container_numbers(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
) -> dict:
    """Extract ALL container numbers from image using Gemini AI.

    Returns:
        Dict with keys:
        - success: bool
        - container_numbers: list[str] — all valid ISO 6346 numbers found
        - error: str | None
        - provider: str | None
    """
    try:
        image_bytes, mime_type = preprocess_image(image_bytes)
    except Exception as e:
        _logger.warning("[OCR] preprocess failed, using raw image: %s", e)

    result = await analyze_image_with_fallback(MULTI_CONTAINER_PROMPT, image_bytes, mime_type)

    if not result["success"]:
        _logger.error("[OCR] AI provider failed: %s", result["error"])
        return {
            "success": False,
            "container_numbers": [],
            "error": "Không nhận dạng được số cont",
            "provider": result.get("provider"),
        }

    text = result["text"]
    text = re.sub(r"[`\"'\n\r]", "", text).strip().upper()

    if text == "NONE":
        _logger.info("[OCR] AI (%s) could not find container numbers", result["provider"])
        return {
            "success": False,
            "container_numbers": [],
            "error": "Không nhận dạng được số cont",
            "provider": result["provider"],
        }

    # Find ALL matches, deduplicate preserving order
    raw_matches = list(dict.fromkeys(re.findall(r"[A-Z]{4}\d{7}", text)))
    if not raw_matches:
        return {
            "success": False,
            "container_numbers": [],
            "error": "Không nhận dạng được số cont",
            "provider": result["provider"],
        }

    # Safety cap
    if len(raw_matches) > MAX_DETECT:
        _logger.warning("[OCR] truncating %d matches to %d", len(raw_matches), MAX_DETECT)
        raw_matches = raw_matches[:MAX_DETECT]

    # Validate each via ISO 6346, keep only valid
    valid = []
    for num in raw_matches:
        is_valid, error_msg = validate_container_number(num)
        if is_valid:
            valid.append(num)
        else:
            _logger.warning("[OCR] skipping invalid: %s (%s)", num, error_msg)

    if not valid:
        return {
            "success": False,
            "container_numbers": [],
            "error": "Không nhận dạng được số cont",
            "provider": result["provider"],
        }

    _logger.info(
        "[OCR] multi-cont success: %d numbers (%s) [provider: %s, fallback: %s]",
        len(valid), ", ".join(valid), result["provider"], result["fallback_used"],
    )
    return {
        "success": True,
        "container_numbers": valid,
        "error": None,
        "provider": result["provider"],
        "fallback_used": result["fallback_used"],
    }
