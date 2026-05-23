"""AI-assisted reconciliation service using Gemini.
"""

from __future__ import annotations

import json
import logging
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    Client as ClientORM,
    DeliveredTrip as DeliveredTripORM,
    Location as LocationORM,
    BookedTrip as BookedTripORM,
)
from app.contexts.operations.infrastructure.auto_match_service import _score_pair, _load_alias_groups

_logger = logging.getLogger(__name__)

_SUGGESTION_PROMPT = """\
You are an expert logistics accountant matching delivered container trips to booked container orders.
You have one DeliveredTrip that needs to be matched against a list of candidate BookedTrips.

Evaluate the discrepancies (e.g. typos in container number, slightly different dates/locations) and pick the MOST LIKELY match from the candidates.
If none of them look like a match, indicate that.

Target Delivered Trip:
{target_trip}

Candidate Booked Trips:
{candidates}

Respond strictly in JSON format with no markdown formatting. The JSON must have these keys:
- "suggested_booked_trip_id": The integer ID of the best match BookedTrip, or null if no good match exists.
- "reasoning": A clear, concise natural language explanation in Vietnamese explaining why this is the best match despite discrepancies.
- "confidence": A string, either "high", "medium", or "low".
"""


async def get_ai_match_suggestion(db: AsyncSession, delivered_trip_id: int) -> dict:
    """Get an AI match suggestion for a given unmatched delivered trip."""

    # 1. Fetch the target unmatched DeliveredTrip
    wo = (await db.execute(
        select(DeliveredTripORM)
        .where(DeliveredTripORM.id == delivered_trip_id)
        .where(DeliveredTripORM.matched == False)
    )).scalar_one_or_none()

    if not wo:
        return {"error": "Delivered trip not found or already matched."}

    # 2. Fetch candidate BookedTrips within a +/- 15 day window
    date_from = wo.trip_date - timedelta(days=15) if wo.trip_date else None
    date_to = wo.trip_date + timedelta(days=15) if wo.trip_date else None

    to_query = select(BookedTripORM).where(BookedTripORM.matched == False)

    if date_from:
        to_query = to_query.where(BookedTripORM.trip_date >= date_from)
    if date_to:
        to_query = to_query.where(BookedTripORM.trip_date <= date_to)

    booked_trips = list((await db.execute(to_query)).scalars().all())

    if not booked_trips:
        return {"suggested_booked_trip_id": None, "reasoning": "Không có chuyến yêu cầu nào (Booked Trip) khả dụng trong khoảng thời gian 15 ngày.", "confidence": "low"}

    # 3. Pre-filter using heuristic scorer to get top 5
    alias_groups = await _load_alias_groups(db)
    scored_candidates = []

    for to in booked_trips:
        _, score = _score_pair(wo, to, alias_groups)
        scored_candidates.append((score, to))

    scored_candidates.sort(key=lambda x: x[0], reverse=True)
    top_candidates = [c[1] for c in scored_candidates[:5] if c[0] > 0.0]

    if not top_candidates:
        top_candidates = [c[1] for c in scored_candidates[:5]]

    if not top_candidates:
         return {"suggested_booked_trip_id": None, "reasoning": "Không tìm thấy chuyến xe nào gần giống.", "confidence": "low"}

    # 4. Batch-load location and client names for all relevant IDs
    all_trips = [wo] + top_candidates
    loc_ids = set()
    client_ids = set()
    for t in all_trips:
        loc_ids.add(t.pickup_location_id)
        loc_ids.add(t.dropoff_location_id)
        client_ids.add(t.client_id)

    loc_rows = (await db.execute(
        select(LocationORM.id, LocationORM.name).where(LocationORM.id.in_(loc_ids))
    )).all()
    loc_map = {r[0]: r[1] for r in loc_rows}

    client_rows = (await db.execute(
        select(ClientORM.id, ClientORM.code).where(ClientORM.id.in_(client_ids))
    )).all()
    client_map = {r[0]: r[1] for r in client_rows}

    # 5. Construct prompt
    def _format_trip(t) -> dict:
        return {
            "id": t.id,
            "container_number": t.cont_number,
            "container_type": t.cont_type,
            "trip_date": str(t.trip_date) if t.trip_date else None,
            "pickup": loc_map.get(t.pickup_location_id),
            "dropoff": loc_map.get(t.dropoff_location_id),
            "client": client_map.get(t.client_id),
            "vessel": t.vessel,
            "vehicle_plate": t.vehicle_plate,
        }

    target_json = json.dumps(_format_trip(wo), ensure_ascii=False, indent=2)
    candidates_json = json.dumps([_format_trip(t) for t in top_candidates], ensure_ascii=False, indent=2)
    
    prompt = _SUGGESTION_PROMPT.format(target_trip=target_json, candidates=candidates_json)

    # 5. Call Gemini
    from app.contexts.operations.infrastructure.ai import GEMINI_API_KEY, GEMINI_MODEL, GEMINI_ENDPOINT

    if not GEMINI_API_KEY:
         return {"error": "GEMINI_API_KEY is not configured."}

    try:
        import httpx
        url = (
            f"{GEMINI_ENDPOINT}/"
            f"models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0, "maxOutputTokens": 1024},
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
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
        
        # Parse JSON
        import re
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        
        result = json.loads(text)
        return {
            "suggested_booked_trip_id": result.get("suggested_booked_trip_id"),
            "reasoning": result.get("reasoning", "Không có giải thích."),
            "confidence": result.get("confidence", "low"),
        }
        
    except Exception as exc:
        _logger.warning("AI match suggestion failed: %s", exc)
        return {"error": "AI provider failed or returned invalid response."}
