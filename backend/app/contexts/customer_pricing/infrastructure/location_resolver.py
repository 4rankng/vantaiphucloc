"""LocationResolverService — single source of truth for turning a raw
location string into a Location row.

Used from BOTH:
- the customer-Excel import commit endpoint, and
- the TripOrder (đơn hàng) create/update endpoints

so the same resolution rules apply everywhere a location string can
arrive. Hits the lookup chain:

    1. Exact match on `locations.name` (normalized).
    2. Exact match on any `location_aliases.alias_normalized`.
    3. Fuzzy match against names + aliases (token-set similarity ≥ 0.85
       OR Levenshtein-equivalent), returns suggestions but does not
       silently link.
    4. No match → create a new Location with `created_via=<source>`.

The fuzzy step uses `difflib.SequenceMatcher` so we don't introduce a
new runtime dependency.
"""

from __future__ import annotations

import difflib
import logging
import re
import unicodedata
from dataclasses import dataclass
from enum import Enum

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.customer_pricing.infrastructure.orm import (
    LocationAliasORM as LocationAlias,
    LocationORM as Location,
)


_logger = logging.getLogger(__name__)


class MatchKind(str, Enum):
    EXACT_NAME = "exact_name"
    EXACT_ALIAS = "exact_alias"
    FUZZY_AUTO = "fuzzy_auto"            # auto-linked, but flagged for review
    FUZZY_AMBIGUOUS = "fuzzy_ambiguous"  # multiple candidates, needs accountant pick
    NEW = "new"                          # nothing close enough → create new


# Confidence thresholds.
FUZZY_AUTO_THRESHOLD = 0.92    # very close — link automatically (still flagged)
FUZZY_SUGGEST_THRESHOLD = 0.85  # close — suggest, don't auto-link
TOP_K_SUGGESTIONS = 3


# Source labels — written to `location.created_via` and
# `location_alias.source` so admins can filter "where did this come from".
class ResolverSource(str, Enum):
    IMPORT = "import"
    CUSTOMER_ORDER = "customer_order"
    DRIVER_PIN = "driver_pin"
    MANUAL = "manual"


@dataclass
class Suggestion:
    location_id: int
    name: str
    score: float


@dataclass
class ResolveResult:
    raw_input: str
    location: Location | None
    match_kind: MatchKind
    suggestions: list[Suggestion]    # populated for FUZZY_AMBIGUOUS / FUZZY_AUTO
    review_needed: bool              # set on FUZZY_AUTO and (optionally) NEW


# ---------------------------------------------------------------------------
# Normalization (must match the migration's _normalize)
# ---------------------------------------------------------------------------

_WS_RE = re.compile(r"\s+", flags=re.UNICODE)


def normalize(s: str | None) -> str:
    if s is None:
        return ""
    s = str(s)
    folded = unicodedata.normalize("NFD", s)
    folded = "".join(ch for ch in folded if not unicodedata.combining(ch))
    folded = folded.replace("đ", "d").replace("Đ", "d")
    folded = folded.lower()
    folded = _WS_RE.sub(" ", folded).strip()
    folded = folded.replace(".", "").replace(":", "").replace("\n", " ").replace("\r", " ")
    folded = _WS_RE.sub(" ", folded).strip()
    return folded


# ---------------------------------------------------------------------------
# Public service
# ---------------------------------------------------------------------------

class LocationResolverService:
    """Stateful per-request helper. Caches lookups within a single
    resolve-many call so the same string isn't re-queried.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self._cache: dict[str, ResolveResult] = {}
        self._all_names: list[tuple[int, str, str]] | None = None  # (id, name, normalized)
        self._all_aliases: list[tuple[int, str, str]] | None = None  # (location_id, alias, normalized)

    async def find_match(self, raw_name: str) -> ResolveResult:
        """Look up `raw_name` without writing. Returns the resolution
        result so callers can decide whether to create / link / suggest."""
        key = normalize(raw_name)
        cached = self._cache.get(key)
        if cached is not None:
            return cached

        if not key:
            result = ResolveResult(
                raw_input=raw_name or "",
                location=None,
                match_kind=MatchKind.NEW,
                suggestions=[],
                review_needed=False,
            )
            self._cache[key] = result
            return result

        # 1. exact name
        loc = await self._exact_name(key)
        if loc is not None:
            result = ResolveResult(raw_name, loc, MatchKind.EXACT_NAME, [], False)
            self._cache[key] = result
            return result

        # 2. exact alias
        loc = await self._exact_alias(key)
        if loc is not None:
            result = ResolveResult(raw_name, loc, MatchKind.EXACT_ALIAS, [], False)
            self._cache[key] = result
            return result

        # 3. fuzzy
        suggestions = await self._fuzzy_candidates(key)
        if suggestions:
            best = suggestions[0]
            if best.score >= FUZZY_AUTO_THRESHOLD and (len(suggestions) == 1 or suggestions[1].score < FUZZY_SUGGEST_THRESHOLD):
                # one strong candidate — auto-link with review flag
                loc = await self.db.get(Location, best.location_id)
                result = ResolveResult(
                    raw_input=raw_name,
                    location=loc,
                    match_kind=MatchKind.FUZZY_AUTO,
                    suggestions=suggestions,
                    review_needed=True,
                )
                self._cache[key] = result
                return result
            if best.score >= FUZZY_SUGGEST_THRESHOLD:
                # multiple plausible / not strong enough to auto-link
                result = ResolveResult(
                    raw_input=raw_name,
                    location=None,
                    match_kind=MatchKind.FUZZY_AMBIGUOUS,
                    suggestions=suggestions,
                    review_needed=True,
                )
                self._cache[key] = result
                return result

        # 4. no match
        result = ResolveResult(
            raw_input=raw_name,
            location=None,
            match_kind=MatchKind.NEW,
            suggestions=suggestions,  # may be empty
            review_needed=False,
        )
        self._cache[key] = result
        return result

    async def resolve_or_create(
        self,
        raw_name: str,
        *,
        source: ResolverSource,
        user_id: int | None,
    ) -> ResolveResult:
        """Look up a name; if no match, create a new Location. Always
        records the raw input as a `location_alias` row (so the next
        import sees an exact-alias match).
        """
        result = await self.find_match(raw_name)

        # NEW with no location yet → create. NEW with a location means we
        # already created it earlier in this same resolver instance and
        # cached the result; reuse it instead of duplicating.
        if result.match_kind == MatchKind.NEW and result.location is None:
            loc = Location(
                name=raw_name.strip()[:255],
                is_active=True,
                pending_geocode=True,
                created_via=source.value,
                created_by_id=user_id,
                location_review_needed=False,
            )
            self.db.add(loc)
            await self.db.flush()
            result = ResolveResult(
                raw_input=raw_name,
                location=loc,
                match_kind=MatchKind.NEW,
                suggestions=result.suggestions,
                review_needed=False,
            )
            self._cache[normalize(raw_name)] = result
            # Reset name-cache so subsequent calls in this request see it.
            self._all_names = None

        if result.location is None:
            return result

        # Always record the raw input as an alias if it's not already one.
        # Exception: if raw_input matches the canonical name verbatim,
        # we don't need an alias row.
        norm = normalize(raw_name)
        canonical_norm = normalize(result.location.name)
        if norm and norm != canonical_norm:
            already = await self._alias_by_normalized(norm)
            if already is None:
                alias_source = self._alias_source_for(source, result.match_kind)
                self.db.add(LocationAlias(
                    location_id=result.location.id,
                    alias=raw_name.strip()[:255],
                    alias_normalized=norm,
                    source=alias_source,
                    created_by_id=user_id,
                ))
                await self.db.flush()
                self._all_aliases = None

        # If we auto-linked via fuzzy, mark the Location for admin review.
        if result.match_kind == MatchKind.FUZZY_AUTO:
            result.location.location_review_needed = True
            await self.db.flush()

        return result

    # ------------------------------------------------------------------
    # Lookups
    # ------------------------------------------------------------------

    async def _exact_name(self, normalized: str) -> Location | None:
        names = await self._load_names()
        for loc_id, _, name_norm in names:
            if name_norm == normalized:
                return await self.db.get(Location, loc_id)
        return None

    async def _exact_alias(self, normalized: str) -> Location | None:
        res = await self.db.execute(
            select(LocationAlias).where(LocationAlias.alias_normalized == normalized).limit(1)
        )
        alias = res.scalar_one_or_none()
        if alias is None:
            return None
        return await self.db.get(Location, alias.location_id)

    async def _alias_by_normalized(self, normalized: str) -> LocationAlias | None:
        res = await self.db.execute(
            select(LocationAlias).where(LocationAlias.alias_normalized == normalized).limit(1)
        )
        return res.scalar_one_or_none()

    async def _load_names(self) -> list[tuple[int, str, str]]:
        if self._all_names is None:
            res = await self.db.execute(
                select(Location.id, Location.name).where(Location.is_active.is_(True))
            )
            self._all_names = [(lid, name, normalize(name)) for lid, name in res.all()]
        return self._all_names

    async def _load_aliases(self) -> list[tuple[int, str, str]]:
        if self._all_aliases is None:
            res = await self.db.execute(
                select(LocationAlias.location_id, LocationAlias.alias, LocationAlias.alias_normalized)
            )
            self._all_aliases = [(lid, alias, an) for lid, alias, an in res.all()]
        return self._all_aliases

    async def _fuzzy_candidates(self, normalized_query: str) -> list[Suggestion]:
        """Score every name + alias by `SequenceMatcher.ratio()`, keep
        any candidate ≥ FUZZY_SUGGEST_THRESHOLD, return top-K sorted."""
        names = await self._load_names()
        aliases = await self._load_aliases()

        # Build candidate pool: (location_id, display_name, normalized_text)
        pool: dict[int, tuple[str, float]] = {}  # location_id → (display, best_score)
        for loc_id, display, norm in names:
            score = _ratio(normalized_query, norm)
            if score >= FUZZY_SUGGEST_THRESHOLD:
                cur = pool.get(loc_id)
                if cur is None or score > cur[1]:
                    pool[loc_id] = (display, score)
        for loc_id, alias, alias_norm in aliases:
            score = _ratio(normalized_query, alias_norm)
            if score >= FUZZY_SUGGEST_THRESHOLD:
                cur = pool.get(loc_id)
                if cur is None or score > cur[1]:
                    # Use the location's canonical name for display.
                    display_name = next((n for lid, n, _ in names if lid == loc_id), alias)
                    pool[loc_id] = (display_name, score)

        ranked = sorted(
            (Suggestion(location_id=lid, name=disp, score=round(score, 4))
             for lid, (disp, score) in pool.items()),
            key=lambda s: -s.score,
        )
        return ranked[:TOP_K_SUGGESTIONS]

    # ------------------------------------------------------------------
    @staticmethod
    def _alias_source_for(
        source: ResolverSource,
        kind: MatchKind,
    ) -> str:
        return f"{source.value}_auto"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ratio(a: str, b: str) -> float:
    """SequenceMatcher ratio — gestalt pattern matching. Token-set
    similarity for very short strings can be misleading; we use the
    plain ratio over normalized text which works well in practice for
    Vietnamese/English mixed names."""
    if not a or not b:
        return 0.0
    return difflib.SequenceMatcher(None, a, b).ratio()
