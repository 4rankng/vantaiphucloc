"""OCR service for extracting container numbers from images.

OpenRouter is the sole OCR provider. Each request tries the OpenRouter models
in sequence (Qwen3-VL-32B then Qwen3.7-Plus); the first model that returns a
valid identifier wins.

SLA: the whole provider chain is bounded by ``settings.OCR_DEADLINE_SECONDS``
(wall-clock budget for every attempt combined) and each individual call is
additionally capped by the per-model timeout in ``OPENROUTER_MODELS``. OCR now
runs from the arq worker, so this deadline protects worker capacity rather than
an upload request. When no model returns a clean read (and salvage cannot
recover one), the service returns ``"Không nhận diện được số cont"`` for the
job result.

Driver workflow:
1. Take photo of container
2. AI single-shot OCR (temperature 0.0 = deterministic)
3. Backend auto-corrects near-miss ISO numbers via ISO 6346 check digit
4. If no provider returns a clean 4-letter+7-digit read, salvage partial
   reads: keep the digits (usually reliable) and stub-pad missing owner-code
   letters with 'A' (e.g. U7735411 -> AAAU7735411) so the driver gets an
   editable candidate instead of a blank field.
5. Driver visually confirms/edits on-screen

Accuracy techniques:
- Structured JSON output (same prompt across models)
- Temperature 0.0 for deterministic responses
- Image preprocessing (downscale + auto-contrast)
- ISO 6346 check-digit auto-correction
- Stub-pad salvage of partial reads (digits trusted, letters stubbed)
"""

import asyncio
import json
import logging
import re
import time
from collections.abc import Awaitable, Callable

from app.config import OPENROUTER_MODELS, settings
from app.contexts.operations.infrastructure.ai import preprocess_image
from app.contexts.operations.infrastructure.openrouter import call_openrouter_vision
from app.utils.iso6346 import (
    normalize_container_number,
    suggest_corrections,
    validate_check_digit,
    validate_format,
    validate_special_container_format,
)

ProviderCallable = Callable[[bytes, str], Awaitable[dict]]


_logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Multi-container OCR — single deterministic call with ISO 6346 correction
# ---------------------------------------------------------------------------

MAX_DETECT = 10

MULTI_CONTAINER_PROMPT = """You are reading shipping container identifiers from a photo.

Return a JSON array of container identifiers.

Most container numbers are ISO numbers with 11 characters:
- first 4 characters are uppercase letters A-Z
- last 7 characters are digits 0-9
- spaces, dashes, vertical layout, or line breaks between characters should be removed

Some special containers have a short painted code instead:
- first 4 characters are uppercase letters A-Z
- last 4 characters are digits 0-9
- example: HCWT 0006 should be returned as HCWT0006

Critical instruction:
If you can see any plausible container identifier, return your best reading.
Do NOT return an empty array just because some characters are blurry, partially hidden, low contrast, or the ISO check digit may be invalid.
A visually reasonable best guess is better than [].

Only return [] when there is truly no visible container identifier-like text anywhere in the image.

How to read:
1. Scan the whole visible container: door panels, top/bottom edges, vertical markings, and nearby repeated markings.
2. First look for ISO numbers: 4 letters followed by 7 digits, even if split across lines.
3. If an ISO number is visible, return only the ISO number(s).
4. If no ISO number is visible, look for a special code: 4 letters followed by exactly 4 digits.
5. Normalize spaces, dashes, vertical layout, or line breaks into 4 letters + digits.
6. The first 4 positions must be letters. If a character in the first 4 positions looks like a digit, convert it to the most visually similar letter when reasonable:
   0→O, 1→I, 2→Z, 5→S, 6→G, 8→B.
7. The digit positions must be digits. If a character in the digit positions looks like a letter, convert it to the most visually similar digit when reasonable:
   O/Q→0, I/L/T→1, Z→2, S→5, G→6, B→8.
8. Ignore ISO size/type codes such as 22G1, 42G1, 45G1, company names, KG, and LB.
9. If several readings are possible, return the single most visually likely container identifier first. If two different container identifiers are visible, return both.

Output rules:
- Return ONLY a JSON array.
- Do not explain.
- Do not include confidence.
- Do not include markdown.
- Example output: ["MSKU1234567"]
- Example special-code output: ["HCWT0006"]"""


# Pre-compiled container-number patterns — used across multiple functions
_CONTAINER_RE = re.compile(r"[A-Z]{4}\d{7}")
_CONTAINER_TOKEN_RE = re.compile(
    r"(?<![A-Z0-9])(?:[A-Z]{4}[-\s]*\d{7}|[A-Z]{4}[-\s]*\d{4})(?![A-Z0-9])"
)


def _is_container_identifier(value: str) -> bool:
    normalized = normalize_container_number(value)
    return bool(_CONTAINER_RE.fullmatch(normalized)) or validate_special_container_format(
        normalized
    )


def _json_container_candidates(data: object) -> list[object]:
    if isinstance(data, dict):
        nums = data.get("container_numbers")
        return nums if isinstance(nums, list) else []
    if isinstance(data, list):
        return data
    return []


def _prefer_iso_identifiers(candidates: list[str]) -> list[str]:
    deduped = list(dict.fromkeys(candidates))
    iso = [n for n in deduped if _CONTAINER_RE.fullmatch(n)]
    if iso:
        return iso
    return [n for n in deduped if validate_special_container_format(n)]


def _parse_numbers_from_response(text: str) -> list[str]:
    """Extract container numbers from a provider response (JSON or fallback regex)."""
    # Try structured JSON first
    try:
        data = json.loads(text)
        nums = _json_container_candidates(data)
        if nums:
            normalized = [
                normalize_container_number(str(n))
                for n in nums
                if isinstance(n, (str, int))
            ]
            return _prefer_iso_identifiers(
                [n for n in normalized if _is_container_identifier(n)]
            )
    except (json.JSONDecodeError, TypeError):
        pass

    # Fallback: regex extraction from free-text response
    cleaned = re.sub(r"[`\"'\n\r]", " ", text).strip().upper()
    if cleaned == "NONE":
        return []
    matches = [normalize_container_number(m) for m in _CONTAINER_TOKEN_RE.findall(cleaned)]
    return _prefer_iso_identifiers([m for m in matches if _is_container_identifier(m)])


_STUB_LETTER = "A"
# A letter run followed by a 7+ digit run — the signature of a container
# number whose owner code may be partly occluded or over-read.
_SALVAGE_RE = re.compile(r"([A-Z]+)(\d{7,})")


def _salvage_tokens(text: str) -> list[str]:
    """Split a VLM response into individual candidate strings so each is
    salvaged in isolation. Without this, a JSON object key like
    ``container_numbers`` would glue onto the value and corrupt the owner
    code. Returns the array values from a JSON object/array; falls back to the
    whole text as a single token when the response is not valid JSON.
    """
    try:
        data = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return [text] if text else []
    if isinstance(data, dict):
        vals = data.get("container_numbers")
        if isinstance(vals, list):
            return [str(v) for v in vals if isinstance(v, (str, int))]
    if isinstance(data, list):
        return [str(v) for v in data if isinstance(v, (str, int))]
    return [text] if text else []


def _salvage_container_numbers(text: str) -> list[str]:
    """Last-resort salvage of partial container reads.

    Reached only when no provider returned a clean ``[A-Z]{4}\\d{7}`` number.
    The VLM usually reads the serial (digits) reliably even when owner-code
    letters are occluded or split across the stencil, so the digits are kept
    and missing owner-code letters are stub-padded with 'A'. This gives the
    driver an editable candidate (e.g. ``U7735411`` -> ``AAAU7735411``)
    instead of a blank field. Digits are treated as trustworthy; letters are
    not, so salvaged numbers are NOT run through ISO 6346 check-digit
    auto-correction (the stub letters guarantee a bad check digit and
    "correcting" it would only corrupt the reliable serial).

    Recovered shapes:
    - too few letters + >=7 digits: pad letters to 4 with a leading 'A'
      (visible letters are kept at the end, nearest the serial, since the
      category letter is what the VLM most often catches)
    - 4+ letters + >7 digits: truncate the digit run to the first 7
    """
    salvaged: list[str] = []
    for token in _salvage_tokens(text):
        cleaned = re.sub(r"[^A-Z0-9]", "", token.upper())
        for m in _SALVAGE_RE.finditer(cleaned):
            letters = m.group(1)[-4:].rjust(4, _STUB_LETTER)
            digits = m.group(2)[:7]
            salvaged.append(letters + digits)
    return list(dict.fromkeys(salvaged))


def _available_openrouter_models() -> list[tuple[str, str, float]]:
    return [
        (label, model, timeout) for label, model, timeout in OPENROUTER_MODELS if model
    ]


def _make_openrouter_provider(model: str) -> ProviderCallable:
    async def _call(image_bytes: bytes, mime_type: str) -> dict:
        return await call_openrouter_vision(
            MULTI_CONTAINER_PROMPT, image_bytes, mime_type, model=model
        )

    return _call


def _available_providers() -> list[tuple[str, str | None, float, ProviderCallable]]:
    """Ordered OCR providers enabled by config, as ``(name, model, timeout, callable)``.

    OpenRouter only — Gemini has been retired from the OCR chain. When enabled,
    its models are tried in sequence (Qwen3-VL-32B then Qwen3.7-Plus), each
    with its own per-call timeout. The ``model`` hint is carried alongside each
    callable so a timed-out call can still attribute the failure to the right
    model in analytics.
    """
    providers: list[tuple[str, str | None, float, ProviderCallable]] = []
    if settings.OPENROUTER_ENABLE and settings.OPENROUTER_API_KEY:
        for _, model, timeout in _available_openrouter_models():
            providers.append(
                ("openrouter", model, timeout, _make_openrouter_provider(model))
            )
    return providers


def _auto_correct_numbers(numbers: list[str]) -> list[str]:
    """Auto-correct numbers with bad check digits using ISO 6346 suggestions."""
    corrected: list[str] = []
    for n in numbers:
        if not validate_format(n):
            corrected.append(n)
            continue
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
    """Extract ALL container identifiers using single-shot OCR.

    Tries each OpenRouter model in sequence (Qwen3-VL-32B then Qwen3.7-Plus);
    the first model that returns ≥1 accepted identifier wins. ISO numbers with
    invalid check digits are auto-corrected when a near-miss valid number
    exists. Short special codes are returned as-is after format filtering.

    SLA: the chain is bounded by ``settings.OCR_DEADLINE_SECONDS`` of wall-clock
    time and each call is capped by ``settings.OCR_PER_CALL_TIMEOUT_SECONDS``.
    A timeout counts as a failed attempt; the next model is tried only if
    budget remains, otherwise the chain stops and falls through to salvage /
    the no-answer error — never exceeding the frontend's 60s axios timeout.

    Returns:
        Dict with keys:
        - success: bool
        - container_numbers: list[str] — all accepted container identifiers found
        - error: str | None
        - provider: str | None — provider that produced the result
        - model: str | None
        - latency_ms: int | None — winning provider's call latency (NOT e2e)
        - attempts: list[dict] — one entry per provider LLM call tried, each
          {provider, model, success, latency_ms, error, container_numbers_found}.
          A fail-then-fallback request yields one entry per attempt, so every
          timeout / "no valid numbers" / success is visible to analytics even
          when a later model rescued the request.
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
            "attempts": [],
        }

    # Validate accepted shapes only. We intentionally skip ISO 6346 check-digit
    # verification here because VLMs often misread 1-2 characters (O↔Q, 5↔6,
    # 0↔O). The driver visually confirms the numbers on-screen, and the
    # validate-container endpoint can flag check-digit mismatches as a warning.
    last: dict = {
        "provider": None,
        "model": None,
        "latency_ms": None,
        "error": None,
    }
    # One entry per provider LLM call (fail / no-valid / winner). Returned so
    # the caller can log a row per attempt — every 429 and every fallback is
    # then visible to analytics, not just the winning provider.
    attempts: list[dict] = []
    # Raw VLM text from each provider that returned a response — kept so the
    # last-resort salvage can stub-pad partial reads if nobody returns an
    # accepted identifier.
    salvage_texts: list[str] = []

    # Wall-clock backstop matching the frontend axios timeout (60s). Each model
    # already carries its own per-call timeout (see OPENROUTER_MODELS), sized so
    # the two-model chain sums to the SLA (10s + 50s); this deadline only bites
    # if a future model is added or a cap is raised past the budget. monotonic()
    # is immune to system-clock jumps across the awaits below.
    deadline = time.monotonic() + settings.OCR_DEADLINE_SECONDS

    for name, model_hint, per_model_timeout, call_fn in providers:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            _logger.warning(
                "[OCR] %ss deadline reached before %s — stopping chain",
                settings.OCR_DEADLINE_SECONDS,
                name,
            )
            break
        call_cap = min(per_model_timeout, remaining)
        t0 = time.perf_counter()
        try:
            result = await asyncio.wait_for(
                call_fn(image_bytes, mime_type), timeout=call_cap
            )
        except asyncio.TimeoutError:
            latency_ms = int((time.perf_counter() - t0) * 1000)
            last = {
                "provider": name,
                "model": model_hint,
                "latency_ms": latency_ms,
                "error": f"timeout ({call_cap:.1f}s)",
            }
            attempts.append(
                {
                    "provider": name,
                    "model": model_hint,
                    "success": False,
                    "latency_ms": latency_ms,
                    "error": f"timeout ({call_cap:.1f}s)",
                    "container_numbers_found": 0,
                }
            )
            _logger.warning(
                "[OCR] %s (%s) timed out after %.1fs — trying next model",
                name,
                model_hint,
                call_cap,
            )
            continue
        latency_ms = int((time.perf_counter() - t0) * 1000)
        provider_label = result.get("provider") or name

        if not result["success"]:
            is_rate_limited = bool(result.get("rate_limited"))
            last = {
                "provider": provider_label,
                "model": result.get("model"),
                "latency_ms": latency_ms,
                "error": result.get("error"),
            }
            attempt = {
                "provider": provider_label,
                "model": result.get("model"),
                "success": False,
                "latency_ms": latency_ms,
                "error": result.get("error"),
                "container_numbers_found": 0,
                "status_code": result.get("status_code"),
                "rate_limited": is_rate_limited,
                "retry_after_seconds": result.get("retry_after_seconds"),
            }
            attempts.append(attempt)
            if is_rate_limited:
                _logger.warning(
                    "[OCR] %s rate limited (%s); deferring retry instead of trying next model",
                    provider_label,
                    result.get("error"),
                )
                return {
                    "success": False,
                    "container_numbers": [],
                    "error": "OpenRouter đang giới hạn tốc độ, hệ thống sẽ tự thử lại",
                    "analytics_error": result.get("error"),
                    "provider": provider_label,
                    "model": result.get("model"),
                    "latency_ms": latency_ms,
                    "attempts": attempts,
                    "rate_limited": True,
                    "retry_after_seconds": result.get("retry_after_seconds"),
                }
            _logger.warning(
                "[OCR] %s failed (%s): %s — trying next provider",
                provider_label,
                latency_ms,
                result.get("error"),
            )
            continue

        salvage_texts.append(result.get("text") or "")
        merged = _parse_numbers_from_response(result["text"])
        valid = [n for n in merged if _is_container_identifier(n)]

        if not valid:
            last = {
                "provider": provider_label,
                "model": result.get("model"),
                "latency_ms": latency_ms,
                "error": "no valid numbers",
            }
            attempts.append(
                {
                    "provider": provider_label,
                    "model": result.get("model"),
                    "success": False,
                    "latency_ms": latency_ms,
                    "error": "no valid numbers",
                    "container_numbers_found": 0,
                }
            )
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
        attempts.append(
            {
                "provider": provider_label,
                "model": result.get("model"),
                "success": True,
                "latency_ms": latency_ms,
                "error": None,
                "container_numbers_found": len(valid),
            }
        )
        return {
            "success": True,
            "container_numbers": valid,
            "error": None,
            "provider": provider_label,
            "model": result.get("model"),
            "latency_ms": latency_ms,
            "attempts": attempts,
        }

    _logger.info("[OCR] all providers exhausted, no valid numbers found")

    # Last resort: no clean 4-letter+7-digit read from any provider. Salvage
    # partial reads from the raw VLM text — keep the digits, stub-pad missing
    # owner-code letters with 'A'. The driver gets an editable candidate
    # instead of a blank field. Salvaged numbers skip ISO 6346 auto-correction
    # (stub letters guarantee a bad check digit; see _salvage_container_numbers).
    salvaged: list[str] = []
    for raw in salvage_texts:
        salvaged.extend(_salvage_container_numbers(raw))
    salvaged = list(dict.fromkeys(salvaged))
    if salvaged:
        salvaged = salvaged[:MAX_DETECT]
        _logger.info(
            "[OCR] salvaged %d partial read(s): %s",
            len(salvaged),
            ", ".join(salvaged),
        )
        return {
            "success": True,
            "container_numbers": salvaged,
            "error": None,
            "provider": last["provider"],
            "model": last["model"],
            "latency_ms": last["latency_ms"],
            "attempts": attempts,
        }

    return {
        "success": False,
        "container_numbers": [],
        "error": "Không nhận diện được số cont",
        "analytics_error": last["error"],
        "provider": last["provider"],
        "model": last["model"],
        "latency_ms": last["latency_ms"],
        "attempts": attempts,
    }
