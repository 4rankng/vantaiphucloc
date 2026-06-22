"""OCR service for extracting container numbers from images.

Gemini is the primary OCR provider; MiniMax-M3 is the last-resort fallback.
Each call goes through ``_available_providers()`` (gated by the GEMINI_ENABLE
/ MINIMAX_ENABLE flags plus a non-empty API key) and the first provider that
returns valid numbers wins.

Two Gemini keys (``GEMINI_API_KEY`` / ``GEMINI_API_KEY2``) are alternated per
request — a round-robin counter picks the starting key so consecutive
requests land on different keys, spreading load to avoid HTTP 429 rate
limits. If the chosen key fails (429 or any error) the other Gemini key is
still tried before falling through to MiniMax, which is only used when every
Gemini key has failed.

Driver workflow:
1. Take photo of container
2. AI single-shot OCR (temperature 0.0 = deterministic)
3. Backend auto-corrects near-miss numbers via ISO 6346 check digit
4. If all fail → driver enters manually

Accuracy techniques:
- Structured JSON output (Gemini responseSchema; same prompt for MiniMax)
- Temperature 0.0 for deterministic responses
- Image preprocessing (downscale + auto-contrast)
- ISO 6346 check-digit auto-correction
"""

import json
import logging
import re
import time
from collections.abc import Awaitable, Callable

from app.config import settings
from app.contexts.operations.infrastructure.ai import (
    analyze_image_with_fallback,
    preprocess_image,
)
from app.contexts.operations.infrastructure.minimax import call_minimax_vision
from app.utils.iso6346 import validate_check_digit, suggest_corrections

ProviderCallable = Callable[[bytes, str], Awaitable[dict]]


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
                return [
                    str(n).upper().strip()
                    for n in nums
                    if isinstance(n, (str, int))
                    and _CONTAINER_RE.fullmatch(str(n).upper())
                ]
    except (json.JSONDecodeError, TypeError):
        pass

    # Fallback: regex extraction from free-text response
    cleaned = re.sub(r"[`\"'\n\r]", "", text).strip().upper()
    if cleaned == "NONE":
        return []
    return list(dict.fromkeys(_CONTAINER_RE.findall(cleaned)))


# Round-robin index across the available Gemini keys. Consecutive OCR
# requests start on a different key so load is spread across keys and a
# single key is less likely to hit a 429. asyncio runs single-threaded per
# event loop, so the read-modify-write below is atomic between awaits; in a
# multi-worker deployment each worker keeps its own counter, which still
# balances roughly across keys.
_gemini_rotation_index = 0


def _available_gemini_keys() -> list[str]:
    """Non-empty Gemini API keys configured for OCR, in fixed order."""
    return [k for k in (settings.GEMINI_API_KEY, settings.GEMINI_API_KEY2) if k]


def _rotate_gemini_keys(keys: list[str]) -> list[str]:
    """Order ``keys`` so this request starts on the next key (round-robin).

    With one key the list is returned unchanged. With two keys the requests
    alternate: ``[k0, k1]`` then ``[k1, k0]`` then ``[k0, k1]`` …  The first
    element is the key this request tries first; the rest are tried in order
    on failure before MiniMax is reached.
    """
    global _gemini_rotation_index
    if len(keys) <= 1:
        return list(keys)
    start = _gemini_rotation_index % len(keys)
    _gemini_rotation_index += 1
    return keys[start:] + keys[:start]


def _make_gemini_provider(api_key: str) -> ProviderCallable:
    """Build an OCR provider callable pinned to a specific Gemini key."""

    async def _call(image_bytes: bytes, mime_type: str) -> dict:
        return await analyze_image_with_fallback(
            MULTI_CONTAINER_PROMPT,
            image_bytes,
            mime_type,
            response_schema=_CONTAINER_SCHEMA,
            api_key=api_key,
        )

    return _call


async def _call_minimax(image_bytes: bytes, mime_type: str) -> dict:
    """MiniMax-M3 vision OCR call (last-resort provider)."""
    return await call_minimax_vision(MULTI_CONTAINER_PROMPT, image_bytes, mime_type)


def _available_providers() -> list[tuple[str, ProviderCallable]]:
    """Ordered OCR providers enabled by config (flag on AND key set).

    Gemini is primary. When two keys are configured they alternate per
    request (round-robin); if the first key fails the other Gemini key is
    still tried before giving up on Gemini. MiniMax is appended last as the
    fallback of last resort. Returns a list of ``(name, async-callable)``
    pairs — Gemini may appear more than once (once per key).
    """
    providers: list[tuple[str, ProviderCallable]] = []
    gemini_keys = _available_gemini_keys()
    if settings.GEMINI_ENABLE and gemini_keys:
        for key in _rotate_gemini_keys(gemini_keys):
            providers.append(("gemini", _make_gemini_provider(key)))
    if settings.MINIMAX_ENABLE and settings.MINIMAX_API_KEY:
        providers.append(("minimax", _call_minimax))
    return providers


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

    Tries each enabled provider in order (Gemini first — alternating between
    two keys per request to avoid 429s — then MiniMax as the last resort).
    The first provider that returns ≥1 format-valid number wins. Numbers
    with invalid ISO 6346 check digits are auto-corrected when a near-miss
    valid number exists.

    Returns:
        Dict with keys:
        - success: bool
        - container_numbers: list[str] — all valid ISO 6346 numbers found
        - error: str | None
        - provider: str | None — provider that produced the result
        - model: str | None
        - latency_ms: int | None
    """
    try:
        image_bytes, mime_type = preprocess_image(image_bytes)
    except Exception as e:
        _logger.warning("[OCR] preprocess failed, using raw image: %s", e)

    providers = _available_providers()
    if not providers:
        _logger.warning("[OCR] no provider enabled (check *_ENABLE flags and keys)")
        return {
            "success": False,
            "container_numbers": [],
            "error": "OCR chưa được cấu hình",
            "provider": None,
            "model": None,
            "latency_ms": None,
        }

    # Validate FORMAT only (4 letters + 7 digits).  We intentionally skip the
    # ISO 6346 check-digit verification here because VLMs often misread 1-2
    # characters (O↔Q, 5↔6, 0↔O).  The driver visually confirms the numbers
    # on-screen, and the frontend's validate-container endpoint can flag
    # check-digit mismatches as a warning.
    last: dict = {
        "provider": None,
        "model": None,
        "latency_ms": None,
        "error": None,
    }

    for name, call_fn in providers:
        t0 = time.perf_counter()
        result = await call_fn(image_bytes, mime_type)
        latency_ms = int((time.perf_counter() - t0) * 1000)
        provider_label = result.get("provider") or name

        if not result["success"]:
            last = {
                "provider": provider_label,
                "model": result.get("model"),
                "latency_ms": latency_ms,
                "error": result.get("error"),
            }
            _logger.warning(
                "[OCR] %s failed (%s): %s — trying next provider",
                provider_label,
                latency_ms,
                result.get("error"),
            )
            continue

        merged = _parse_numbers_from_response(result["text"])
        valid = [n for n in merged if _CONTAINER_RE.fullmatch(n)]

        if not valid:
            last = {
                "provider": provider_label,
                "model": result.get("model"),
                "latency_ms": latency_ms,
                "error": "no valid numbers",
            }
            _logger.info(
                "[OCR] %s returned no valid numbers (%s) — trying next provider",
                provider_label,
                latency_ms,
            )
            continue

        valid = _auto_correct_numbers(valid)
        if len(valid) > MAX_DETECT:
            _logger.warning("[OCR] truncating %d matches to %d", len(valid), MAX_DETECT)
            valid = valid[:MAX_DETECT]

        _logger.info(
            "[OCR] success via %s (%s): %d numbers (%s)",
            provider_label,
            latency_ms,
            len(valid),
            ", ".join(valid),
        )
        return {
            "success": True,
            "container_numbers": valid,
            "error": None,
            "provider": provider_label,
            "model": result.get("model"),
            "latency_ms": latency_ms,
        }

    _logger.info("[OCR] all providers exhausted, no valid numbers found")
    return {
        "success": False,
        "container_numbers": [],
        "error": "Không nhận dạng được số cont",
        "provider": last["provider"],
        "model": last["model"],
        "latency_ms": last["latency_ms"],
    }
