"""LLM fallback for column-header classification.

Layer 3 calls this when the heuristic dictionary + pattern check both
yield confidence < 0.5 for a header. The default implementation
(`NullHeaderClassifier`) returns no decision, so the pipeline still works
end-to-end with zero LLM calls — it just leaves the column unmapped and
flagged for human review.

To enable real LLM classification, set
`settings.IMPORT_LLM_FALLBACK_ENABLED=True` and provide
`settings.GEMINI_API_KEY` (already in use for OCR — see ai_service.py).
"""

from __future__ import annotations

import hashlib
import logging
from typing import Protocol


_logger = logging.getLogger(__name__)


class HeaderClassifier(Protocol):
    async def classify(
        self,
        header_text: str,
        sample_values: list[str],
        candidates: list[str],
    ) -> tuple[str | None, float]:
        """Return (canonical_field_name | None, confidence in [0,1])."""
        ...


class NullHeaderClassifier:
    """Default — never returns a guess. Keeps imports working with no
    external dependencies."""

    async def classify(
        self,
        header_text: str,
        sample_values: list[str],
        candidates: list[str],
    ) -> tuple[str | None, float]:
        return None, 0.0


# ---------------------------------------------------------------------------
# In-process cache so re-running the pipeline on the same file (preview
# repeatedly) doesn't re-pay the LLM cost.
# ---------------------------------------------------------------------------

_LLM_CACHE: dict[str, tuple[str | None, float]] = {}


def _cache_key(header: str, samples: list[str]) -> str:
    h = hashlib.sha256()
    h.update(header.encode("utf-8"))
    for s in samples[:5]:
        h.update(b"|")
        h.update(str(s).encode("utf-8"))
    return h.hexdigest()


class CachedHeaderClassifier:
    """Wraps any HeaderClassifier with a sha256-keyed in-process cache."""

    def __init__(self, inner: HeaderClassifier) -> None:
        self._inner = inner

    async def classify(
        self,
        header_text: str,
        sample_values: list[str],
        candidates: list[str],
    ) -> tuple[str | None, float]:
        key = _cache_key(header_text, sample_values)
        cached = _LLM_CACHE.get(key)
        if cached is not None:
            return cached
        result = await self._inner.classify(header_text, sample_values, candidates)
        _LLM_CACHE[key] = result
        return result


# ---------------------------------------------------------------------------
# Gemini-backed implementation. Wired but disabled by default — the
# settings flag keeps it inert.
# ---------------------------------------------------------------------------

class GeminiHeaderClassifier:
    """Real LLM classifier. Calls Gemini once per (header, samples).

    Returns (None, 0.0) on any error so the pipeline never fails because
    of the LLM.
    """

    def __init__(self) -> None:
        # Lazy-import inside __init__ so the module loads even when the
        # settings module / Gemini deps are missing.
        from app.config import settings
        self._enabled = bool(getattr(settings, "IMPORT_LLM_FALLBACK_ENABLED", False))
        self._api_key = getattr(settings, "GEMINI_API_KEY", None)
        self._model = getattr(settings, "GEMINI_MODEL", "gemini-2.5-flash")

    async def classify(
        self,
        header_text: str,
        sample_values: list[str],
        candidates: list[str],
    ) -> tuple[str | None, float]:
        if not self._enabled or not self._api_key:
            return None, 0.0
        try:
            import httpx
            prompt = _build_prompt(header_text, sample_values, candidates)
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/"
                f"models/{self._model}:generateContent?key={self._api_key}"
            )
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0, "maxOutputTokens": 64},
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()
            text = (
                data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                    .strip()
            )
            return _parse_llm_response(text, candidates)
        except Exception as exc:  # pragma: no cover - external service
            _logger.warning("Gemini header classify failed: %s", exc)
            return None, 0.0


def _build_prompt(header: str, samples: list[str], candidates: list[str]) -> str:
    samples_str = "\n".join(f"  - {s!r}" for s in samples[:5]) or "  (no samples)"
    cand_list = ", ".join(candidates)
    return (
        "Classify this Excel column header into one of the canonical fields used in a "
        "container-trucking system. Reply with ONLY the field name (or 'skip' if it's "
        "vessel info, port info, stowage, crane, marketing, or otherwise irrelevant).\n\n"
        f"Header text: {header!r}\n"
        f"Sample values from the column:\n{samples_str}\n\n"
        f"Allowed fields: {cand_list}, skip\n\n"
        "Rules:\n"
        "- Vessel name, voyage, ATA/ATD/ETA/ETB/ETD, port of loading/discharge, "
        "  bay/slot/cell, crane code, sales region → reply 'skip'.\n"
        "- If unsure, reply 'skip'.\n"
        "Reply with ONE WORD only."
    )


def _parse_llm_response(text: str, candidates: list[str]) -> tuple[str | None, float]:
    if not text:
        return None, 0.0
    word = text.strip().split()[0].lower().strip(".,;:'\"")
    if word == "skip":
        from app.services.import_pipeline.canonical import SKIP_FIELD
        return SKIP_FIELD, 0.7
    for c in candidates:
        if word == c.lower():
            return c, 0.65
    return None, 0.0


def get_default_classifier() -> HeaderClassifier:
    """Factory used by the pipeline. Honours
    `settings.IMPORT_LLM_FALLBACK_ENABLED`.
    """
    try:
        from app.config import settings
        if getattr(settings, "IMPORT_LLM_FALLBACK_ENABLED", False):
            return CachedHeaderClassifier(GeminiHeaderClassifier())
    except Exception:
        pass
    return CachedHeaderClassifier(NullHeaderClassifier())
