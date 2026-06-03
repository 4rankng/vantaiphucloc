"""Background worker tasks for the customer-Excel import pipeline.

The preview endpoint enqueues `import_excel_preview_task` instead of
running the full pipeline inline. The worker decodes the file bytes,
calls `run_preview`, and resolves LocationResolver lookups (which
needs a DB session) so the polling endpoint can return the complete
PreviewResult in one round-trip.
"""

import base64
import logging
from datetime import date

logger = logging.getLogger(__name__)


async def import_excel_preview_task(
    ctx: dict,
    job_id: str,
    file_bytes_b64: str,
    filename: str,
    default_trip_date_iso: str,
    sheet_name: str | None = None,
) -> dict:
    """Run run_preview() in the worker and resolve location suggestions.

    The result dict shape matches what the sync `/customer-excel/preview`
    endpoint returns, so the frontend doesn't need to know which path
    produced the data.
    """
    from app.contexts.customer_pricing.infrastructure.location_resolver import (
        LocationResolverService,
    )
    from app.contexts.operations.infrastructure.import_pipeline.llm import (
        get_default_classifier,
    )
    from app.contexts.operations.infrastructure.import_pipeline.pipeline import (
        run_preview,
    )
    from app.database import get_session

    logger.info("Import preview task started: %s (%s)", job_id, filename)
    content = base64.b64decode(file_bytes_b64)
    trip_date = date.fromisoformat(default_trip_date_iso)
    classifier = get_default_classifier()

    result = await run_preview(
        content,
        filename,
        default_trip_date=trip_date,
        classifier=classifier,
    )

    async with get_session() as db:
        resolver = LocationResolverService(db)
        seen: set[str] = set()
        for r in result.accepted:
            v = r.get("values") or {}
            for key in ("pickup_location", "dropoff_location"):
                s = (v.get(key) or "").strip()
                if s:
                    seen.add(s)

        location_resolutions: dict[str, dict] = {}
        for raw in seen:
            resolution = await resolver.find_match(raw)
            location_resolutions[raw] = {
                "raw": raw,
                "match_kind": resolution.match_kind.value,
                "location_id": resolution.location.id if resolution.location else None,
                "location_name": resolution.location.name if resolution.location else None,
                "review_needed": resolution.review_needed,
                "suggestions": [
                    {"location_id": s.location_id, "name": s.name, "score": s.score}
                    for s in resolution.suggestions
                ],
            }

    payload = result.to_dict()
    payload["location_resolutions"] = location_resolutions
    logger.info(
        "Import preview task finished: %s — accepted=%d rejected=%d",
        job_id, result.stats.get("accepted_count", 0), result.stats.get("rejected_count", 0),
    )
    return payload
