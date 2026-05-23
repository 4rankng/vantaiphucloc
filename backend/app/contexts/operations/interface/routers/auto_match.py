"""Auto-match HTTP endpoints for reconciliation."""

from __future__ import annotations

import logging
from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_permission
from app.database import get_db
from app.models.base import User
from app.contexts.operations.infrastructure.auto_match_service import (
    auto_match_preview,
    confirm_matches,
)
from app.contexts.operations.infrastructure.ai_reconciliation_service import (
    get_ai_match_suggestion,
)

_logger = logging.getLogger(__name__)

router = APIRouter()


class AutoMatchRequest(BaseModel):
    date_from: str | None = None
    date_to: str | None = None


class MatchCandidateOut(BaseModel):
    delivered_trip_id: int
    booked_trip_id: int
    score: float
    confidence: str
    matched_fields: list[str]


class AutoMatchResponse(BaseModel):
    candidates: list[MatchCandidateOut]
    unmatched_count: int
    scanned_count: int


class MatchPair(BaseModel):
    delivered_trip_id: int
    booked_trip_id: int


class ConfirmMatchRequest(BaseModel):
    pairs: list[MatchPair]


class ConfirmMatchResponse(BaseModel):
    matched_count: int
    errors: list[str]


class AISuggestionResponse(BaseModel):
    suggested_booked_trip_id: int | None = None
    reasoning: str
    confidence: str
    error: str | None = None


@router.post("/auto-match/preview", response_model=AutoMatchResponse)
async def auto_match_preview_endpoint(
    body: AutoMatchRequest,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    db: AsyncSession = Depends(get_db),
):
    df = date.fromisoformat(body.date_from) if body.date_from else None
    dt = date.fromisoformat(body.date_to) if body.date_to else None

    result = await auto_match_preview(db, date_from=df, date_to=dt)
    return AutoMatchResponse(
        candidates=[
            MatchCandidateOut(**c) for c in result["candidates"]
        ],
        unmatched_count=result["unmatched_count"],
        scanned_count=result["scanned_count"],
    )


@router.post("/auto-match/confirm", response_model=ConfirmMatchResponse)
async def auto_match_confirm_endpoint(
    body: ConfirmMatchRequest,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    db: AsyncSession = Depends(get_db),
):
    result = await confirm_matches(db, [(p.delivered_trip_id, p.booked_trip_id) for p in body.pairs])
    return ConfirmMatchResponse(**result)


@router.post("/auto-match/ai-suggest/{delivered_trip_id}", response_model=AISuggestionResponse)
async def ai_suggest_endpoint(
    delivered_trip_id: int,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    db: AsyncSession = Depends(get_db),
):
    result = await get_ai_match_suggestion(db, delivered_trip_id)
    if "error" in result:
        return AISuggestionResponse(
            reasoning="",
            confidence="none",
            error=result["error"],
        )
    return AISuggestionResponse(
        suggested_booked_trip_id=result.get("suggested_booked_trip_id"),
        reasoning=result.get("reasoning", ""),
        confidence=result.get("confidence", "low"),
    )
