"""OCR service for extracting container numbers from images using Gemini AI.

Driver workflow:
1. Take photo of container
2. AI attempts single-shot OCR (temperature 0.0 = deterministic, no need for voting)
3. If fails → two-pass fallback (localize positions, then focused extraction)
4. If all fail → driver enters manually
5. Backend validates against ISO 6346

Accuracy techniques applied:
- Structured JSON output via Gemini responseSchema
- Temperature 0.0 for deterministic responses
- Two-pass fallback (spatial localization → focused extraction)
- Minimal preprocessing (downscale only, no aggressive enhancement)
"""

import asyncio
import io
import json
import logging
import re
import time

from PIL import Image

from app.contexts.operations.infrastructure.ai import analyze_image_with_fallback, preprocess_image
from app.utils.iso6346 import validate_check_digit, suggest_corrections


_logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Multi-container OCR — uses structured JSON + self-consistency voting
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

PASS1_PROMPT = """Look at this photo of shipping containers.

Identify all visible containers and list their approximate positions alongside any visible text.
Use combinations of vertical (Top, Middle, Bottom) and horizontal (Left, Center, Right) descriptors for the position.

Respond with JSON: {"positions": [{"position": "TOP_LEFT", "text": "TCLU123?"}]}

If you see partial text, include it with ? for unknown characters.
If no containers are visible, respond: {"positions": []}"""

PASS2_PROMPT = """Look at this photo carefully, specifically focusing on the region described as: {position}.

Find the container number painted in this specific area. It follows the ISO 6346 format:
4 uppercase letters + 7 digits (e.g., MSKU1234567).

The number is usually the LARGEST text in this section. Read each character carefully, left to right.

Reply with ONLY the container number (11 chars, no spaces, no hyphens). If you cannot definitively read it, reply with: NONE."""

_PASS1_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "positions": {
            "type": "ARRAY",
            "description": "List of visible container positions and partial text.",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "position": {"type": "STRING", "description": "Position descriptor like TOP_LEFT, MIDDLE_CENTER, etc."},
                    "text": {"type": "STRING", "description": "Visible or partial text at this position."}
                },
                "required": ["position", "text"]
            }
        }
    },
    "required": ["positions"],
}

# Pass-2 uses the same schema as one-shot
_PASS2_SCHEMA = _CONTAINER_SCHEMA

MAX_PASS2_REGIONS = 4

# Pre-compiled container-number pattern — used across multiple functions
_CONTAINER_RE = re.compile(r"[A-Z]{4}\d{7}")


def _ocr_fail() -> dict:
    """Standard OCR failure response."""
    return {
        "success": False,
        "container_numbers": [],
        "error": "Không nhận dạng được số cont",
        "provider": "gemini",
    }


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


# ---------------------------------------------------------------------------
# Position-aware cropping — used by two-pass OCR to focus on specific regions
# ---------------------------------------------------------------------------

_POSITION_REGIONS: dict[str, tuple[float, float, float, float]] = {
    "TOP_LEFT": (0.0, 0.5, 0.0, 0.5),
    "TOP_CENTER": (0.0, 0.5, 0.25, 0.75),
    "TOP_RIGHT": (0.0, 0.5, 0.5, 1.0),
    "MIDDLE_LEFT": (0.25, 0.75, 0.0, 0.5),
    "MIDDLE_CENTER": (0.25, 0.75, 0.25, 0.75),
    "MIDDLE_RIGHT": (0.25, 0.75, 0.5, 1.0),
    "BOTTOM_LEFT": (0.5, 1.0, 0.0, 0.5),
    "BOTTOM_CENTER": (0.5, 1.0, 0.25, 0.75),
    "BOTTOM_RIGHT": (0.5, 1.0, 0.5, 1.0),
    "LEFT": (0.0, 1.0, 0.0, 0.5),
    "CENTER": (0.0, 1.0, 0.25, 0.75),
    "RIGHT": (0.0, 1.0, 0.5, 1.0),
}


def _parse_pass1_positions(text: str) -> list[tuple[str, str]]:
    """Extract position-text pairs from pass-1 AI response.

    Tries JSON parse first, then falls back to regex for free-text responses.

    Args:
        text: Raw AI response text.

    Returns:
        List of (position, text) tuples. Empty list if no valid entries.
    """
    result: list[tuple[str, str]] = []
    try:
        data = json.loads(text)
        if isinstance(data, dict) and "positions" in data:
            items = data["positions"]
            if isinstance(items, list):
                for item in items:
                    if isinstance(item, dict):
                        pos = str(item.get("position", "")).strip().upper()
                        txt = str(item.get("text", "")).strip().upper()
                        if pos and txt and txt != "NONE":
                            result.append((pos, txt))
                return result
    except (json.JSONDecodeError, TypeError):
        pass

    result = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        match = re.match(r"^([A-Z_]+)\s*,\s*([A-Z0-9?]+)", line.upper())
        if match:
            pos = match.group(1)
            txt = match.group(2)
            if txt == "NONE":
                continue
            if pos and txt:
                result.append((pos, txt))

    return result


def _crop_to_region(
    image_bytes: bytes,
    position: str,
    mime_type: str = "image/jpeg",
) -> tuple[bytes, str]:
    """Crop image to the region defined by position.

    Args:
        image_bytes: Raw image data.
        position: Position key from _POSITION_REGIONS.
        mime_type: MIME type of the image.

    Returns:
        Tuple of (cropped_image_bytes, mime_type).
        If position is unknown, returns original image_bytes and mime_type.
    """
    if position not in _POSITION_REGIONS:
        return image_bytes, mime_type

    y_start_pct, y_end_pct, x_start_pct, x_end_pct = _POSITION_REGIONS[position]

    img = Image.open(io.BytesIO(image_bytes))
    width, height = img.size

    left = int(width * x_start_pct)
    top = int(height * y_start_pct)
    right = int(width * x_end_pct)
    bottom = int(height * y_end_pct)

    # Enforce minimum dimensions: expand from center if too small
    MIN_WIDTH = 200
    MIN_HEIGHT = 100

    crop_width = right - left
    crop_height = bottom - top

    if crop_width < MIN_WIDTH:
        expand = (MIN_WIDTH - crop_width) // 2
        left = max(0, left - expand)
        right = min(width, right + expand)
        if right - left < MIN_WIDTH:
            if left == 0:
                right = min(width, left + MIN_WIDTH)
            else:
                left = max(0, right - MIN_WIDTH)

    if crop_height < MIN_HEIGHT:
        expand = (MIN_HEIGHT - crop_height) // 2
        top = max(0, top - expand)
        bottom = min(height, bottom + expand)
        if bottom - top < MIN_HEIGHT:
            if top == 0:
                bottom = min(height, top + MIN_HEIGHT)
            else:
                top = max(0, bottom - MIN_HEIGHT)

    left = max(0, left)
    top = max(0, top)
    right = min(width, right)
    bottom = min(height, bottom)

    cropped = img.crop((left, top, right, bottom))

    if cropped.width < MIN_WIDTH or cropped.height < MIN_HEIGHT:
        new_width = max(MIN_WIDTH, cropped.width)
        new_height = max(MIN_HEIGHT, cropped.height)
        cropped = cropped.resize((new_width, new_height), Image.Resampling.LANCZOS)

    buf = io.BytesIO()
    cropped.save(buf, format="JPEG", quality=95)
    return buf.getvalue(), "image/jpeg"


async def _single_ocr_call(
    image_bytes: bytes,
    mime_type: str,
    prompt_override: str | None = None,
    response_schema_override: dict | None = None,
) -> list[str]:
    """Make one OCR call with JSON schema enforcement. Returns list of raw matches."""
    prompt = prompt_override if prompt_override is not None else MULTI_CONTAINER_PROMPT
    schema = response_schema_override if response_schema_override is not None else _CONTAINER_SCHEMA
    result = await analyze_image_with_fallback(
        prompt,
        image_bytes,
        mime_type,
        response_schema=schema,
    )
    if not result["success"]:
        _logger.warning("[OCR-vote] call failed: %s", result["error"])
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
    seen: set[str] = set()
    dedup: list[str] = []
    for n in corrected:
        if n not in seen:
            seen.add(n)
            dedup.append(n)
    return dedup


async def extract_container_numbers(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
) -> dict:
    """Extract ALL container numbers using single-shot OCR with two-pass fallback.

    Single deterministic call (temperature 0.0). If one-shot fails (empty or all
    invalid), triggers two-pass fallback:
    Pass 1: localize container positions, Pass 2: focused extraction per region.

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
        _logger.info("[OCR] one-shot failed, attempting two-pass")
        fallback_start = time.perf_counter()

        pass1_raw = await analyze_image_with_fallback(
            PASS1_PROMPT,
            image_bytes,
            mime_type,
            response_schema=_PASS1_SCHEMA,
        )
        if not pass1_raw["success"]:
            _logger.warning("[OCR] Pass 1 failed: %s", pass1_raw["error"])
            return _ocr_fail()

        positions = _parse_pass1_positions(pass1_raw["text"])
        _logger.info("[OCR] Pass 1 found %d positions", len(positions))

        if not positions:
            return _ocr_fail()

        # Filter to positions that map to known crop regions
        valid_positions = [(p, t) for p, t in positions[:MAX_PASS2_REGIONS] if p in _POSITION_REGIONS]
        if not valid_positions:
            _logger.warning("[OCR] Pass 1 returned no mappable positions: %s",
                            [p for p, _ in positions[:MAX_PASS2_REGIONS]])
            return _ocr_fail()

        # Run pass-2 region extractions in parallel
        async def _pass2_region(pos: str) -> list[str]:
            cropped_bytes, cropped_mime = _crop_to_region(image_bytes, pos, mime_type)
            return await _single_ocr_call(
                cropped_bytes,
                cropped_mime,
                prompt_override=PASS2_PROMPT.format(position=pos),
                response_schema_override=_PASS2_SCHEMA,
            )

        pass2_results = await asyncio.gather(
            *[_pass2_region(p) for p, _ in valid_positions]
        )

        # Deduplicate across all regions
        pass2_numbers: list[str] = []
        pass2_seen: set[str] = set()
        for (position, _partial), region_nums in zip(valid_positions, pass2_results):
            _logger.info("[OCR] Pass 2 position %s: found %d numbers", position, len(region_nums))
            for n in region_nums:
                if n not in pass2_seen:
                    pass2_seen.add(n)
                    pass2_numbers.append(n)

        fallback_elapsed = time.perf_counter() - fallback_start
        _logger.info("[OCR] two-pass elapsed: %.3fs", fallback_elapsed)

        if pass2_numbers:
            pass2_numbers = _auto_correct_numbers(pass2_numbers)
            if len(pass2_numbers) > MAX_DETECT:
                _logger.warning("[OCR] truncating %d matches to %d", len(pass2_numbers), MAX_DETECT)
                pass2_numbers = pass2_numbers[:MAX_DETECT]
            _logger.info(
                "[OCR] two-pass success: %d numbers (%s)",
                len(pass2_numbers), ", ".join(pass2_numbers),
            )
            return {
                "success": True,
                "container_numbers": pass2_numbers,
                "error": None,
                "provider": "gemini",
            }

        _logger.info("[OCR] two-pass found no valid numbers")
        return _ocr_fail()

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
