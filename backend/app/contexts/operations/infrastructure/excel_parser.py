from __future__ import annotations

import io
import logging
from datetime import date, datetime
from typing import Any

import openpyxl

from app.contexts.operations.application.bulk_import_types import ImportRow
from app.utils.excel_utils import (
    CONTAINER_RE,
    looks_like_container,
    parse_amount,
    parse_date,
)
from app.utils.iso6346 import normalize_container_number

_logger = logging.getLogger(__name__)

_HEADER_PATTERNS: dict[str, list[str]] = {
    "container": ["container", "cont", "số cont", "so cont", "số container", "container no", "công container", "số côn"],
    "date": ["ngày", "date", "ngày đi", "trip date", "ngày chạy", "ngày vận chuyển", "ngày thực hiện"],
    "client": ["khách", "customer", "client", "khách hàng", "tên khách", "customer name", "đối tác", "partner"],
    "pickup": ["điểm lấy", "pickup", "lấy hàng", "nơi lấy", "đi từ", "from", "điểm đi", "nơi đi", "lấy"],
    "dropoff": ["điểm trả", "dropoff", "trả hàng", "nơi trả", "đến", "to", "điểm đến", "nơi đến", "trả"],
    "amount": ["tiền", "amount", "cước", "giá", "đơn giá", "unit price", "cước phí", "thành tiền", "tổng tiền", "price"],
    "work_type": ["loại", "work type", "type", "loại cont", "loại container", "size"],
    "notes": ["ghi chú", "note", "notes", "remark", "remarks", "mô tả", "description"],
    "vehicle_plate": ["biển số", "biển số xe", "xe", "vehicle", "plate", "bsx", "bien so", "bien so xe", "số xe"],
}


def _parse_amount(raw: Any) -> int | None:
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        v = int(raw)
        return v if v > 0 else None
    return parse_amount(raw)


def _detect_columns(headers: list[str | None]) -> dict[str, int]:
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


class ExcelParser:
    def parse(self, content: bytes, filename: str) -> list[ImportRow]:
        return self._parse_excel(content, filename)

    def _parse_excel(self, content: bytes, filename: str) -> list[ImportRow]:
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True, read_only=True)
        rows_out: list[ImportRow] = []

        for sheet in wb.worksheets:
            raw_rows = list(sheet.iter_rows(values_only=True))
            if not raw_rows:
                continue

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

            break

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
        cont_type_raw = _get("work_type")
        cont_type = str(cont_type_raw).strip().upper() if cont_type_raw is not None else None
        notes = str(_get("notes")).strip() if _get("notes") is not None else None
        vehicle_plate_raw = _get("vehicle_plate")
        vehicle_plate = str(vehicle_plate_raw).strip() if vehicle_plate_raw is not None else None

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
            vehicle_plate=vehicle_plate,
        )
