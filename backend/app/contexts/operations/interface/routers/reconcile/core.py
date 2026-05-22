"""Reconciliation router — sub-module: core endpoints (reconcile, batch, unmatch)."""

from __future__ import annotations

import logging

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request,
)

from app.contexts.operations.application import (
    GetBookedTrip,
    GetDeliveredTrip,
    MatchTripToDeliveredTrip,
    UnmatchTripFromDeliveredTrip,
)
from app.contexts.operations.application.dto import (
    ReconcileInput,
    UnmatchInput,
)
from app.contexts.operations.interface.dependencies import (
    get_get_booked_trip,
    get_get_delivered_trip,
    get_match_booked_to_delivered_trip,
    get_unmatch_booked_from_delivered_trip,
)
from app.contexts.operations.interface.error_translation import translate
from app.contexts.operations.interface.routers.booked_trips import (
    _load_one as _load_trip_one,
)
from app.core.audit import log_action
from app.core.audit_context import set_audit_reason
from app.core.deps import require_permission
from app.models.base import User
from app.models.domain import BookedTrip as BookedTripORM, BookedTripContainer, DeliveredTrip as DeliveredTripORM
from app.schemas.domain import (
    BatchMatchForTORequest,
    BatchMatchForTOResponse,
    BatchMatchForTOResult,
    BatchMatchForWORequest,
    BatchMatchForWOResponse,
    BatchMatchForWOResult,
    BookedTripOut,
    ReconcileRequest,
    UnmatchRequest,
)

_logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/reconcile", response_model=BookedTripOut)
async def reconcile(
    body: ReconcileRequest,
    request: Request,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: MatchTripToDeliveredTrip = Depends(get_match_booked_to_delivered_trip),
):
    try:
        to = await use_case(ReconcileInput(
            delivered_trip_id=body.delivered_trip_id,
            booked_trip_id=body.booked_trip_id,
            user_id=current_user.id,
        ))
    except Exception as exc:
        _logger.exception(
            "Reconcile failed: WO#%s ↔ TO#%s",
            body.delivered_trip_id, body.booked_trip_id,
        )
        raise translate(exc)

    db = use_case.session
    try:
        await log_action(
            db, user_id=current_user.id, action="MATCH",
            table_name="matched_trips",
            record_id=int(to.id),  # type: ignore[arg-type]
            new_value={
                "delivered_trip_id": body.delivered_trip_id,
                "booked_trip_id": body.booked_trip_id,
            },
            request=request,
        )
        await db.commit()
    except Exception:
        _logger.exception("Audit log failed after reconcile WO#%s ↔ TO#%s",
                          body.delivered_trip_id, body.booked_trip_id)
        # Match already succeeded; commit without audit log.
        try:
            await db.commit()
        except Exception:
            pass

    # Salary is calculated on-the-fly from matched DeliveredTrip earnings,
    # not materialised at match time. No post-match recalc needed.

    try:
        return await _load_trip_one(db, to)
    except Exception as exc:
        _logger.exception(
            "Failed to load TO#%s after reconcile with WO#%s",
            body.booked_trip_id, body.delivered_trip_id,
        )
        raise translate(exc)


@router.post("/reconcile/batch-for-wo", response_model=BatchMatchForWOResponse)
async def batch_reconcile_for_wo(
    body: BatchMatchForWORequest,
    request: Request,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    match_use_case: MatchTripToDeliveredTrip = Depends(get_match_booked_to_delivered_trip),
):
    """Match one DeliveredTrip with multiple BookedTrips in a single call.

    NOTE: In the TO-centric model, this endpoint is kept for backward
    compatibility but each call is validated: a WO can only match 1 TO.
    For multi-WO matching, use /reconcile/batch-for-to instead.
    """
    db = match_use_case.session
    results: list[BatchMatchForWOResult] = []

    for to_id in body.booked_trip_ids:
        try:
            to = await match_use_case(ReconcileInput(
                delivered_trip_id=body.delivered_trip_id,
                booked_trip_id=to_id,
                user_id=current_user.id,
            ))
            try:
                await log_action(
                    db, user_id=current_user.id, action="BATCH_MATCH_WO",
                    table_name="matched_trips",
                    record_id=int(to.id),  # type: ignore[arg-type]
                    new_value={
                        "delivered_trip_id": body.delivered_trip_id,
                        "booked_trip_id": to_id,
                    },
                    request=request,
                )
            except Exception:
                _logger.exception("Audit log failed for batch match WO#%s ↔ TO#%s",
                                  body.delivered_trip_id, to_id)
            results.append(BatchMatchForWOResult(
                booked_trip_id=to_id, success=True,
            ))
        except Exception as exc:
            results.append(BatchMatchForWOResult(
                booked_trip_id=to_id, success=False, error=str(exc),
            ))

    success_count = sum(1 for r in results if r.success)
    fail_count = len(results) - success_count
    _logger.info(
        "Batch match WO#%s: %d/%d succeeded",
        body.delivered_trip_id, success_count, len(results),
    )

    try:
        await db.commit()
    except Exception:
        _logger.exception("Commit failed after batch match for WO#%s", body.delivered_trip_id)
        raise

    return BatchMatchForWOResponse(
        delivered_trip_id=body.delivered_trip_id, results=results,
    )


@router.post("/reconcile/batch-for-to", response_model=BatchMatchForTOResponse)
async def batch_reconcile_for_to(
    body: BatchMatchForTORequest,
    request: Request,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    match_use_case: MatchTripToDeliveredTrip = Depends(get_match_booked_to_delivered_trip),
):
    """Match multiple DeliveredTrips to a single BookedTrip (TO-centric model).

    Validates: len(delivered_trip_ids) <= BookedTrip.container_count - already_matched.
    """
    from app.contexts.operations.infrastructure.link_queries import (
        count_links_for_to,
    )
    from sqlalchemy import select as sa_select

    db = match_use_case.session

    # Fetch the BookedTrip to check capacity
    to_orm = (await db.execute(
        sa_select(BookedTripORM).where(BookedTripORM.id == body.booked_trip_id)
    )).scalar_one_or_none()
    if to_orm is None:
        raise HTTPException(status_code=404, detail="BookedTrip not found")

    # Load TO containers
    to_containers = (await db.execute(
        sa_select(BookedTripContainer).where(
            BookedTripContainer.booked_trip_id == body.booked_trip_id
        )
    )).scalars().all()
    container_count = len(to_containers)
    if container_count == 0:
        raise HTTPException(
            status_code=422,
            detail="Đơn hàng chưa có container",
        )

    # Check capacity
    already_matched = await count_links_for_to(db, body.booked_trip_id)
    remaining_capacity = container_count - already_matched
    if len(body.delivered_trip_ids) > remaining_capacity:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Số đơn hàng ({len(body.delivered_trip_ids)}) vượt quá số container "
                f"còn trống của chuyến (tối đa: {remaining_capacity}, "
                f"tổng container: {container_count}, đã ghép: {already_matched})"
            ),
        )

    results: list[BatchMatchForTOResult] = []
    for wo_id in body.delivered_trip_ids:
        try:
            to = await match_use_case(ReconcileInput(
                delivered_trip_id=wo_id,
                booked_trip_id=body.booked_trip_id,
                user_id=current_user.id,
            ))
            try:
                await log_action(
                    db, user_id=current_user.id, action="BATCH_MATCH_TO",
                    table_name="matched_trips",
                    record_id=int(to.id),  # type: ignore[arg-type]
                    new_value={
                        "delivered_trip_id": wo_id,
                        "booked_trip_id": body.booked_trip_id,
                    },
                    request=request,
                )
            except Exception:
                _logger.exception("Audit log failed for batch match TO#%s ↔ WO#%s",
                                  body.booked_trip_id, wo_id)
            results.append(BatchMatchForTOResult(
                delivered_trip_id=wo_id, success=True,
            ))
        except Exception as exc:
            results.append(BatchMatchForTOResult(
                delivered_trip_id=wo_id, success=False, error=str(exc),
            ))

    success_count = sum(1 for r in results if r.success)
    fail_count = len(results) - success_count
    _logger.info(
        "Batch match TO#%s: %d/%d succeeded",
        body.booked_trip_id, success_count, len(results),
    )

    try:
        await db.commit()
    except Exception:
        _logger.exception("Commit failed after batch match for TO#%s", body.booked_trip_id)
        raise

    return BatchMatchForTOResponse(
        booked_trip_id=body.booked_trip_id, results=results,
    )


@router.post("/reconcile/unmatch")
async def unmatch(
    body: UnmatchRequest,
    request: Request,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: UnmatchTripFromDeliveredTrip = Depends(get_unmatch_booked_from_delivered_trip),
):
    set_audit_reason("unmatch")
    try:
        to, wo = await use_case(UnmatchInput(
            user_id=current_user.id,
            delivered_trip_id=body.delivered_trip_id,
            booked_trip_id=body.booked_trip_id,
        ))
    except Exception as exc:
        raise translate(exc)

    db = use_case.session
    try:
        await log_action(
            db, user_id=current_user.id, action="UNMATCH",
            table_name="matched_trips",
            record_id=int(to.id),  # type: ignore[arg-type]
            reason="unmatch",
            old_value={
                "delivered_trip_id": int(wo.id),  # type: ignore[arg-type]
                "booked_trip_id": int(to.id),  # type: ignore[arg-type]
            },
            request=request,
        )
        await db.commit()
    except Exception:
        _logger.exception("Audit log failed after unmatch WO#%s ↔ TO#%s",
                          body.delivered_trip_id, body.booked_trip_id)
        try:
            await db.commit()
        except Exception:
            pass

    # Salary is calculated on-the-fly; no post-unmatch recalc needed.

    return {"success": True, "message": "Unmatched successfully"}
