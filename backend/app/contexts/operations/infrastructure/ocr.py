"""OCR service for extracting container numbers from images using Gemini AI.

Driver workflow:
1. Take photo of container
2. AI single-shot OCR (temperature 0.0 = deterministic)
3. Backend auto-corrects near-miss numbers via ISO 6346 check digit
4. If all fail → driver enters manually

Accuracy techniques:
- Structured JSON output via Gemini responseSchema
- Temperature 0.0 for deterministic responses
- Image preprocessing (downscale + auto-contrast)
- ISO 6346 check-digit auto-correction
"""

import json
import logging
import re

from app.contexts.operations.infrastructure.ai import analyze_image_with_fallback, preprocess_image
from app.utils.iso6346 import validate_check_digit, suggest_corrections


_logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Multi-container OCR — single deterministic call with ISO 6346 correction
# ---------------------------------------------------------------------------

MAX_DETECT = 10

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

MULTI_CONTAINER_PROMPT = """Role: You are an expert logistics OCR assistant specializing in shipping containers. Examine the provided image and extract all standard ISO shipping container numbers.

Extraction Rules:

Format: A valid container number ALWAYS consists of exactly 4 uppercase letters followed by exactly 7 digits (e.g., MSKU1234567 or ALLU5216535).

Layout: The letters and digits may be separated by spaces, dashes, or printed across multiple lines. Concatenate them into a single, continuous 11-character alphanumeric string without spaces.

Exclusions: Strictly ignore ISO size/type codes (e.g., 22G1, 45G1, 42G1), company names, and weight/capacity specifications (e.g., MAX GW, TARE, NET, CU CAP, KG, LB).

Common Errors: Pay close attention to characters that look similar (e.g., distinguish the letter O from the number 0, the letter Q from O, and the letter S from the number 5). Remember: the first 4 characters are always letters, and the last 7 are always numbers.

Output: Return ONLY a clean JSON array containing the recognized container numbers. Do not include any conversational text. Example: {"container_numbers": ["ALLU5216535", "LSQU1077376"]}"""



# Pre-compiled container-number pattern — used across multiple functions
_CONTAINER_RE = re.compile(r"[A-Z]{4}\d{7}")


def _parse_numbers_from_response(text: str) -> list[str]:
    """Extract container numbers from Gemini response (JSON or fallback regex)."""
    # Try structured JSON first
    try:
        data = json.loads(text)
        if isinstance(data, dict) and "container_numbers" in data:
            nums = data["container_numbers"]
            if isinstance(nums, list):
                return [str(n).upper().strip() for n in nums if isinstance(n, (str, int)) and _CONTAINER_RE.fullmatch(str(n).upper())]
    except (json.JSONDecodeError, TypeError):
        pass

    # Fallback: regex extraction from free-text response
    cleaned = re.sub(r"[`\"'\n\r]", "", text).strip().upper()
    if cleaned == "NONE":
        return []
    return list(dict.fromkeys(_CONTAINER_RE.findall(cleaned)))




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
        _logger.warning("[OCR] call failed: %s", result["error"])
        return []
    return _parse_numbers_from_response(result["text"])


def _auto_correct_numbers(numbers: list[str]) -> list[str]:
    """Auto-correct numbers with bad check digits using ISO 6346 suggestions."""
    corrected: list[str] = []
    for n in numbers:
        if validate_check_digit(n):
            corrected.append(n)
        else:
            suggestions = suggest_corrections(n, max_results=1)
            if suggestions:
                _logger.info("[OCR] auto-corrected %s to %s", n, suggestions[0])
                corrected.append(suggestions[0])
            else:
                corrected.append(n)

    # Deduplicate in case multiple misreads corrected to same valid number
    return list(dict.fromkeys(corrected))


async def extract_container_numbers(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
) -> dict:
    """Extract ALL container numbers using single-shot OCR.

    Single deterministic call (temperature 0.0). Numbers with invalid ISO 6346
    check digits are auto-corrected when a near-miss valid number exists.

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

    # Single deterministic call (temperature 0.0 — no benefit from voting)
    merged = await _single_ocr_call(image_bytes, mime_type)

    _logger.info("[OCR] one-shot result: %s", merged)

    # Validate FORMAT only (4 letters + 7 digits).  We intentionally skip the
    # ISO 6346 check-digit verification here because VLMs often misread 1-2
    # characters (O↔Q, 5↔6, 0↔O).  The driver visually confirms the numbers
    # on-screen, and the frontend's validate-container endpoint can flag
    # check-digit mismatches as a warning.
    valid = [n for n in merged if _CONTAINER_RE.fullmatch(n)]

    if not merged or not valid:
        if merged and not valid:
            _logger.warning("[OCR] one-shot near-miss (format invalid): %s", merged)
        _logger.info("[OCR] single-shot found no valid numbers")
        return {
            "success": False,
            "container_numbers": [],
            "error": "Không nhận dạng được số cont",
            "provider": "gemini",
        }

    valid = _auto_correct_numbers(valid)

    if len(valid) > MAX_DETECT:
        _logger.warning("[OCR] truncating %d matches to %d", len(valid), MAX_DETECT)
        valid = valid[:MAX_DETECT]

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
