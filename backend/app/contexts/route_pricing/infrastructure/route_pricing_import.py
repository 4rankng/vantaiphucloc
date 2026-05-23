"""Excel import for Route Pricing (Cước tuyến).

Scans any sheet for a header row containing CHỦ HÀNG, ĐIỂM ĐI, ĐIỂM ĐẾN,
at least one price column (F20/F40/E20/E40), and optionally TÁC NGHIỆP.
Returns parsed rows ready for client/location matching.
"""
from __future__ import annotations

import re
from io import BytesIO
from typing import Any, Sequence

import openpyxl
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.customer_pricing.infrastructure.location_resolver import (
    LocationResolverService,
)
from app.contexts.route_pricing.domain.value_objects import VALID_OPERATION_TYPES
from app.models.domain import Client
from app.models.domain import RoutePricing as RoutePricingORM


def _find_header_row(rows: list[list], max_scan: int = 10) -> int | None:
    required = {"chủ hàng", "điểm đi", "điểm đến"}
    price_cols = {"f20", "f40", "e20", "e40"}
    for idx, row in enumerate(rows[:max_scan]):
        cells = {str(c).strip().lower() if c is not None else "" for c in row}
        if required.issubset(cells) and cells & price_cols:
            return idx
    return None


def _col_index(header_row: list, name: str) -> int | None:
    normalised = name.lower()
    for i, cell in enumerate(header_row):
        if cell is not None and str(cell).strip().lower() == normalised:
            return i
    return None


def _is_aggregate_row(row: Sequence) -> bool:
    for c in row:
        if isinstance(c, str):
            upper = c.upper().strip()
            if any(tok in upper for tok in ("TỔNG", "CỘNG", "TOTAL", "SUM")):
                return True
    return False


def _parse_int_price(val: Any) -> int | None:
    if val is None or (isinstance(val, str) and val.strip() == ""):
        return None
    if isinstance(val, (int, float)) and val > 0:
        return int(round(float(val)))
    try:
        v = float(val)
        return int(round(v)) if v > 0 else None
    except (ValueError, TypeError):
        return None


def _normalize_operation_type(raw: str) -> str | None:
    cleaned = raw.strip().upper()
    cleaned = re.sub(r"\s*/\s*", "/", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    for valid in VALID_OPERATION_TYPES:
        if cleaned == valid:
            return valid
    return None


def parse_route_pricing_bytes(content: bytes) -> dict:
    wb = openpyxl.load_workbook(BytesIO(content), data_only=True)
    warnings: list[str] = []

    for ws in wb.worksheets:
        all_rows = list(ws.iter_rows(values_only=True))
        header_idx = _find_header_row(all_rows)
        if header_idx is None:
            continue

        header = list(all_rows[header_idx])
        col = {}
        for cell in header:
            idx = _col_index(header, str(cell)) if cell is not None else None
            if idx is not None:
                col[str(cell).strip().lower()] = idx

        parsed: list[dict] = []
        has_op = 0
        missing_op = 0

        for ridx in range(header_idx + 1, len(all_rows)):
            row = all_rows[ridx]

            if all(c is None or str(c).strip() == "" for c in row):
                continue
            if _is_aggregate_row(row):
                continue

            client_raw = str(row[col["chủ hàng"]] or "").strip() if "chủ hàng" in col else ""
            pickup_raw = str(row[col["điểm đi"]] or "").strip() if "điểm đi" in col else ""
            dropoff_raw = str(row[col["điểm đến"]] or "").strip() if "điểm đến" in col else ""

            if not client_raw or not pickup_raw:
                continue

            op_raw = str(row[col["tác nghiệp"]] or "").strip() if "tác nghiệp" in col else ""
            operation_type = _normalize_operation_type(op_raw) if op_raw else None

            if op_raw:
                if operation_type:
                    has_op += 1
                else:
                    missing_op += 1

            parsed.append({
                "client_raw": client_raw,
                "pickup_raw": pickup_raw,
                "dropoff_raw": dropoff_raw,
                "operation_type": operation_type,
                "f20_price": _parse_int_price(row[col["f20"]] if "f20" in col else None),
                "f40_price": _parse_int_price(row[col["f40"]] if "f40" in col else None),
                "e20_price": _parse_int_price(row[col["e20"]] if "e20" in col else None),
                "e40_price": _parse_int_price(row[col["e40"]] if "e40" in col else None),
                "row_index": ridx,
            })

        wb.close()
        return {
            "sheet_name": ws.title,
            "rows": parsed,
            "warnings": warnings,
            "stats": {
                "total": len(parsed),
                "has_operation_type": has_op,
                "missing_operation_type": missing_op,
            },
        }

    wb.close()
    return {
        "sheet_name": "",
        "rows": [],
        "warnings": ["Không tìm thấy sheet chứa bảng cước tuyến. Cần có cột: CHỦ HÀNG, ĐIỂM ĐI, ĐIỂM ĐẾN, và ít nhất 1 cột giá (F20/F40/E20/E40)."],
        "stats": {"total": 0, "has_operation_type": 0, "missing_operation_type": 0},
    }


async def preview_with_matching(db: AsyncSession, content: bytes) -> dict:
    parsed = parse_route_pricing_bytes(content)
    if not parsed["rows"]:
        return parsed

    all_clients = list((await db.execute(
        select(Client).where(Client.is_active.is_(True))
    )).scalars().all())

    client_by_code: dict[str, Client] = {}
    client_by_name: dict[str, Client] = {}
    for c in all_clients:
        if c.code:
            client_by_code[c.code.strip().lower()] = c
        client_by_name[c.name.strip().lower()] = c

    resolver = LocationResolverService(db)

    unique_locations: set[str] = set()
    for r in parsed["rows"]:
        if r["pickup_raw"]:
            unique_locations.add(r["pickup_raw"])
        if r["dropoff_raw"]:
            unique_locations.add(r["dropoff_raw"])

    location_cache: dict[str, int | None] = {}
    for loc_name in unique_locations:
        result = await resolver.find_match(loc_name)
        location_cache[loc_name] = result.location.id if result.location else None

    matched_count = 0
    unmatched_client_count = 0
    unmatched_location_count = 0

    for r in parsed["rows"]:
        raw_upper = r["client_raw"].strip().lower()
        client = client_by_code.get(raw_upper)
        if client is None:
            for name_upper, c in client_by_name.items():
                if raw_upper in name_upper or name_upper in raw_upper:
                    client = c
                    break

        r["client_id"] = client.id if client else None
        r["client_matched"] = client is not None
        if client is None:
            unmatched_client_count += 1

        pickup_id = location_cache.get(r["pickup_raw"])
        dropoff_id = location_cache.get(r["dropoff_raw"]) if r["dropoff_raw"] else None

        r["pickup_location_id"] = pickup_id
        r["pickup_matched"] = pickup_id is not None
        if pickup_id is None:
            unmatched_location_count += 1

        r["dropoff_location_id"] = dropoff_id
        r["dropoff_matched"] = dropoff_id is not None
        if r["dropoff_raw"] and dropoff_id is None:
            unmatched_location_count += 1

        r["can_commit"] = (
            client is not None
            and pickup_id is not None
            and dropoff_id is not None
            and r["operation_type"] is not None
        )
        if r["can_commit"]:
            matched_count += 1

    parsed["stats"]["matched"] = matched_count
    parsed["stats"]["unmatched_client"] = unmatched_client_count
    parsed["stats"]["unmatched_location"] = unmatched_location_count
    return parsed


async def commit_import_rows(db: AsyncSession, rows: list[dict]) -> dict:
    created = 0
    updated = 0
    skipped = 0

    for r in rows:
        if not all(r.get(k) for k in ("client_id", "pickup_location_id", "dropoff_location_id")):
            skipped += 1
            continue
        if not r.get("operation_type"):
            skipped += 1
            continue

        existing = (await db.execute(
            select(RoutePricingORM).where(
                RoutePricingORM.client_id == r["client_id"],
                RoutePricingORM.pickup_location_id == r["pickup_location_id"],
                RoutePricingORM.dropoff_location_id == r["dropoff_location_id"],
                RoutePricingORM.operation_type == r["operation_type"],
                RoutePricingORM.is_active.is_(True),
            )
        )).scalar_one_or_none()

        if existing:
            changed = False
            for col in ("f20_price", "f40_price", "e20_price", "e40_price"):
                new_val = r.get(col)
                if new_val is not None and getattr(existing, col) != new_val:
                    setattr(existing, col, new_val)
                    changed = True
            updated += 1 if changed else 0
            skipped += 1 if not changed else 0
        else:
            db.add(RoutePricingORM(
                client_id=r["client_id"],
                pickup_location_id=r["pickup_location_id"],
                dropoff_location_id=r["dropoff_location_id"],
                operation_type=r["operation_type"],
                f20_price=r.get("f20_price"),
                f40_price=r.get("f40_price"),
                e20_price=r.get("e20_price"),
                e40_price=r.get("e40_price"),
                is_active=True,
            ))
            created += 1

    await db.commit()
    return {"created": created, "updated": updated, "skipped": skipped}
