# Route Pricing Excel Import — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Excel import to the Cước tuyến page so accountants can bulk-import route pricing from Excel files with auto-matched clients and locations.

**Architecture:** Backend parser scans any sheet for the expected header pattern (CHỦ HÀNG, ĐIỂM ĐI, ĐIỂM ĐẾN, price columns, TÁC NGHIỆP), auto-matches clients/locations, and returns a preview. A commit endpoint upserts on `(client_id, pickup, dropoff, operation_type)` for idempotent re-imports. Frontend adds an import dialog to the RoutePricingPage.

**Tech Stack:** Python (openpyxl, FastAPI, SQLAlchemy), React (TypeScript, TanStack Query, shadcn/ui)

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `backend/app/contexts/route_pricing/infrastructure/route_pricing_import.py` | Excel parser + auto-matching logic |
| Modify | `backend/app/contexts/route_pricing/interface/router.py` | Add import-preview + import-commit endpoints |
| Modify | `backend/app/contexts/route_pricing/interface/schemas.py` | Add import request/response schemas |
| Create | `backend/tests/test_route_pricing_import.py` | Parser tests |
| Create | `frontend/src/services/api/routePricings.api.ts` | Add preview + commit API functions |
| Create | `frontend/src/hooks/queries/route-pricings-import.ts` | React Query hooks for import |
| Modify | `frontend/src/hooks/use-queries.ts` | Export new hooks |
| Create | `frontend/src/components/route-pricing/RoutePricingImportDialog.tsx` | Import dialog component |
| Modify | `frontend/src/pages/accountant/RoutePricingPage.tsx` | Add import button + dialog |

---

### Task 1: Backend — Excel Parser

**Files:**
- Create: `backend/app/contexts/route_pricing/infrastructure/route_pricing_import.py`
- Test: `backend/tests/test_route_pricing_import.py`

- [ ] **Step 1: Create the test file with parser tests**

```python
# backend/tests/test_route_pricing_import.py
"""Tests for route pricing Excel import parser."""
from __future__ import annotations

import openpyxl
import pytest
from io import BytesIO

from app.contexts.route_pricing.infrastructure.route_pricing_import import (
    parse_route_pricing_bytes,
    _find_header_row,
    _normalize_operation_type,
)


def _make_xlsx(sheet_name: str, rows: list[list]]) -> bytes:
    """Build an in-memory xlsx with the given sheet name and rows."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = sheet_name
    for row in rows:
        ws.append(row)
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()


# ── _find_header_row ─────────────────────────────────────────────

class TestFindHeaderRow:
    def test_standard_headers(self):
        rows = [
            ["Some title"],
            ["STT", "CHỦ HÀNG", "ĐIỂM ĐI", "ĐIỂM ĐẾN", "F20", "F40", "E20", "E40", "TÁC NGHIỆP"],
            [1, "HPH", "HECHUN", "HẢI AN", 400000, 400000, None, None, "XUẤT/ NHẬP TÀU"],
        ]
        result = _find_header_row(rows)
        assert result == 1

    def test_case_insensitive(self):
        rows = [
            ["stt", "chủ hàng", "điểm đi", "điểm đến", "f20", "f40", "e20", "e40", "tác nghiệp"],
        ]
        result = _find_header_row(rows)
        assert result == 0

    def test_whitespace_tolerant(self):
        rows = [
            [" STT ", " CHỦ HÀNG ", " ĐIỂM ĐI ", " ĐIỂM ĐẾN ", " F20 ", " F40 ", " E20 ", " E40 ", " TÁC NGHIỆP "],
        ]
        result = _find_header_row(rows)
        assert result == 0

    def test_no_match_returns_none(self):
        rows = [
            ["A", "B", "C"],
        ]
        result = _find_header_row(rows)
        assert result is None

    def test_partial_headers_no_required(self):
        """Missing required columns should return None."""
        rows = [
            ["STT", "CHỦ HÀNG", "F20", "F40"],
        ]
        result = _find_header_row(rows)
        assert result is None


# ── _normalize_operation_type ────────────────────────────────────

class TestNormalizeOperationType:
    def test_exact_match(self):
        assert _normalize_operation_type("XUẤT/NHẬP TÀU") == "XUẤT/NHẬP TÀU"

    def test_case_insensitive(self):
        assert _normalize_operation_type("xuất/nhập tàu") == "XUẤT/NHẬP TÀU"

    def test_whitespace_normalization(self):
        assert _normalize_operation_type("  XUẤT / NHẬP TÀU  ") == "XUẤT/NHẬP TÀU"

    def test_chuyen_bai_variant(self):
        assert _normalize_operation_type("CHUYỂN BÃI") == "CHUYỂN BÃI"

    def test_invalid_returns_none(self):
        assert _normalize_operation_type("SOMETHING") is None


# ── parse_route_pricing_bytes ────────────────────────────────────

class TestParseRoutePricingBytes:
    def test_basic_parse(self):
        data = _make_xlsx("CƯỚC TUYẾN", [
            ["STT", "CHỦ HÀNG", "ĐIỂM ĐI", "ĐIỂM ĐẾN", "F20", "F40", "E20", "E40", "TÁC NGHIỆP"],
            [1, "HPH", "HECHUN", "HẢI AN", 400000, 400000, None, None, "XUẤT/ NHẬP TÀU"],
            [2, "VNB", "VIMC", "VIMC", 67500, 135000, 67500, 135000, "XUẤT/ NHẬP TÀU"],
        ])
        result = parse_route_pricing_bytes(data)
        assert result["sheet_name"] == "CƯỚC TUYẾN"
        assert len(result["rows"]) == 2
        r0 = result["rows"][0]
        assert r0["client_raw"] == "HPH"
        assert r0["pickup_raw"] == "HECHUN"
        assert r0["dropoff_raw"] == "HẢI AN"
        assert r0["f20_price"] == 400000
        assert r0["f40_price"] == 400000
        assert r0["e20_price"] is None
        assert r0["e40_price"] is None
        assert r0["operation_type"] == "XUẤT/NHẬP TÀU"

    def test_skips_empty_rows(self):
        data = _make_xlsx("Sheet1", [
            ["STT", "CHỦ HÀNG", "ĐIỂM ĐI", "ĐIỂM ĐẾN", "F20", "F40", "E20", "E40", "TÁC NGHIỆP"],
            [1, "HPH", "HECHUN", "HẢI AN", 400000, None, None, None, "XUẤT/ NHẬP TÀU"],
            [None, None, None, None, None, None, None, None, None],
            [3, "VNB", "VIMC", "VIMC", 67500, 135000, 67500, 135000, "XUẤT/ NHẬP TÀU"],
        ])
        result = parse_route_pricing_bytes(data)
        assert len(result["rows"]) == 2

    def test_skips_aggregate_rows(self):
        data = _make_xlsx("Sheet1", [
            ["STT", "CHỦ HÀNG", "ĐIỂM ĐI", "ĐIỂM ĐẾN", "F20", "F40", "E20", "E40", "TÁC NGHIỆP"],
            [1, "HPH", "HECHUN", "HẢI AN", 400000, None, None, None, "XUẤT/ NHẬP TÀU"],
            [None, "TỔNG CỘNG", None, None, 999999, None, None, None, None],
        ])
        result = parse_route_pricing_bytes(data)
        assert len(result["rows"]) == 1

    def test_no_matching_sheet_returns_empty(self):
        data = _make_xlsx("RandomSheet", [
            ["A", "B", "C"],
        ])
        result = parse_route_pricing_bytes(data)
        assert len(result["rows"]) == 0
        assert len(result["warnings"]) > 0

    def test_header_not_in_first_row(self):
        data = _make_xlsx("Data", [
            ["BẢNG CƯỚC TUYẾN PHÚC LỘC"],
            ["Ngày cập nhật: 2026-05-23"],
            ["STT", "CHỦ HÀNG", "ĐIỂM ĐI", "ĐIỂM ĐẾN", "F20", "F40", "E20", "E40", "TÁC NGHIỆP"],
            [1, "PAN", "PAN", "NAM ĐÌNH VŨ", 454158, 489065, 218352, 436705, "XUẤT/ NHẬP TÀU"],
        ])
        result = parse_route_pricing_bytes(data)
        assert len(result["rows"]) == 1
        assert result["rows"][0]["client_raw"] == "PAN"

    def test_multiple_sheets_picks_first_match(self):
        """When multiple sheets have matching headers, use the first one."""
        wb = openpyxl.Workbook()
        ws1 = wb.active
        ws1.title = "Other"
        ws1.append(["A", "B"])
        ws2 = wb.create_sheet("CƯỚC TUYẾN")
        ws2.append(["STT", "CHỦ HÀNG", "ĐIỂM ĐI", "ĐIỂM ĐẾN", "F20", "F40", "E20", "E40", "TÁC NGHIỆP"])
        ws2.append([1, "HPH", "HECHUN", "HẢI AN", 400000, None, None, None, "XUẤT/ NHẬP TÀU"])
        buf = BytesIO()
        wb.save(buf)
        buf.seek(0)
        result = parse_route_pricing_bytes(buf.read())
        assert result["sheet_name"] == "CƯỚC TUYẾN"
        assert len(result["rows"]) == 1

    def test_price_rounding(self):
        data = _make_xlsx("Sheet1", [
            ["STT", "CHỦ HÀNG", "ĐIỂM ĐI", "ĐIỂM ĐẾN", "F20", "F40", "E20", "E40", "TÁC NGHIỆP"],
            [1, "PAN", "PAN", "NAM ĐÌNH VŨ", 218352.5, None, None, None, "XUẤT/ NHẬP TÀU"],
        ])
        result = parse_route_pricing_bytes(data)
        assert result["rows"][0]["f20_price"] == 218353
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_route_pricing_import.py -v`
Expected: FAIL — module `route_pricing_import` does not exist

- [ ] **Step 3: Implement the parser**

```python
# backend/app/contexts/route_pricing/infrastructure/route_pricing_import.py
"""Excel import for Route Pricing (Cước tuyến).

Scans any sheet for a header row containing CHỦ HÀNG, ĐIỂM ĐI, ĐIỂM ĐẾN,
at least one price column (F20/F40/E20/E40), and TÁC NGHIỆP.
Returns parsed rows ready for client/location matching.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from io import BytesIO
from typing import Sequence

import openpyxl
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.customer_pricing.infrastructure.location_resolver import (
    LocationResolverService,
)
from app.contexts.route_pricing.domain.value_objects import VALID_OPERATION_TYPES


# ── Constants ────────────────────────────────────────────────────

_AGGREGATE_TOKENS = ("TỔNG", "TOTAL", "GHI CHU", "GHI CHÚ", "CỘNG", "GRAND TOTAL")

# Required header keywords (normalized)
_REQUIRED_HEADERS = {"CHỦ HÀNG", "ĐIỂM ĐI", "ĐIỂM ĐẾN"}
_PRICE_HEADERS = {"F20", "F40", "E20", "E40"}
_MAX_HEADER_SCAN = 10  # scan first N rows for headers


# ── Value types ──────────────────────────────────────────────────

@dataclass
class ImportRow:
    client_raw: str
    pickup_raw: str
    dropoff_raw: str
    operation_type: str | None
    f20_price: int | None = None
    f40_price: int | None = None
    e20_price: int | None = None
    e40_price: int | None = None
    row_index: int = 0

    # Resolution results (filled during preview)
    client_id: int | None = None
    client_matched: bool = False
    pickup_location_id: int | None = None
    pickup_matched: bool = False
    dropoff_location_id: int | None = None
    dropoff_matched: bool = False

    @property
    def can_commit(self) -> bool:
        return (
            self.client_id is not None
            and self.pickup_location_id is not None
            and self.dropoff_location_id is not None
            and self.operation_type is not None
        )

    def to_dict(self) -> dict:
        return {
            "client_raw": self.client_raw,
            "client_id": self.client_id,
            "client_matched": self.client_matched,
            "pickup_raw": self.pickup_raw,
            "pickup_location_id": self.pickup_location_id,
            "pickup_matched": self.pickup_matched,
            "dropoff_raw": self.dropoff_raw,
            "dropoff_location_id": self.dropoff_location_id,
            "dropoff_matched": self.dropoff_matched,
            "operation_type": self.operation_type,
            "operation_type_valid": self.operation_type in VALID_OPERATION_TYPES,
            "f20_price": self.f20_price,
            "f40_price": self.f40_price,
            "e20_price": self.e20_price,
            "e40_price": self.e40_price,
            "row_index": self.row_index,
            "can_commit": self.can_commit,
        }


# ── Helpers ──────────────────────────────────────────────────────

def _normalize_header(val: str) -> str:
    return val.strip().upper()


def _is_aggregate_row(values: Sequence) -> bool:
    for v in values:
        if isinstance(v, str):
            upper = v.upper().strip()
            if any(tok in upper for tok in _AGGREGATE_TOKENS):
                return True
    return False


def _find_header_row(rows: list[list]) -> int | None:
    """Find the index of the header row within the first _MAX_HEADER_SCAN rows.
    Must contain all required headers + at least one price header."""
    for i, row in enumerate(rows[:_MAX_HEADER_SCAN]):
        normalized = {_normalize_header(str(c)) for c in row if c is not None}
        if _REQUIRED_HEADERS.issubset(normalized) and normalized & _PRICE_HEADERS:
            return i
    return None


def _parse_price(val) -> int | None:
    if val is None:
        return None
    if isinstance(val, (int, float)) and val > 0:
        return int(round(val))
    return None


def _normalize_operation_type(raw: str) -> str | None:
    """Normalize an operation type string to the canonical form.
    Returns None if not a valid type."""
    norm = raw.strip().upper()
    # Normalize whitespace around slashes
    norm = norm.replace(" / ", "/").replace(" /", "/").replace("/ ", "/")
    # Normalize multiple spaces
    norm = " ".join(norm.split())
    for valid in VALID_OPERATION_TYPES:
        if norm == valid:
            return valid
    return None


# ── Sheet parsing ────────────────────────────────────────────────

def _build_col_map(header_row: list) -> dict[str, int]:
    """Map normalized header names to 0-based column indices."""
    col_map: dict[str, int] = {}
    for i, val in enumerate(header_row):
        if val is None:
            continue
        key = _normalize_header(str(val))
        col_map[key] = i
    return col_map


def parse_route_pricing_bytes(content: bytes) -> dict:
    """Parse an Excel file and return route pricing rows.

    Scans all sheets for a matching header pattern.
    Returns dict with sheet_name, rows (list of dicts), warnings, stats.
    """
    wb = openpyxl.load_workbook(BytesIO(content), data_only=True)
    warnings: list[str] = []

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        all_rows = []
        for row in ws.iter_rows(min_row=1, max_row=ws.max_row, values_only=True):
            all_rows.append(list(row))

        header_idx = _find_header_row(all_rows)
        if header_idx is None:
            continue

        col_map = _build_col_map(all_rows[header_idx])
        rows: list[ImportRow] = []

        for data_idx in range(header_idx + 1, len(all_rows)):
            raw = all_rows[data_idx]

            # Skip empty rows (no client or no pickup)
            client_raw = raw[col_map.get("CHỦ HÀNG", -1)] if "CHỦ HÀNG" in col_map else None
            pickup_raw = raw[col_map.get("ĐIỂM ĐI", -1)] if "ĐIỂM ĐI" in col_map else None
            dropoff_raw = raw[col_map.get("ĐIỂM ĐẾN", -1)] if "ĐIỂM ĐẾN" in col_map else None

            if not client_raw or not isinstance(client_raw, str):
                continue
            if not pickup_raw or not isinstance(pickup_raw, str):
                continue

            client_raw = client_raw.strip()
            pickup_raw = pickup_raw.strip()
            dropoff_raw = (dropoff_raw or "").strip() if isinstance(dropoff_raw, str) else ""

            if not client_raw or not pickup_raw:
                continue

            # Skip aggregate rows
            if _is_aggregate_row(raw):
                continue

            op_raw = raw[col_map.get("TÁC NGHIỆP", -1)] if "TÁC NGHIỆP" in col_map else None
            operation_type = _normalize_operation_type(str(op_raw)) if op_raw else None

            rows.append(ImportRow(
                client_raw=client_raw,
                pickup_raw=pickup_raw,
                dropoff_raw=dropoff_raw,
                operation_type=operation_type,
                f20_price=_parse_price(raw[col_map.get("F20", -1)] if "F20" in col_map else None),
                f40_price=_parse_price(raw[col_map.get("F40", -1)] if "F40" in col_map else None),
                e20_price=_parse_price(raw[col_map.get("E20", -1)] if "E20" in col_map else None),
                e40_price=_parse_price(raw[col_map.get("E40", -1)] if "E40" in col_map else None),
                row_index=data_idx,
            ))

        wb.close()
        return {
            "sheet_name": sheet_name,
            "rows": [r.to_dict() for r in rows],
            "warnings": [],
            "stats": {
                "total": len(rows),
                "has_operation_type": sum(1 for r in rows if r.operation_type),
                "missing_operation_type": sum(1 for r in rows if not r.operation_type),
            },
        }

    wb.close()
    return {
        "sheet_name": "",
        "rows": [],
        "warnings": ["Không tìm thấy sheet chứa bảng cước tuyến. Cần có cột: CHỦ HÀNG, ĐIỂM ĐI, ĐIỂM ĐẾN, và ít nhất 1 cột giá (F20/F40/E20/E40)."],
        "stats": {"total": 0, "has_operation_type": 0, "missing_operation_type": 0},
    }


# ── Preview with auto-matching ──────────────────────────────────

async def preview_with_matching(db: AsyncSession, content: bytes) -> dict:
    """Parse Excel, auto-match clients and locations, return full preview."""
    from app.models.domain import Client, Location

    parsed = parse_route_pricing_bytes(content)
    if not parsed["rows"]:
        return parsed

    # Collect unique client names for batch lookup
    client_names = {r["client_raw"] for r in parsed["rows"] if r["client_raw"]}
    # Load all clients once
    all_clients = list((await db.execute(
        select(Client).where(Client.is_active.is_(True))
    )).scalars().all())

    # Build client lookup: normalized code → client, normalized name → client
    client_by_code: dict[str, Client] = {}
    client_by_name: dict[str, Client] = {}
    for c in all_clients:
        if c.code:
            client_by_code[c.code.strip().upper()] = c
        client_by_name[c.name.strip().upper()] = c

    # Resolve locations via LocationResolverService
    resolver = LocationResolverService(db)

    # Collect unique location strings
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

    # Match each row
    matched_count = 0
    unmatched_client_count = 0
    unmatched_location_count = 0

    for r in parsed["rows"]:
        # Match client
        raw_upper = r["client_raw"].upper().strip()
        client = client_by_code.get(raw_upper)
        if client is None:
            # Fuzzy: check if raw_upper is contained in any client name or vice versa
            for name_upper, c in client_by_name.items():
                if raw_upper in name_upper or name_upper in raw_upper:
                    client = c
                    break
        if client:
            r["client_id"] = client.id
            r["client_matched"] = True
        else:
            unmatched_client_count += 1

        # Match locations
        pickup_id = location_cache.get(r["pickup_raw"])
        dropoff_id = location_cache.get(r["dropoff_raw"]) if r["dropoff_raw"] else None

        if pickup_id is not None:
            r["pickup_location_id"] = pickup_id
            r["pickup_matched"] = True
        else:
            unmatched_location_count += 1

        if dropoff_id is not None:
            r["dropoff_location_id"] = dropoff_id
            r["dropoff_matched"] = True
        elif r["dropoff_raw"]:
            unmatched_location_count += 1

        if r["can_commit"]:
            matched_count += 1

    parsed["stats"]["matched"] = matched_count
    parsed["stats"]["unmatched_client"] = unmatched_client_count
    parsed["stats"]["unmatched_location"] = unmatched_location_count
    return parsed


# ── Commit ───────────────────────────────────────────────────────

async def commit_import_rows(db: AsyncSession, rows: list[dict]) -> dict:
    """Bulk upsert RoutePricing records. Idempotent on
    (client_id, pickup_location_id, dropoff_location_id, operation_type)."""
    from app.models.domain import RoutePricing as RoutePricingORM

    created = 0
    updated = 0
    skipped = 0

    for r in rows:
        if not all([
            r.get("client_id"),
            r.get("pickup_location_id"),
            r.get("dropoff_location_id"),
            r.get("operation_type"),
        ]):
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
            # Update prices
            changed = False
            for col in ("f20_price", "f40_price", "e20_price", "e40_price"):
                new_val = r.get(col)
                old_val = getattr(existing, col)
                if new_val is not None and new_val != old_val:
                    setattr(existing, col, new_val)
                    changed = True
            if changed:
                updated += 1
            else:
                skipped += 1
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_route_pricing_import.py -v`
Expected: All 11 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/contexts/route_pricing/infrastructure/route_pricing_import.py backend/tests/test_route_pricing_import.py
git commit -m "feat: add route pricing Excel parser with flexible sheet detection"
```

---

### Task 2: Backend — API Endpoints

**Files:**
- Modify: `backend/app/contexts/route_pricing/interface/schemas.py`
- Modify: `backend/app/contexts/route_pricing/interface/router.py`

- [ ] **Step 1: Add import schemas**

Add these schemas to the end of `backend/app/contexts/route_pricing/interface/schemas.py`:

```python
class RoutePricingImportRow(BaseModel):
    client_id: int
    pickup_location_id: int
    dropoff_location_id: int
    operation_type: str
    f20_price: int | None = None
    f40_price: int | None = None
    e20_price: int | None = None
    e40_price: int | None = None


class RoutePricingImportCommit(BaseModel):
    rows: list[RoutePricingImportRow]


class RoutePricingImportResult(BaseModel):
    created: int = 0
    updated: int = 0
    skipped: int = 0
```

- [ ] **Step 2: Add import endpoints to the router**

Add these imports at the top of `backend/app/contexts/route_pricing/interface/router.py` (add to existing import block):

```python
from fastapi import UploadFile, File as FastAPIFile
from app.contexts.route_pricing.infrastructure.route_pricing_import import (
    preview_with_matching,
    commit_import_rows,
)
from app.contexts.route_pricing.interface.schemas import (
    RoutePricingImportCommit,
    RoutePricingImportResult,
)
```

Add these endpoints at the end of `backend/app/contexts/route_pricing/interface/router.py`:

```python
@router.post("/route-pricings/import-preview")
async def import_preview_route_pricings(
    file: UploadFile = FastAPIFile(...),
    _current_user: User = Depends(require_permission("update", "RoutePricing")),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    return await preview_with_matching(db, content)


@router.post("/route-pricings/import-commit", response_model=RoutePricingImportResult)
async def import_commit_route_pricings(
    body: RoutePricingImportCommit,
    _current_user: User = Depends(require_permission("update", "RoutePricing")),
    db: AsyncSession = Depends(get_db),
):
    rows = [r.model_dump() for r in body.rows]
    return await commit_import_rows(db, rows)
```

- [ ] **Step 3: Run backend to verify no import errors**

Run: `cd backend && python -c "from app.contexts.route_pricing.interface.router import router; print('OK')"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/contexts/route_pricing/interface/schemas.py backend/app/contexts/route_pricing/interface/router.py
git commit -m "feat: add import-preview and import-commit endpoints for route pricing"
```

---

### Task 3: Frontend — API Functions + Hooks

**Files:**
- Modify: `frontend/src/services/api/routePricings.api.ts`
- Create: `frontend/src/hooks/queries/route-pricings-import.ts`
- Modify: `frontend/src/hooks/use-queries.ts`

- [ ] **Step 1: Add API functions**

Add these functions to the end of `frontend/src/services/api/routePricings.api.ts`:

```typescript
export interface RoutePricingImportPreviewRow {
  clientRaw: string
  clientId: number | null
  clientMatched: boolean
  pickupRaw: string
  pickupLocationId: number | null
  pickupMatched: boolean
  dropoffRaw: string
  dropoffLocationId: number | null
  dropoffMatched: boolean
  operationType: string | null
  operationTypeValid: boolean
  f20Price: number | null
  f40Price: number | null
  e20Price: number | null
  e40Price: number | null
  rowIndex: number
  canCommit: boolean
}

export interface RoutePricingImportPreview {
  sheetName: string
  rows: RoutePricingImportPreviewRow[]
  warnings: string[]
  stats: {
    total: number
    matched: number
    unmatchedClient: number
    unmatchedLocation: number
    hasOperationType: number
    missingOperationType: number
  }
}

export interface RoutePricingImportCommitRow {
  clientId: number
  pickupLocationId: number
  dropoffLocationId: number
  operationType: string
  f20Price?: number | null
  f40Price?: number | null
  e20Price?: number | null
  e40Price?: number | null
}

export interface RoutePricingImportResult {
  created: number
  updated: number
  skipped: number
}

export async function previewRoutePricingImport(
  file: File,
): Promise<RoutePricingImportPreview> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post('/route-pricings/import-preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return toCamel<RoutePricingImportPreview>(res.data)
}

export async function commitRoutePricingImport(
  rows: RoutePricingImportCommitRow[],
): Promise<RoutePricingImportResult> {
  const res = await api.post('/route-pricings/import-commit', toSnake({ rows }))
  return toCamel<RoutePricingImportResult>(res.data)
}
```

- [ ] **Step 2: Create import hooks**

Create `frontend/src/hooks/queries/route-pricings-import.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  previewRoutePricingImport,
  commitRoutePricingImport,
  type RoutePricingImportCommitRow,
  type RoutePricingImportPreview,
  type RoutePricingImportResult,
} from '@/services/api/routePricings.api'

export { type RoutePricingImportPreviewRow, type RoutePricingImportPreview, type RoutePricingImportCommitRow, type RoutePricingImportResult } from '@/services/api/routePricings.api'

export function usePreviewRoutePricingImport() {
  return useMutation({
    mutationFn: (file: File) => previewRoutePricingImport(file),
  })
}

export function useCommitRoutePricingImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rows: RoutePricingImportCommitRow[]) =>
      commitRoutePricingImport(rows),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['route-pricings'] })
    },
  })
}
```

- [ ] **Step 3: Export hooks from barrel**

Add this export to `frontend/src/hooks/use-queries.ts`:

```typescript
export { usePreviewRoutePricingImport, useCommitRoutePricingImport, type RoutePricingImportPreviewRow, type RoutePricingImportPreview, type RoutePricingImportCommitRow, type RoutePricingImportResult } from './queries/route-pricings-import'
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to the new files

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/api/routePricings.api.ts frontend/src/hooks/queries/route-pricings-import.ts frontend/src/hooks/use-queries.ts
git commit -m "feat: add API functions and React Query hooks for route pricing import"
```

---

### Task 4: Frontend — Import Dialog Component

**Files:**
- Create: `frontend/src/components/route-pricing/RoutePricingImportDialog.tsx`

- [ ] **Step 1: Create the import dialog component**

```tsx
// frontend/src/components/route-pricing/RoutePricingImportDialog.tsx
import { useState, useRef, useCallback, useMemo } from 'react'
import {
  FileSpreadsheet,
  X,
  Upload,
  AlertCircle,
  AlertTriangle,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui'
import { Button } from '@/components/ui'
import {
  usePreviewRoutePricingImport,
  useCommitRoutePricingImport,
  type RoutePricingImportPreviewRow,
} from '@/hooks/use-queries'
import { getWorkTypeLabel } from '@/data/domain'

type Step = 'upload' | 'preview' | 'done'

const PREVIEW_COLS = [
  'Chủ hàng',
  'Điểm đi',
  'Điểm đến',
  'F20',
  'F40',
  'E20',
  'E40',
  'Tác nghiệp',
] as const

function MatchBadge({ matched }: { matched: boolean }) {
  return (
    <span
      className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ml-1"
      style={{
        background: matched ? 'var(--success-soft)' : 'var(--warning-soft)',
        color: matched ? 'var(--success)' : 'var(--warning)',
      }}
    >
      {matched ? '✓' : '?'}
    </span>
  )
}

function formatPrice(v: number | null | undefined) {
  if (v == null) return '—'
  return v.toLocaleString('vi-VN')
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RoutePricingImportDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<RoutePricingImportPreviewRow[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [stats, setStats] = useState<{
    total: number
    matched: number
    unmatchedClient: number
    unmatchedLocation: number
  } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const previewMut = usePreviewRoutePricingImport()
  const commitMut = useCommitRoutePricingImport()

  const handleFileSelect = useCallback(
    (f: File | null) => {
      if (!f) return
      setFile(f)
      setError(null)
      previewMut.mutate(f, {
        onSuccess: (data) => {
          setRows(data.rows)
          setWarnings(data.warnings)
          setStats(data.stats as typeof stats)
          setStep('preview')
        },
        onError: (err) =>
          setError(err instanceof Error ? err.message : 'Lỗi khi phân tích file'),
      })
    },
    [previewMut],
  )

  const commitRows = useMemo(
    () => rows.filter((r) => r.canCommit),
    [rows],
  )

  const handleCommit = useCallback(() => {
    setError(null)
    commitMut.mutate(
      commitRows.map((r) => ({
        clientId: r.clientId!,
        pickupLocationId: r.pickupLocationId!,
        dropoffLocationId: r.dropoffLocationId!,
        operationType: r.operationType!,
        f20Price: r.f20Price,
        f40Price: r.f40Price,
        e20Price: r.e20Price,
        e40Price: r.e40Price,
      })),
      {
        onSuccess: () => setStep('done'),
        onError: (err) =>
          setError(err instanceof Error ? err.message : 'Lỗi khi lưu dữ liệu'),
      },
    )
  }, [commitMut, commitRows])

  const handleReset = useCallback(() => {
    setStep('upload')
    setFile(null)
    setRows([])
    setWarnings([])
    setStats(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  const handleClose = useCallback(() => {
    handleReset()
    onOpenChange(false)
  }, [handleReset, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Nhập Excel cước tuyến</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-1">
          {/* ── Upload Step ── */}
          {step === 'upload' && (
            <div className="space-y-4">
              {file ? (
                <div
                  className="flex items-center gap-2.5 px-3 py-2"
                  style={{
                    background: 'var(--accent-soft)',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid var(--accent)',
                  }}
                >
                  <FileSpreadsheet
                    className="h-4 w-4 shrink-0"
                    style={{ color: 'var(--accent)' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold truncate m-0" style={{ color: 'var(--ink)' }}>
                      {file.name}
                    </p>
                    <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
                  onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files?.[0] ?? null) }}
                  className="nepo-dropzone cursor-pointer"
                  style={{ minHeight: 120 }}
                >
                  <Upload className="h-6 w-6 mb-2" style={{ color: 'var(--ink-3)' }} strokeWidth={1.5} />
                  <p className="text-[13px] font-semibold m-0" style={{ color: 'var(--ink)' }}>
                    Kéo & thả file hoặc nhấn để chọn
                  </p>
                  <p className="text-[11px] m-0 mt-1" style={{ color: 'var(--ink-3)' }}>
                    .xlsx — Cần có cột: CHỦ HÀNG, ĐIỂM ĐI, ĐIỂM ĐẾN, giá cước
                  </p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              {previewMut.isPending && (
                <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--ink-2)' }}>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang phân tích tệp...
                </div>
              )}
            </div>
          )}

          {/* ── Preview Step ── */}
          {step === 'preview' && (
            <div className="space-y-3">
              {warnings.length > 0 && (
                <div
                  className="flex items-start gap-2 px-3 py-2.5"
                  style={{ background: 'var(--warning-soft)', borderRadius: 'var(--r-sm)', color: 'var(--warning)', fontSize: 13 }}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  {warnings.map((w, i) => <p key={i} className="m-0 font-semibold">{w}</p>)}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-3 flex-wrap text-[12px]">
                <span className="font-semibold" style={{ color: 'var(--ink)' }}>{file?.name}</span>
                <span className="rounded-full px-2 py-0.5" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}>
                  {stats?.total ?? rows.length} dòng
                </span>
                {(stats?.matched ?? 0) > 0 && (
                  <span className="rounded-full px-2 py-0.5" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                    {stats!.matched} khớp
                  </span>
                )}
                {(stats?.unmatchedClient ?? 0) > 0 && (
                  <span className="rounded-full px-2 py-0.5" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                    {stats!.unmatchedClient} chủ hàng chưa khớp
                  </span>
                )}
              </div>

              {/* Table */}
              <div className="nepo-table-scroll" style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', overflow: 'auto', maxHeight: '50vh' }}>
                <table className="nepo-table w-full" style={{ minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>#</th>
                      {PREVIEW_COLS.map((c) => (
                        <th key={c} className="text-left">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const rowBg = !r.canCommit ? 'var(--warning-soft)' : undefined
                      return (
                        <tr key={i} style={rowBg ? { background: rowBg } : undefined}>
                          <td>
                            <span className="tabular-nums text-[12px]" style={{ color: 'var(--ink-3)' }}>
                              {i + 1}
                            </span>
                          </td>
                          <td>
                            <span className="text-[12.5px]" style={{ color: 'var(--ink-2)' }}>
                              {r.clientRaw}
                            </span>
                            <MatchBadge matched={r.clientMatched} />
                          </td>
                          <td>
                            <span className="text-[12.5px]" style={{ color: 'var(--ink-2)' }}>
                              {r.pickupRaw}
                            </span>
                            <MatchBadge matched={r.pickupMatched} />
                          </td>
                          <td>
                            <span className="text-[12.5px]" style={{ color: 'var(--ink-2)' }}>
                              {r.dropoffRaw}
                            </span>
                            <MatchBadge matched={r.dropoffMatched} />
                          </td>
                          <td><span className="tabular-nums text-[12.5px]" style={{ color: r.f20Price ? 'var(--ink)' : 'var(--ink-3)' }}>{formatPrice(r.f20Price)}</span></td>
                          <td><span className="tabular-nums text-[12.5px]" style={{ color: r.f40Price ? 'var(--ink)' : 'var(--ink-3)' }}>{formatPrice(r.f40Price)}</span></td>
                          <td><span className="tabular-nums text-[12.5px]" style={{ color: r.e20Price ? 'var(--ink)' : 'var(--ink-3)' }}>{formatPrice(r.e20Price)}</span></td>
                          <td><span className="tabular-nums text-[12.5px]" style={{ color: r.e40Price ? 'var(--ink)' : 'var(--ink-3)' }}>{formatPrice(r.e40Price)}</span></td>
                          <td>
                            <span className="text-[12.5px]" style={{ color: r.operationTypeValid ? 'var(--ink-2)' : 'var(--warning)' }}>
                              {getWorkTypeLabel(r.operationType) ?? r.operationType ?? '—'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {commitRows.length < rows.length && (
                <p className="text-[12px] m-0" style={{ color: 'var(--ink-3)' }}>
                  Chỉ {commitRows.length}/{rows.length} dòng đủ điều kiện để lưu (cần khớp chủ hàng + điểm đi/đến).
                </p>
              )}
            </div>
          )}

          {/* ── Done Step ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center text-center py-4">
              <div
                className="grid place-items-center mb-3"
                style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-soft)', color: 'var(--success)' }}
              >
                <CheckCircle className="h-7 w-7" strokeWidth={1.75} />
              </div>
              <h3 className="m-0 text-[16px] font-bold" style={{ color: 'var(--ink)' }}>
                Nhập dữ liệu thành công
              </h3>
              <div className="grid grid-cols-3 gap-3 w-full mt-4">
                <div className="p-2.5 rounded-lg" style={{ border: '1px solid var(--line)', background: 'var(--surface-2)' }}>
                  <p className="text-[18px] font-bold m-0 tabular-nums" style={{ color: 'var(--success)' }}>{commitMut.data?.created ?? 0}</p>
                  <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>Tạo mới</p>
                </div>
                <div className="p-2.5 rounded-lg" style={{ border: '1px solid var(--line)', background: 'var(--surface-2)' }}>
                  <p className="text-[18px] font-bold m-0 tabular-nums" style={{ color: 'var(--accent)' }}>{commitMut.data?.updated ?? 0}</p>
                  <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>Cập nhật giá</p>
                </div>
                <div className="p-2.5 rounded-lg" style={{ border: '1px solid var(--line)', background: 'var(--surface-2)' }}>
                  <p className="text-[18px] font-bold m-0 tabular-nums" style={{ color: 'var(--ink-3)' }}>{commitMut.data?.skipped ?? 0}</p>
                  <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>Bỏ qua</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 mt-2" style={{ background: 'var(--danger-soft)', borderRadius: 'var(--r-sm)', color: 'var(--danger)', fontSize: 13 }}>
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--line)' }}>
          {step === 'upload' && (
            <Button variant="ghost" onClick={handleClose}>Huỷ</Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="ghost" onClick={handleReset}>Quay lại</Button>
              <Button onClick={handleCommit} disabled={commitMut.isPending || commitRows.length === 0}>
                {commitMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {commitMut.isPending ? 'Đang lưu...' : `Lưu ${commitRows.length} dòng`}
              </Button>
            </>
          )}
          {step === 'done' && (
            <>
              <Button variant="ghost" onClick={handleReset}>Nhập file khác</Button>
              <Button onClick={handleClose}>Xong</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to the new file

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/route-pricing/RoutePricingImportDialog.tsx
git commit -m "feat: add RoutePricingImportDialog component with preview and commit flow"
```

---

### Task 5: Frontend — Wire Up to RoutePricingPage

**Files:**
- Modify: `frontend/src/pages/accountant/RoutePricingPage.tsx`

- [ ] **Step 1: Add import button and dialog to RoutePricingPage**

Modify `frontend/src/pages/accountant/RoutePricingPage.tsx`:

Add imports:
```typescript
import { FileSpreadsheet, Plus, Route } from 'lucide-react'
import { useState } from 'react'
import { RoutePricingImportDialog } from '@/components/route-pricing/RoutePricingImportDialog'
```

Add state inside the component function (before the return):
```typescript
const [importOpen, setImportOpen] = useState(false)
```

Update the `actions` prop in `<SettingsPageLayout>` to include the import button:
```tsx
actions={
  <div className="flex gap-2">
    <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
      <FileSpreadsheet className="h-4 w-4" />
      Nhập Excel
    </Button>
    <Button onClick={openCreate} className="gap-2">
      <Plus className="h-4 w-4" />
      Thêm cước tuyến
    </Button>
  </div>
}
```

Add the dialog component after the delete dialog (before closing `</SettingsPageLayout>`):
```tsx
<RoutePricingImportDialog open={importOpen} onOpenChange={setImportOpen} />
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/accountant/RoutePricingPage.tsx
git commit -m "feat: add Excel import button to RoutePricingPage"
```

---

### Task 6: Integration Test — Verify with Sample Excel

**Files:** None (manual verification)

- [ ] **Step 1: Start backend server**

Run: `cd backend && uvicorn app.main:app --reload --port 8000`

- [ ] **Step 2: Test import-preview endpoint with sample file**

Run: `curl -s -X POST http://localhost:8000/api/v1/route-pricings/import-preview -F "file=@docs/real-life-data/DS PORT+CƯỚC TUYẾN.xlsx" -H "Authorization: Bearer $(cat /tmp/test_token 2>/dev/null || echo '')" | python -m json.tool | head -50`

Expected: JSON with `sheet_name`, `rows` array, `stats` with match counts

- [ ] **Step 3: Verify frontend**

Open browser at `http://localhost:5174/accountant/settings/cuoc-tuyen`, click "Nhập Excel", upload the sample file, verify preview table shows matched/unmatched rows, commit and verify stats.

- [ ] **Step 4: Final commit if any fixes needed**
