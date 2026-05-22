from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from ._booked_trip import BookedTripOut, TripContainerOut
from ._delivered_trip import DeliveredTripOut

__all__ = [
    "ReconciliationOut",
    "ReconcileRequest",
    "CriterionBreakdown",
    "MatchSuggestion",
    "SuggestMatchesResponse",
    "WOSuggestion",
    "SuggestWosResponse",
    "DeliveredTripMatchScore",
    "MatchScoresResponse",
    "BulkMatchPair",
    "BulkMatchRequest",
    "BulkMatchResult",
    "BulkMatchResponse",
    "AutoMatchRequest",
    "AutoMatchCriterion",
    "AutoMatchDeliveredTripRef",
    "AutoMatchBookedTripRef",
    "AutoMatchCandidate",
    "UnmatchedDeliveredTripRef",
    "AutoMatchRejectionReason",
    "AutoMatchStats",
    "AutoMatchResponse",
    "AutoMatchResult",
    "AutoMatchConfirmRequest",
    "AutoMatchConfirmResult",
    "AutoMatchConfirmResponse",
    "UnmatchRequest",
    "BatchMatchForWORequest",
    "BatchMatchForWOResult",
    "BatchMatchForWOResponse",
    "BatchMatchForTORequest",
    "BatchMatchForTOResult",
    "BatchMatchForTOResponse",
]


# ---------------------------------------------------------------------------
# Reconciliation
# ---------------------------------------------------------------------------

class ReconciliationOut(BaseModel):
    id: int
    booked_trip_id: int
    delivered_trip_id: int
    match_score: float
    matched_by: int
    matched_at: datetime
    unmatched_by: int | None = None
    unmatched_at: datetime | None = None
    reason: str | None = None
    is_active: bool = True
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReconcileRequest(BaseModel):
    delivered_trip_id: int
    booked_trip_id: int
    reason: str | None = None


class CriterionBreakdown(BaseModel):
    name: str
    label: str
    match: bool
    wo_value: str | None = None
    to_value: str | None = None
    fuzzy: bool = False


class MatchSuggestion(BaseModel):
    booked_trip: BookedTripOut
    container_id: int
    confidence: Literal["full", "partial", "none"]
    matched_fields: list[str]
    score: float
    criteria: list[CriterionBreakdown] = Field(default_factory=list)
    match_score: int = 0
    max_score: int = 5
    match_warnings: list[str] = Field(default_factory=list)


class SuggestMatchesResponse(BaseModel):
    delivered_trip_id: int
    suggestions: list[MatchSuggestion]


class WOSuggestion(BaseModel):
    delivered_trip: DeliveredTripOut
    confidence: Literal["full", "partial", "none"]
    matched_fields: list[str]
    score: float
    criteria: list[CriterionBreakdown] = Field(default_factory=list)
    match_score: int = 0
    max_score: int = 5
    match_warnings: list[str] = Field(default_factory=list)


class SuggestWosResponse(BaseModel):
    booked_trip_id: int
    suggestions: list[WOSuggestion]


# ---------------------------------------------------------------------------
# Match scores
# ---------------------------------------------------------------------------

class DeliveredTripMatchScore(BaseModel):
    delivered_trip_id: int
    best_score: float
    best_match_score: int
    max_score: int = 5
    suggestion_count: int = 0


class MatchScoresResponse(BaseModel):
    scores: list[DeliveredTripMatchScore]


# ---------------------------------------------------------------------------
# Bulk match
# ---------------------------------------------------------------------------

class BulkMatchPair(BaseModel):
    delivered_trip_id: int
    booked_trip_id: int


class BulkMatchRequest(BaseModel):
    pairs: list[BulkMatchPair]


class BulkMatchResult(BaseModel):
    delivered_trip_id: int
    booked_trip_id: int
    success: bool
    error: str | None = None


class BulkMatchResponse(BaseModel):
    matched: list[BulkMatchResult]
    errors: list[str]


# ---------------------------------------------------------------------------
# Auto-match
# ---------------------------------------------------------------------------

class AutoMatchRequest(BaseModel):
    date_from: str | None = None
    date_to: str | None = None


class AutoMatchCriterion(BaseModel):
    key: str
    label: str
    match: bool


class AutoMatchDeliveredTripRef(BaseModel):
    id: int
    plate: str | None = None
    date: str | None = None
    client_name: str | None = None


class AutoMatchBookedTripRef(BaseModel):
    id: int
    client_name: str | None = None
    containers: list[TripContainerOut] = []


class AutoMatchCandidate(BaseModel):
    delivered_trip_id: int
    booked_trip_id: int
    score: float
    match_score: int
    max_score: int = 5
    matched_fields: list[str]
    criteria: list[AutoMatchCriterion] = []
    suggested_default: bool = False
    delivered_trip_ref: AutoMatchDeliveredTripRef | None = None
    booked_trip_ref: AutoMatchBookedTripRef | None = None


class UnmatchedDeliveredTripRef(BaseModel):
    id: int
    plate: str | None = None
    date: str | None = None


class AutoMatchRejectionReason(BaseModel):
    code: str
    label: str
    count: int


class AutoMatchStats(BaseModel):
    reasons: list[AutoMatchRejectionReason] = []


class AutoMatchResponse(BaseModel):
    scanned_delivered_trip_count: int = 0
    skipped_already_matched: int = 0
    candidates: list[AutoMatchCandidate] = []
    unmatched_delivered_trip_refs: list[UnmatchedDeliveredTripRef] = []
    errors: list[str] = []
    stats: AutoMatchStats = AutoMatchStats()


# Legacy aliases for backward compat (old response shape)
class AutoMatchResult(BaseModel):
    delivered_trip_id: int
    booked_trip_id: int
    score: float
    matched_fields: list[str]


class AutoMatchConfirmRequest(BaseModel):
    pairs: list[BulkMatchPair]


class AutoMatchConfirmResult(BaseModel):
    delivered_trip_id: int
    booked_trip_id: int
    success: bool
    error: str | None = None


class AutoMatchConfirmResponse(BaseModel):
    matched: list[AutoMatchConfirmResult]
    failed: list[AutoMatchConfirmResult] = []
    duration_ms: int = 0


# ---------------------------------------------------------------------------
# Unmatch / Batch match requests
# ---------------------------------------------------------------------------

class UnmatchRequest(BaseModel):
    delivered_trip_id: int
    booked_trip_id: int


class BatchMatchForWORequest(BaseModel):
    delivered_trip_id: int
    booked_trip_ids: list[int] = Field(..., min_length=1)


class BatchMatchForWOResult(BaseModel):
    booked_trip_id: int
    success: bool
    error: str | None = None


class BatchMatchForWOResponse(BaseModel):
    delivered_trip_id: int
    results: list[BatchMatchForWOResult]


class BatchMatchForTORequest(BaseModel):
    booked_trip_id: int
    delivered_trip_ids: list[int] = Field(..., min_length=1)


class BatchMatchForTOResult(BaseModel):
    delivered_trip_id: int
    success: bool
    error: str | None = None


class BatchMatchForTOResponse(BaseModel):
    booked_trip_id: int
    results: list[BatchMatchForTOResult]
