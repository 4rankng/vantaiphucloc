"""AI-assisted reconciliation service.

Strategy:
  1. Run our own weighted heuristic scorer (_score_pair) against candidates.
  2. If the best candidate scores >= LOCAL_THRESHOLD (0.60), generate human-readable
     Vietnamese reasoning from the matched fields and return immediately — no external
     API call needed.
  3. Only fall through to Gemini for truly ambiguous cases (best score < 0.60),
     where the model's pattern-matching adds value.

The frontend sees the same response shape regardless of path taken.
"""

from __future__ import annotations

import json
import logging
import random
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    Client as ClientORM,
    DeliveredTrip as DeliveredTripORM,
    Location as LocationORM,
    BookedTrip as BookedTripORM,
)
from app.contexts.operations.infrastructure.auto_match_service import (
    _score_pair,
    _load_alias_groups,
    MIN_MATCH_THRESHOLD,
)

_logger = logging.getLogger(__name__)

# Use local algorithm for anything at or above this score.
# Below this → fall through to Gemini (or return no-match if Gemini unavailable).
LOCAL_THRESHOLD = 0.60

_WORK_TYPE_VI: dict[str, str] = {
    "CHUYEN_BAI": "chuyển bãi",
    "XUAT_TAU": "xuất tàu",
    "NHAP_TAU": "nhập tàu",
    "CHUYỂN BÃI": "chuyển bãi",
    "XUẤT TÀU": "xuất tàu",
    "NHẬP TÀU": "nhập tàu",
}


def _fmt_date(d) -> str:
    if not d:
        return ""
    try:
        return f"{d.day:02d}/{d.month:02d}/{d.year}"
    except Exception:
        return str(d)


def _join_vi(items: list[str]) -> str:
    """Join a Vietnamese list: 'a, b và c'."""
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} và {items[1]}"
    return ", ".join(items[:-1]) + f" và {items[-1]}"


def _generate_local_reasoning(
    matched_fields: list[str],
    score: float,
    wo: DeliveredTripORM,
    bt: BookedTripORM,
    loc_map: dict[int, str],
    client_map: dict[int, str],
) -> tuple[str, str]:
    """Return (reasoning_text_vi, confidence_level) derived from the match score."""

    matched_set = set(matched_fields)

    # ── Resolve human-readable values ────────────────────────────────
    cont_d = wo.cont_number or ""
    cont_b = bt.cont_number or ""
    date_str = _fmt_date(bt.trip_date)
    client = client_map.get(bt.client_id) or client_map.get(wo.client_id) or ""
    pickup = loc_map.get(bt.pickup_location_id) or ""
    dropoff = loc_map.get(bt.dropoff_location_id) or ""
    vessel = bt.vessel or wo.vessel or ""
    plate = bt.vehicle_plate or wo.vehicle_plate or ""
    wt_raw = bt.work_type or wo.work_type or ""
    work_type = _WORK_TYPE_VI.get(wt_raw, wt_raw).lower()

    # ── Build a list of matched detail strings ────────────────────────
    details: list[str] = []

    if "container_number" in matched_set:
        details.append(f"số container **{cont_b}**")
    elif "container_number_fuzzy" in matched_set:
        details.append(f"số container gần giống ({cont_d} ≈ {cont_b})")
    elif "container_number_partial" in matched_set:
        details.append(f"phần số của container ({cont_d} / {cont_b})")

    if "pickup_location" in matched_set and pickup:
        details.append(f"điểm đi **{pickup}**")
    if "dropoff_location" in matched_set and dropoff:
        details.append(f"điểm đến **{dropoff}**")
    if "client" in matched_set and client:
        details.append(f"chủ hàng **{client}**")
    if "vessel" in matched_set and vessel:
        details.append(f"số tàu **{vessel}**")
    if "vehicle_plate" in matched_set and plate:
        details.append(f"xe **{plate}**")
    if "work_type" in matched_set and work_type:
        details.append(f"tác nghiệp **{work_type}**")

    detail_str = _join_vi(details) if details else "một số trường thông tin"

    # ── Score → confidence + tone ─────────────────────────────────────
    if score >= 0.90:
        confidence = "high"
        # Pick from a small set of slight variations to feel less robotic
        openers = [
            f"Chuyến giao khớp chính xác về {detail_str}.",
            f"Các trường quan trọng đều trùng khớp: {detail_str}.",
            f"Thông tin chuyến đã giao và lệnh đặt trùng khớp hoàn toàn về {detail_str}.",
        ]
        closers = [
            "Đây là sự trùng khớp tuyệt đối.",
            "Độ chính xác rất cao — không cần xem xét thêm.",
            "Hệ thống tự tin đây là cùng một lô hàng.",
        ]
        opener = random.choice(openers)
        closer = random.choice(closers)
        date_part = f" Ngày thực hiện: {date_str}." if date_str else ""
        reasoning = f"{opener}{date_part} {closer}"

    elif score >= 0.75:
        confidence = "high"
        date_part = f" (ngày {date_str})" if date_str else ""
        reasoning = (
            f"Chuyến đã giao{date_part} khớp tốt với lệnh về {detail_str}. "
            "Mức độ tương đồng cao — nhiều khả năng đây là cùng một lô hàng."
        )

    elif score >= 0.60:
        confidence = "medium"
        date_part = f" ngày {date_str}" if date_str else ""
        reasoning = (
            f"Tìm thấy điểm tương đồng về {detail_str}{date_part}. "
            "Một số trường thông tin có thể khác nhau do sai sót nhập liệu hoặc cập nhật muộn. "
            "Nên xem xét kỹ trước khi xác nhận ghép."
        )

    else:
        # score < 0.60 — shouldn't reach here from local path, but safety net
        confidence = "low"
        reasoning = (
            f"Tìm thấy một số điểm chung về {detail_str}, "
            "nhưng mức độ tương đồng thấp. Vui lòng kiểm tra kỹ trước khi ghép."
        )

    return reasoning, confidence


# ── Gemini fallback (only for score < LOCAL_THRESHOLD) ─────────────────────

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
- "suggested_booked_trip_id": The integer ID of the best match BookedTrip (from the _id field), or null if no good match exists.
- "reasoning": A clear, concise natural language explanation in Vietnamese explaining why this is the best match despite discrepancies. Reference trips by their container number, date, and client name — NEVER mention raw IDs or the word "ID" in the reasoning.
- "confidence": A string, either "high", "medium", or "low".
"""


async def _call_gemini(
    wo: DeliveredTripORM,
    top_candidates: list[BookedTripORM],
    loc_map: dict[int, str],
    client_map: dict[int, str],
) -> dict:
    """Call Gemini and return parsed result dict (or error dict)."""
    from app.contexts.operations.infrastructure.ai import (
        GEMINI_API_KEY,
        GEMINI_MODEL,
        GEMINI_ENDPOINT,
    )
    import re as _re
    import httpx

    if not GEMINI_API_KEY:
        return {"error": "GEMINI_API_KEY is not configured."}

    def _fmt(t) -> dict:
        return {
            "_id": t.id,
            "container_number": t.cont_number,
            "container_type": t.cont_type,
            "trip_date": str(t.trip_date) if t.trip_date else None,
            "pickup": loc_map.get(t.pickup_location_id),
            "dropoff": loc_map.get(t.dropoff_location_id),
            "client": client_map.get(t.client_id),
            "vessel": t.vessel,
            "vehicle_plate": t.vehicle_plate,
        }

    prompt = _SUGGESTION_PROMPT.format(
        target_trip=json.dumps(_fmt(wo), ensure_ascii=False, indent=2),
        candidates=json.dumps(
            [_fmt(t) for t in top_candidates], ensure_ascii=False, indent=2
        ),
    )

    try:
        url = f"{GEMINI_ENDPOINT}/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
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
        text = _re.sub(r"^```(?:json)?\s*", "", text)
        text = _re.sub(r"\s*```$", "", text)
        result = json.loads(text)
        return {
            "suggested_booked_trip_id": result.get("suggested_booked_trip_id"),
            "reasoning": result.get("reasoning", "Không có giải thích."),
            "confidence": result.get("confidence", "low"),
        }
    except Exception as exc:
        _logger.warning("Gemini match suggestion failed: %s", exc)
        return {"error": "AI provider failed or returned invalid response."}


# ── Public entry point ──────────────────────────────────────────────────────


async def get_ai_match_suggestion(db: AsyncSession, delivered_trip_id: int) -> dict:
    """Return a match suggestion for a delivered trip.

    Uses the local scoring algorithm when a confident match is found (score >= LOCAL_THRESHOLD).
    Falls back to Gemini only for ambiguous cases.
    """

    # 1. Fetch the unmatched delivered trip
    wo = (
        await db.execute(
            select(DeliveredTripORM)
            .where(DeliveredTripORM.id == delivered_trip_id)
            .where(DeliveredTripORM.booked_trip_id.is_(None))
        )
    ).scalar_one_or_none()

    if not wo:
        return {"error": "Delivered trip not found or already matched."}

    # 2. Fetch candidate booked trips within ±30 days
    date_from = wo.trip_date - timedelta(days=30) if wo.trip_date else None
    date_to = wo.trip_date + timedelta(days=30) if wo.trip_date else None

    to_query = select(BookedTripORM)
    if date_from:
        to_query = to_query.where(BookedTripORM.trip_date >= date_from)
    if date_to:
        to_query = to_query.where(BookedTripORM.trip_date <= date_to)

    booked_trips = list((await db.execute(to_query)).scalars().all())

    if not booked_trips:
        return {
            "suggested_booked_trip_id": None,
            "reasoning": "Không tìm thấy lệnh đặt nào trong khoảng thời gian 30 ngày quanh chuyến này.",
            "confidence": "low",
        }

    # 3. Score all candidates with our heuristic
    alias_groups = await _load_alias_groups(db)
    scored: list[tuple[float, list[str], BookedTripORM]] = []
    for bt in booked_trips:
        matched_fields, score = _score_pair(wo, bt, alias_groups)
        if score >= MIN_MATCH_THRESHOLD:
            scored.append((score, matched_fields, bt))

    scored.sort(key=lambda x: x[0], reverse=True)

    # 4. Resolve names (needed for both reasoning paths)
    all_trips = [wo] + [s[2] for s in scored[:5]]
    loc_ids = {t.pickup_location_id for t in all_trips} | {
        t.dropoff_location_id for t in all_trips
    }
    client_ids = {t.client_id for t in all_trips}
    loc_ids.discard(None)
    client_ids.discard(None)

    loc_map: dict[int, str] = {}
    client_map: dict[int, str] = {}
    if loc_ids:
        loc_map = dict(
            (
                await db.execute(
                    select(LocationORM.id, LocationORM.name).where(
                        LocationORM.id.in_(loc_ids)
                    )
                )
            ).all()
        )
    if client_ids:
        client_map = dict(
            (
                await db.execute(
                    select(ClientORM.id, ClientORM.name).where(
                        ClientORM.id.in_(client_ids)
                    )
                )
            ).all()
        )

    # 5. Local path: strong enough match — skip Gemini
    if scored and scored[0][0] >= LOCAL_THRESHOLD:
        best_score, best_fields, best_bt = scored[0]
        reasoning, confidence = _generate_local_reasoning(
            best_fields, best_score, wo, best_bt, loc_map, client_map
        )
        return {
            "suggested_booked_trip_id": best_bt.id,
            "reasoning": reasoning,
            "confidence": confidence,
        }

    # 6. No confident match — return best candidate with low confidence
    if scored:
        best_score, best_fields, best_bt = scored[0]
        reasoning, confidence = _generate_local_reasoning(
            best_fields, best_score, wo, best_bt, loc_map, client_map
        )
        return {
            "suggested_booked_trip_id": best_bt.id,
            "reasoning": reasoning,
            "confidence": confidence,
        }

    return {
        "suggested_booked_trip_id": None,
        "reasoning": "Hệ thống đã phân tích nhưng không tìm thấy lệnh đặt nào đủ tiêu chí tương đồng.",
        "confidence": "low",
    }
