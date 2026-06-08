"""OperationType resolver — single source of truth for work_type normalization and alias resolution.

Replaces all scattered `_normalize_work_type` / `_fold` implementations across the codebase.
Follows the `LocationResolverService` pattern but simpler — no fuzzy matching, just
exact name + alias lookup with diacritics-insensitive comparison.
"""

from __future__ import annotations

import logging
import re
import unicodedata
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.operation_type import OperationType, OperationTypeAlias

logger = logging.getLogger(__name__)

_WS_RE = re.compile(r"\s+", flags=re.UNICODE)


# ---------------------------------------------------------------------------
# Public pure function — replaces all _normalize_work_type / _fold implementations.
# No DB access. Used by matching algorithm, pricing lookup, import preview, etc.
# ---------------------------------------------------------------------------


def normalize_operation_type(s: str | None) -> str:
    """NFD fold, strip diacritics, uppercase, collapse whitespace.

    Pure function — no DB. Returns empty string for None/empty input.
    """
    if s is None:
        return ""
    s = str(s).strip().upper()
    if not s:
        return ""
    folded = unicodedata.normalize("NFD", s)
    folded = "".join(ch for ch in folded if not unicodedata.combining(ch))
    folded = folded.replace("Đ", "D").replace("đ", "D")
    folded = _WS_RE.sub(" ", folded).strip()
    return folded


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------


@dataclass
class OperationTypeResolveResult:
    canonical_name: str  # The OperationType.name to use
    was_alias: bool  # True if resolved via alias rather than exact name
    created: bool  # True if a new OperationType was auto-created


# ---------------------------------------------------------------------------
# Resolver service — session-scoped, caches lookups to avoid N+1
# ---------------------------------------------------------------------------


class OperationTypeResolverService:
    """Resolve raw work_type strings to canonical OperationType names.

    Usage (import pipeline — auto-create):
        resolver = OperationTypeResolverService(session)
        canonical = await resolver.resolve_or_create("xuat tau", source="import")

    Usage (matching / read-only — no creation):
        resolver = OperationTypeResolverService(session)
        canonical = await resolver.resolve("xuat tau")  # returns "XUẤT TÀU" or None

    The instance caches all types + aliases on first query, so repeated calls
    within the same session (e.g. processing 200 import rows) are in-memory lookups.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._cache: dict[str, OperationTypeResolveResult] = {}
        self._types_by_norm: dict[str, str] | None = None  # normalized_name → canonical name
        self._aliases_by_norm: dict[str, str] | None = None  # normalized_alias → canonical name

    async def _load_types(self) -> dict[str, str]:
        """Load all active OperationType names (normalized → canonical)."""
        if self._types_by_norm is not None:
            return self._types_by_norm
        rows = (await self.db.execute(
            select(OperationType.name)
        )).scalars().all()
        self._types_by_norm = {normalize_operation_type(n): n for n in rows}
        return self._types_by_norm

    async def _load_aliases(self) -> dict[str, str]:
        """Load all aliases (normalized → canonical OperationType name)."""
        if self._aliases_by_norm is not None:
            return self._aliases_by_norm
        rows = (await self.db.execute(
            select(OperationTypeAlias.alias_normalized, OperationType.name)
            .join(OperationType, OperationTypeAlias.operation_type_id == OperationType.id)
        )).all()
        self._aliases_by_norm = {norm: name for norm, name in rows}
        return self._aliases_by_norm

    async def resolve(self, raw_name: str) -> str | None:
        """Read-only: return canonical OperationType.name or None.

        Resolution chain:
        1. Session cache (avoids repeated DB queries for same string)
        2. Exact match on OperationType.name (normalized)
        3. Exact match on OperationTypeAlias.alias_normalized
        """
        norm = normalize_operation_type(raw_name)
        if not norm:
            return None

        # Check session cache
        cached = self._cache.get(norm)
        if cached is not None:
            return cached.canonical_name

        # Check canonical names
        types = await self._load_types()
        canonical = types.get(norm)
        if canonical is not None:
            self._cache[norm] = OperationTypeResolveResult(
                canonical_name=canonical, was_alias=False, created=False,
            )
            return canonical

        # Check aliases
        aliases = await self._load_aliases()
        canonical = aliases.get(norm)
        if canonical is not None:
            self._cache[norm] = OperationTypeResolveResult(
                canonical_name=canonical, was_alias=True, created=False,
            )
            return canonical

        return None

    async def resolve_or_create(
        self,
        raw_name: str,
        *,
        source: str,
        user_id: int | None = None,
    ) -> str:
        """Resolve raw_name; if no match, create new OperationType + alias.

        Returns canonical name. Used by import pipeline.
        Also refreshes the in-memory work_type validation cache.
        """
        norm = normalize_operation_type(raw_name)
        if not norm:
            return "CHUYỂN BÃI"

        # Try existing match first
        existing = await self.resolve(raw_name)
        if existing is not None:
            return existing

        # Auto-create new OperationType
        canonical = raw_name.strip().upper()
        async with self.db.begin_nested():
            op_type = OperationType(
                name=canonical,
                label=canonical,
                is_active=True,
            )
            self.db.add(op_type)
            await self.db.flush()

            # Also create an alias for the normalized form (so future imports
            # with different diacritics/casing resolve to this type)
            alias_norm = norm
            if alias_norm and alias_norm != normalize_operation_type(canonical):
                alias = OperationTypeAlias(
                    operation_type_id=op_type.id,
                    alias=raw_name.strip(),
                    alias_normalized=alias_norm,
                    source=f"{source}_auto",
                    created_by_id=user_id,
                )
                self.db.add(alias)
                await self.db.flush()

        logger.info("Auto-created OperationType: %s", canonical)

        # Update caches
        if self._types_by_norm is not None:
            self._types_by_norm[normalize_operation_type(canonical)] = canonical
        if self._aliases_by_norm is not None and alias_norm:
            self._aliases_by_norm[alias_norm] = canonical
        self._cache[norm] = OperationTypeResolveResult(
            canonical_name=canonical, was_alias=False, created=True,
        )

        # Refresh module-level validation cache
        await self._refresh_work_types_cache()

        return canonical

    async def _refresh_work_types_cache(self) -> None:
        """Push current active work types into the module-level cache."""
        from app.contexts.route_pricing.domain.value_objects import refresh_work_types_from_async

        rows = (await self.db.execute(
            select(OperationType.name).where(OperationType.is_active == True)  # noqa: E712
        )).scalars().all()
        refresh_work_types_from_async(frozenset(rows))
