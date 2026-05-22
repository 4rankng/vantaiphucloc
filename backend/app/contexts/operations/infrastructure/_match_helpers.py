from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import LocationAlias
from app.schemas.domain import CriterionBreakdown

WEIGHTS = {
    "container_number": 0.28,
    "pickup_location": 0.14,
    "dropoff_location": 0.14,
    "work_type": 0.11,
    "vessel": 0.10,
    "vehicle_plate": 0.09,
    "operation_type": 0.08,
    "client": 0.06,
}

_CONTAINER_EXACT = 1.0
_CONTAINER_1CHAR = 0.8
_CONTAINER_2CHAR = 0.55
_CONTAINER_DIGITS_ONLY = 0.3

FULL_MATCH_THRESHOLD = 0.8
POTENTIAL_MATCH_THRESHOLD = 0.6
MIN_MATCH_THRESHOLD = 0.3

CRITERIA_ORDER = [
    ("container_number", "Container"),
    ("pickup_location", "Điểm đi"),
    ("work_type", "Loại cont"),
    ("dropoff_location", "Điểm đến"),
    ("vessel", "Số tàu"),
    ("vehicle_plate", "Số xe"),
    ("operation_type", "Tác nghiệp"),
    ("client", "Khách hàng"),
]


def _effective_weights(
    *,
    vessel_missing: bool = False,
    work_type_missing: bool = False,
    vehicle_missing: bool = False,
    operation_type_missing: bool = False,
) -> dict[str, float]:
    w = dict(WEIGHTS)
    missing_total = 0.0
    missing_keys: list[str] = []
    if vessel_missing:
        missing_total += w.pop("vessel")
        missing_keys.append("vessel")
    if work_type_missing:
        missing_total += w.pop("work_type")
        missing_keys.append("work_type")
    if vehicle_missing:
        missing_total += w.pop("vehicle_plate")
        missing_keys.append("vehicle_plate")
    if operation_type_missing:
        missing_total += w.pop("operation_type")
        missing_keys.append("operation_type")

    if missing_total > 0 and w:
        active_total = sum(w.values())
        if active_total > 0:
            for k in w:
                w[k] += missing_total * (w[k] / active_total)

    return w


async def _load_alias_groups(db: AsyncSession) -> dict[int, set[int]]:
    rows = (await db.execute(
        select(LocationAlias.location_id, LocationAlias.alias_normalized)
    )).all()

    alias_to_locs: dict[str, set[int]] = {}
    for loc_id, alias_norm in rows:
        alias_to_locs.setdefault(alias_norm, set()).add(loc_id)

    groups: dict[int, set[int]] = {}
    for loc_ids in alias_to_locs.values():
        if len(loc_ids) < 2:
            continue
        merged = set(loc_ids)
        for lid in loc_ids:
            if lid in groups:
                merged |= groups[lid]
        for lid in merged:
            groups[lid] = merged
    return groups


def _locations_match(
    id_a: int | None,
    id_b: int | None,
    alias_groups: dict[int, set[int]],
) -> bool:
    if id_a is None or id_b is None:
        return False
    if id_a == id_b:
        return True
    group = alias_groups.get(id_a)
    return group is not None and id_b in group


def _confidence(score: float) -> str:
    if score >= FULL_MATCH_THRESHOLD:
        return "full"
    if score >= POTENTIAL_MATCH_THRESHOLD:
        return "partial"
    return "none"


def _build_criteria(
    *,
    matched_fields: list[str],
    wo_client: str | None,
    to_client: str | None,
    wo_pickup: str | None,
    to_pickup: str | None,
    wo_dropoff: str | None,
    to_dropoff: str | None,
    wo_containers: str | None,
    to_containers: str | None,
    wo_work_type: str | None = None,
    to_work_type: str | None = None,
    wo_vessel: str | None = None,
    to_vessel: str | None = None,
    wo_vehicle_plate: str | None = None,
    to_vehicle_plate: str | None = None,
    wo_operation_type: str | None = None,
    to_operation_type: str | None = None,
) -> list[CriterionBreakdown]:
    matched = set(matched_fields)
    container_match = (
        "container_number" in matched
        or "container_number_partial" in matched
        or "container_number_fuzzy" in matched
    )
    container_fuzzy = "container_number_fuzzy" in matched

    values: dict[str, tuple[str | None, str | None]] = {
        "container_number": (wo_containers, to_containers),
        "pickup_location": (wo_pickup, to_pickup),
        "dropoff_location": (wo_dropoff, to_dropoff),
        "work_type": (wo_work_type, to_work_type),
        "vessel": (wo_vessel, to_vessel),
        "vehicle_plate": (wo_vehicle_plate, to_vehicle_plate),
        "operation_type": (wo_operation_type, to_operation_type),
        "client": (wo_client, to_client),
    }
    out: list[CriterionBreakdown] = []
    for name, label in CRITERIA_ORDER:
        wo_v, to_v = values.get(name, (None, None))
        if name == "container_number":
            is_match = container_match
            out.append(CriterionBreakdown(
                name=name, label=label, match=is_match,
                wo_value=wo_v, to_value=to_v,
                fuzzy=container_fuzzy,
            ))
        else:
            is_match = name in matched
            out.append(CriterionBreakdown(
                name=name, label=label, match=is_match,
                wo_value=wo_v, to_value=to_v,
            ))
    return out


def _format_containers(items) -> str | None:
    parts: list[str] = []
    for c in items:
        cn = getattr(c, "container_number", None) or ""
        wt = getattr(c, "work_type", None) or ""
        if cn:
            parts.append(f"{wt} {cn}".strip())
    return " · ".join(parts) if parts else None
