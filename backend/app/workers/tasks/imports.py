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
    from app.contexts.operations.infrastructure.import_pipeline.llm import (
        get_batch_classifier,
    )
    from app.contexts.operations.infrastructure.import_pipeline.pipeline import (
        run_preview,
    )
    from app.contexts.operations.interface.routers.imports import (
        resolve_preview_locations,
    )
    from app.database import get_session

    logger.info("Import preview task started: %s (%s)", job_id, filename)
    content = base64.b64decode(file_bytes_b64)
    trip_date = date.fromisoformat(default_trip_date_iso)
    classifier = get_batch_classifier()

    result = await run_preview(
        content,
        filename,
        default_trip_date=trip_date,
        classifier=classifier,
    )

    async with get_session() as db:
        location_resolutions = await resolve_preview_locations(db, result.accepted)

    payload = result.to_dict()
    payload["location_resolutions"] = location_resolutions
    logger.info(
        "Import preview task finished: %s — accepted=%d rejected=%d",
        job_id, result.stats.get("accepted_count", 0), result.stats.get("rejected_count", 0),
    )
    return payload
