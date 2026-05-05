"""Generic customer-file import endpoints.

Two flavours:

- `POST /imports/customer-excel/preview` — multipart upload. Runs the
  detection pipeline, returns the parsed preview (sheet, header row,
  column mapping, accepted/rejected rows). When `client_id` is supplied
  and a saved template matches, reuses the saved column mapping.

- `POST /imports/customer-excel/commit` — JSON body with the confirmed
  mapping + list of rows to commit. Idempotent on
  `(client_id, trip_date, container_number)`.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Any

from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_roles
from app.database import get_db
from app.models.base import User
from app.models.domain import (
    Client,
    TripOrder,
    TripOrderContainer,
)
from app.models.enums import TripOrderStatus
from app.services.import_pipeline.canonical import CANONICAL_FIELDS, SKIP_FIELD
from app.services.import_pipeline.column_mapper import ColumnMapping
from app.services.import_pipeline.llm import get_default_classifier
from app.services.import_pipeline.pipeline import (
    apply_mapping,
    column_mappings_from_dicts,
    compute_structure_hash,
    group_rows_into_trips,
    run_preview,
)
from app.services.import_pipeline.templates import (
    find_template,
    list_templates_for_client,
    save_template,
)
from app.services.import_pipeline.workbook import load_workbook
from app.services.location_resolver import (
    LocationResolverService,
    MatchKind,
    ResolverSource,
)


_logger = logging.getLogger(__name__)

router = APIRouter(prefix="/imports", tags=["imports"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CommitRow(BaseModel):
    container_no: str
    container_size: str
    freight_kind: str
    work_type: str
    container_type_iso: str = ""
    gross_weight_kg: float | None = None
    seal_no: str = ""
    pickup_location: str = ""
    dropoff_location: str = ""
    pickup_date: date | None = None
    dropoff_date: date | None = None
    trip_date: date
    customer_ref: str = ""
    consignee: str = ""
    commodity: str = ""
    driver_name: str = ""
    tractor_plate: str = ""
    remarks: str = ""


class CommitRequest(BaseModel):
    client_id: int
    rows: list[CommitRow]
    overwrite_duplicates: bool = False
    save_template_as: str | None = None
    structure_hash: str | None = None
    sheet_name: str | None = None
    header_row_index: int | None = None
    column_mapping: list[dict[str, Any]] | None = None


class CommitResponse(BaseModel):
    created: int                          # number of TripOrders created
    containers_created: int = 0           # total TripContainer rows
    grouped_trips: int = 0                # number of trips that contain >1 container
    skipped_duplicates: int = 0
    locations_created: int = 0            # new Location rows added during this commit
    locations_review_flagged: int = 0     # trips flagged for fuzzy-match review
    errors: list[str] = Field(default_factory=list)
    template_id: int | None = None


# ---------------------------------------------------------------------------
# Schema introspection — used by the frontend mapping table dropdown
# ---------------------------------------------------------------------------

@router.get("/customer-excel/schema")
async def get_canonical_schema(
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    return {
        "fields": [
            {
                "name": f.name,
                "label": f.label,
                "required": f.required,
                "description": f.description,
            }
            for f in CANONICAL_FIELDS
        ],
        "skip_field": SKIP_FIELD,
    }


# ---------------------------------------------------------------------------
# Preview
# ---------------------------------------------------------------------------

@router.post("/customer-excel/preview")
async def preview_customer_excel(
    file: UploadFile = File(...),
    client_id: int | None = Form(None),
    default_trip_date: date | None = Form(None),
    sheet_name: str | None = Form(None),
    header_row_index: int | None = Form(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    if file.filename is None:
        raise HTTPException(status_code=400, detail="Tệp tải lên không có tên.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Tệp tải lên rỗng.")

    trip_date = default_trip_date or date.today()
    classifier = get_default_classifier()

    cached_mapping: list[ColumnMapping] | None = None
    if client_id is not None:
        # We need the structure_hash before we can look up the template,
        # so do a quick layout sniff first.
        sheets = load_workbook(content, file.filename)
        if not sheets:
            raise HTTPException(status_code=400, detail="Tệp Excel không có sheet nào.")
        from app.services.import_pipeline.sheet_picker import score_sheets
        from app.services.import_pipeline.header_finder import find_header_row, header_row_text

        sheet = None
        if sheet_name:
            for s in sheets:
                if s.name == sheet_name:
                    sheet = s
                    break
        if sheet is None:
            scored = score_sheets(sheets)
            sheet = scored[0].sheet if scored and scored[0].score > 0 else None

        if sheet is not None:
            row_idx = header_row_index
            if row_idx is None:
                hit = find_header_row(sheet)
                row_idx = hit.row_index if hit else None
            if row_idx is not None:
                hdr_cells = header_row_text(sheet, row_idx)
                structure_hash = compute_structure_hash(sheet.name, hdr_cells)
                tpl = await find_template(db, client_id, structure_hash)
                if tpl is not None:
                    cached_mapping = column_mappings_from_dicts(list(tpl.column_mapping))

    try:
        result = await run_preview(
            content,
            file.filename,
            default_trip_date=trip_date,
            classifier=classifier,
            cached_mapping=cached_mapping,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # Layer onto the preview: for every distinct pickup/dropoff string
    # in the parsed rows, run the LocationResolverService in find-only
    # mode (no writes). The frontend uses this to render the 4-state
    # badge: (có sẵn) / (gợi ý) / (mới) / (trùng lặp?).
    location_resolutions = await _resolve_preview_locations(db, result.accepted)

    payload = result.to_dict()
    payload["template_used"] = cached_mapping is not None
    payload["location_resolutions"] = location_resolutions
    return payload


async def _resolve_preview_locations(
    db: AsyncSession, accepted: list[dict],
) -> dict[str, dict]:
    """Return {raw_string: {match_kind, suggestions, location}} for every
    unique pickup/dropoff value in the accepted rows."""
    resolver = LocationResolverService(db)
    seen: set[str] = set()
    for r in accepted:
        v = r.get("values") or {}
        for key in ("pickup_location", "dropoff_location"):
            s = (v.get(key) or "").strip()
            if s:
                seen.add(s)

    out: dict[str, dict] = {}
    for raw in seen:
        result = await resolver.find_match(raw)
        out[raw] = {
            "raw": raw,
            "match_kind": result.match_kind.value,
            "location_id": result.location.id if result.location else None,
            "location_name": result.location.name if result.location else None,
            "review_needed": result.review_needed,
            "suggestions": [
                {"location_id": s.location_id, "name": s.name, "score": s.score}
                for s in result.suggestions
            ],
        }
    return out


# ---------------------------------------------------------------------------
# Commit
# ---------------------------------------------------------------------------

@router.post("/customer-excel/commit", response_model=CommitResponse)
async def commit_customer_excel(
    body: CommitRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles("accountant", "superadmin")),
):
    client = (await db.execute(select(Client).where(Client.id == body.client_id))).scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy khách hàng.")

    if not body.rows:
        raise HTTPException(status_code=400, detail="Không có dòng nào để tạo.")

    # Group rows by (trip_date, dropoff, tractor_plate-or-customer_ref) so
    # one truck running multiple containers becomes one TripOrder with N
    # TripContainers. Rows with no plate/ref signal stay 1:1.
    rows_as_dicts = [
        {
            "container_no": r.container_no,
            "container_size": r.container_size,
            "container_type": r.container_type_iso,
            "freight_kind": r.freight_kind,
            "work_type": r.work_type,
            "gross_weight_kg": r.gross_weight_kg,
            "seal_no": r.seal_no,
            "commodity": r.commodity,
            "pickup_location": r.pickup_location,
            "dropoff_location": r.dropoff_location,
            "trip_date": r.trip_date.isoformat() if r.trip_date else None,
            "tractor_plate": r.tractor_plate,
            "driver_name": r.driver_name,
            "customer_ref": r.customer_ref,
            "remarks": r.remarks,
        }
        for r in body.rows
    ]
    groups = group_rows_into_trips(rows_as_dicts)

    created = 0
    containers_created = 0
    grouped_trips = 0
    skipped = 0
    locations_created = 0
    locations_review_flagged = 0
    errors: list[str] = []

    resolver = LocationResolverService(db)
    locations_seen_before = await _count_locations(db)

    for idx, grp in enumerate(groups, start=1):
        try:
            # Idempotency: skip the whole group if EVERY container is
            # already on a trip for this (client, date). If some are new
            # and some duplicate, we still create the trip with only the
            # new containers — log the skipped ones.
            new_rows = []
            for v in grp.rows:
                cn = v.get("container_no", "")
                td = _parse_iso_date(v.get("trip_date"))
                if td is None:
                    continue
                existing = await _find_duplicate(db, body.client_id, td, cn)
                if existing:
                    if body.overwrite_duplicates:
                        new_rows.append(v)
                    else:
                        skipped += 1
                else:
                    new_rows.append(v)
            if not new_rows:
                continue

            # Pick representative values (first non-empty)
            first = new_rows[0]
            trip_date = _parse_iso_date(first.get("trip_date")) or _parse_iso_date(grp.trip_date)
            pickup = grp.pickup_location or first.get("pickup_location") or ""
            dropoff = grp.dropoff_location or first.get("dropoff_location") or ""
            work_type = first.get("work_type") or ""
            route_str = (f"{pickup} - {dropoff}").strip(" -") if pickup or dropoff else ""

            # Resolve / auto-create Locations. Both raw strings stay on
            # `pickup_raw` / `dropoff_raw`; the resolved canonical name +
            # FK go on `pickup_location` / `pickup_location_id`.
            pickup_loc = None
            dropoff_loc = None
            review_needed = False
            if pickup:
                p = await resolver.resolve_or_create(pickup, source=ResolverSource.IMPORT, user_id=user.id)
                pickup_loc = p.location
                if p.review_needed:
                    review_needed = True
            if dropoff:
                d = await resolver.resolve_or_create(dropoff, source=ResolverSource.IMPORT, user_id=user.id)
                dropoff_loc = d.location
                if d.review_needed:
                    review_needed = True

            if not pickup_loc or not dropoff_loc:
                # Without resolvable locations the trip can't satisfy
                # the (now NOT NULL) FK. Skip with a clear log.
                errors.append(
                    f"Nhóm {idx}: pickup/dropoff không thể giải quyết "
                    f"(pickup={pickup!r}, dropoff={dropoff!r})"
                )
                continue
            trip = TripOrder(
                trip_date=trip_date,
                client_id=client.id,
                route=route_str,
                pickup_raw=pickup or None,
                dropoff_raw=dropoff or None,
                pickup_location_id=pickup_loc.id,
                dropoff_location_id=dropoff_loc.id,
                pricing_id=None,
                # Pricing intentionally NOT applied here. The kế toán
                # prices the trip later via Apply Pricing or manually.
                unit_price=0,
                driver_salary=0,
                allowance=0,
                revenue=0,
                status=TripOrderStatus.DRAFT,
                location_review_needed=review_needed,
            )
            if review_needed:
                locations_review_flagged += 1
            db.add(trip)
            await db.flush()

            for v in new_rows:
                db.add(TripOrderContainer(
                    trip_order_id=trip.id,
                    container_number=v.get("container_no") or "",
                    work_type=v.get("work_type") or work_type,
                    container_size=v.get("container_size") or None,
                    container_type=v.get("container_type") or None,
                    freight_kind=v.get("freight_kind") or None,
                    gross_weight_kg=_to_float(v.get("gross_weight_kg")),
                    seal_no=v.get("seal_no") or None,
                    commodity=v.get("commodity") or None,
                    container_metadata=_extract_metadata(v),
                ))
                containers_created += 1

            created += 1
            if len(new_rows) > 1:
                grouped_trips += 1

        except Exception as exc:  # pragma: no cover - safety net
            _logger.exception("Import group %d failed", idx)
            errors.append(f"Nhóm {idx}: {exc}")

    template_id: int | None = None
    if (
        body.save_template_as
        and body.structure_hash
        and body.sheet_name
        and body.header_row_index is not None
        and body.column_mapping is not None
    ):
        tpl = await save_template(
            db,
            client_id=body.client_id,
            structure_hash=body.structure_hash,
            template_name=body.save_template_as,
            sheet_name=body.sheet_name,
            header_row_index=body.header_row_index,
            column_mapping=body.column_mapping,
            user_id=user.id,
        )
        template_id = tpl.id

    locations_seen_after = await _count_locations(db)
    locations_created = max(0, locations_seen_after - locations_seen_before)

    await db.commit()

    return CommitResponse(
        created=created,
        containers_created=containers_created,
        grouped_trips=grouped_trips,
        skipped_duplicates=skipped,
        locations_created=locations_created,
        locations_review_flagged=locations_review_flagged,
        errors=errors,
        template_id=template_id,
    )


# ---------------------------------------------------------------------------
# Templates listing — for the UI to show "saved customer mappings"
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Apply pricing — bulk action that runs `find_tiered_pricing` over a set of
# already-imported TripOrders and fills `unit_price`/`driver_salary`/
# `allowance` from the Pricing table. Status stays DRAFT (per
# docs/PRICING_DATA_FLOW.md) but the price is now populated.
# ---------------------------------------------------------------------------

class ApplyPricingRequest(BaseModel):
    client_id: int
    trip_order_ids: list[int] | None = None  # if None, all DRAFT trips for client


class ApplyPricingResponse(BaseModel):
    priced: int
    not_found: int
    not_found_trip_ids: list[int] = Field(default_factory=list)


@router.post("/apply-pricing", response_model=ApplyPricingResponse)
async def apply_pricing(
    body: ApplyPricingRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    from app.services.pricing_service import find_tiered_pricing
    from app.models.enums import TripOrderStatus

    q = select(TripOrder).where(
        TripOrder.client_id == body.client_id,
        TripOrder.status == TripOrderStatus.DRAFT.value,
    )
    if body.trip_order_ids:
        q = q.where(TripOrder.id.in_(body.trip_order_ids))
    rows: list[TripOrder] = list((await db.execute(q)).scalars().all())

    priced = 0
    not_found_ids: list[int] = []
    for trip in rows:
        # Need container count + work_type for tiered lookup
        cont_count = await db.scalar(
            select(func.count(TripOrderContainer.id))
            .where(TripOrderContainer.trip_order_id == trip.id)
        ) or 1
        # work_type is now stored on each TripContainer (top-level
        # column was dropped). Pull from the first container.
        first_c_res = await db.execute(
            select(TripOrderContainer.work_type)
            .where(TripOrderContainer.trip_order_id == trip.id)
            .limit(1)
        )
        wt = first_c_res.scalar_one_or_none() or ""
        if not wt:
            not_found_ids.append(trip.id)
            continue
        tiered = await find_tiered_pricing(
            db, client_id=trip.client_id, work_type=wt,
            quantity=int(cont_count),
            pickup_location_id=trip.pickup_location_id,
            dropoff_location_id=trip.dropoff_location_id,
        )
        if tiered is None:
            not_found_ids.append(trip.id)
            continue
        trip.unit_price = tiered.unit_price
        trip.driver_salary = tiered.driver_salary
        trip.allowance = tiered.allowance
        trip.revenue = tiered.unit_price
        trip.pricing_id = tiered.pricing.id
        priced += 1

    await db.commit()
    return ApplyPricingResponse(
        priced=priced,
        not_found=len(not_found_ids),
        not_found_trip_ids=not_found_ids[:50],
    )


@router.get("/customer-excel/templates")
async def list_templates(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    rows = await list_templates_for_client(db, client_id)
    return [
        {
            "id": r.id,
            "client_id": r.client_id,
            "template_name": r.template_name,
            "structure_hash": r.structure_hash,
            "sheet_name": r.sheet_name,
            "header_row_index": r.header_row_index,
            "last_used_at": r.last_used_at,
            "column_count": len(r.column_mapping or []),
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Customer pricing (bảng giá) import — preview + commit
# ---------------------------------------------------------------------------


class PricingPreviewRowDto(BaseModel):
    pickup_location: str
    dropoff_location: str
    work_type: str
    unit_price: int
    quantity: int = 1
    driver_salary: int = 0
    allowance: int = 0
    note: str = ""


class PricingCommitRequest(BaseModel):
    client_id: int
    rows: list[PricingPreviewRowDto]
    update_existing_lines: bool = False


class PricingCommitResponse(BaseModel):
    pricings_created: int
    pricings_existing: int
    lines_created: int
    lines_updated: int
    lines_existing: int
    skipped_no_locations: int
    locations_created: int


@router.post("/customer-pricing/preview")
async def preview_customer_pricing(
    file: UploadFile = File(...),
    format: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    """Parse an uploaded tariff file. `format` is one of pan|hap|newway, or
    omit to auto-detect from the filename."""
    from app.services.pricing_import import (
        SUPPORTED_FORMATS,
        detect_format,
        parse_tariff_bytes,
        resolve_preview_locations,
    )

    if file.filename is None:
        raise HTTPException(status_code=400, detail="Tệp tải lên không có tên.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Tệp tải lên rỗng.")

    fmt = (format or "").lower().strip() or detect_format(file.filename or "")
    if not fmt:
        raise HTTPException(
            status_code=400,
            detail=(
                "Không nhận diện được định dạng tệp bảng giá. "
                "Hãy chọn pan, hap hoặc newway."
            ),
        )
    if fmt not in SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Định dạng không hợp lệ: {fmt!r}. "
                f"Các định dạng được hỗ trợ: {', '.join(SUPPORTED_FORMATS)}."
            ),
        )

    try:
        preview = parse_tariff_bytes(content, fmt)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    location_resolutions = await resolve_preview_locations(db, preview.rows)
    payload = preview.to_dict()
    payload["filename"] = file.filename
    payload["location_resolutions"] = location_resolutions
    payload["supported_formats"] = list(SUPPORTED_FORMATS)
    return payload


@router.post("/customer-pricing/commit", response_model=PricingCommitResponse)
async def commit_customer_pricing(
    body: PricingCommitRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles("accountant", "superadmin")),
):
    from app.services.pricing_import import TariffRow, commit_tariff_rows

    if not body.rows:
        raise HTTPException(status_code=400, detail="Không có dòng nào để tạo.")
    client = (
        await db.execute(select(Client).where(Client.id == body.client_id))
    ).scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy khách hàng.")

    tariff_rows = [
        TariffRow(
            pickup_raw=r.pickup_location,
            dropoff_raw=r.dropoff_location,
            work_type=r.work_type,
            unit_price=r.unit_price,
            quantity=r.quantity,
            driver_salary=r.driver_salary,
            allowance=r.allowance,
            note=r.note,
        )
        for r in body.rows
    ]
    result = await commit_tariff_rows(
        db,
        client=client,
        rows=tariff_rows,
        user_id=user.id,
        update_existing_lines=body.update_existing_lines,
    )
    return PricingCommitResponse(
        pricings_created=result.pricings_created,
        pricings_existing=result.pricings_existing,
        lines_created=result.lines_created,
        lines_updated=result.lines_updated,
        lines_existing=result.lines_existing,
        skipped_no_locations=result.skipped_no_locations,
        locations_created=result.locations_created,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_iso_date(s: object) -> date | None:
    if isinstance(s, date):
        return s
    if not s or not isinstance(s, str):
        return None
    try:
        return date.fromisoformat(s)
    except ValueError:
        return None


def _to_float(v: object) -> float | None:
    if v is None or v == "":
        return None
    try:
        return float(v)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


# Fields the canonical schema captures into TripContainer columns directly.
# Anything else goes into `container_metadata` JSON for traceability.
_CONTAINER_DIRECT_FIELDS = {
    "container_no", "container_size", "container_type", "freight_kind",
    "work_type", "gross_weight_kg", "seal_no", "commodity",
    "pickup_location", "dropoff_location", "trip_date",
    "tractor_plate", "driver_name", "customer_ref",
}


def _extract_metadata(row: dict[str, object]) -> dict[str, object] | None:
    extras = {
        k: v
        for k, v in row.items()
        if k not in _CONTAINER_DIRECT_FIELDS
        and v not in (None, "", [], {})
    }
    return extras or None


async def _count_locations(db: AsyncSession) -> int:
    from sqlalchemy import func
    from app.models.domain import Location
    res = await db.execute(select(func.count()).select_from(Location))
    return int(res.scalar_one())


async def _find_duplicate(
    db: AsyncSession,
    client_id: int,
    trip_date: date,
    container_no: str,
) -> TripOrder | None:
    res = await db.execute(
        select(TripOrder)
        .join(TripOrderContainer, TripOrderContainer.trip_order_id == TripOrder.id)
        .where(
            and_(
                TripOrder.client_id == client_id,
                TripOrder.trip_date == trip_date,
                TripOrderContainer.container_number == container_no,
            )
        )
        .limit(1)
    )
    return res.scalar_one_or_none()
