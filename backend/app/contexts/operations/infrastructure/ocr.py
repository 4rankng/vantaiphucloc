"""OCR service for extracting container numbers from images.

OpenRouter is the sole OCR provider. Each request tries the OpenRouter models
in sequence (Qwen3-VL-32B then Qwen3.7-Plus); the first model that returns a
valid number wins.

SLA: the whole provider chain is bounded by ``settings.OCR_DEADLINE_SECONDS``
(wall-clock budget for every attempt combined) and each individual call is
additionally capped by ``settings.OCR_PER_CALL_TIMEOUT_SECONDS``. This keeps
the endpoint inside the frontend's 60s axios timeout — a single hung model
can no longer eat the entire budget. When no model returns a clean read (and
salvage cannot recover one), the service returns ``"Không nhận diện được số
cont"`` instead of letting axios abort the request.

Driver workflow:
1. Take photo of container
2. AI single-shot OCR (temperature 0.0 = deterministic)
3. Backend auto-corrects near-miss numbers via ISO 6346 check digit
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
from app.utils.iso6346 import validate_check_digit, suggest_corrections

ProviderCallable = Callable[[bytes, str], Awaitable[dict]]


_logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Multi-container OCR — single deterministic call with ISO 6346 correction
# ---------------------------------------------------------------------------

MAX_DETECT = 10

MULTI_CONTAINER_PROMPT = """You are reading ISO shipping container numbers from a photo.

Return a JSON array of container numbers.

A container number is 11 characters:
- first 4 characters are uppercase letters A-Z
- last 7 characters are digits 0-9
- spaces, dashes, vertical layout, or line breaks between characters should be removed

Critical instruction:
If you can see any plausible container number, return your best 11-character reading.
Do NOT return an empty array just because some characters are blurry, partially hidden, low contrast, or the ISO check digit may be invalid.
A visually reasonable best guess is better than [].

Only return [] when there is truly no visible container number-like text anywhere in the image.

How to read:
1. Scan the whole visible container: door panels, top/bottom edges, vertical markings, and nearby repeated markings.
2. Look for a group with 4 letters followed by 6 or 7 digits, even if split across lines.
3. Normalize it into exactly 4 letters + 7 digits.
4. The first 4 positions must be letters. If a character in the first 4 positions looks like a digit, convert it to the most visually similar letter when reasonable:
   0→O, 1→I, 2→Z, 5→S, 6→G, 8→B.
5. The last 7 positions must be digits. If a character in the last 7 positions looks like a letter, convert it to the most visually similar digit when reasonable:
   O/Q→0, I/L/T→1, Z→2, S→5, G→6, B→8.
6. Ignore ISO size/type codes such as 22G1, 42G1, 45G1, company names, MAX GW, TARE, NET, CU CAP, KG, and LB.
7. If several readings are possible, return the single most visually likely container number first. If two different container numbers are visible, return both.

Output rules:
- Return ONLY a JSON array.
- Do not explain.
- Do not include confidence.
- Do not include markdown.
- Example output: ["MSKU1234567"]"""


# Pre-compiled container-number pattern — used across multiple functions
_CONTAINER_RE = re.compile(r"[A-Z]{4}\d{7}")


def _parse_numbers_from_response(text: str) -> list[str]:
    """Extract container numbers from a provider response (JSON or fallback regex)."""
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
        (label, model, timeout)
        for label, model, timeout in OPENROUTER_MODELS
        if model
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

    Tries each OpenRouter model in sequence (Qwen3-VL-32B then Qwen3.7-Plus);
    the first model that returns ≥1 format-valid number wins. Numbers with
    invalid ISO 6346 check digits are auto-corrected when a near-miss valid
    number exists.

    SLA: the chain is bounded by ``settings.OCR_DEADLINE_SECONDS`` of wall-clock
    time and each call is capped by ``settings.OCR_PER_CALL_TIMEOUT_SECONDS``.
    A timeout counts as a failed attempt; the next model is tried only if
    budget remains, otherwise the chain stops and falls through to salvage /
    the no-answer error — never exceeding the frontend's 60s axios timeout.

    Returns:
        Dict with keys:
        - success: bool
        - container_numbers: list[str] — all valid ISO 6346 numbers found
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
    # One entry per provider LLM call (fail / no-valid / winner). Returned so
    # the caller can log a row per attempt — every 429 and every fallback is
    # then visible to analytics, not just the winning provider.
    attempts: list[dict] = []
    # Raw VLM text from each provider that returned a response — kept so the
    # last-resort salvage can stub-pad partial reads if nobody returns a clean
    # 4-letter+7-digit number.
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
            last = {
                "provider": provider_label,
                "model": result.get("model"),
                "latency_ms": latency_ms,
                "error": result.get("error"),
            }
            attempts.append(
                {
                    "provider": provider_label,
                    "model": result.get("model"),
                    "success": False,
                    "latency_ms": latency_ms,
                    "error": result.get("error"),
                    "container_numbers_found": 0,
                }
            )
            _logger.warning(
                "[OCR] %s failed (%s): %s — trying next provider",
                provider_label,
                latency_ms,
                result.get("error"),
            )
            continue

        salvage_texts.append(result.get("text") or "")
        merged = _parse_numbers_from_response(result["text"])
        valid = [n for n in merged if _CONTAINER_RE.fullmatch(n)]

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
