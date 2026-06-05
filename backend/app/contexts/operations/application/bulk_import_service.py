"""Bulk import delivered trips from Excel.

Parses an Excel file (.xlsx) with flexible column detection, creates
DeliveredTrip rows with flat container fields.
"""

from __future__ import annotations

import io
import logging
from dataclasses import dataclass, field  # noqa: F401 — dataclass still used for BulkImportResult
from datetime import date, datetime
from typing import Any

import openpyxl
from sqlalchemy import select
from app.core.vi_search import vi_ilike as _vi_ilike
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import (
    Location,
    LocationAlias,
    Client,
    DeliveredTrip,
)
from app.utils.excel_utils import (
    CONTAINER_RE,
    looks_like_container,
    parse_amount,
    parse_date,
)

from app.utils.iso6346 import normalize_container_number

from app.contexts.operations.application.bulk_import_types import ImportRow

_logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Column detection
# ---------------------------------------------------------------------------

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
class BulkImportResult:
    """Result of the bulk import operation."""
    total_rows: int
    created: int
    warnings: int
    errors: list[str] = field(default_factory=list)
    details: list[dict] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class BulkImportService:
    """Parse Excel file and create DeliveredTrips."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def import_and_match(
        self,
        content: bytes,
        filename: str,
        client_id: int | None = None,
        user_id: int | None = None,
    ) -> BulkImportResult:
        """Main entry: parse → create trips → return summary."""
        rows = self._parse_excel(content, filename)
        if not rows:
            return BulkImportResult(
                total_rows=0, created=0, warnings=0,
                errors=["Không tìm thấy dữ liệu hợp lệ trong file"],
            )

        valid_rows = [r for r in rows if r.parse_error is None]
        error_rows = [r for r in rows if r.parse_error is not None]

        if not valid_rows:
            return BulkImportResult(
                total_rows=len(rows), created=0, warnings=0,
                errors=[r.parse_error for r in error_rows if r.parse_error] or ["Không có dòng hợp lệ"],
            )

        # Resolve client_id from file if not provided
        resolved_client_id = client_id
        if resolved_client_id is None:
            resolved_client_id = await self._resolve_client_from_rows(valid_rows)

        if resolved_client_id is None:
            return BulkImportResult(
                total_rows=len(rows), created=0, warnings=0,
                errors=["Không xác định được khách hàng. Vui lòng chọn khách hàng hoặc thêm cột 'khách' trong file."],
            )

        # Resolve locations for all rows
        await self._resolve_locations_for_rows(valid_rows)

        # Create DeliveredTrips
        created_ids: list[int] = []
        create_errors: list[str] = []
        details: list[dict] = []

        for row in valid_rows:
            try:
                trip_id = await self._create_delivered_trip(row, resolved_client_id)
                created_ids.append(trip_id)
                details.append({
                    "row": row.row_number,
                    "container": row.container_number,
                    "delivered_trip_id": trip_id,
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

        await self.session.commit()

        all_errors = [r.parse_error for r in error_rows if r.parse_error] + create_errors
        return BulkImportResult(
            total_rows=len(rows),
            created=len(created_ids),
            warnings=0,
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

        from app.utils.excel_utils import flatten_complex_sheet

        for sheet in wb.worksheets:
            raw_rows = list(sheet.iter_rows(values_only=True))
            if not raw_rows:
                continue

            # Flatten side-by-side tables if any
            raw_rows = flatten_complex_sheet(raw_rows)

            # Try to detect header row
            header_idx = self._find_header_row(raw_rows)
            if header_idx is None:
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

            # Do not break; process all sheets in case data is split

        wb.close()
        return rows_out

    def _find_header_row(self, rows: list[tuple]) -> int | None:
        for idx, row in enumerate(rows[:10]):
            text_cells = [str(c).strip().lower() for c in row if c is not None]
            text = " ".join(text_cells)
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
        for idx, row in enumerate(rows):
            if any(looks_like_container(c) for c in row):
                return idx
        return None

    def _detect_columns_from_data(self, rows: list[tuple], start_idx: int) -> dict[str, int]:
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
        def _get(role: str) -> Any:
            idx = col_map.get(role)
            return cells[idx] if idx is not None and idx < len(cells) else None

        container_raw = _get("container")
        container_number = None
        if container_raw is not None:
            raw_str = str(container_raw).strip()
            if raw_str:
                match = CONTAINER_RE.search(raw_str.upper().replace(" ", ""))
                if match:
                    container_number = match.group(0)
                else:
                    container_number = raw_str

        if container_number is None:
            return ImportRow(
                row_number=row_num,
                parse_error="Không tìm thấy số container",
            )

        container_number = normalize_container_number(container_number) or container_number

        trip_date = parse_date(_get("date"))
        client_name = str(_get("client")).strip() if _get("client") is not None else None
        pickup = str(_get("pickup")).strip() if _get("pickup") is not None else None
        dropoff = str(_get("dropoff")).strip() if _get("dropoff") is not None else None
        amount = _parse_amount(_get("amount"))
        cont_type_raw = _get("work_type")  # header says "work_type" but it's really container type
        cont_type = str(cont_type_raw).strip().upper() if cont_type_raw is not None else None
        notes = str(_get("notes")).strip() if _get("notes") is not None else None

        valid_cont_types = {"E20", "E40", "F20", "F40"}
        if cont_type and cont_type not in valid_cont_types:
            cont_type = None

        return ImportRow(
            row_number=row_num,
            container_number=container_number,
            trip_date=trip_date,
            client_name=client_name,
            pickup_location=pickup,
            dropoff_location=dropoff,
            amount=amount,
            cont_type=cont_type or "E20",
            notes=notes,
        )

    # -----------------------------------------------------------------------
    # Resolution helpers
    # -----------------------------------------------------------------------

    async def _resolve_client_from_rows(self, rows: list[ImportRow]) -> int | None:
        names = {r.client_name for r in rows if r.client_name}
        if not names:
            return None
        for name in names:
            partner = (
                await self.session.execute(
                    select(Client).where(_vi_ilike(Client.name, name))
                )
            ).scalar_one_or_none()
            if partner:
                return partner.id
        return None

    async def _resolve_locations_for_rows(self, rows: list[ImportRow]) -> None:
        location_names: set[str] = set()
        for r in rows:
            if r.pickup_location:
                location_names.add(r.pickup_location)
            if r.dropoff_location:
                location_names.add(r.dropoff_location)

        if not location_names:
            return

        locations = (await self.session.execute(select(Location))).scalars().all()
        aliases = (await self.session.execute(select(LocationAlias))).scalars().all()

        name_to_id: dict[str, int] = {}
        for loc in locations:
            name_to_id[loc.name.strip().lower()] = loc.id
        for alias in aliases:
            name_to_id[alias.alias_normalized.strip().lower()] = alias.location_id

        resolved: dict[str, int | None] = {}
        for name in location_names:
            key = name.strip().lower()
            if key in name_to_id:
                resolved[name] = name_to_id[key]
            else:
                found = None
                for loc in locations:
                    if key in loc.name.lower() or loc.name.lower() in key:
                        found = loc.id
                        break
                resolved[name] = found

        for r in rows:
            r._pickup_location_id = resolved.get(r.pickup_location or "", None)  # type: ignore[attr-defined]
            r._dropoff_location_id = resolved.get(r.dropoff_location or "", None)  # type: ignore[attr-defined]

    async def _create_delivered_trip(
        self, row: ImportRow, client_id: int,
    ) -> int:
        """Create a DeliveredTrip from an ImportRow."""
        pickup_id = getattr(row, "_pickup_location_id", None)
        dropoff_id = getattr(row, "_dropoff_location_id", None)

        if not pickup_id or not dropoff_id:
            raise ValueError(
                f"Không tìm thấy điểm {'lấy' if not pickup_id else 'trả'} "
                f"'{row.pickup_location if not pickup_id else row.dropoff_location}' "
                f"trong hệ thống"
            )

        wo = DeliveredTrip(
            client_id=client_id,
            pickup_location_id=pickup_id,
            dropoff_location_id=dropoff_id,
            driver_id=None,
            work_type="CHUYỂN BÃI",
            cont_number=row.container_number,
            cont_type=row.cont_type or "E20",
            trip_date=row.trip_date,
            vessel=row.notes if row.notes and ("tau" in row.notes.lower() or "tàu" in row.notes.lower()) else None,
        )
        self.session.add(wo)
        await self.session.flush()

        return int(wo.id)  # type: ignore[arg-type]
