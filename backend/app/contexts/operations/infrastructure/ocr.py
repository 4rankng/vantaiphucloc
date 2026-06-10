"""OCR service for extracting container numbers from images using Gemini AI.

Driver workflow:
1. Take photo of container
2. AI attempts OCR (max MAX_OCR_ATTEMPTS attempts)
3. If all fail → driver enters manually
4. Backend validates against ISO 6346

Accuracy techniques applied:
- Structured JSON output via Gemini responseSchema
- Temperature 0.0 for deterministic responses
- Self-consistency voting (2 parallel calls → merge)
- Spatial scanning prompt to anchor multi-container detection
- Minimal preprocessing (downscale only, no aggressive enhancement)
"""

import asyncio
import json
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
# Multi-container OCR — uses structured JSON + self-consistency voting
# ---------------------------------------------------------------------------

MAX_DETECT = 10
_VOTING_CALLS = 2  # parallel calls for self-consistency

# JSON schema enforced at the Gemini engine level
_CONTAINER_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "container_numbers": {
            "type": "ARRAY",
            "description": "List of all valid ISO 6346 container numbers found in the image.",
            "items": {
                "type": "STRING",
                "pattern": "^[A-Z]{4}\\d{7}$",
            },
        }
    },
    "required": ["container_numbers"],
}

MULTI_CONTAINER_PROMPT = """You are inspecting a photo of shipping containers in a port or truck yard.

Your task: find ALL container numbers painted on the shipping containers visible in this image.

Container number format (ISO 6346): 4 uppercase letters followed by 7 digits (e.g., MSKU1234567).

Scanning procedure — follow this order:
1. Scan the image systematically from LEFT to RIGHT.
2. Inspect every distinct container hull, side panel, or surface independently.
3. For EACH container surface found, look for the large painted owner code + serial number.
4. If multiple separate views, panels, or zones are visible, treat each as independent and extract from ALL zones.

Rules:
- Each container number is the LARGEST text on that container's side
- Ignore weight capacity codes (e.g. MGW, tare), customs marks, or owner logos
- Numbers may be white on colored background, or black on white background
- Hyphens may appear between groups (e.g., MSKU-123456-7) — strip them
- Include a number ONLY if you are highly confident in ALL 11 characters
- Return an empty array if no containers are found"""


def _parse_numbers_from_response(text: str) -> list[str]:
    """Extract container numbers from Gemini response (JSON or fallback regex)."""
    # Try structured JSON first
    try:
        data = json.loads(text)
        if isinstance(data, dict) and "container_numbers" in data:
            nums = data["container_numbers"]
            if isinstance(nums, list):
                return [str(n).upper().strip() for n in nums if isinstance(n, str) and re.match(r"^[A-Z]{4}\d{7}$", str(n).upper())]
    except (json.JSONDecodeError, TypeError):
        pass

    # Fallback: regex extraction from free-text response
    cleaned = re.sub(r"[`\"'\n\r]", "", text).strip().upper()
    if cleaned == "NONE":
        return []
    return list(dict.fromkeys(re.findall(r"[A-Z]{4}\d{7}", cleaned)))


async def _single_ocr_call(
    image_bytes: bytes,
    mime_type: str,
) -> list[str]:
    """Make one OCR call with JSON schema enforcement. Returns list of raw matches."""
    result = await analyze_image_with_fallback(
        MULTI_CONTAINER_PROMPT,
        image_bytes,
        mime_type,
        response_schema=_CONTAINER_SCHEMA,
    )
    if not result["success"]:
        _logger.warning("[OCR-vote] call failed: %s", result["error"])
        return []
    return _parse_numbers_from_response(result["text"])


async def extract_container_numbers(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
) -> dict:
    """Extract ALL container numbers using self-consistency voting.

    Fires _VOTING_CALLS parallel requests, merges via set union to maximize
    recall — if either call finds a container, it's included in the result.

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

    # Self-consistency: fire multiple calls in parallel, merge results
    vote_results = await asyncio.gather(
        *[_single_ocr_call(image_bytes, mime_type) for _ in range(_VOTING_CALLS)]
    )

    # Union of all found numbers (preserving order, deduped)
    seen: set[str] = set()
    merged: list[str] = []
    for nums in vote_results:
        for n in nums:
            if n not in seen:
                seen.add(n)
                merged.append(n)

    _logger.info(
        "[OCR-vote] vote results: %s → merged: %s",
        [nums for nums in vote_results],
        merged,
    )

    if not merged:
        return {
            "success": False,
            "container_numbers": [],
            "error": "Không nhận dạng được số cont",
            "provider": "gemini",
        }

    # Safety cap
    if len(merged) > MAX_DETECT:
        _logger.warning("[OCR] truncating %d matches to %d", len(merged), MAX_DETECT)
        merged = merged[:MAX_DETECT]

    # Validate FORMAT only (4 letters + 7 digits).  We intentionally skip the
    # ISO 6346 check-digit verification here because VLMs often misread 1-2
    # characters (O↔Q, 5↔6, 0↔O).  The driver visually confirms the numbers
    # on-screen, and the frontend's validate-container endpoint can flag
    # check-digit mismatches as a warning.
    valid = [n for n in merged if re.fullmatch(r"[A-Z]{4}\d{7}", n)]

    if not valid:
        return {
            "success": False,
            "container_numbers": [],
            "error": "Không nhận dạng được số cont",
            "provider": "gemini",
        }

    _logger.info(
        "[OCR] multi-cont success: %d numbers (%s)",
        len(valid), ", ".join(valid),
    )
    return {
        "success": True,
        "container_numbers": valid,
        "error": None,
        "provider": "gemini",
    }
