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
from app.models.domain import TripOrder as TripOrderORM, TripOrderContainer, WorkOrder as WorkOrderORM
from app.schemas.domain import (
    AutoMatchCandidate,
    AutoMatchConfirmRequest,
    AutoMatchConfirmResponse,
    AutoMatchConfirmResult,
    AutoMatchRequest,
    AutoMatchResponse,
    AutoMatchResult,
    AutoMatchWorkOrderRef,
    AutoMatchTripOrderRef,
    AutoMatchCriterion,
    BatchMatchForTORequest,
    BatchMatchForTOResponse,
    BatchMatchForTOResult,
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
    UnmatchedWorkOrderRef,
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
    """Match one WorkOrder with multiple TripOrders in a single call.

    NOTE: In the TO-centric model, this endpoint is kept for backward
    compatibility but each call is validated: a WO can only match 1 TO.
    For multi-WO matching, use /reconcile/batch-for-to instead.
    """
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


@router.post("/reconcile/batch-for-to", response_model=BatchMatchForTOResponse)
async def batch_reconcile_for_to(
    body: BatchMatchForTORequest,
    request: Request,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    match_use_case: MatchTripToWorkOrder = Depends(get_match_trip_to_work_order),
):
    """Match multiple WorkOrders to a single TripOrder (TO-centric model).

    Validates: len(work_order_ids) <= TripOrder.container_count - already_matched.
    """
    from app.contexts.operations.infrastructure.link_queries import (
        count_links_for_to,
    )
    from sqlalchemy import select as sa_select

    db = match_use_case.session

    # Fetch the TripOrder to check capacity
    to_orm = (await db.execute(
        sa_select(TripOrderORM).where(TripOrderORM.id == body.trip_order_id)
    )).scalar_one_or_none()
    if to_orm is None:
        raise HTTPException(status_code=404, detail="TripOrder not found")

    # Load TO containers
    to_containers = (await db.execute(
        sa_select(TripOrderContainer).where(
            TripOrderContainer.trip_order_id == body.trip_order_id
        )
    )).scalars().all()
    container_count = len(to_containers)
    if container_count == 0:
        raise HTTPException(
            status_code=422,
            detail="Đơn hàng chưa có container",
        )

    # Check capacity
    already_matched = await count_links_for_to(db, body.trip_order_id)
    remaining_capacity = container_count - already_matched
    if len(body.work_order_ids) > remaining_capacity:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Số đơn hàng ({len(body.work_order_ids)}) vượt quá số container "
                f"còn trống của chuyến (tối đa: {remaining_capacity}, "
                f"tổng container: {container_count}, đã ghép: {already_matched})"
            ),
        )

    results: list[BatchMatchForTOResult] = []
    for wo_id in body.work_order_ids:
        try:
            to = await match_use_case(ReconcileInput(
                work_order_id=wo_id,
                trip_order_id=body.trip_order_id,
                user_id=current_user.id,
            ))
            try:
                await log_action(
                    db, user_id=current_user.id, action="BATCH_MATCH_TO",
                    table_name="reconciliations",
                    record_id=int(to.id),  # type: ignore[arg-type]
                    new_value={
                        "work_order_id": wo_id,
                        "trip_order_id": body.trip_order_id,
                    },
                    request=request,
                )
            except Exception:
                _logger.exception("Audit log failed for batch match TO#%s ↔ WO#%s",
                                  body.trip_order_id, wo_id)
            results.append(BatchMatchForTOResult(
                work_order_id=wo_id, success=True,
            ))
        except Exception as exc:
            results.append(BatchMatchForTOResult(
                work_order_id=wo_id, success=False, error=str(exc),
            ))

    success_count = sum(1 for r in results if r.success)
    fail_count = len(results) - success_count
    _logger.info(
        "Batch match TO#%s: %d/%d succeeded",
        body.trip_order_id, success_count, len(results),
    )

    try:
        await db.commit()
    except Exception:
        _logger.exception("Commit failed after batch match for TO#%s", body.trip_order_id)
        raise

    return BatchMatchForTOResponse(
        trip_order_id=body.trip_order_id, results=results,
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
    to_use_case: GetTripOrder = Depends(get_get_trip_order),
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

    from app.contexts.operations.interface.routers.trip_orders import (
        _load_one as _load_trip_one,
    )
    to_session = to_use_case.repo.session  # type: ignore[attr-defined]
    result = []
    for to_id in to_ids:
        t = await to_use_case(to_id)
        out = await _load_trip_one(to_session, t)
        result.append(out)
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
    wo_use_case: GetWorkOrder = Depends(get_get_work_order),
):
    """Auto-match preview: returns candidates WITHOUT committing.

    Full-score candidates (5/5) are marked suggested_default=True.
    Partial candidates (≥ 3/5) are also returned for review.
    Use /reconcile/auto-match/confirm to actually commit selected pairs.
    """
    from datetime import date as date_type
    from sqlalchemy import select as sa_select
    from app.models.domain import WorkOrder as WO, Reconciliation
    from app.schemas.domain import (
        AutoMatchCandidate,
        AutoMatchCriterion,
        AutoMatchWorkOrderRef,
        AutoMatchTripOrderRef,
        UnmatchedWorkOrderRef,
        AutoMatchStats,
        AutoMatchRejectionReason,
    )
    from app.core.summaries import (
        get_partner_summary,
        get_location_summary,
        load_partner_summaries,
        load_driver_summaries,
        load_location_summaries,
    )

    db = wo_use_case.repo.session  # type: ignore[attr-defined]

    date_from = date_type.fromisoformat(body.date_from) if body.date_from else None
    date_to = date_type.fromisoformat(body.date_to) if body.date_to else None

    # Fetch all PENDING work orders in date range
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

    candidates: list[AutoMatchCandidate] = []
    unmatched_refs: list[UnmatchedWorkOrderRef] = []
    unmatched_wos: list[WO] = []
    skipped = 0
    errors: list[str] = []

    # Preload helpers for building refs
    for wo in work_orders:
        try:
            suggestions = await suggest_trip_matches(db, wo)
            # Filter out already-matched trip orders
            suggestions = [s for s in suggestions if s.trip_order.id not in matched_to_ids]
            if not suggestions:
                # Check if WO has any active link already
                has_link = (await db.execute(
                    sa_select(Reconciliation.id).where(
                        Reconciliation.work_order_id == wo.id,
                        Reconciliation.is_active == True,  # noqa: E712
                    )
                )).scalar_one_or_none()
                if has_link:
                    skipped += 1
                else:
                    unmatched_wos.append(wo)
                    unmatched_refs.append(UnmatchedWorkOrderRef(
                        id=wo.id,
                        code=wo.code,
                        plate=None,  # populated below if needed
                        date=wo.created_at.date().isoformat() if wo.created_at else None,
                    ))
                continue

            # Build refs for this WO
            partner_ids_set = {s.trip_order.partner.id for s in suggestions} | {wo.partner_id}
            location_ids_set = set()
            for s in suggestions:
                location_ids_set |= {s.trip_order.pickup_location.id, s.trip_order.dropoff_location.id}
            location_ids_set |= {wo.pickup_location_id, wo.dropoff_location_id}

            partners_map = await load_partner_summaries(db, partner_ids_set)
            locations_map = await load_location_summaries(db, location_ids_set)
            drivers_map = await load_driver_summaries(db, {wo.driver_id})

            wo_partner = get_partner_summary(partners_map, wo.partner_id)
            wo_pickup = get_location_summary(locations_map, wo.pickup_location_id)
            wo_dropoff = get_location_summary(locations_map, wo.dropoff_location_id)
            wo_driver = get_driver_summary(drivers_map, wo.driver_id)
            wo_ref = AutoMatchWorkOrderRef(
                id=wo.id,
                code=wo.code,
                plate=wo_driver.vehicle.plate if wo_driver and wo_driver.vehicle else None,
                date=wo.created_at.date().isoformat() if wo.created_at else None,
                client_name=wo_partner.name,
            )

            for s in suggestions:
                if s.score < 0.5:
                    continue  # skip below-threshold
                to_partner = get_partner_summary(partners_map, s.trip_order.partner.id)
                to_pickup = get_location_summary(locations_map, s.trip_order.pickup_location.id)
                to_dropoff = get_location_summary(locations_map, s.trip_order.dropoff_location.id)
                to_ref = AutoMatchTripOrderRef(
                    id=s.trip_order.id,
                    code=s.trip_order.code,
                    client_name=to_partner.name,
                    containers=list(s.trip_order.containers or []),
                )

                criteria = [
                    AutoMatchCriterion(key=c.name, label=c.label, match=c.match)
                    for c in s.criteria
                ]

                candidates.append(AutoMatchCandidate(
                    work_order_id=wo.id,
                    trip_order_id=s.trip_order.id,
                    score=s.score,
                    match_score=s.match_score,
                    max_score=s.max_score,
                    matched_fields=s.matched_fields,
                    criteria=criteria,
                    suggested_default=s.score >= (4.0 / 5.0),
                    work_order_ref=wo_ref,
                    trip_order_ref=to_ref,
                ))

        except Exception as exc:
            errors.append(f"WO#{wo.id}: {exc}")

    # ── Compute rejection breakdown for unmatched WOs ──
    stats = AutoMatchStats()
    if unmatched_wos:
        from app.models.domain import TripOrder as TORM, TripOrderContainer as TOC, WorkOrderContainer as WOC
        from app.contexts.operations.infrastructure.match_suggester import (
            _load_alias_groups, _locations_match,
        )
        from app.utils.iso6346 import normalize_container_number

        all_tos = list((await db.execute(
            sa_select(TORM).where(TORM.status.in_(["PENDING", "MATCHED"]))
        )).scalars().all())

        if all_tos:
            alias_groups = await _load_alias_groups(db)

            to_partner_ids = {to.partner_id for to in all_tos}
            to_dates = {to.trip_date for to in all_tos if to.trip_date}
            to_cont_rows = (await db.execute(
                sa_select(TOC.trip_order_id, TOC.container_number)
            )).all()
            to_container_map: dict[int, set[str]] = {}
            for tid, cn in to_cont_rows:
                if cn:
                    to_container_map.setdefault(tid, set()).add(
                        normalize_container_number(cn)
                    )
            to_pickup_ids = {to.pickup_location_id for to in all_tos if to.pickup_location_id}
            to_dropoff_ids = {to.dropoff_location_id for to in all_tos if to.dropoff_location_id}

            wo_cont_rows = (await db.execute(
                sa_select(WOC.work_order_id, WOC.container_number)
                .where(WOC.work_order_id.in_([wo.id for wo in unmatched_wos]))
            )).all()
            wo_container_map: dict[int, set[str]] = {}
            for wid, cn in wo_cont_rows:
                if cn:
                    wo_container_map.setdefault(wid, set()).add(
                        normalize_container_number(cn)
                    )

            location_mismatch = 0
            date_mismatch = 0
            client_mismatch = 0
            container_mismatch = 0

            for wo in unmatched_wos:
                has_client = wo.partner_id in to_partner_ids
                wo_date = wo.created_at.date() if wo.created_at else None
                has_date = wo_date in to_dates if wo_date else False
                has_pickup = any(
                    _locations_match(wo.pickup_location_id, pid, alias_groups)
                    for pid in to_pickup_ids
                ) if wo.pickup_location_id else False
                has_dropoff = any(
                    _locations_match(wo.dropoff_location_id, did, alias_groups)
                    for did in to_dropoff_ids
                ) if wo.dropoff_location_id else False
                has_location = has_pickup or has_dropoff

                wo_cns = wo_container_map.get(wo.id, set())
                has_container = any(
                    wo_cns & to_container_map.get(to.id, set())
                    for to in all_tos
                ) if wo_cns else False

                if not has_location:
                    location_mismatch += 1
                if not has_date:
                    date_mismatch += 1
                if not has_client:
                    client_mismatch += 1
                if not has_container:
                    container_mismatch += 1

            reason_defs = [
                ("location_mismatch", "Chưa map địa điểm", location_mismatch),
                ("date_mismatch", "Ngày không khớp", date_mismatch),
                ("client_mismatch", "Khách hàng không khớp", client_mismatch),
                ("container_mismatch", "Container không khớp", container_mismatch),
            ]
            stats = AutoMatchStats(reasons=[
                AutoMatchRejectionReason(code=c, label=l, count=n)
                for c, l, n in reason_defs if n > 0
            ])

    return AutoMatchResponse(
        scanned_work_order_count=len(work_orders),
        skipped_already_matched=skipped,
        candidates=candidates,
        unmatched_work_order_refs=unmatched_refs,
        errors=errors,
        stats=stats,
    )


@router.post("/reconcile/auto-match/confirm", response_model=AutoMatchConfirmResponse)
async def auto_match_confirm(
    body: AutoMatchConfirmRequest,
    request: Request,
    current_user: User = Depends(require_permission("reconcile", "Reconciliation")),
    match_use_case: MatchTripToWorkOrder = Depends(get_match_trip_to_work_order),
):
    """Confirm selected auto-match pairs — only commits user-reviewed pairs.

    Validates per pair: WO still PENDING, TO has remaining capacity,
    no existing active reconciliation for the pair.
    Idempotent: confirming the same pair twice returns error, no duplicate.
    """
    import time
    from sqlalchemy import select as sa_select
    from app.contexts.operations.infrastructure.link_queries import (
        count_links_for_to,
        find_link,
    )

    db = match_use_case.session
    start = time.monotonic()

    matched: list[AutoMatchConfirmResult] = []
    failed: list[AutoMatchConfirmResult] = []

    for pair in body.pairs:
        try:
            # Idempotency check
            existing = await find_link(db, pair.work_order_id, pair.trip_order_id)
            if existing:
                failed.append(AutoMatchConfirmResult(
                    work_order_id=pair.work_order_id,
                    trip_order_id=pair.trip_order_id,
                    success=False,
                    error="Đã ghép trước đó",
                ))
                continue

            # Validate WO is still PENDING
            wo = (await db.execute(
                sa_select(WorkOrderORM).where(WorkOrderORM.id == pair.work_order_id)
            )).scalar_one_or_none()
            if wo is None:
                failed.append(AutoMatchConfirmResult(
                    work_order_id=pair.work_order_id,
                    trip_order_id=pair.trip_order_id,
                    success=False,
                    error="Phiếu chuyến không tồn tại",
                ))
                continue
            if wo.status != "PENDING":
                failed.append(AutoMatchConfirmResult(
                    work_order_id=pair.work_order_id,
                    trip_order_id=pair.trip_order_id,
                    success=False,
                    error=f"Phiếu chuyến đã ở trạng thái {wo.status}",
                ))
                continue

            # Validate TO capacity
            to_orm = (await db.execute(
                sa_select(TripOrderORM).where(TripOrderORM.id == pair.trip_order_id)
            )).scalar_one_or_none()
            if to_orm is None:
                failed.append(AutoMatchConfirmResult(
                    work_order_id=pair.work_order_id,
                    trip_order_id=pair.trip_order_id,
                    success=False,
                    error="Đơn hàng không tồn tại",
                ))
                continue

            to_containers = (await db.execute(
                sa_select(TripOrderContainer).where(
                    TripOrderContainer.trip_order_id == pair.trip_order_id
                )
            )).scalars().all()
            container_count = len(to_containers)
            already_linked = await count_links_for_to(db, pair.trip_order_id)
            if container_count == 0:
                failed.append(AutoMatchConfirmResult(
                    work_order_id=pair.work_order_id,
                    trip_order_id=pair.trip_order_id,
                    success=False,
                    error="Đơn hàng chưa có container",
                ))
                continue
            if already_linked >= container_count:
                failed.append(AutoMatchConfirmResult(
                    work_order_id=pair.work_order_id,
                    trip_order_id=pair.trip_order_id,
                    success=False,
                    error="Đơn hàng đã hết sức chứa",
                ))
                continue

            # Perform the match
            to = await match_use_case(ReconcileInput(
                work_order_id=pair.work_order_id,
                trip_order_id=pair.trip_order_id,
                user_id=current_user.id,
            ))
            await log_action(
                db, user_id=current_user.id, action="AUTO_MATCH_CONFIRM",
                table_name="reconciliations",
                record_id=int(to.id),  # type: ignore[arg-type]
                new_value={
                    "work_order_id": pair.work_order_id,
                    "trip_order_id": pair.trip_order_id,
                },
                request=request,
            )
            matched.append(AutoMatchConfirmResult(
                work_order_id=pair.work_order_id,
                trip_order_id=pair.trip_order_id,
                success=True,
            ))
        except Exception as exc:
            failed.append(AutoMatchConfirmResult(
                work_order_id=pair.work_order_id,
                trip_order_id=pair.trip_order_id,
                success=False,
                error=str(exc),
            ))

    # Single commit for all successful pairs
    if matched:
        try:
            await db.commit()
        except Exception:
            _logger.exception("Commit failed after auto-match confirm")
            raise

    duration_ms = int((time.monotonic() - start) * 1000)
    success_count = len(matched)
    fail_count = len(failed)
    _logger.info(
        "Auto-match confirm: %d/%d succeeded, %d failed, %dms",
        success_count, success_count + fail_count, fail_count, duration_ms,
    )

    return AutoMatchConfirmResponse(
        matched=matched,
        failed=failed,
        duration_ms=duration_ms,
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

    Only accepts pairs where the suggestion has score == 1.0 (5/5 full match).
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
                    f"only full matches (5/5) allowed"
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
