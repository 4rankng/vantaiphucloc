"""Bulk import work orders from Excel and auto-match against trip orders.

Parses an Excel file (.xlsx) with flexible column detection, creates
WorkOrder + WorkOrderContainer rows, then runs matching against existing
unmatched TripOrders using the match_suggester scoring logic.
"""

from __future__ import annotations

import io
import logging
import re
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from typing import Any

import openpyxl
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    Location,
    LocationAlias,
    Partner,
    Reconciliation,
    TripOrder,
    TripOrderContainer,
    WorkOrder,
    WorkOrderContainer,
)
from app.utils.excel_utils import (
    CONTAINER_RE,
    looks_like_container,
    parse_amount,
    parse_date,
)
from app.utils.iso6346 import normalize_container_number

_logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Column detection
# ---------------------------------------------------------------------------

# Vietnamese + English header patterns for auto-detection
_HEADER_PATTERNS: dict[str, list[str]] = {
    "container": ["container", "cont", "số cont", "so cont", "số container", "container no", "công container", "số côn"],
    "date": ["ngày", "date", "ngày đi", "trip date", "ngày chạy", "ngày vận chuyển", "ngày thực hiện"],
    "client": ["khách", "customer", "client", "khách hàng", "tên khách", "customer name", "đối tác", "partner"],
    "pickup": ["điểm lấy", "pickup", "lấy hàng", "nơi lấy", "đi từ", "from", "điểm đi", "nơi đi", "lấy"],
    "dropoff": ["điểm trả", "dropoff", "trả hàng", "nơi trả", "đến", "to", "điểm đến", "nơi đến", "trả"],
    "amount": ["tiền", "amount", "cước", "giá", "đơn giá", "unit price", "cước phí", "thành tiền", "tổng tiền", "price"],
    "work_type": ["loại", "work type", "type", "loại cont", "loại container", "size"],
    "notes": ["ghi chú", "note", "notes", "remark", "remarks", "mô tả", "description"],
}


# Parsing helpers imported from app.utils.excel_utils

# Note: bulk_import_service has a slightly different _parse_amount that
# handles int/float directly. We wrap the shared version to preserve behavior.
def _parse_amount(raw: Any) -> int | None:
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        v = int(raw)
        return v if v > 0 else None
    return parse_amount(raw)


def _detect_columns(headers: list[str | None]) -> dict[str, int]:
    """Map column roles to column indices by inspecting header row."""
    mapping: dict[str, int] = {}
    used: set[int] = set()
    for role, patterns in _HEADER_PATTERNS.items():
        for idx, h in enumerate(headers):
            if idx in used or h is None:
                continue
            h_lower = str(h).strip().lower()
            for pat in patterns:
                if pat in h_lower:
                    mapping[role] = idx
                    used.add(idx)
                    break
            if role in mapping:
                break
    return mapping


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class ImportRow:
    """Single row parsed from the Excel file."""
    row_number: int
    container_number: str | None = None
    trip_date: date | None = None
    client_name: str | None = None
    pickup_location: str | None = None
    dropoff_location: str | None = None
    amount: int | None = None  # In VND (integer)
    work_type: str | None = None
    notes: str | None = None
    parse_error: str | None = None


@dataclass
class BulkImportResult:
    """Result of the bulk import + match operation."""
    total_rows: int
    created: int
    matched: int
    warnings: int
    unmatched: int
    errors: list[str] = field(default_factory=list)
    details: list[dict] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class BulkImportService:
    """Parse Excel file, create WorkOrders, auto-match against TripOrders."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def import_and_match(
        self,
        content: bytes,
        filename: str,
        client_id: int | None = None,
        user_id: int | None = None,
    ) -> BulkImportResult:
        """Main entry: parse → create WOs → auto-match → return summary."""
        rows = self._parse_excel(content, filename)
        if not rows:
            return BulkImportResult(
                total_rows=0, created=0, matched=0,
                warnings=0, unmatched=0,
                errors=["Không tìm thấy dữ liệu hợp lệ trong file"],
            )

        valid_rows = [r for r in rows if r.parse_error is None]
        error_rows = [r for r in rows if r.parse_error is not None]

        if not valid_rows:
            return BulkImportResult(
                total_rows=len(rows), created=0, matched=0,
                warnings=0, unmatched=0,
                errors=[r.parse_error for r in error_rows if r.parse_error] or ["Không có dòng hợp lệ"],
            )

        # Resolve client_id from file if not provided
        resolved_client_id = client_id
        if resolved_client_id is None:
            resolved_client_id = await self._resolve_client_from_rows(valid_rows)

        if resolved_client_id is None:
            return BulkImportResult(
                total_rows=len(rows), created=0, matched=0,
                warnings=0, unmatched=0,
                errors=["Không xác định được khách hàng. Vui lòng chọn khách hàng hoặc thêm cột 'khách' trong file."],
            )

        # Resolve locations for all rows
        await self._resolve_locations_for_rows(valid_rows)

        # Create WorkOrders
        created_wo_ids: list[int] = []
        create_errors: list[str] = []
        details: list[dict] = []

        for row in valid_rows:
            try:
                wo_id = await self._create_work_order(row, resolved_client_id, user_id)
                created_wo_ids.append(wo_id)
                details.append({
                    "row": row.row_number,
                    "container": row.container_number,
                    "work_order_id": wo_id,
                    "status": "created",
                })
            except Exception as exc:
                msg = f"Dòng {row.row_number}: {exc}"
                create_errors.append(msg)
                details.append({
                    "row": row.row_number,
                    "container": row.container_number,
                    "status": "error",
                    "error": str(exc),
                })

        await self.session.flush()

        # Auto-match created WOs against existing TripOrders
        matched, warnings, unmatched = await self._auto_match(created_wo_ids, user_id or 0)

        await self.session.commit()

        all_errors = [r.parse_error for r in error_rows if r.parse_error] + create_errors
        return BulkImportResult(
            total_rows=len(rows),
            created=len(created_wo_ids),
            matched=matched,
            warnings=warnings,
            unmatched=unmatched,
            errors=all_errors,
            details=details,
        )

    # -----------------------------------------------------------------------
    # Excel parsing
    # -----------------------------------------------------------------------

    def _parse_excel(self, content: bytes, filename: str) -> list[ImportRow]:
        """Parse Excel file into ImportRow list."""
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True, read_only=True)
        rows_out: list[ImportRow] = []

        for sheet in wb.worksheets:
            raw_rows = list(sheet.iter_rows(values_only=True))
            if not raw_rows:
                continue

            # Try to detect header row
            header_idx = self._find_header_row(raw_rows)
            if header_idx is None:
                # Fallback: look for first row with container number
                header_idx = self._find_data_start(raw_rows)
                if header_idx is None:
                    continue
                col_map = self._detect_columns_from_data(raw_rows, header_idx)
            else:
                col_map = _detect_columns([str(c) if c is not None else None for c in raw_rows[header_idx]])

            if not col_map:
                continue

            for idx in range(header_idx + 1, len(raw_rows)):
                cells = list(raw_rows[idx])
                row = self._parse_row(idx + 1, cells, col_map)
                if row.container_number or row.parse_error:
                    rows_out.append(row)

            break  # Use first sheet with data

        wb.close()
        return rows_out

    def _find_header_row(self, rows: list[tuple]) -> int | None:
        """Find the first row that looks like a header."""
        for idx, row in enumerate(rows[:10]):  # Check first 10 rows
            text_cells = [str(c).strip().lower() for c in row if c is not None]
            text = " ".join(text_cells)
            # Check for multiple header patterns
            matches = 0
            for patterns in _HEADER_PATTERNS.values():
                for pat in patterns:
                    if pat in text:
                        matches += 1
                        break
            if matches >= 2:
                return idx
        return None

    def _find_data_start(self, rows: list[tuple]) -> int | None:
        """Find the first row containing a container number."""
        for idx, row in enumerate(rows):
            if any(looks_like_container(c) for c in row):
                return idx
        return None

    def _detect_columns_from_data(self, rows: list[tuple], start_idx: int) -> dict[str, int]:
        """Infer column roles from data when no header is found."""
        if start_idx >= len(rows):
            return {}
        col_map: dict[str, int] = {}
        row = list(rows[start_idx])
        for idx, cell in enumerate(row):
            if looks_like_container(cell) and "container" not in col_map:
                col_map["container"] = idx
            elif isinstance(cell, (date, datetime)) and "date" not in col_map:
                col_map["date"] = idx
        return col_map

    def _parse_row(self, row_num: int, cells: list[Any], col_map: dict[str, int]) -> ImportRow:
        """Parse a single row into an ImportRow."""
        def _get(role: str) -> Any:
            idx = col_map.get(role)
            return cells[idx] if idx is not None and idx < len(cells) else None

        container_raw = _get("container")
        container_number = None
        if container_raw is not None:
            match = CONTAINER_RE.search(str(container_raw).upper().replace(" ", ""))
            if match:
                container_number = match.group(0)

        if container_number is None and _get("container") is not None:
            # Not a valid container format
            return ImportRow(
                row_number=row_num,
                parse_error=f"Số container không hợp lệ: {_get('container')}",
            )

        if container_number is None:
            return ImportRow(
                row_number=row_num,
                parse_error="Không tìm thấy số container",
            )

        # Normalize container number
        container_number = normalize_container_number(container_number) or container_number

        trip_date = parse_date(_get("date"))
        client_name = str(_get("client")).strip() if _get("client") is not None else None
        pickup = str(_get("pickup")).strip() if _get("pickup") is not None else None
        dropoff = str(_get("dropoff")).strip() if _get("dropoff") is not None else None
        amount = _parse_amount(_get("amount"))
        work_type_raw = _get("work_type")
        work_type = str(work_type_raw).strip().upper() if work_type_raw is not None else None
        notes = str(_get("notes")).strip() if _get("notes") is not None else None

        # Validate work_type
        valid_work_types = {"E20", "E40", "F20", "F40"}
        if work_type and work_type not in valid_work_types:
            # Try to infer from container number prefix or size hints
            work_type = None  # Will default to E20

        return ImportRow(
            row_number=row_num,
            container_number=container_number,
            trip_date=trip_date,
            client_name=client_name,
            pickup_location=pickup,
            dropoff_location=dropoff,
            amount=amount,
            work_type=work_type or "E20",
            notes=notes,
        )

    # -----------------------------------------------------------------------
    # Resolution helpers
    # -----------------------------------------------------------------------

    async def _resolve_client_from_rows(self, rows: list[ImportRow]) -> int | None:
        """Try to resolve client_id from row data."""
        names = {r.client_name for r in rows if r.client_name}
        if not names:
            return None
        # Try to find matching partner
        for name in names:
            partner = (
                await self.session.execute(
                    select(Partner).where(
                        Partner.name.ilike(f"%{name}%"),
                        Partner.partner_type == "client",
                    )
                )
            ).scalar_one_or_none()
            if partner:
                return partner.id
        return None

    async def _resolve_locations_for_rows(self, rows: list[ImportRow]) -> None:
        """Resolve pickup/dropoff location names to IDs. Sets location_id on rows.

        We store the resolved location IDs on the rows as a side effect
        using a dict attribute.
        """
        # Collect all unique location names
        location_names: set[str] = set()
        for r in rows:
            if r.pickup_location:
                location_names.add(r.pickup_location)
            if r.dropoff_location:
                location_names.add(r.dropoff_location)

        if not location_names:
            return

        # Load existing locations and aliases for matching
        locations = (await self.session.execute(select(Location))).scalars().all()
        aliases = (await self.session.execute(
            select(LocationAlias).where(LocationAlias.status == "CONFIRMED")
        )).scalars().all()

        # Build lookup: normalized_name → location_id
        name_to_id: dict[str, int] = {}
        for loc in locations:
            name_to_id[loc.name.strip().lower()] = loc.id
        for alias in aliases:
            name_to_id[alias.alias_normalized.strip().lower()] = alias.location_id

        # Try to match each location name
        resolved: dict[str, int | None] = {}
        for name in location_names:
            key = name.strip().lower()
            if key in name_to_id:
                resolved[name] = name_to_id[key]
            else:
                # Fuzzy: check if any existing location name is contained
                found = None
                for loc in locations:
                    if key in loc.name.lower() or loc.name.lower() in key:
                        found = loc.id
                        break
                resolved[name] = found

        # Store on rows (use a _resolved dict hack)
        for r in rows:
            r._pickup_location_id = resolved.get(r.pickup_location or "", None)  # type: ignore[attr-defined]
            r._dropoff_location_id = resolved.get(r.dropoff_location or "", None)  # type: ignore[attr-defined]

    async def _create_work_order(
        self, row: ImportRow, client_id: int, user_id: int | None,
    ) -> int:
        """Create a WorkOrder + WorkOrderContainer from an ImportRow."""
        pickup_id = getattr(row, "_pickup_location_id", None)
        dropoff_id = getattr(row, "_dropoff_location_id", None)

        if not pickup_id or not dropoff_id:
            raise ValueError(
                f"Không tìm thấy điểm {'lấy' if not pickup_id else 'trả'} "
                f"'{row.pickup_location if not pickup_id else row.dropoff_location}' "
                f"trong hệ thống"
            )

        # Generate code
        wo_count = (
            await self.session.execute(
                select(func.count()).select_from(WorkOrder)
            )
        ).scalar() or 0
        code = f"PLV{wo_count + 1:06d}"

        wo = WorkOrder(
            client_id=client_id,
            code=code,
            pickup_location_id=pickup_id,
            dropoff_location_id=dropoff_id,
            driver_id=None,  # Will be assigned later
            trip_date=row.trip_date,
            status="PENDING",
            vessel=row.notes if row.notes and ("tau" in row.notes.lower() or "tàu" in row.notes.lower()) else None,
        )
        self.session.add(wo)
        await self.session.flush()

        container = WorkOrderContainer(
            work_order_id=wo.id,
            container_number=row.container_number or "",
            work_type=row.work_type or "E20",
        )
        self.session.add(container)
        await self.session.flush()

        return int(wo.id)  # type: ignore[arg-type]

    # -----------------------------------------------------------------------
    # Auto-matching
    # -----------------------------------------------------------------------

    async def _auto_match(
        self, wo_ids: list[int], user_id: int,
    ) -> tuple[int, int, int]:
        """Match newly created WOs against existing unmatched TripOrders.

        Returns (matched, warnings, unmatched) counts.
        Uses the same scoring logic as match_suggester.
        """
        if not wo_ids:
            return 0, 0, 0

        from app.contexts.operations.infrastructure.match_suggester import (
            FULL_MATCH_THRESHOLD,
            WEIGHTS,
            _load_alias_groups,
            _locations_match,
        )
        from app.utils.fuzzy import fuzzy_match_container

        # Load created WOs with their containers
        wos = (await self.session.execute(
            select(WorkOrder).where(WorkOrder.id.in_(wo_ids))
        )).scalars().all()

        wo_container_map: dict[int, list[str]] = {}
        wo_cont_rows = (await self.session.execute(
            select(WorkOrderContainer.work_order_id, WorkOrderContainer.container_number)
            .where(WorkOrderContainer.work_order_id.in_(wo_ids))
        )).all()
        for wo_id, cn in wo_cont_rows:
            wo_container_map.setdefault(wo_id, []).append(
                normalize_container_number(cn) if cn else ""
            )

        # Get all active reconciliation links (already matched WOs)
        already_linked = set(
            r[0] for r in (await self.session.execute(
                select(Reconciliation.work_order_id).where(
                    Reconciliation.is_active == True  # noqa: E712
                )
            )).all()
        )

        # Load alias groups for location matching
        alias_groups = await _load_alias_groups(self.session)

        matched = 0
        warnings = 0
        unmatched = 0

        for wo in wos:
            if wo.id in already_linked:
                unmatched += 1
                continue

            wo_cn_set = set(wo_container_map.get(wo.id, []))
            if not wo_cn_set:
                unmatched += 1
                continue

            wo_date = wo.trip_date or (wo.created_at.date() if wo.created_at else None)

            # Find candidate TripOrders
            container_subquery = (
                select(TripOrderContainer.trip_order_id)
                .where(TripOrderContainer.container_number.in_(wo_cn_set))
            )
            candidates = list((await self.session.execute(
                select(TripOrder).where(
                    TripOrder.status.in_(["PENDING", "MATCHED"]),
                    or_(
                        TripOrder.client_id == wo.client_id,
                        TripOrder.id.in_(container_subquery),
                    ),
                )
            )).scalars().all())

            if not candidates:
                unmatched += 1
                continue

            # Load TO containers and link counts
            to_ids = [t.id for t in candidates]
            to_cont_rows = (await self.session.execute(
                select(TripOrderContainer)
                .where(TripOrderContainer.trip_order_id.in_(to_ids))
            )).scalars().all()
            to_containers: dict[int, list[TripOrderContainer]] = defaultdict(list)
            for c in to_cont_rows:
                to_containers[c.trip_order_id].append(c)

            # Count active links per TO
            link_counts: dict[int, int] = {}
            if to_ids:
                link_rows = (await self.session.execute(
                    select(Reconciliation.trip_order_id, func.count())
                    .where(
                        Reconciliation.trip_order_id.in_(to_ids),
                        Reconciliation.is_active == True,  # noqa: E712
                    ).group_by(Reconciliation.trip_order_id)
                )).all()
                link_counts = {r[0]: r[1] for r in link_rows}

            # Score each candidate TO
            best_to: TripOrder | None = None
            best_score = 0.0
            best_container_id: int | None = None

            for to in candidates:
                all_to_conts = to_containers.get(to.id, [])
                if link_counts.get(to.id, 0) >= len(all_to_conts):
                    continue  # TO at full capacity

                # Find available containers (not yet linked)
                used_ids = await self._used_container_ids(to.id, all_to_conts, link_counts.get(to.id, 0))
                available = [c for c in all_to_conts if c.id not in used_ids]
                if not available:
                    continue

                for cont in available:
                    score = self._score_match(
                        wo, wo_cn_set, wo_date, to, cont, alias_groups,
                    )
                    if score > best_score:
                        best_score = score
                        best_to = to
                        best_container_id = cont.id

            if best_to and best_score >= FULL_MATCH_THRESHOLD:
                # Auto-match
                await self._create_match(wo, best_to, best_score, user_id)
                if best_score < 1.0:
                    warnings += 1
                matched += 1
            else:
                unmatched += 1

        return matched, warnings, unmatched

    async def _used_container_ids(
        self, to_id: int, to_conts: list[TripOrderContainer], link_count: int,
    ) -> set[int]:
        """Get IDs of TO containers already used by active reconciliations."""
        recons = (await self.session.execute(
            select(Reconciliation.work_order_id).where(
                Reconciliation.trip_order_id == to_id,
                Reconciliation.is_active == True,  # noqa: E712
            )
        )).all()

        if not recons:
            return set()

        wo_ids = [r[0] for r in recons]
        wo_conts = (await self.session.execute(
            select(WorkOrderContainer)
            .where(WorkOrderContainer.work_order_id.in_(wo_ids))
        )).scalars().all()

        used: set[int] = set()
        for wo_c in wo_conts:
            wo_cn = normalize_container_number(wo_c.container_number) if wo_c.container_number else None
            if wo_cn:
                for to_c in to_conts:
                    if to_c.id in used:
                        continue
                    to_cn = normalize_container_number(to_c.container_number) if to_c.container_number else None
                    if to_cn == wo_cn:
                        used.add(to_c.id)
                        break

        return used

    def _score_match(
        self,
        wo: WorkOrder,
        wo_cn_set: set[str],
        wo_date: date | None,
        to: TripOrder,
        to_cont: TripOrderContainer,
        alias_groups: dict[int, set[int]],
    ) -> float:
        """Score a (WO, TO container) match. Same logic as match_suggester."""
        score = 0.0

        # Container
        to_cn = normalize_container_number(to_cont.container_number) if to_cont.container_number else None
        if to_cn and to_cn in wo_cn_set:
            score += WEIGHTS["container_number"]
        else:
            # Fuzzy check
            from app.utils.fuzzy import fuzzy_match_container
            if to_cn:
                for wo_cn in wo_cn_set:
                    is_match, is_fuzzy = fuzzy_match_container(to_cn, wo_cn, threshold=1)
                    if is_match and is_fuzzy:
                        score += WEIGHTS["container_number"] * 0.8
                        break

        # Date
        if wo_date and to.trip_date == wo_date:
            score += WEIGHTS["date"]

        # Pickup location
        if _locations_match(wo.pickup_location_id, to.pickup_location_id, alias_groups):
            score += WEIGHTS["pickup_location"]

        # Dropoff location
        if _locations_match(wo.dropoff_location_id, to.dropoff_location_id, alias_groups):
            score += WEIGHTS["dropoff_location"]

        # Client
        if wo.client_id == to.client_id:
            score += WEIGHTS["client"]

        return score

    async def _create_match(
        self, wo: WorkOrder, to: TripOrder, score: float, user_id: int,
    ) -> None:
        """Create a reconciliation link between WO and TO."""
        from app.contexts.operations.domain.value_objects import WorkOrderStatus, TripOrderStatus

        # Update WO status and pricing
        wo.status = WorkOrderStatus.MATCHED.value
        wo.is_locked = True
        wo.apply_pricing_snapshot(
            unit_price=to.unit_price,
            driver_salary=to.driver_salary,
            allowance=to.allowance,
            pricing_id=to.pricing_id,
        )

        # Update TO status
        if to.status == TripOrderStatus.PENDING.value:
            to.status = TripOrderStatus.MATCHED.value
        to.is_locked = True

        # Create reconciliation link
        recon = Reconciliation(
            trip_order_id=to.id,
            work_order_id=wo.id,
            match_score=score,
            matched_by=user_id,
            is_active=True,
        )
        self.session.add(recon)
        await self.session.flush()
