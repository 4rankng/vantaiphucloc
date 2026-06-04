"""Excel import for Vendor Route Pricing (Cước trả xe ngoài).

Scans any sheet for a header row containing NHÀ THẦU, ĐIỂM ĐI, ĐIỂM ĐẾN,
at least one price column (F20/F40/E20/E40), and optionally TÁC NGHIỆP.
Returns parsed rows ready for vendor/location matching.
"""
from __future__ import annotations

import re
from io import BytesIO
from typing import Any, Sequence

import openpyxl
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.customer_pricing.infrastructure.location_resolver import (
    LocationResolverService,
    ResolverSource,
)
from app.contexts.route_pricing.domain.value_objects import get_valid_work_types
from app.models.domain import Vendor
from app.models.domain import VendorRoutePricing as VendorRoutePricingORM


_VENDOR_HEADER_NAMES = {
    "nhà thầu", "nha thau", "nhà xe", "nha xe",
    "nhà xe ngoài", "nha xe ngoai", "nhà thầu/nhà xe",
    "nhà vận chuyển", "nha van chuyen", "vendor", "nhà tc",
}
_LOCATION_PICKUP_NAMES = {"điểm đi", "diem di", "đi", "nơi đi", "noi di", "from", "bến đi", "ben di"}
_LOCATION_DROPOFF_NAMES = {"điểm đến", "diem den", "đến", "nơi đến", "noi den", "to", "bến đến", "ben den"}
_PRICE_COLS = {"f20", "f40", "e20", "e40", "20ft", "40ft", "cont 20", "cont 40"}


def _find_header_row(rows: list[list], max_scan: int = 10) -> int | None:
    for idx, row in enumerate(rows[:max_scan]):
        cells = {str(c).strip().lower() if c is not None else "" for c in row}
        has_vendor = bool(cells & _VENDOR_HEADER_NAMES)
        has_pickup = bool(cells & _LOCATION_PICKUP_NAMES)
        has_dropoff = bool(cells & _LOCATION_DROPOFF_NAMES)
        if has_vendor and has_pickup and has_dropoff and cells & _PRICE_COLS:
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


def _normalize_work_type(raw: str) -> str | None:
    cleaned = raw.strip().upper()
    cleaned = re.sub(r"\s*/\s*", "/", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    for valid in get_valid_work_types():
        if cleaned == valid:
            return valid
    return None


def _find_col(header: list, candidates: set[str]) -> int | None:
    for i, cell in enumerate(header):
        if cell is not None and str(cell).strip().lower() in candidates:
            return i
    return None


def _find_vendor_col(header: list) -> int | None:
    return _find_col(header, _VENDOR_HEADER_NAMES)


def _find_pickup_col(header: list) -> int | None:
    return _find_col(header, _LOCATION_PICKUP_NAMES)


def _find_dropoff_col(header: list) -> int | None:
    return _find_col(header, _LOCATION_DROPOFF_NAMES)


def _find_work_type_col(header: list) -> int | None:
    for name in ("tác nghiệp", "tac nghiep", "loại", "loai", "work type", "type"):
        idx = _col_index(header, name)
        if idx is not None:
            return idx
    return None


def _find_price_col(header: list, base_names: set[str]) -> int | None:
    for i, cell in enumerate(header):
        val = str(cell).strip().lower() if cell is not None else ""
        for name in base_names:
            if val == name or val.startswith(name):
                return i
    return None


def parse_vendor_route_pricing_bytes(content: bytes) -> dict:
    wb = openpyxl.load_workbook(BytesIO(content), data_only=True)
    warnings: list[str] = []

    for ws in wb.worksheets:
        all_rows = list(ws.iter_rows(values_only=True))
        header_idx = _find_header_row(all_rows)
        if header_idx is None:
            continue

        header = list(all_rows[header_idx])

        vendor_col = _find_vendor_col(header)
        if vendor_col is None:
            continue

        pickup_col = _find_pickup_col(header)
        dropoff_col = _find_dropoff_col(header)
        wt_col = _find_work_type_col(header)
        f20_col = _find_price_col(header, {"f20", "20ft", "cont 20"})
        f40_col = _find_price_col(header, {"f40", "40ft", "cont 40"})
        e20_col = _find_price_col(header, {"e20"})
        e40_col = _find_price_col(header, {"e40"})

        parsed: list[dict] = []
        has_wt = 0
        missing_wt = 0

        for ridx in range(header_idx + 1, len(all_rows)):
            row = all_rows[ridx]

            if all(c is None or str(c).strip() == "" for c in row):
                continue
            if _is_aggregate_row(row):
                continue

            vendor_raw = str(row[vendor_col] or "").strip() if vendor_col is not None else ""
            pickup_raw = str(row[pickup_col] or "").strip() if pickup_col is not None else ""
            dropoff_raw = str(row[dropoff_col] or "").strip() if dropoff_col is not None else ""

            if not vendor_raw or not pickup_raw:
                continue

            wt_raw = str(row[wt_col] or "").strip() if wt_col is not None else ""
            work_type = _normalize_work_type(wt_raw) if wt_raw else None

            if wt_raw:
                if work_type:
                    has_wt += 1
                else:
                    missing_wt += 1

            parsed.append({
                "vendor_raw": vendor_raw,
                "pickup_raw": pickup_raw,
                "dropoff_raw": dropoff_raw,
                "work_type": work_type,
                "f20_price": _parse_int_price(row[f20_col] if f20_col is not None else None),
                "f40_price": _parse_int_price(row[f40_col] if f40_col is not None else None),
                "e20_price": _parse_int_price(row[e20_col] if e20_col is not None else None),
                "e40_price": _parse_int_price(row[e40_col] if e40_col is not None else None),
                "row_index": ridx,
            })

        wb.close()
        return {
            "sheet_name": ws.title,
            "rows": parsed,
            "warnings": warnings,
            "stats": {
                "total": len(parsed),
                "has_work_type": has_wt,
                "missing_work_type": missing_wt,
            },
        }

    wb.close()
    return {
        "sheet_name": "",
        "rows": [],
        "warnings": ["Không tìm thấy sheet chứa bảng cước trả xe ngoài. Cần có cột: NHÀ THẦU, ĐIỂM ĐI, ĐIỂM ĐẾN, và ít nhất 1 cột giá (F20/F40/E20/E40)."],
        "stats": {"total": 0, "has_work_type": 0, "missing_work_type": 0},
    }


def _find_vendor(raw_lower: str, vendor_by_code: dict, vendor_by_name: dict) -> Vendor | None:
    vendor = vendor_by_code.get(raw_lower)
    if vendor is None:
        vendor = vendor_by_name.get(raw_lower)
    return vendor


async def preview_with_matching(db: AsyncSession, content: bytes) -> dict:
    parsed = parse_vendor_route_pricing_bytes(content)
    if not parsed["rows"]:
        return parsed

    all_vendors = list((await db.execute(
        select(Vendor)
    )).scalars().all())

    vendor_by_code: dict[str, Vendor] = {}
    vendor_by_name: dict[str, Vendor] = {}
    for v in all_vendors:
        if v.code:
            vendor_by_code[v.code.strip().lower()] = v
        vendor_by_name[v.name.strip().lower()] = v

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
    unmatched_vendor_count = 0
    unmatched_location_count = 0

    for r in parsed["rows"]:
        raw_lower = r["vendor_raw"].strip().lower()
        vendor = _find_vendor(raw_lower, vendor_by_code, vendor_by_name)

        r["vendor_id"] = vendor.id if vendor else None
        r["vendor_matched"] = vendor is not None
        if vendor is None:
            unmatched_vendor_count += 1

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
            r["vendor_raw"]
            and r["pickup_raw"]
            and r["dropoff_raw"]
            and r["work_type"] is not None
        )
        if r["can_commit"]:
            matched_count += 1

    parsed["stats"]["matched"] = matched_count
    parsed["stats"]["unmatched_vendor"] = unmatched_vendor_count
    parsed["stats"]["unmatched_location"] = unmatched_location_count
    return parsed


async def commit_import_rows(db: AsyncSession, rows: list[dict]) -> dict:
    created = 0
    updated = 0
    skipped = 0
    created_vendors = 0
    created_locations = 0

    resolver = LocationResolverService(db)

    all_vendors = list((await db.execute(
        select(Vendor)
    )).scalars().all())
    vendor_by_code: dict[str, Vendor] = {}
    vendor_by_name: dict[str, Vendor] = {}
    for v in all_vendors:
        if v.code:
            vendor_by_code[v.code.strip().lower()] = v
        vendor_by_name[v.name.strip().lower()] = v

    vendor_cache: dict[str, int] = {}
    location_cache: dict[str, int] = {}

    async def _find_or_create_vendor(raw: str) -> int | None:
        raw_stripped = raw.strip()
        if not raw_stripped:
            return None
        key = raw_stripped.lower()
        if key in vendor_cache:
            return vendor_cache[key]

        existing = _find_vendor(key, vendor_by_code, vendor_by_name)
        if existing:
            vendor_cache[key] = existing.id
            return existing.id

        new_vendor = Vendor(name=raw_stripped)
        db.add(new_vendor)
        try:
            async with db.begin_nested():
                await db.flush()
        except IntegrityError:
            row = (await db.execute(
                select(Vendor).where(Vendor.name == raw_stripped)
            )).scalar_one_or_none()
            if row is None:
                raise
            new_vendor = row
        else:
            nonlocal created_vendors
            created_vendors += 1
        vendor_by_name[key] = new_vendor
        vendor_cache[key] = new_vendor.id
        return new_vendor.id

    async def _resolve_location(raw: str) -> int | None:
        raw_stripped = raw.strip()
        if not raw_stripped:
            return None
        key = raw_stripped.lower()
        if key in location_cache:
            return location_cache[key]

        result = await resolver.resolve_or_create(
            raw_stripped, source=ResolverSource.IMPORT, user_id=None,
        )
        loc = result.location
        if loc is None:
            return None
        location_cache[key] = loc.id
        nonlocal created_locations
        if result.match_kind.value == "new":
            created_locations += 1
        return loc.id

    for r in rows:
        vendor_id = r.get("vendor_id")
        if not vendor_id:
            vendor_id = await _find_or_create_vendor(r.get("vendor_raw", ""))
        pickup_id = r.get("pickup_location_id")
        if not pickup_id:
            pickup_id = await _resolve_location(r.get("pickup_raw", ""))
        dropoff_id = r.get("dropoff_location_id")
        if not dropoff_id:
            dropoff_id = await _resolve_location(r.get("dropoff_raw", ""))

        if not vendor_id or not pickup_id or not dropoff_id:
            skipped += 1
            continue

        work_type = r.get("work_type")
        if not work_type:
            skipped += 1
            continue

        existing = (await db.execute(
            select(VendorRoutePricingORM).where(
                VendorRoutePricingORM.vendor_id == vendor_id,
                VendorRoutePricingORM.pickup_location_id == pickup_id,
                VendorRoutePricingORM.dropoff_location_id == dropoff_id,
                VendorRoutePricingORM.work_type == work_type,
                VendorRoutePricingORM.is_active.is_(True),
            )
        )).scalar_one_or_none()

        if existing:
            changed = False
            for schema_col, orm_col in (
                ("f20_price", "f20_price"),
                ("f40_price", "f40_price"),
                ("e20_price", "e20_price"),
                ("e40_price", "e40_price"),
            ):
                new_val = r.get(schema_col)
                if new_val is not None and getattr(existing, orm_col) != new_val:
                    setattr(existing, orm_col, new_val)
                    changed = True
            updated += 1 if changed else 0
            skipped += 1 if not changed else 0
        else:
            db.add(VendorRoutePricingORM(
                vendor_id=vendor_id,
                pickup_location_id=pickup_id,
                dropoff_location_id=dropoff_id,
                work_type=work_type,
                f20_price=r.get("f20_price"),
                f40_price=r.get("f40_price"),
                e20_price=r.get("e20_price"),
                e40_price=r.get("e40_price"),
                is_active=True,
            ))
            created += 1

    await db.commit()
    return {
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "created_vendors": created_vendors,
        "created_locations": created_locations,
    }
