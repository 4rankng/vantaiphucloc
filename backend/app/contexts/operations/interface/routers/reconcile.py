"""Reconciliation HTTP endpoints."""

from __future__ import annotations

import logging
from io import BytesIO

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
)

from app.contexts.operations.application import (
    GetTripOrder,
    GetWorkOrder,
    MatchTripToWorkOrder,
    UnmatchTripFromWorkOrder,
)
from app.contexts.operations.application.dto import (
    ReconcileInput,
    UnmatchInput,
)
from app.contexts.operations.infrastructure.match_suggester import (
    suggest_trip_matches,
    suggest_wo_matches,
)
from app.contexts.operations.interface.dependencies import (
    get_get_trip_order,
    get_get_work_order,
    get_match_trip_to_work_order,
    get_unmatch_trip_from_work_order,
)
from app.contexts.operations.interface.error_translation import translate
from app.contexts.operations.interface.routers.trip_orders import (
    _load_one as _load_trip_one,
)
from app.core.audit_context import set_audit_reason
from app.core.deps import require_permission
from app.models.base import User
from app.models.domain import TripOrder as TripOrderORM, WorkOrder as WorkOrderORM
from app.schemas.domain import (
    AutoMatchRequest,
    AutoMatchResponse,
    AutoMatchResult,
    BatchMatchForWORequest,
    BatchMatchForWOResponse,
    BatchMatchForWOResult,
    BulkMatchRequest,
    BulkMatchResponse,
    BulkMatchResult,
    MatchScoresResponse,
    ReconcileRequest,
    SuggestMatchesResponse,
    SuggestWosResponse,
    TripOrderOut,
    UnmatchRequest,
    WorkOrderMatchScore,
)
from app.core.audit import log_action

_logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/reconcile", response_model=TripOrderOut)
async def reconcile(
    body: ReconcileRequest,
    request: Request,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: MatchTripToWorkOrder = Depends(get_match_trip_to_work_order),
):
    try:
        to = await use_case(ReconcileInput(
            work_order_id=body.work_order_id,
            trip_order_id=body.trip_order_id,
            user_id=current_user.id,
        ))
    except Exception as exc:
        _logger.exception(
            "Reconcile failed: WO#%s ↔ TO#%s",
            body.work_order_id, body.trip_order_id,
        )
        raise translate(exc)

    db = use_case.session
    try:
        await log_action(
            db, user_id=current_user.id, action="MATCH",
            table_name="reconciliations",
            record_id=int(to.id),  # type: ignore[arg-type]
            new_value={
                "work_order_id": body.work_order_id,
                "trip_order_id": body.trip_order_id,
            },
            request=request,
        )
        await db.commit()
    except Exception:
        _logger.exception("Audit log failed after reconcile WO#%s ↔ TO#%s",
                          body.work_order_id, body.trip_order_id)
        # Match already succeeded; commit without audit log.
        try:
            await db.commit()
        except Exception:
            pass

    # Salary is calculated on-the-fly from matched WorkOrder earnings,
    # not materialised at match time. No post-match recalc needed.

    try:
        return await _load_trip_one(db, to)
    except Exception as exc:
        _logger.exception(
            "Failed to load TO#%s after reconcile with WO#%s",
            body.trip_order_id, body.work_order_id,
        )
        raise translate(exc)


@router.post("/reconcile/batch-for-wo", response_model=BatchMatchForWOResponse)
async def batch_reconcile_for_wo(
    body: BatchMatchForWORequest,
    request: Request,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    match_use_case: MatchTripToWorkOrder = Depends(get_match_trip_to_work_order),
):
    """Match one WorkOrder with multiple TripOrders in a single call."""
    db = match_use_case.session
    results: list[BatchMatchForWOResult] = []

    for to_id in body.trip_order_ids:
        try:
            to = await match_use_case(ReconcileInput(
                work_order_id=body.work_order_id,
                trip_order_id=to_id,
                user_id=current_user.id,
            ))
            try:
                await log_action(
                    db, user_id=current_user.id, action="BATCH_MATCH_WO",
                    table_name="reconciliations",
                    record_id=int(to.id),  # type: ignore[arg-type]
                    new_value={
                        "work_order_id": body.work_order_id,
                        "trip_order_id": to_id,
                    },
                    request=request,
                )
            except Exception:
                _logger.exception("Audit log failed for batch match WO#%s ↔ TO#%s",
                                  body.work_order_id, to_id)
            results.append(BatchMatchForWOResult(
                trip_order_id=to_id, success=True,
            ))
        except Exception as exc:
            results.append(BatchMatchForWOResult(
                trip_order_id=to_id, success=False, error=str(exc),
            ))

    success_count = sum(1 for r in results if r.success)
    fail_count = len(results) - success_count
    _logger.info(
        "Batch match WO#%s: %d/%d succeeded",
        body.work_order_id, success_count, len(results),
    )

    try:
        await db.commit()
    except Exception:
        _logger.exception("Commit failed after batch match for WO#%s", body.work_order_id)
        raise

    return BatchMatchForWOResponse(
        work_order_id=body.work_order_id, results=results,
    )


@router.post("/reconcile/unmatch")
async def unmatch(
    body: UnmatchRequest,
    request: Request,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: UnmatchTripFromWorkOrder = Depends(get_unmatch_trip_from_work_order),
):
    set_audit_reason(body.reason)
    try:
        to, wo = await use_case(UnmatchInput(
            user_id=current_user.id,
            reason=body.reason,
            work_order_id=body.work_order_id,
            trip_order_id=body.trip_order_id,
        ))
    except Exception as exc:
        raise translate(exc)

    db = use_case.session
    try:
        await log_action(
            db, user_id=current_user.id, action="UNMATCH",
            table_name="reconciliations",
            record_id=int(to.id),  # type: ignore[arg-type]
            reason=body.reason,
            old_value={
                "work_order_id": int(wo.id),  # type: ignore[arg-type]
                "trip_order_id": int(to.id),  # type: ignore[arg-type]
            },
            request=request,
        )
        await db.commit()
    except Exception:
        _logger.exception("Audit log failed after unmatch WO#%s ↔ TO#%s",
                          body.work_order_id, body.trip_order_id)
        try:
            await db.commit()
        except Exception:
            pass

    # Salary is calculated on-the-fly; no post-unmatch recalc needed.

    return {"success": True, "message": "Unmatched successfully"}


@router.get(
    "/suggest-matches/{work_order_id:int}",
    response_model=SuggestMatchesResponse,
)
async def suggest_matches(
    work_order_id: int,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: GetWorkOrder = Depends(get_get_work_order),
):
    db = use_case.repo.session  # type: ignore[attr-defined]
    from sqlalchemy import select
    wo = (await db.execute(
        select(WorkOrderORM).where(WorkOrderORM.id == work_order_id)
    )).scalar_one_or_none()
    if wo is None:
        raise HTTPException(status_code=404, detail="WorkOrder not found")
    suggestions = await suggest_trip_matches(db, wo)
    return SuggestMatchesResponse(
        work_order_id=work_order_id, suggestions=suggestions,
    )


@router.get("/suggest-wos/{trip_order_id}", response_model=SuggestWosResponse)
async def suggest_wos(
    trip_order_id: int,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: GetTripOrder = Depends(get_get_trip_order),
):
    db = use_case.repo.session  # type: ignore[attr-defined]
    from sqlalchemy import select
    to = (await db.execute(
        select(TripOrderORM).where(TripOrderORM.id == trip_order_id)
    )).scalar_one_or_none()
    if to is None:
        raise HTTPException(status_code=404, detail="TripOrder not found")
    suggestions = await suggest_wo_matches(db, to)
    return SuggestWosResponse(
        trip_order_id=trip_order_id, suggestions=suggestions,
    )


@router.get("/reconcile/links/{work_order_id}")
async def get_linked_trip_orders(
    work_order_id: int,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: GetWorkOrder = Depends(get_get_work_order),
):
    """Return all TripOrders linked to a WorkOrder via active reconciliations."""
    from app.contexts.operations.infrastructure.link_queries import (
        find_all_links_for_wo,
    )
    from sqlalchemy import select as sa_select

    db = use_case.repo.session  # type: ignore[attr-defined]

    links = await find_all_links_for_wo(db, work_order_id)
    to_ids = [link.trip_order_id for link in links]
    if not to_ids:
        return {"work_order_id": work_order_id, "trip_orders": []}

    tos = list((await db.execute(
        sa_select(TripOrderORM).where(TripOrderORM.id.in_(to_ids))
    )).scalars().all())

    from app.contexts.operations.interface.routers.trip_orders import (
        _load_one as _load_trip_one,
    )
    result = []
    for to_orm in tos:
        try:
            out = await _load_trip_one(db, to_orm)
            result.append(out)
        except Exception:
            pass
    return {"work_order_id": work_order_id, "trip_orders": result}


@router.post("/upload-excel")
async def upload_customer_excel(
    file: UploadFile = File(...),
    partner_id: int = Query(..., description="Partner ID for reconciliation"),
    date_from: str | None = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: str | None = Query(None, description="Filter to date (YYYY-MM-DD)"),
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: GetWorkOrder = Depends(get_get_work_order),
):
    from app.contexts.operations.infrastructure.excel import (
        compare_with_system_records,
        parse_customer_excel,
    )

    if not file.filename or not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=400,
            detail="Only Excel files (.xlsx, .xls) are supported",
        )

    file_content = await file.read()
    excel_data = await parse_customer_excel(file_content, partner_id)
    if not excel_data:
        raise HTTPException(status_code=400, detail="No data found in Excel file")

    db = use_case.repo.session  # type: ignore[attr-defined]
    results = await compare_with_system_records(
        db=db, partner_id=partner_id, excel_data=excel_data,
        date_from=date_from, date_to=date_to,
    )

    return {
        "success": True,
        "data": {
            "total_containers": len(results),
            "duplicates_found": sum(1 for r in results if r.is_duplicate),
            "confirmed": sum(1 for r in results if r.status == "confirmed"),
            "pending": sum(1 for r in results if r.status == "pending"),
            "results": [r.to_dict() for r in results],
        },
    }


@router.post("/reconcile/auto-match", response_model=AutoMatchResponse)
async def auto_match(
    body: AutoMatchRequest,
    request: Request,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    match_use_case: MatchTripToWorkOrder = Depends(get_match_trip_to_work_order),
    wo_use_case: GetWorkOrder = Depends(get_get_work_order),
):
    """Auto-match PENDING work orders with trip orders.

    score == 1.0 (all 6 criteria) → auto-confirmed immediately.
    score >= 0.5 → returned as partial_matches for manual review.
    """
    from datetime import date as date_type

    db = match_use_case.session

    date_from = date_type.fromisoformat(body.date_from) if body.date_from else None
    date_to = date_type.fromisoformat(body.date_to) if body.date_to else None

    # Fetch all PENDING work orders in date range
    from sqlalchemy import select as sa_select
    from app.models.domain import WorkOrder as WO, Reconciliation

    wo_query = sa_select(WO).where(WO.status == "PENDING")
    if date_from:
        wo_query = wo_query.where(WO.created_at >= date_from)
    if date_to:
        wo_query = wo_query.where(WO.created_at < date_to)

    work_orders = list((await db.execute(wo_query)).scalars().all())

    matched_to_ids = set(
        r[0] for r in (await db.execute(
            sa_select(Reconciliation.trip_order_id).where(
                Reconciliation.is_active == True  # noqa: E712
            )
        )).all()
    )

    auto_matched: list[AutoMatchResult] = []
    partial_matches: list[AutoMatchResult] = []
    unmatched_work_order_ids: list[int] = []
    skipped = 0
    errors: list[str] = []

    for wo in work_orders:
        try:
            suggestions = await suggest_trip_matches(db, wo)
            # Filter out already-matched trip orders
            suggestions = [s for s in suggestions if s.trip_order.id not in matched_to_ids]
            if not suggestions:
                unmatched_work_order_ids.append(wo.id)
                continue

            # Match ALL full-score TOs (multi-container: 1 WO → N TOs)
            full_matches = [s for s in suggestions if s.score >= 1.0]
            partial = [s for s in suggestions if 0.5 <= s.score < 1.0]

            if full_matches:
                for match in full_matches:
                    try:
                        to = await match_use_case(ReconcileInput(
                            work_order_id=wo.id,
                            trip_order_id=match.trip_order.id,
                            user_id=current_user.id,
                        ))
                        await log_action(
                            db, user_id=current_user.id, action="AUTO_MATCH",
                            table_name="reconciliations",
                            record_id=int(to.id),  # type: ignore[arg-type]
                            new_value={
                                "work_order_id": wo.id,
                                "trip_order_id": match.trip_order.id,
                                "score": match.score,
                                "matched_fields": match.matched_fields,
                            },
                            request=request,
                        )
                        await db.commit()
                        matched_to_ids.add(match.trip_order.id)

                        auto_matched.append(AutoMatchResult(
                            work_order_id=wo.id,
                            trip_order_id=match.trip_order.id,
                            score=match.score,
                            matched_fields=match.matched_fields,
                        ))
                    except Exception as exc:
                        errors.append(f"WO#{wo.id} → TO#{match.trip_order.id}: {exc}")
            elif partial:
                for p in partial:
                    partial_matches.append(AutoMatchResult(
                        work_order_id=wo.id,
                        trip_order_id=p.trip_order.id,
                        score=p.score,
                        matched_fields=p.matched_fields,
                    ))
            else:
                unmatched_work_order_ids.append(wo.id)
                skipped += 1
        except Exception as exc:
            errors.append(f"WO#{wo.id}: {exc}")

    return AutoMatchResponse(
        auto_matched=auto_matched,
        partial_matches=partial_matches,
        unmatched_work_order_ids=unmatched_work_order_ids,
        skipped_already_matched=skipped,
        errors=errors,
    )


@router.get("/match-scores", response_model=MatchScoresResponse)
async def match_scores(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: GetWorkOrder = Depends(get_get_work_order),
):
    """Return the best match score for each PENDING work order.

    Lightweight endpoint so the master list can show color-coded score
    chips without fetching full suggestions for every row.
    """
    from datetime import date as date_type
    from sqlalchemy import select as sa_select
    from app.models.domain import WorkOrder as WO, Reconciliation

    db = use_case.repo.session  # type: ignore[attr-defined]

    df = date_type.fromisoformat(date_from) if date_from else None
    dt = date_type.fromisoformat(date_to) if date_to else None

    wo_query = sa_select(WO).where(WO.status == "PENDING")
    if df:
        wo_query = wo_query.where(WO.created_at >= df)
    if dt:
        wo_query = wo_query.where(WO.created_at < dt)

    work_orders = list((await db.execute(wo_query)).scalars().all())
    scores: list[WorkOrderMatchScore] = []

    for wo in work_orders:
        suggestions = await suggest_trip_matches(db, wo)
        if suggestions:
            best = suggestions[0]
            scores.append(WorkOrderMatchScore(
                work_order_id=wo.id,
                best_score=best.score,
                best_match_score=best.match_score,
                max_score=best.max_score,
                suggestion_count=len(suggestions),
            ))
        else:
            scores.append(WorkOrderMatchScore(
                work_order_id=wo.id,
                best_score=0.0,
                best_match_score=0,
            ))

    return MatchScoresResponse(scores=scores)


@router.post("/reconcile/bulk-match", response_model=BulkMatchResponse)
async def bulk_match(
    body: BulkMatchRequest,
    request: Request,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    match_use_case: MatchTripToWorkOrder = Depends(get_match_trip_to_work_order),
):
    """Bulk-match pairs of work orders with trip orders.

    Only accepts pairs where the suggestion has score == 1.0 (6/6 full match).
    """
    db = match_use_case.session
    matched: list[BulkMatchResult] = []
    errors: list[str] = []

    for pair in body.pairs:
        try:
            # Verify full match score
            from sqlalchemy import select as sa_select
            wo = (await db.execute(
                sa_select(WorkOrderORM).where(WorkOrderORM.id == pair.work_order_id)
            )).scalar_one_or_none()
            if wo is None:
                errors.append(f"WorkOrder #{pair.work_order_id} not found")
                continue

            suggestions = await suggest_trip_matches(db, wo)
            matching = [s for s in suggestions if s.trip_order.id == pair.trip_order_id]
            if not matching:
                errors.append(
                    f"TO #{pair.trip_order_id} not a suggestion for WO #{pair.work_order_id}"
                )
                continue
            if matching[0].score < 1.0:
                errors.append(
                    f"WO #{pair.work_order_id} → TO #{pair.trip_order_id}: "
                    f"score {matching[0].match_score}/{matching[0].max_score}, "
                    f"only full matches (6/6) allowed"
                )
                continue

            to = await match_use_case(ReconcileInput(
                work_order_id=pair.work_order_id,
                trip_order_id=pair.trip_order_id,
                user_id=current_user.id,
            ))
            await log_action(
                db, user_id=current_user.id, action="BULK_MATCH",
                table_name="reconciliations",
                record_id=int(to.id),  # type: ignore[arg-type]
                new_value={
                    "work_order_id": pair.work_order_id,
                    "trip_order_id": pair.trip_order_id,
                },
                request=request,
            )
            await db.commit()

            # Salary is calculated on-the-fly; no post-match recalc needed.

            matched.append(BulkMatchResult(
                work_order_id=pair.work_order_id,
                trip_order_id=pair.trip_order_id,
                success=True,
            ))
        except Exception as exc:
            errors.append(f"WO #{pair.work_order_id} → TO #{pair.trip_order_id}: {exc}")

    return BulkMatchResponse(matched=matched, errors=errors)


@router.get("/export-excel")
async def export_reconciliation_excel(
    partner_id: int = Query(..., description="Partner ID"),
    date_from: str | None = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: str | None = Query(None, description="Filter to date (YYYY-MM-DD)"),
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    use_case: GetWorkOrder = Depends(get_get_work_order),
):
    from app.contexts.operations.infrastructure.excel import generate_reconciliation_excel

    db = use_case.repo.session  # type: ignore[attr-defined]
    excel_content = await generate_reconciliation_excel(
        db=db, partner_id=partner_id, date_from=date_from, date_to=date_to,
    )

    filename = f"reconciliation_partner_{partner_id}"
    if date_from:
        filename += f"_{date_from}"
    if date_to:
        filename += f"_{date_to}"
    filename += ".xlsx"

    return Response(
        content=excel_content,
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
