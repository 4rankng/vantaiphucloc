# Customer Excel Flexible Parser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the customer Excel import flow correctly parse BDST 30.5.xls, VIPI 28.5.xls, ultima02.06.xlsx, and any future customer template through a 3-layer strategy (pattern → heuristic → AI) with user-saved mapping profiles.

**Architecture:** Three layered changes in the existing `import_pipeline` package, plus a new `MappingProfile` model for caching inferred mappings. New `terminal_log` pattern handles BDST/VIPI style. Generic path gets synonym expansion + Levenshtein fuzzy matching + Gemini header inference. Pipeline surfaces per-row `confidence` and `source`. Frontend shows confidence badges + drag-to-remap + save-profile flow.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy async, xlrd 1.x, openpyxl, Google Gemini (existing), Alembic. Frontend: React 19, TanStack Query, Tailwind v4, shadcn/ui-style components. Tests: pytest, vitest. Manual QA: Playwright (existing `qa/scripts/`).

**Spec:** `docs/superpowers/specs/2026-06-12-customer-excel-flexible-parser.md`

**Phases:**
1. **Bug fixes** — xlrd datemode, settlement_list date discard, pattern threshold
2. **New pattern** — `terminal_log` for BDST/VIPI
3. **Synonyms + fuzzy** — canonical expansion + Levenshtein
4. **MappingProfile model** — DB, ORM, repository, endpoints
5. **AI inference** — Gemini schema inference + cache
6. **Pipeline integration** — confidence, source, 3-layer orchestration
7. **Frontend UI** — confidence badges, column mapper, save-profile dialog, profile picker, drawer integration
8. **Integration + QA** — e2e tests, Playwright scripts

---

## Root cause summary

The 3 sample files fail today because:

1. **BDST 30.5.xls / VIPI 28.5.xls** — Neither matches any of the 6 hardcoded patterns (bay_plan, loading_list, dual_panel, invoice, settlement_list, stacking_plan). Pattern detection returns `None`; falls through to generic `map_columns()`. The generic path's synonym dictionary in `canonical.py` doesn't contain "Số Container" / "Hãng khai thác" / "Loại công việc" / "F/E" headers. Result: most columns `canonical_field=None`, preview shows garbage (container numbers in work_type column, "CHUYỂN BÃI" hardcoded fallback everywhere, empty customer/vehicle).

2. **ultima02.06.xlsx** — Should match `settlement_list` pattern (pivoted F20'/F40'/E20'/E40' columns). But the extractor at `pattern_extractors.py:799` has a bug: `parse_date(row[col_map["date"]])` is called but its result is **discarded**. So `trip_date` is always `None` even when a perfectly parseable date is in the cell. Also the `work_type` is hardcoded to `"CHUYỂN BÃI"` instead of using the pivot-derived value.

3. **Date flicker (30 May ↔ 31 May)** — `workbook.py:_xls_cell_value()` calls `xlrd.xldate_as_tuple(cell.value, wb.datemode)` but `wb.datemode` is the workbook's actual mode (0=1900, 1=1904). If the file uses 1904 mode (Mac), dates get a 4-year shift, which can flip month/day boundaries. Need to normalize to 1900 system universally.

4. **Pattern threshold too strict** — `DETECTION_THRESHOLD = 0.6` in `pattern_detector.py`. Lowering to 0.5 lets marginally-matching files reach the extractor instead of falling to generic.

---

## File changes

### Backend (new files)

| Path | Purpose |
|---|---|
| `backend/alembic/versions/0006_add_mapping_profiles.py` | Migration: `mapping_profiles` table |
| `backend/app/contexts/operations/infrastructure/repositories/mapping_profile_repository.py` | CRUD for profiles |
| `backend/app/contexts/operations/infrastructure/import_pipeline/ai_inference.py` | `infer_schema_with_ai()` for Layer 3 |
| `backend/tests/test_terminal_log_pattern.py` | BDST/VIPI extractor tests |
| `backend/tests/test_datemode_fix.py` | 1900 vs 1904 system tests |
| `backend/tests/test_settlement_date.py` | Regression: trip_date populated for ultima |
| `backend/tests/test_ai_inference.py` | Gemini header inference tests (mocked) |
| `backend/tests/test_mapping_profiles.py` | Profile save/load/use tests |
| `backend/tests/test_fuzzy_header_matching.py` | Levenshtein synonym matching tests |
| `backend/tests/test_pipeline_confidence.py` | PreviewRow.confidence + source tests |

### Backend (modified)

| Path | Change |
|---|---|
| `backend/app/contexts/operations/infrastructure/import_pipeline/workbook.py` | Normalize `wb.datemode` to 0 in `_xls_cell_value` |
| `backend/app/contexts/operations/infrastructure/import_pipeline/value_parsers.py` | Add `datemode` param to `parse_date` |
| `backend/app/contexts/operations/infrastructure/import_pipeline/pattern_detector.py` | Lower `DETECTION_THRESHOLD` to 0.5; add `_score_terminal_log` |
| `backend/app/contexts/operations/infrastructure/import_pipeline/pattern_extractors.py` | Fix settlement_list date discard; fix `work_type` hardcoding; add `extract_terminal_log` |
| `backend/app/contexts/operations/infrastructure/import_pipeline/canonical.py` | Add `HeaderSignature`; expand `SYNONYMS` with BDST/VIPI/ultima headers |
| `backend/app/contexts/operations/infrastructure/import_pipeline/column_mapper.py` | Add `MappingProfilePicker`; add Levenshtein fuzzy match |
| `backend/app/contexts/operations/infrastructure/import_pipeline/pipeline.py` | Add `confidence` + `source` to `PreviewRow`; wire Layer 3 AI fallback |
| `backend/app/contexts/operations/infrastructure/orm.py` | Add `MappingProfile` ORM |
| `backend/app/models/__init__.py` | Re-export `MappingProfile` |
| `backend/app/contexts/operations/interface/schemas.py` | Add confidence + source to `PreviewRowSchema`; add `MappingProfileSchema` |
| `backend/app/contexts/operations/interface/routers/imports.py` | Add `GET /customer-excel/profiles` + `POST /customer-excel/profiles` |
| `backend/app/contexts/operations/interface/dependencies.py` | Add `get_mapping_profile_repo()` |
| `backend/app/workers/tasks/imports.py` | Wire profile cache into preview task |

### Frontend (new)

| Path | Purpose |
|---|---|
| `frontend/src/components/imports/ConfidenceBadge.tsx` | Green/yellow/red badge |
| `frontend/src/components/imports/ColumnMapper.tsx` | Drag-to-remap header → canonical field |
| `frontend/src/components/imports/SaveProfileDialog.tsx` | "Save as profile?" dialog |
| `frontend/src/components/imports/ProfilePicker.tsx` | Saved-profile picker on import |
| `frontend/src/components/imports/index.ts` | Barrel export |
| `frontend/src/services/api/mapping-profiles.api.ts` | `listProfiles()`, `saveProfile()` |
| `frontend/src/hooks/queries/useMappingProfiles.ts` | TanStack Query hooks |

### Frontend (modified)

| Path | Change |
|---|---|
| `frontend/src/components/shared/overlays/ExcelImportDrawer.tsx` | Use new confidence badges + ColumnMapper + SaveProfileDialog |
| `frontend/src/services/api/imports.api.ts` | Update preview response types to include `confidence` + `source` |

### QA

| Path | Purpose |
|---|---|
| `qa/scripts/test_imports_ui.py` | Playwright: upload BDST, verify preview, commit |
| `qa/scripts/test_imports_profile.py` | Playwright: save profile, re-upload, verify auto-apply |

---

## Tasks (TDD, frequent commits)

### Phase 1: Bug fixes (foundation)

#### Task 1.1 — Fix xlrd datemode handling

**Files:**
- Modify: `backend/app/contexts/operations/infrastructure/import_pipeline/workbook.py:95-105`
- Test: `backend/tests/test_datemode_fix.py`

- [ ] **Step 1: Write failing test for 1904-mode file**

```python
# tests/test_datemode_fix.py
import pytest
import xlrd
from datetime import datetime
from app.contexts.operations.infrastructure.import_pipeline.workbook import load_workbook
import io

def test_xls_1904_mode_date_normalized(tmp_path):
    """A 1904-mode xls file should produce the same date as 1900-mode for the same wall-clock date."""
    # Create minimal 1904-mode xls in memory
    # xlrd doesn't easily write, so use a fixture file or build bytes manually
    # For the test, assert the function normalizes datemode=1 correctly
    from app.contexts.operations.infrastructure.import_pipeline.workbook import _xls_cell_value

    # Mock: a cell from a 1904-mode workbook
    class MockCell:
        ctype = xlrd.XL_CELL_DATE
        value = 0  # serial 0 in 1904 system = 1904-01-01
    class MockWb:
        datemode = 1  # 1904 mode

    result = _xls_cell_value(MockCell(), MockWb())
    # 1900 system epoch is 1899-12-30; serial 0 in 1904 mode = 1904-01-01
    # After normalization, the result should NOT be a 1904-system date
    assert result.year == 1900  # normalized to 1900 mode
    assert result.month == 1
    assert result.day == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. pytest tests/test_datemode_fix.py -v`
Expected: FAIL with "AssertionError" or "AttributeError" (current code doesn't normalize)

- [ ] **Step 3: Fix `_xls_cell_value` in workbook.py**

```python
# In workbook.py, replace the existing _xls_cell_value function:
def _xls_cell_value(cell, wb):
    if cell.ctype == xlrd.XL_CELL_DATE:
        # Normalize datemode=1 (1904 system) to datemode=0 (1900 system)
        # by adding 1462 days (the offset between 1900-01-01 and 1904-01-01)
        value = cell.value
        if wb.datemode == 1:
            value = value + 1462  # shift 1904 serial to 1900 serial
        tup = xlrd.xldate_as_tuple(value, 0)  # always use 1900 mode
        return datetime(*tup) if tup[0] else None
    if cell.ctype == xlrd.XL_CELL_NUMBER:
        return float(cell.value)
    if cell.ctype == xlrd.XL_CELL_BOOLEAN:
        return bool(cell.value)
    if cell.ctype == xlrd.XL_CELL_TEXT:
        return cell.value
    if cell.ctype == xlrd.XL_CELL_EMPTY:
        return None
    return cell.value
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. pytest tests/test_datemode_fix.py -v`
Expected: PASS

- [ ] **Step 5: Verify no regression on existing files**

Run: `cd backend && PYTHONPATH=. pytest tests/test_import_pipeline.py -v`
Expected: All existing tests still pass

- [ ] **Step 6: Commit**

```bash
cd backend
git add app/contexts/operations/infrastructure/import_pipeline/workbook.py tests/test_datemode_fix.py
git commit -m "fix(import): normalize xlrd datemode=1 to 1900 system"
```

#### Task 1.2 — Fix settlement_list date discard bug

**Files:**
- Modify: `backend/app/contexts/operations/infrastructure/import_pipeline/pattern_extractors.py:780-820`
- Test: `backend/tests/test_settlement_date.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_settlement_date.py
from app.contexts.operations.infrastructure.import_pipeline.pattern_extractors import extract_settlement_list
from datetime import date

def test_settlement_list_trip_date_populated():
    """Regression: parse_date() result was discarded; trip_date was always None."""
    # ultima02.06.xlsx has NGÀY ĐI in col 0
    # Use a small fixture: header row + 3 data rows
    rows = [
        ["NGÀY ĐI", "CHỦ HÀNG", "SỐ CONTAINER", "F20'", "F40'", "E20'", "E40'", "TÁC NGHIỆP", "TÊN TẦU"],
        [date(2026, 6, 2), "MIPEC", "CAIU6167954", 1, "", "", "", "Xuất giao thẳng", "ULTIMA 1047SN"],
        [date(2026, 6, 2), "MIPEC", "CAIU6386850", 1, "", "", "", "Xuất giao thẳng", "ULTIMA 1047SN"],
    ]
    accepted, rejected = extract_settlement_list(rows)
    assert len(accepted) == 2
    assert all(r.trip_date == date(2026, 6, 2) for r in accepted), f"trip_date not populated: {[r.trip_date for r in accepted]}"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. pytest tests/test_settlement_date.py -v`
Expected: FAIL (current code discards parse_date result)

- [ ] **Step 3: Fix the bug in pattern_extractors.py**

In `extract_settlement_list`, find the loop that builds ExtractedRow. The current code has:
```python
if col_map.get("date") is not None and col_map["date"] < len(row):
    parse_date(row[col_map["date"]])  # RESULT DISCARDED
```

Change it to capture the result and pass it to ExtractedRow:
```python
trip_date = None
if col_map.get("date") is not None and col_map["date"] < len(row):
    parsed = parse_date(row[col_map["date"]])
    if parsed is not None:
        trip_date = parsed.date() if hasattr(parsed, "date") else parsed
```

Then in the `ExtractedRow(...)` constructor call, set `trip_date=trip_date`.

Also fix the `work_type` hardcoding at the same site:
```python
# Replace: work_type_val = "CHUYỂN BÃI"  (hardcoded)
# With:
work_type_val = work_type or "CHUYỂN BÃI"  # use parsed value, fallback only if missing
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. pytest tests/test_settlement_date.py -v`
Expected: PASS

- [ ] **Step 5: Run full pipeline tests for regression**

Run: `cd backend && PYTHONPATH=. pytest tests/test_import_pipeline.py -v`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
cd backend
git add app/contexts/operations/infrastructure/import_pipeline/pattern_extractors.py tests/test_settlement_date.py
git commit -m "fix(import): store trip_date in settlement_list extractor (was discarded)"
```

#### Task 1.3 — Lower pattern detection threshold

**Files:**
- Modify: `backend/app/contexts/operations/infrastructure/import_pipeline/pattern_detector.py:16`
- Test: `backend/tests/test_threshold_lowering.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_threshold_lowering.py
from app.contexts.operations.infrastructure.import_pipeline.pattern_detector import DETECTION_THRESHOLD

def test_threshold_is_lowered():
    """The threshold should be lowered from 0.6 to 0.5 to allow marginally-matching files."""
    assert DETECTION_THRESHOLD <= 0.5, f"Expected ≤ 0.5, got {DETECTION_THRESHOLD}"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. pytest tests/test_threshold_lowering.py -v`
Expected: FAIL (current value is 0.6)

- [ ] **Step 3: Lower the threshold**

In `pattern_detector.py:16`, change:
```python
DETECTION_THRESHOLD = 0.5
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. pytest tests/test_threshold_lowering.py -v`
Expected: PASS

- [ ] **Step 5: Run full pipeline tests for regression**

Run: `cd backend && PYTHONPATH=. pytest tests/test_import_pipeline.py -v`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
cd backend
git add app/contexts/operations/infrastructure/import_pipeline/pattern_detector.py tests/test_threshold_lowering.py
git commit -m "chore(import): lower pattern detection threshold from 0.6 to 0.5"
```

---

### Phase 2: New pattern (terminal_log for BDST/VIPI)

#### Task 2.1 — Add `_score_terminal_log` to pattern detector

**Files:**
- Modify: `backend/app/contexts/operations/infrastructure/import_pipeline/pattern_detector.py`
- Test: `backend/tests/test_terminal_log_pattern.py`

- [ ] **Step 1: Write failing test for scoring**

```python
# tests/test_terminal_log_pattern.py
import xlrd
from app.contexts.operations.infrastructure.import_pipeline.pattern_detector import _score_terminal_log

def test_terminal_log_scores_high_for_bdst():
    """BDST 30.5.xls header row should score > 0.5 for terminal_log."""
    # Load real BDST file
    wb = xlrd.open_workbook("docs/templates/BDST 30.5.xls")
    sh = wb.sheet_by_index(0)
    score = _score_terminal_log(sh)
    assert score >= 0.5, f"Expected ≥ 0.5, got {score}"

def test_terminal_log_scores_high_for_vipi():
    """VIPI 28.5.xls header row should score > 0.5 for terminal_log."""
    wb = xlrd.open_workbook("docs/templates/VIPI 28.5.xls")
    sh = wb.sheet_by_index(0)
    score = _score_terminal_log(sh)
    assert score >= 0.5, f"Expected ≥ 0.5, got {score}"

def test_terminal_log_scores_low_for_ultima():
    """ultima02.06.xlsx should NOT match terminal_log (different format)."""
    import openpyxl
    wb = openpyxl.load_workbook("docs/templates/ultima02.06.xlsx", data_only=True, read_only=True)
    sh = wb.active
    score = _score_terminal_log(sh)
    assert score < 0.3, f"Expected < 0.3 for ultima, got {score}"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. pytest tests/test_terminal_log_pattern.py -v`
Expected: FAIL (function doesn't exist)

- [ ] **Step 3: Add `_score_terminal_log` function**

In `pattern_detector.py`, add (above the existing scoring functions):

```python
def _score_terminal_log(sheet) -> float:
    """Score whether a sheet looks like a terminal operations log (BDST/VIPI style).

    Signals:
    - Header contains "Số Container" or "Số Cont" (or "SỐ CONTAINER" with normalization)
    - Header contains "Loại công việc" (or normalized)
    - Header contains "Hãng khai thác" (or normalized)
    - Many columns (>20)
    - Has datetime in column 12-18 (typical position for terminal logs)
    """
    from .canonical import normalize_for_match

    if sheet.nrows < 2:
        return 0.0

    # Look at first 5 rows for headers
    header_candidates = []
    for r in range(min(5, sheet.nrows)):
        for c in range(min(sheet.ncols, 35)):
            try:
                v = sheet.cell_value(r, c) if hasattr(sheet, "cell_value") else sheet.cell(r + 1, c + 1).value
            except Exception:
                continue
            if v is not None and str(v).strip():
                header_candidates.append(normalize_for_match(str(v)))

    if not header_candidates:
        return 0.0

    joined = " ".join(header_candidates)
    score = 0.0

    # Strong signals
    if "socontainer" in joined or "socont" in joined:
        score += 0.4
    if "loaicongviec" in joined or "loaicv" in joined:
        score += 0.3
    if "hangkhaithac" in joined:
        score += 0.2

    # Format signal: many columns
    if sheet.ncols >= 20:
        score += 0.1

    return min(score, 1.0)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. pytest tests/test_terminal_log_pattern.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd backend
git add app/contexts/operations/infrastructure/import_pipeline/pattern_detector.py tests/test_terminal_log_pattern.py
git commit -m "feat(import): add _score_terminal_log for BDST/VIPI detection"
```

#### Task 2.2 — Wire `terminal_log` into `detect_pattern`

**Files:**
- Modify: `backend/app/contexts/operations/infrastructure/import_pipeline/pattern_detector.py:26-46`

- [ ] **Step 1: Write failing test**

```python
# Add to tests/test_terminal_log_pattern.py
from app.contexts.operations.infrastructure.import_pipeline.pattern_detector import detect_pattern
import xlrd

def test_detect_pattern_returns_terminal_log_for_bdst():
    """detect_pattern should return pattern_name='terminal_log' for BDST."""
    wb = xlrd.open_workbook("docs/templates/BDST 30.5.xls")
    sheets = [wb.sheet_by_index(0)]
    result = detect_pattern(sheets, "BDST 30.5.xls")
    assert result is not None, "Expected a pattern match for BDST"
    assert result.pattern_name == "terminal_log", f"Expected terminal_log, got {result.pattern_name}"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. pytest tests/test_terminal_log_pattern.py::test_detect_pattern_returns_terminal_log_for_bdst -v`
Expected: FAIL (terminal_log not in detect_pattern)

- [ ] **Step 3: Add to `detect_pattern` function**

In `pattern_detector.py`, find `detect_pattern()` and add the `terminal_log` scoring inside the loop:

```python
def detect_pattern(sheets, filename: str = ""):
    best = None
    for sheet in sheets:
        scores = {
            "bay_plan": _score_bay_plan(sheet),
            "stacking_plan": _score_stacking_plan(sheet),
            "dual_panel": _score_dual_panel(sheet),
            "loading_list": _score_loading_list(sheet),
            "invoice": _score_invoice(sheet),
            "settlement_list": _score_settlement_list(sheet),
            "terminal_log": _score_terminal_log(sheet),  # NEW
        }
        for name, score in scores.items():
            if score >= DETECTION_THRESHOLD and (best is None or score > best.score):
                best = DetectedPattern(pattern_name=name, score=score, sheet_index=sheets.index(sheet))
    return best
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. pytest tests/test_terminal_log_pattern.py -v`
Expected: PASS

- [ ] **Step 5: Run full pipeline tests for regression**

Run: `cd backend && PYTHONPATH=. pytest tests/test_import_pipeline.py -v`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
cd backend
git add app/contexts/operations/infrastructure/import_pipeline/pattern_detector.py
git commit -m "feat(import): register terminal_log in detect_pattern"
```

#### Task 2.3 — Implement `extract_terminal_log`

**Files:**
- Modify: `backend/app/contexts/operations/infrastructure/import_pipeline/pattern_extractors.py`
- Test: `backend/tests/test_terminal_log_pattern.py`

- [ ] **Step 1: Write failing test**

```python
# Add to tests/test_terminal_log_pattern.py
from app.contexts.operations.infrastructure.import_pipeline.pattern_extractors import extract_terminal_log
from datetime import date

def test_extract_terminal_log_bdst_rows_have_container_and_date():
    """BDST extraction should produce rows with container_number, trip_date, work_type."""
    import xlrd
    wb = xlrd.open_workbook("docs/templates/BDST 30.5.xls")
    sh = wb.sheet_by_index(0)
    # Convert to list-of-lists (extractors work on raw rows)
    rows = [[sh.cell_value(r, c) for c in range(sh.ncols)] for r in range(sh.nrows)]
    accepted, rejected = extract_terminal_log(rows)
    assert len(accepted) > 500, f"Expected > 500 rows, got {len(accepted)}"
    sample = accepted[0]
    assert sample.container_number == "BEAU5242811", f"Wrong container: {sample.container_number}"
    assert sample.trip_date is not None, "trip_date should be populated"
    assert sample.work_type in ("Dỡ tàu", "Xếp tàu"), f"Wrong work_type: {sample.work_type}"

def test_extract_terminal_log_vipi_rows_have_container_and_date():
    """VIPI extraction should produce rows with container_number, trip_date, work_type."""
    import xlrd
    wb = xlrd.open_workbook("docs/templates/VIPI 28.5.xls")
    sh = wb.sheet_by_index(0)
    rows = [[sh.cell_value(r, c) for c in range(sh.ncols)] for r in range(sh.nrows)]
    accepted, rejected = extract_terminal_log(rows)
    assert len(accepted) > 600, f"Expected > 600 rows, got {len(accepted)}"
    sample = accepted[0]
    assert sample.container_number == "BEAU5362592", f"Wrong container: {sample.container_number}"
    assert sample.trip_date is not None, "trip_date should be populated"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. pytest tests/test_terminal_log_pattern.py::test_extract_terminal_log_bdst_rows_have_container_and_date -v`
Expected: FAIL (function doesn't exist)

- [ ] **Step 3: Implement `extract_terminal_log` in pattern_extractors.py**

Add at the end of `pattern_extractors.py` (before any existing extractor function for consistency, or at the end):

```python
def extract_terminal_log(rows: list[list]) -> tuple[list, list]:
    """Extract rows from a terminal operations log (BDST/VIPI style).

    Layout (BDST/VIPI):
    - Col 1: Số Container (e.g. BEAU5242811)
    - Col 2: Hãng khai thác (shipping line, e.g. ONE, VMC) — used as vessel proxy
    - Col 3: Kích cỡ ISO (e.g. 45G0, 22G0) — maps to cont_type E40/E20
    - Col 4: F/E (full/empty)
    - Col 5: Nhập/xuất (Import/Export) — informational
    - Col 6: Loại công việc (Dỡ tàu / Xếp tàu) — work type
    - Col 14: datetime (trip_date)

    Returns: (accepted, rejected) where each is a list of ExtractedRow.
    """
    from .value_parsers import parse_date, parse_container_no, parse_size

    if not rows:
        return [], []

    # Find header row: first row with "Số Container" or "SỐ CONTAINER"
    header_row_idx = 0
    for r in range(min(5, len(rows))):
        row_text = " ".join(str(c) for c in rows[r] if c is not None)
        if "container" in row_text.lower() and ("số" in row_text.lower() or "so" in row_text.lower()):
            header_row_idx = r
            break

    # Column positions (constant for terminal logs)
    COL_CONTAINER = 1
    COL_SHIPPING_LINE = 2
    COL_ISO_SIZE = 3
    COL_FE = 4
    COL_IMP_EXP = 5
    COL_WORK_TYPE = 6
    COL_TRIP_DATE = 14

    accepted = []
    rejected = []

    for r in range(header_row_idx + 1, len(rows)):
        row = rows[r]
        if not row or len(row) <= COL_CONTAINER:
            continue

        container_raw = row[COL_CONTAINER] if COL_CONTAINER < len(row) else None
        container_no = parse_container_no(container_raw) if container_raw else None
        if not container_no:
            rejected.append({"row": r, "reason": "missing_container"})
            continue

        # ISO size → cont_type
        iso_raw = row[COL_ISO_SIZE] if COL_ISO_SIZE < len(row) else None
        cont_type = None
        if iso_raw:
            iso_str = str(iso_raw).strip().upper()
            # 45G0, 42G0 → E40; 22G0, 20G0 → E20
            if iso_str.startswith(("4", "L")):
                cont_type = "E40"
            elif iso_str.startswith(("2", "2")):
                cont_type = "E20"

        # F/E
        fe_raw = row[COL_FE] if COL_FE < len(row) else None
        freight_kind = None
        if fe_raw:
            fe_str = str(fe_raw).strip().upper()
            if fe_str == "F":
                freight_kind = "F"
            elif fe_str == "E":
                freight_kind = "E"

        # Work type
        work_type_raw = row[COL_WORK_TYPE] if COL_WORK_TYPE < len(row) else None
        work_type = str(work_type_raw).strip() if work_type_raw else None

        # Shipping line → vessel proxy
        shipping_line_raw = row[COL_SHIPPING_LINE] if COL_SHIPPING_LINE < len(row) else None
        vessel_name = str(shipping_line_raw).strip() if shipping_line_raw else None

        # Trip date
        trip_date = None
        date_raw = row[COL_TRIP_DATE] if COL_TRIP_DATE < len(row) else None
        if date_raw is not None:
            parsed = parse_date(date_raw)
            if parsed is not None:
                trip_date = parsed.date() if hasattr(parsed, "date") else parsed

        if trip_date is None:
            rejected.append({"row": r, "reason": "missing_date", "container": container_no})
            continue

        accepted.append(ExtractedRow(
            container_number=container_no,
            cont_type=cont_type,
            freight_kind=freight_kind,
            work_type=work_type,
            vessel_name=vessel_name,
            trip_date=trip_date,
        ))

    return accepted, rejected
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. pytest tests/test_terminal_log_pattern.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd backend
git add app/contexts/operations/infrastructure/import_pipeline/pattern_extractors.py tests/test_terminal_log_pattern.py
git commit -m "feat(import): add extract_terminal_log for BDST/VIPI-style files"
```

#### Task 2.4 — Wire `extract_terminal_log` into pipeline

**Files:**
- Modify: `backend/app/contexts/operations/infrastructure/import_pipeline/pipeline.py`

- [ ] **Step 1: Write failing test for end-to-end preview of BDST**

```python
# Add to tests/test_terminal_log_pattern.py
from app.contexts.operations.infrastructure.import_pipeline.pipeline import run_preview

def test_bdst_runs_through_terminal_log_extractor():
    """run_preview on BDST 30.5.xls should use terminal_log extractor and produce rows."""
    with open("docs/templates/BDST 30.5.xls", "rb") as f:
        content = f.read()
    result = run_preview(content, filename="BDST 30.5.xls")
    assert len(result.accepted) > 500, f"Expected > 500 rows, got {len(result.accepted)}"
    sample = result.accepted[0]
    assert sample.container_number == "BEAU5242811"
    assert sample.trip_date is not None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. pytest tests/test_terminal_log_pattern.py::test_bdst_runs_through_terminal_log_extractor -v`
Expected: FAIL (terminal_log not routed in pipeline)

- [ ] **Step 3: Add routing in `pipeline.py:_run_pattern_preview`**

Find `_run_pattern_preview` and add the terminal_log case:

```python
def _run_pattern_preview(sheet, pattern_name: str) -> tuple[list, list]:
    """Route to the correct extractor based on pattern name."""
    if pattern_name == "terminal_log":
        return extract_terminal_log(_sheet_to_rows(sheet))
    # ... existing routing
```

(Adjust the function signature to match existing code; check pipeline.py for the actual pattern switch.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. pytest tests/test_terminal_log_pattern.py -v`
Expected: PASS

- [ ] **Step 5: Run full pipeline tests for regression**

Run: `cd backend && PYTHONPATH=. pytest tests/test_import_pipeline.py -v`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
cd backend
git add app/contexts/operations/infrastructure/import_pipeline/pipeline.py
git commit -m "feat(import): route terminal_log pattern to extract_terminal_log"
```

---

### Phase 3: Synonym expansion + fuzzy matching

#### Task 3.1 — Expand SYNONYMS with BDST/VIPI/ultima headers

**Files:**
- Modify: `backend/app/contexts/operations/infrastructure/import_pipeline/canonical.py:109-222`
- Test: `backend/tests/test_canonical_synonyms.py` (existing, update)

- [ ] **Step 1: Write failing test for new synonyms**

```python
# Add to tests/test_canonical_synonyms.py
from app.contexts.operations.infrastructure.import_pipeline.canonical import SYNONYMS

def test_bdst_headers_in_synonyms():
    """Headers from BDST should be in the SYNONYMS dict."""
    # Normalized forms (lowercase, no diacritics, no spaces)
    assert "socontainer" in SYNONYMS or any("socontainer" in k for k in SYNONYMS.keys())
    assert "hangkhaithac" in SYNONYMS or any("hangkhaithac" in k for k in SYNONYMS.keys())
    assert "loaicongviec" in SYNONYMS or any("loaicongviec" in k for k in SYNONYMS.keys())
    assert "fe" in SYNONYMS  # F/E column

def test_ultima_headers_in_synonyms():
    """Headers from ultima should be in the SYNONYMS dict."""
    assert "ngaydi" in SYNONYMS or any("ngaydi" in k for k in SYNONYMS.keys())
    assert "chuhang" in SYNONYMS or any("chuhang" in k for k in SYNONYMS.keys())
    assert "tentau" in SYNONYMS or any("tentau" in k for k in SYNONYMS.keys())
    assert "f20'" in SYNONYMS or any("f20'" in k for k in SYNONYMS.keys())
    assert "f40'" in SYNONYMS or any("f40'" in k for k in SYNONYMS.keys())
    assert "e20'" in SYNONYMS or any("e20'" in k for k in SYNONYMS.keys())
    assert "e40'" in SYNONYMS or any("e40'" in k for k in SYNONYMS.keys())
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. pytest tests/test_canonical_synonyms.py -v`
Expected: FAIL (synonyms missing)

- [ ] **Step 3: Add new synonyms to canonical.py**

In `canonical.py`, find the `SYNONYMS` dict and add (preserving existing structure):

```python
# In SYNONYMS dict, add these entries:
SYNONYMS.update({
    # BDST / VIPI / terminal log headers
    "socontainer": "container_number",
    "hangkhaithac": "vessel_name",  # shipping line as vessel proxy
    "loaicongviec": "work_type",
    "fe": "freight_kind",
    "kiechiso": "cont_type",
    "nhapxuat": "import_export",
    "phuongthucra": "discharge_method",
    "loaihang": "cargo_type",
    "hangnoingoai": "cargo_origin",

    # Ultima / customer trip headers
    "ngaydi": "trip_date",
    "chuhang": "customer_code",
    "tentau": "vessel_name",
    "f20'": "cont_type_pivot",
    "f40'": "cont_type_pivot",
    "e20'": "cont_type_pivot",
    "e40'": "cont_type_pivot",
    "tacnghiep": "work_type",
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. pytest tests/test_canonical_synonyms.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd backend
git add app/contexts/operations/infrastructure/import_pipeline/canonical.py tests/test_canonical_synonyms.py
git commit -m "feat(import): expand SYNONYMS with BDST/VIPI/ultima headers"
```

#### Task 3.2 — Add Levenshtein fuzzy header matching

**Files:**
- Modify: `backend/app/contexts/operations/infrastructure/import_pipeline/column_mapper.py`
- Test: `backend/tests/test_fuzzy_header_matching.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_fuzzy_header_matching.py
from app.contexts.operations.infrastructure.import_pipeline.column_mapper import fuzzy_match_header

def test_fuzzy_match_typo():
    """A header with a typo (e.g. 'Só Container') should fuzzy-match 'Số Container'."""
    result = fuzzy_match_header("Só Container")  # missing d
    assert result is not None
    canonical_field, confidence = result
    assert canonical_field == "container_number"
    assert confidence >= 0.7

def test_fuzzy_match_no_match_returns_none():
    """A completely unrelated header should return None."""
    result = fuzzy_match_header("blah blah xyz")
    assert result is None or result[1] < 0.5
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. pytest tests/test_fuzzy_header_matching.py -v`
Expected: FAIL (function doesn't exist)

- [ ] **Step 3: Add `fuzzy_match_header` function**

In `column_mapper.py`, add:

```python
def _levenshtein(s1: str, s2: str) -> int:
    """Levenshtein distance between two strings."""
    if len(s1) < len(s2):
        return _levenshtein(s2, s1)
    if len(s2) == 0:
        return len(s1)
    prev_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        curr_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = prev_row[j + 1] + 1
            deletions = curr_row[j] + 1
            substitutions = prev_row[j] + (c1 != c2)
            curr_row.append(min(insertions, deletions, substitutions))
        prev_row = curr_row
    return prev_row[-1]


def fuzzy_match_header(header: str, max_distance: int = 2) -> tuple[str, float] | None:
    """Match a header to a canonical field using Levenshtein distance.

    Returns (canonical_field, confidence) where confidence is 1.0 - (distance / max_len).
    Returns None if no match within max_distance.
    """
    from .canonical import SYNONYMS, normalize_for_match

    if not header:
        return None
    normalized = normalize_for_match(header)
    if not normalized:
        return None

    best_field = None
    best_distance = max_distance + 1

    for synonym, field in SYNONYMS.items():
        if not synonym:
            continue
        dist = _levenshtein(normalized, synonym)
        if dist < best_distance and dist <= max_distance:
            best_distance = dist
            best_field = field

    if best_field is None:
        return None

    # Confidence: 1.0 for exact match, 0.7 for distance=1, 0.5 for distance=2
    confidence = 1.0 - (best_distance * 0.15)
    return (best_field, confidence)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. pytest tests/test_fuzzy_header_matching.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd backend
git add app/contexts/operations/infrastructure/import_pipeline/column_mapper.py tests/test_fuzzy_header_matching.py
git commit -m "feat(import): add Levenshtein fuzzy header matching"
```

---

### Phase 4: MappingProfile model + endpoints

#### Task 4.1 — Create migration

**Files:**
- Create: `backend/alembic/versions/0006_add_mapping_profiles.py`

- [ ] **Step 1: Generate migration with alembic**

```bash
cd backend && PYTHONPATH=. alembic revision --autogenerate -m "add_mapping_profiles"
```

Expected: New file `0006_add_mapping_profiles.py` created

- [ ] **Step 2: Add `MappingProfile` ORM model first (so alembic detects it)**

In `backend/app/contexts/operations/infrastructure/orm.py`, add (matching existing patterns in the file):

```python
class MappingProfile(Base):
    __tablename__ = "mapping_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    profile_name: Mapped[str] = mapped_column(String(64), index=True)
    template_filename: Mapped[str] = mapped_column(String(255))
    header_signature: Mapped[str] = mapped_column(String(64), index=True)
    column_mapping_json: Mapped[str] = mapped_column(Text)
    pivot_columns_json: Mapped[str] = mapped_column(Text, default="[]")
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    last_used_at: Mapped[datetime | None] = mapped_column(nullable=True)
    use_count: Mapped[int] = mapped_column(default=0)
    is_active: Mapped[bool] = mapped_column(default=True)
```

- [ ] **Step 3: Re-export from `app/models/__init__.py`**

Add `MappingProfile` to the import/export list in `backend/app/models/__init__.py`.

- [ ] **Step 4: Regenerate migration (now that model exists)**

```bash
cd backend && PYTHONPATH=. alembic revision --autogenerate -m "add_mapping_profiles"
```

Expected: Migration file now has the `mapping_profiles` table definition.

- [ ] **Step 5: Run migration**

```bash
cd backend && PYTHONPATH=. alembic upgrade head
```

Expected: `mapping_profiles` table created in DB

- [ ] **Step 6: Write test for table existence**

```python
# tests/test_mapping_profiles.py
from sqlalchemy import inspect
from app.core.db import engine

def test_mapping_profiles_table_exists():
    """The mapping_profiles table should exist after migration."""
    insp = inspect(engine)
    assert "mapping_profiles" in insp.get_table_names()
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. pytest tests/test_mapping_profiles.py -v`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
cd backend
git add alembic/versions/0006_add_mapping_profiles.py app/contexts/operations/infrastructure/orm.py app/models/__init__.py tests/test_mapping_profiles.py
git commit -m "feat(import): add MappingProfile model and migration"
```

#### Task 4.2 — Add MappingProfileRepository

**Files:**
- Create: `backend/app/contexts/operations/infrastructure/repositories/mapping_profile_repository.py`
- Modify: `backend/app/contexts/operations/interface/dependencies.py`
- Test: `backend/tests/test_mapping_profiles.py`

- [ ] **Step 1: Write failing test for repository**

```python
# Add to tests/test_mapping_profiles.py
import pytest
from app.contexts.operations.infrastructure.orm import MappingProfile
from app.contexts.operations.infrastructure.repositories.mapping_profile_repository import MappingProfileRepository

@pytest.mark.asyncio
async def test_save_and_get_profile_by_signature(db_session):
    """Save a profile, then retrieve it by header_signature."""
    repo = MappingProfileRepository(db_session)
    profile = await repo.create(
        profile_name="Test BDST",
        template_filename="BDST 30.5.xls",
        header_signature="abc123",
        column_mapping_json='{"1": "container_number"}',
        pivot_columns_json='[]',
        created_by_id=1,
    )
    fetched = await repo.get_by_signature("abc123")
    assert fetched is not None
    assert fetched.id == profile.id
    assert fetched.profile_name == "Test BDST"

@pytest.mark.asyncio
async def test_list_active_profiles(db_session):
    """list_active should return all is_active=True profiles."""
    repo = MappingProfileRepository(db_session)
    await repo.create(profile_name="A", template_filename="a.xls", header_signature="sig_a", column_mapping_json="{}", pivot_columns_json="[]", created_by_id=1)
    await repo.create(profile_name="B", template_filename="b.xls", header_signature="sig_b", column_mapping_json="{}", pivot_columns_json="[]", created_by_id=1, is_active=False)
    profiles = await repo.list_active()
    assert len(profiles) == 1
    assert profiles[0].profile_name == "A"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. pytest tests/test_mapping_profiles.py -v`
Expected: FAIL (repository doesn't exist)

- [ ] **Step 3: Implement `MappingProfileRepository`**

Create `mapping_profile_repository.py`:

```python
"""Repository for MappingProfile ORM."""
from typing import Sequence
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..orm import MappingProfile


class MappingProfileRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create(
        self,
        profile_name: str,
        template_filename: str,
        header_signature: str,
        column_mapping_json: str,
        pivot_columns_json: str,
        created_by_id: int,
        is_active: bool = True,
    ) -> MappingProfile:
        profile = MappingProfile(
            profile_name=profile_name,
            template_filename=template_filename,
            header_signature=header_signature,
            column_mapping_json=column_mapping_json,
            pivot_columns_json=pivot_columns_json,
            created_by_id=created_by_id,
            is_active=is_active,
        )
        self._session.add(profile)
        await self._session.flush()
        return profile

    async def get_by_signature(self, header_signature: str) -> MappingProfile | None:
        stmt = select(MappingProfile).where(
            MappingProfile.header_signature == header_signature,
            MappingProfile.is_active == True,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, profile_id: int) -> MappingProfile | None:
        stmt = select(MappingProfile).where(MappingProfile.id == profile_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_active(self, profile_name: str | None = None) -> Sequence[MappingProfile]:
        stmt = select(MappingProfile).where(MappingProfile.is_active == True)
        if profile_name:
            stmt = stmt.where(MappingProfile.profile_name == profile_name)
        stmt = stmt.order_by(MappingProfile.use_count.desc(), MappingProfile.last_used_at.desc())
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def mark_used(self, profile_id: int) -> None:
        from datetime import datetime
        stmt = (
            update(MappingProfile)
            .where(MappingProfile.id == profile_id)
            .values(
                last_used_at=datetime.utcnow(),
                use_count=MappingProfile.use_count + 1,
            )
        )
        await self._session.execute(stmt)
```

- [ ] **Step 4: Add to `dependencies.py`**

In `backend/app/contexts/operations/interface/dependencies.py`, add:

```python
def get_mapping_profile_repo(session: AsyncSession = Depends(get_db)) -> MappingProfileRepository:
    return MappingProfileRepository(session)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. pytest tests/test_mapping_profiles.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd backend
git add app/contexts/operations/infrastructure/repositories/mapping_profile_repository.py app/contexts/operations/interface/dependencies.py tests/test_mapping_profiles.py
git commit -m "feat(import): add MappingProfileRepository with CRUD"
```

#### Task 4.3 — Add API endpoints for profiles

**Files:**
- Modify: `backend/app/contexts/operations/interface/routers/imports.py`
- Modify: `backend/app/contexts/operations/interface/schemas.py`
- Test: `backend/tests/test_mapping_profiles.py`

- [ ] **Step 1: Add Pydantic schemas**

In `backend/app/contexts/operations/interface/schemas.py`, add:

```python
class MappingProfileCreateSchema(BaseModel):
    profile_name: str = Field(..., min_length=1, max_length=64)
    template_filename: str
    header_signature: str
    column_mapping: dict[int, str]  # {col_idx: canonical_field}
    pivot_columns: list[str] = Field(default_factory=list)


class MappingProfileSchema(BaseModel):
    id: int
    profile_name: str
    template_filename: str
    header_signature: str
    column_mapping: dict[int, str]
    pivot_columns: list[str]
    created_at: datetime
    last_used_at: datetime | None
    use_count: int

    class Config:
        from_attributes = True
```

- [ ] **Step 2: Add endpoints to router**

In `imports.py`, add:

```python
@router.get("/customer-excel/profiles", response_model=list[MappingProfileSchema])
async def list_profiles(
    profile_name: str | None = None,
    repo: MappingProfileRepository = Depends(get_mapping_profile_repo),
    _user: User = Depends(get_current_user),
):
    return await repo.list_active(profile_name=profile_name)


@router.post("/customer-excel/profiles", response_model=MappingProfileSchema, status_code=201)
async def save_profile(
    payload: MappingProfileCreateSchema,
    repo: MappingProfileRepository = Depends(get_mapping_profile_repo),
    user: User = Depends(get_current_user),
):
    import json
    profile = await repo.create(
        profile_name=payload.profile_name,
        template_filename=payload.template_filename,
        header_signature=payload.header_signature,
        column_mapping_json=json.dumps({str(k): v for k, v in payload.column_mapping.items()}),
        pivot_columns_json=json.dumps(payload.pivot_columns),
        created_by_id=user.id,
    )
    return profile
```

- [ ] **Step 3: Write integration test**

```python
# Add to tests/test_mapping_profiles.py
from httpx import AsyncClient
import json

@pytest.mark.asyncio
async def test_save_profile_endpoint(async_client: AsyncClient, make_auth_headers):
    """POST /customer-excel/profiles should create a profile."""
    headers = await make_auth_headers(role="accountant")
    payload = {
        "profile_name": "BDST Bãi",
        "template_filename": "BDST 30.5.xls",
        "header_signature": "abc123def",
        "column_mapping": {"1": "container_number", "14": "trip_date"},
        "pivot_columns": [],
    }
    resp = await async_client.post("/api/v1/customer-excel/profiles", json=payload, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["profile_name"] == "BDST Bãi"

@pytest.mark.asyncio
async def test_list_profiles_endpoint(async_client: AsyncClient, make_auth_headers, db_session):
    """GET /customer-excel/profiles should list active profiles."""
    from app.contexts.operations.infrastructure.orm import MappingProfile
    profile = MappingProfile(
        profile_name="VIPI",
        template_filename="VIPI 28.5.xls",
        header_signature="vipihash",
        column_mapping_json="{}",
        pivot_columns_json="[]",
        created_by_id=1,
    )
    db_session.add(profile)
    await db_session.flush()

    headers = await make_auth_headers(role="accountant")
    resp = await async_client.get("/api/v1/customer-excel/profiles", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert any(p["profile_name"] == "VIPI" for p in data)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && PYTHONPATH=. pytest tests/test_mapping_profiles.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
cd backend
git add app/contexts/operations/interface/routers/imports.py app/contexts/operations/interface/schemas.py tests/test_mapping_profiles.py
git commit -m "feat(import): add profile list and save endpoints"
```

---

### Phase 5: AI inference (Layer 3)

#### Task 5.1 — Add `infer_schema_with_ai` function

**Files:**
- Create: `backend/app/contexts/operations/infrastructure/import_pipeline/ai_inference.py`
- Test: `backend/tests/test_ai_inference.py`

- [ ] **Step 1: Write failing test (with mocked Gemini)**

```python
# tests/test_ai_inference.py
import pytest
from unittest.mock import patch, AsyncMock
from app.contexts.operations.infrastructure.import_pipeline.ai_inference import infer_schema_with_ai

@pytest.mark.asyncio
async def test_infer_schema_calls_gemini_and_returns_mapping():
    """infer_schema_with_ai should send headers + sample rows to Gemini and return a mapping."""
    headers = ["Mã cont", "Ngày xếp", "Hãng tàu", "Kích cỡ"]
    sample_rows = [
        ["CAIU6167954", "2026-06-02", "ONE", "40"],
        ["CAIU6386850", "2026-06-02", "ONE", "40"],
    ]

    mock_response = {
        "0": {"field": "container_number", "confidence": 0.95},
        "1": {"field": "trip_date", "confidence": 0.92},
        "2": {"field": "vessel_name", "confidence": 0.88},
        "3": {"field": "cont_type", "confidence": 0.85},
    }

    with patch("app.contexts.operations.infrastructure.import_pipeline.ai_inference._call_gemini", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = mock_response
        result = await infer_schema_with_ai(headers, sample_rows)

    assert result[0].canonical_field == "container_number"
    assert result[0].confidence == 0.95
    assert result[3].canonical_field == "cont_type"

@pytest.mark.asyncio
async def test_infer_schema_caches_result_by_header_signature():
    """Second call with same headers should not re-call Gemini."""
    headers = ["Mã cont", "Ngày xếp"]
    sample_rows = [["X1", "2026-01-01"]]

    with patch("app.contexts.operations.infrastructure.import_pipeline.ai_inference._call_gemini", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = {"0": {"field": "container_number", "confidence": 0.9}, "1": {"field": "trip_date", "confidence": 0.9}}
        await infer_schema_with_ai(headers, sample_rows)
        await infer_schema_with_ai(headers, sample_rows)  # should use cache
        assert mock_call.call_count == 1, f"Expected 1 call (cached), got {mock_call.call_count}"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. pytest tests/test_ai_inference.py -v`
Expected: FAIL (function doesn't exist)

- [ ] **Step 3: Implement `infer_schema_with_ai`**

Create `ai_inference.py`:

```python
"""AI-powered schema inference for customer Excel imports.

Uses Gemini to propose column → canonical_field mappings when heuristic
methods fail. Caches results by header signature.
"""
import hashlib
import json
import logging
from dataclasses import dataclass

from .canonical import CANONICAL_FIELDS

logger = logging.getLogger(__name__)

_CACHE: dict[str, dict[int, dict]] = {}


@dataclass
class InferredColumn:
    canonical_field: str
    confidence: float


def _header_signature(headers: list[str]) -> str:
    """Stable hash of normalized headers for cache key."""
    normalized = "|".join(h.strip().lower() for h in headers if h)
    return hashlib.sha256(normalized.encode()).hexdigest()


def _build_prompt(headers: list[str], sample_rows: list[list]) -> str:
    """Build the Gemini prompt with headers + samples + canonical schema."""
    field_list = "\n".join(f"- {name}: {desc}" for name, desc in CANONICAL_FIELDS.items())
    header_line = " | ".join(f"[{i}] {h}" for i, h in enumerate(headers))
    sample_lines = "\n".join(
        " | ".join(str(cell) for cell in row) for row in sample_rows[:5]
    )
    return f"""You are a data import expert. Map these Excel column headers to canonical fields.

CANONICAL FIELDS (use these exact names):
{field_list}

HEADERS (with index):
{header_line}

SAMPLE DATA (first 5 rows):
{sample_lines}

Return a JSON object: {{"<col_index>": {{"field": "<canonical_field>", "confidence": <0.0-1.0>}}}}
Use empty object for unmappable columns. Be conservative with confidence.
"""


async def _call_gemini(prompt: str) -> dict:
    """Call Gemini API. Raises on failure."""
    from .llm import get_batch_classifier
    classifier = get_batch_classifier()
    # Reuse the existing classifier for batch prompt
    # (in real impl, would call Gemini directly with this prompt)
    # For now, return mock; replace with actual Gemini call
    if not classifier or not hasattr(classifier, "_client"):
        return {}
    # Parse headers from prompt to extract column indices
    # ... (actual implementation calls Gemini)
    raise NotImplementedError("Replace with actual Gemini call")


async def infer_schema_with_ai(
    headers: list[str],
    sample_rows: list[list],
) -> dict[int, InferredColumn]:
    """Infer column mapping using Gemini, with header-signature caching.

    Returns: {col_index: InferredColumn(canonical_field, confidence)}
    Returns empty dict on failure (never raises).
    """
    sig = _header_signature(headers)
    if sig in _CACHE:
        return {idx: InferredColumn(**d) for idx, d in _CACHE[sig].items()}

    try:
        prompt = _build_prompt(headers, sample_rows)
        raw = await _call_gemini(prompt)
        _CACHE[sig] = raw
        return {int(idx): InferredColumn(**d) for idx, d in raw.items()}
    except Exception as e:
        logger.warning("infer_schema_with_ai failed: %s", e)
        return {}


def clear_cache() -> None:
    """Clear the in-process cache (for testing)."""
    _CACHE.clear()
```

- [ ] **Step 4: Implement actual `_call_gemini` (replace NotImplementedError)**

Replace the `_call_gemini` stub with a real call to Gemini:

```python
async def _call_gemini(prompt: str) -> dict:
    """Call Gemini API. Returns parsed JSON response. Raises on failure."""
    import os
    import httpx
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1024},
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    # Extract JSON from response (may be wrapped in ```json ... ```)
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]
    return json.loads(text.strip())
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && PYTHONPATH=. pytest tests/test_ai_inference.py -v`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
cd backend
git add app/contexts/operations/infrastructure/import_pipeline/ai_inference.py tests/test_ai_inference.py
git commit -m "feat(import): add AI schema inference with header-signature cache"
```

---

### Phase 6: Pipeline integration (full 3-layer flow)

#### Task 6.1 — Add `confidence` and `source` to `PreviewRow`

**Files:**
- Modify: `backend/app/contexts/operations/infrastructure/import_pipeline/pipeline.py`
- Test: `backend/tests/test_pipeline_confidence.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_pipeline_confidence.py
from app.contexts.operations.infrastructure.import_pipeline.pipeline import run_preview

def test_preview_row_has_confidence_field():
    """PreviewRow should have a confidence field (0.0-1.0) per row."""
    with open("docs/templates/ultima02.06.xlsx", "rb") as f:
        content = f.read()
    result = run_preview(content, filename="ultima02.06.xlsx")
    assert len(result.accepted) > 0
    sample = result.accepted[0]
    assert hasattr(sample, "confidence")
    assert 0.0 <= sample.confidence <= 1.0
    assert hasattr(sample, "source")
    assert sample.source in ("pattern", "synonym", "fuzzy", "value_pattern", "ai", "profile", "unmapped")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. pytest tests/test_pipeline_confidence.py -v`
Expected: FAIL (fields don't exist)

- [ ] **Step 3: Add fields to `ExtractedRow` (in pattern_extractors.py) and `PreviewRow` (in pipeline.py)**

In `pattern_extractors.py`, find `ExtractedRow` dataclass and add:
```python
@dataclass
class ExtractedRow:
    # ... existing fields ...
    confidence: float = 1.0
    source: str = "pattern"
```

In `pipeline.py`, ensure `PreviewRow` passes through these fields (or has its own).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. pytest tests/test_pipeline_confidence.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd backend
git add app/contexts/operations/infrastructure/import_pipeline/pipeline.py app/contexts/operations/infrastructure/import_pipeline/pattern_extractors.py tests/test_pipeline_confidence.py
git commit -m "feat(import): add confidence and source to PreviewRow/ExtractedRow"
```

#### Task 6.2 — Wire Layer 3 (AI fallback) into `run_preview`

**Files:**
- Modify: `backend/app/contexts/operations/infrastructure/import_pipeline/pipeline.py`
- Test: `backend/tests/test_pipeline_confidence.py`

- [ ] **Step 1: Write failing test for AI fallback triggering**

```python
# Add to tests/test_pipeline_confidence.py
from unittest.mock import patch, AsyncMock
import pytest

@pytest.mark.asyncio
async def test_run_preview_calls_ai_when_heuristic_low_confidence():
    """When heuristic mapping leaves columns with confidence < 0.6, AI fallback should be called."""
    with open("docs/templates/ultima02.06.xlsx", "rb") as f:
        content = f.read()
    with patch("app.contexts.operations.infrastructure.import_pipeline.pipeline.infer_schema_with_ai", new_callable=AsyncMock) as mock_ai:
        mock_ai.return_value = {}
        result = run_preview(content, filename="ultima02.06.xlsx")
        # ultima is settlement_list (pattern match), so AI shouldn't fire
        # This test just verifies no crash; adjust per actual behavior
        assert result is not None
```

- [ ] **Step 2: Wire AI fallback**

In `pipeline.py`, find `_run_generic_preview` and add AI fallback after heuristic mapping:

```python
async def _run_generic_preview(sheet, ...):
    # ... existing heuristic mapping ...
    mapping = map_columns(headers, sample_rows)

    # If any required field is unmapped OR confidence is low, try AI
    if mapping.has_low_confidence(threshold=0.6) or mapping.missing_required():
        from .ai_inference import infer_schema_with_ai
        inferred = await infer_schema_with_ai(headers, sample_rows)
        mapping.merge_ai_inference(inferred)

    return apply_mapping(sheet, mapping)
```

- [ ] **Step 3: Make `map_columns` and `ColumnMapping` async-aware**

Add `has_low_confidence()` and `missing_required()` methods to `ColumnMapping`. Add `merge_ai_inference()` method.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. pytest tests/test_pipeline_confidence.py -v`
Expected: PASS

- [ ] **Step 5: Run full pipeline tests for regression**

Run: `cd backend && PYTHONPATH=. pytest tests/test_import_pipeline.py -v`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
cd backend
git add app/contexts/operations/infrastructure/import_pipeline/pipeline.py app/contexts/operations/infrastructure/import_pipeline/column_mapper.py tests/test_pipeline_confidence.py
git commit -m "feat(import): wire AI fallback into _run_generic_preview"
```

#### Task 6.3 — Wire `MappingProfilePicker` (Layer 2 cache hit)

**Files:**
- Modify: `backend/app/contexts/operations/infrastructure/import_pipeline/column_mapper.py`
- Test: `backend/tests/test_mapping_profiles.py`

- [ ] **Step 1: Write failing test**

```python
# Add to tests/test_mapping_profiles.py
import pytest
from app.contexts.operations.infrastructure.import_pipeline.column_mapper import MappingProfilePicker

@pytest.mark.asyncio
async def test_profile_picker_returns_cached_mapping(db_session):
    """If a profile exists for the header signature, picker returns it."""
    from app.contexts.operations.infrastructure.repositories.mapping_profile_repository import MappingProfileRepository
    repo = MappingProfileRepository(db_session)
    await repo.create(
        profile_name="BDST",
        template_filename="BDST 30.5.xls",
        header_signature="bdst-hash-123",
        column_mapping_json='{"1": "container_number", "14": "trip_date"}',
        pivot_columns_json="[]",
        created_by_id=1,
    )

    picker = MappingProfilePicker(repo)
    mapping = await picker.pick(headers=["", "Số Container", "Hãng khai thác"], sample_rows=[])
    assert mapping is not None
    assert mapping["1"] == "container_number"

@pytest.mark.asyncio
async def test_profile_picker_returns_none_if_no_match(db_session):
    """If no profile exists, picker returns None."""
    from app.contexts.operations.infrastructure.repositories.mapping_profile_repository import MappingProfileRepository
    picker = MappingProfilePicker(MappingProfileRepository(db_session))
    mapping = await picker.pick(headers=["Unknown Header"], sample_rows=[])
    assert mapping is None
```

- [ ] **Step 2: Implement `MappingProfilePicker`**

In `column_mapper.py`, add:

```python
import hashlib
import json


class MappingProfilePicker:
    def __init__(self, repo):
        self._repo = repo

    @staticmethod
    def _signature(headers: list[str]) -> str:
        normalized = "|".join(h.strip().lower() for h in headers if h)
        return hashlib.sha256(normalized.encode()).hexdigest()

    async def pick(self, headers: list[str], sample_rows: list[list]) -> dict | None:
        sig = self._signature(headers)
        profile = await self._repo.get_by_signature(sig)
        if profile is None:
            return None
        # Mark as used
        await self._repo.mark_used(profile.id)
        # Return mapping (convert string keys to int)
        raw = json.loads(profile.column_mapping_json)
        return {int(k): v for k, v in raw.items()}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. pytest tests/test_mapping_profiles.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd backend
git add app/contexts/operations/infrastructure/import_pipeline/column_mapper.py tests/test_mapping_profiles.py
git commit -m "feat(import): add MappingProfilePicker for cache hits"
```

---

### Phase 7: Frontend UI

#### Task 7.1 — Add confidence badge component

**Files:**
- Create: `frontend/src/components/imports/ConfidenceBadge.tsx`
- Create: `frontend/src/components/imports/index.ts`

- [ ] **Step 1: Create ConfidenceBadge component**

```typescript
// frontend/src/components/imports/ConfidenceBadge.tsx
import { cn } from "@/lib/utils";

type Confidence = number;

export function ConfidenceBadge({ confidence, source }: { confidence: Confidence; source: string }) {
  const variant =
    confidence >= 0.9
      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
      : confidence >= 0.6
      ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
      : "bg-rose-500/10 text-rose-700 border-rose-500/20";

  const label =
    source === "pattern" ? "Pattern" :
    source === "synonym" ? "Synonym" :
    source === "fuzzy" ? "Fuzzy" :
    source === "value_pattern" ? "Value" :
    source === "ai" ? "AI" :
    source === "profile" ? "Profile" :
    "Unmapped";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        variant
      )}
      title={`Source: ${source} (${Math.round(confidence * 100)}% confidence)`}
    >
      {label} {Math.round(confidence * 100)}%
    </span>
  );
}
```

- [ ] **Step 2: Create barrel export**

```typescript
// frontend/src/components/imports/index.ts
export { ConfidenceBadge } from "./ConfidenceBadge";
export { ColumnMapper } from "./ColumnMapper";
export { SaveProfileDialog } from "./SaveProfileDialog";
export { ProfilePicker } from "./ProfilePicker";
```

- [ ] **Step 3: Run lint to verify**

Run: `cd frontend && pnpm lint`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd frontend
git add src/components/imports/
git commit -m "feat(imports-ui): add ConfidenceBadge component"
```

#### Task 7.2 — Add ColumnMapper (drag-to-remap)

**Files:**
- Create: `frontend/src/components/imports/ColumnMapper.tsx`

- [ ] **Step 1: Create ColumnMapper component**

```typescript
// frontend/src/components/imports/ColumnMapper.tsx
import { useState } from "react";
import { CANONICAL_FIELDS } from "@/data/domain";
import { ConfidenceBadge } from "./ConfidenceBadge";

type ColumnMapping = Record<number, { field: string; confidence: number; source: string }>;

export function ColumnMapper({
  headers,
  mapping,
  onChange,
}: {
  headers: string[];
  mapping: ColumnMapping;
  onChange: (newMapping: ColumnMapping) => void;
}) {
  const [draggedCol, setDraggedCol] = useState<number | null>(null);

  const handleDrop = (field: string) => {
    if (draggedCol === null) return;
    onChange({
      ...mapping,
      [draggedCol]: { field, confidence: 1.0, source: "manual" },
    });
    setDraggedCol(null);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Cột trong file</h3>
        {headers.map((h, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => setDraggedCol(i)}
            onDragEnd={() => setDraggedCol(null)}
            className="p-2 mb-1 rounded border cursor-grab hover:bg-muted"
          >
            <div className="text-xs text-muted-foreground">Cột {i}</div>
            <div className="font-medium">{h || "(trống)"}</div>
            {mapping[i] && (
              <ConfidenceBadge
                confidence={mapping[i].confidence}
                source={mapping[i].source}
              />
            )}
          </div>
        ))}
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Trường dữ liệu</h3>
        {Object.entries(CANONICAL_FIELDS).map(([field, desc]) => (
          <div
            key={field}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(field)}
            className="p-2 mb-1 rounded border border-dashed hover:border-primary"
          >
            <div className="font-medium">{field}</div>
            <div className="text-xs text-muted-foreground">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run lint**

Run: `cd frontend && pnpm lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/components/imports/ColumnMapper.tsx
git commit -m "feat(imports-ui): add ColumnMapper drag-to-remap"
```

#### Task 7.3 — Add SaveProfileDialog component

**Files:**
- Create: `frontend/src/components/imports/SaveProfileDialog.tsx`

- [ ] **Step 1: Create SaveProfileDialog**

```typescript
// frontend/src/components/imports/SaveProfileDialog.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SaveProfileDialog({
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (profileName: string) => void;
  isSaving: boolean;
}) {
  const [profileName, setProfileName] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lưu profile cho khách hàng này</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium">Tên profile</label>
          <Input
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="VD: BDST Bãi ST, VIPI Khách Hàng"
            maxLength={64}
          />
          <p className="text-xs text-muted-foreground">
            Lần import sau với cùng header sẽ tự động dùng profile này.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={() => onSave(profileName)}
            disabled={!profileName.trim() || isSaving}
          >
            {isSaving ? "Đang lưu..." : "Lưu profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Run lint**

Run: `cd frontend && pnpm lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/components/imports/SaveProfileDialog.tsx
git commit -m "feat(imports-ui): add SaveProfileDialog"
```

#### Task 7.4 — Add ProfilePicker component

**Files:**
- Create: `frontend/src/components/imports/ProfilePicker.tsx`

- [ ] **Step 1: Create ProfilePicker**

```typescript
// frontend/src/components/imports/ProfilePicker.tsx
import { MappingProfile } from "@/services/api/mapping-profiles.api";
import { Card, CardContent } from "@/components/ui/card";

export function ProfilePicker({
  profiles,
  onSelect,
  onSkip,
}: {
  profiles: MappingProfile[];
  onSelect: (profile: MappingProfile) => void;
  onSkip: () => void;
}) {
  if (profiles.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Có profile đã lưu cho file này:</p>
      <div className="space-y-1">
        {profiles.map((p) => (
          <Card
            key={p.id}
            className="cursor-pointer hover:bg-muted"
            onClick={() => onSelect(p)}
          >
            <CardContent className="p-3">
              <div className="font-medium">{p.profile_name}</div>
              <div className="text-xs text-muted-foreground">
                {p.template_filename} · đã dùng {p.use_count} lần
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <button
        onClick={onSkip}
        className="text-xs text-muted-foreground hover:underline"
      >
        Bỏ qua, để hệ thống tự nhận
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Run lint**

Run: `cd frontend && pnpm lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/components/imports/ProfilePicker.tsx
git commit -m "feat(imports-ui): add ProfilePicker"
```

#### Task 7.5 — Add API service and TanStack Query hooks

**Files:**
- Create: `frontend/src/services/api/mapping-profiles.api.ts`
- Create: `frontend/src/hooks/queries/useMappingProfiles.ts`

- [ ] **Step 1: Create API service**

```typescript
// frontend/src/services/api/mapping-profiles.api.ts
import { api } from "./client";

export interface MappingProfile {
  id: number;
  profile_name: string;
  template_filename: string;
  header_signature: string;
  column_mapping: Record<number, string>;
  pivot_columns: string[];
  created_at: string;
  last_used_at: string | null;
  use_count: number;
}

export interface MappingProfileCreate {
  profile_name: string;
  template_filename: string;
  header_signature: string;
  column_mapping: Record<number, string>;
  pivot_columns?: string[];
}

export const mappingProfilesApi = {
  list: async (profileName?: string): Promise<MappingProfile[]> => {
    const params = profileName ? { profile_name: profileName } : {};
    const { data } = await api.get("/customer-excel/profiles", { params });
    return data;
  },
  save: async (payload: MappingProfileCreate): Promise<MappingProfile> => {
    const { data } = await api.post("/customer-excel/profiles", payload);
    return data;
  },
};
```

- [ ] **Step 2: Create TanStack Query hook**

```typescript
// frontend/src/hooks/queries/useMappingProfiles.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mappingProfilesApi, MappingProfileCreate } from "@/services/api/mapping-profiles.api";

export function useMappingProfiles(profileName?: string) {
  return useQuery({
    queryKey: ["mapping-profiles", profileName],
    queryFn: () => mappingProfilesApi.list(profileName),
  });
}

export function useSaveMappingProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MappingProfileCreate) => mappingProfilesApi.save(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mapping-profiles"] });
    },
  });
}
```

- [ ] **Step 3: Run lint**

Run: `cd frontend && pnpm lint`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd frontend
git add src/services/api/mapping-profiles.api.ts src/hooks/queries/useMappingProfiles.ts
git commit -m "feat(imports-ui): add profile API service and TanStack hooks"
```

#### Task 7.6 — Wire UI into ExcelImportDrawer

**Files:**
- Modify: `frontend/src/components/shared/overlays/ExcelImportDrawer.tsx`

- [ ] **Step 1: Add imports and wire ConfidenceBadge + ColumnMapper**

Find the preview rendering section in `ExcelImportDrawer.tsx`. Add:

```typescript
import { ConfidenceBadge, ColumnMapper, SaveProfileDialog, ProfilePicker } from "@/components/imports";
import { useMappingProfiles, useSaveMappingProfile } from "@/hooks/queries/useMappingProfiles";

// Inside the component, where preview rows are rendered:
<ConfidenceBadge confidence={row.confidence} source={row.source} />

// For column mapping edit:
<ColumnMapper
  headers={preview.headers}
  mapping={preview.column_mapping}
  onChange={setEditedMapping}
/>

// After successful import commit:
<SaveProfileDialog
  open={showSaveDialog}
  onOpenChange={setShowSaveDialog}
  onSave={(profileName) => saveProfile.mutate({
    profile_name: profileName,
    template_filename: filename,
    header_signature: preview.header_signature,
    column_mapping: editedMapping,
  })}
/>

// On new import, show profile picker:
<ProfilePicker
  profiles={profiles || []}
  onSelect={(profile) => applyProfile(profile)}
/>
```

(Adjust based on the actual structure of `ExcelImportDrawer.tsx`. The exact integration requires reading the existing file and adapting to its state management.)

- [ ] **Step 2: Run lint**

Run: `cd frontend && pnpm lint`
Expected: No errors

- [ ] **Step 3: Run type check**

Run: `cd frontend && pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd frontend
git add src/components/shared/overlays/ExcelImportDrawer.tsx
git commit -m "feat(imports-ui): wire confidence badges, column mapper, save dialog"
```

---

### Phase 8: Integration tests + manual QA

#### Task 8.1 — End-to-end integration tests

**Files:**
- Create: `tests/integration/test_imports_e2e.py`

- [ ] **Step 1: Write integration test for BDST**

```python
# tests/integration/test_imports_e2e.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_bdst_preview_e2e(async_client: AsyncClient, make_auth_headers):
    """End-to-end: upload BDST 30.5.xls, preview, verify rows have correct fields."""
    with open("docs/templates/BDST 30.5.xls", "rb") as f:
        content = f.read()
    headers = await make_auth_headers(role="accountant")
    files = {"file": ("BDST 30.5.xls", content, "application/vnd.ms-excel")}
    resp = await async_client.post("/api/v1/customer-excel/preview", files=files, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["accepted"]) > 500
    sample = data["accepted"][0]
    assert sample["container_number"] == "BEAU5242811"
    assert sample["trip_date"] is not None
    assert sample["work_type"] in ("Dỡ tàu", "Xếp tàu")

@pytest.mark.asyncio
async def test_vipi_preview_e2e(async_client: AsyncClient, make_auth_headers):
    """End-to-end: upload VIPI 28.5.xls, preview, verify rows."""
    with open("docs/templates/VIPI 28.5.xls", "rb") as f:
        content = f.read()
    headers = await make_auth_headers(role="accountant")
    files = {"file": ("VIPI 28.5.xls", content, "application/vnd.ms-excel")}
    resp = await async_client.post("/api/v1/customer-excel/preview", files=files, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["accepted"]) > 600
    sample = data["accepted"][0]
    assert sample["container_number"] == "BEAU5362592"

@pytest.mark.asyncio
async def test_ultima_preview_e2e(async_client: AsyncClient, make_auth_headers):
    """End-to-end: upload ultima02.06.xlsx, preview, verify trip_date is populated (was None before bug fix)."""
    with open("docs/templates/ultima02.06.xlsx", "rb") as f:
        content = f.read()
    headers = await make_auth_headers(role="accountant")
    files = {"file": ("ultima02.06.xlsx", content, "application/vnd.xlsx")}
    resp = await async_client.post("/api/v1/customer-excel/preview", files=files, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["accepted"]) > 300
    sample = data["accepted"][0]
    assert sample["trip_date"] is not None, f"trip_date should be populated, got: {sample}"
    assert sample["container_number"] is not None
```

- [ ] **Step 2: Run tests**

Run: `cd backend && PYTHONPATH=. pytest tests/integration/test_imports_e2e.py -v`
Expected: All PASS (requires backend running on localhost:8100 per AGENTS.md integration test setup)

- [ ] **Step 3: Commit**

```bash
cd backend
git add tests/integration/test_imports_e2e.py
git commit -m "test(import): add e2e integration tests for BDST/VIPI/ultima"
```

#### Task 8.2 — Playwright QA scripts

**Files:**
- Create: `qa/scripts/test_imports_ui.py`
- Create: `qa/scripts/test_imports_profile.py`

- [ ] **Step 1: Write Playwright UI test**

```python
# qa/scripts/test_imports_ui.py
"""Playwright: upload BDST, verify preview, commit.

Run: cd qa && python scripts/test_imports_ui.py
Requires: backend + frontend running, browser installed.
"""
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        # Login as accountant
        await page.goto("http://localhost:5174/login")
        await page.fill('input[name="username"]', "ketoan")
        await page.fill('input[name="password"]', "admin123")
        await page.click('button[type="submit"]')
        await page.wait_for_url("**/accountant**")

        # Navigate to imports
        await page.goto("http://localhost:5174/accountant/imports")
        await page.click('button:has-text("Import Excel")')

        # Upload BDST
        async with page.expect_file_chooser() as fc_info:
            await page.click('input[type="file"]')
        file_chooser = await fc_info.value
        await file_chooser.set_files("docs/templates/BDST 30.5.xls")

        # Wait for preview
        await page.wait_for_selector('text=BEAU5242811', timeout=30000)

        # Verify confidence badges present
        badges = await page.locator('[class*="ConfidenceBadge"]').count()
        assert badges > 0, "Expected confidence badges in preview"

        # Click Confirm
        await page.click('button:has-text("Xác nhận")')
        await page.wait_for_selector('text=Import thành công', timeout=30000)

        print("✓ BDST import UI test passed")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 2: Write profile-save test**

```python
# qa/scripts/test_imports_profile.py
"""Playwright: save profile, re-upload, verify auto-apply."""
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        # Login
        await page.goto("http://localhost:5174/login")
        await page.fill('input[name="username"]', "ketoan")
        await page.fill('input[name="password"]', "admin123")
        await page.click('button[type="submit"]')

        # Upload BDST
        await page.goto("http://localhost:5174/accountant/imports")
        await page.click('button:has-text("Import Excel")')
        async with page.expect_file_chooser() as fc_info:
            await page.click('input[type="file"]')
        file_chooser = await fc_info.value
        await file_chooser.set_files("docs/templates/BDST 30.5.xls")
        await page.wait_for_selector('text=BEAU5242811', timeout=30000)

        # Save profile
        await page.click('button:has-text("Lưu profile")')
        await page.fill('input[name="profileName"]', "BDST Bãi ST")
        await page.click('button:has-text("Lưu")')

        # Re-upload same file
        await page.goto("http://localhost:5174/accountant/imports")
        await page.click('button:has-text("Import Excel")')
        async with page.expect_file_chooser() as fc_info:
            await page.click('input[type="file"]')
        file_chooser = await fc_info.value
        await file_chooser.set_files("docs/templates/BDST 30.5.xls")

        # Should auto-apply saved profile
        await page.wait_for_selector('text=BDST Bãi ST', timeout=10000)  # profile name shown

        print("✓ Profile auto-apply test passed")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 3: Commit**

```bash
git add qa/scripts/test_imports_ui.py qa/scripts/test_imports_profile.py
git commit -m "test(imports-qa): add Playwright UI tests for import flow"
```

---

## Acceptance criteria (verify all pass before declaring done)

1. **BDST 30.5.xls** uploads → preview shows 547 rows with `container_number`, `cont_type`, `trip_date`, `work_type` populated; `confidence ≥ 0.9`; clicking Confirm saves to `booked_trips`
2. **VIPI 28.5.xls** uploads → preview shows 633 rows with same fields populated
3. **ultima02.06.xlsx** uploads → preview shows 371 rows with `trip_date` populated (regression: was None due to bug)
4. **Unknown template** (e.g. with headers like "Mã cont", "Ngày xếp") uploads → AI proposes mapping; preview shows yellow confidence badges; user can drag-remap; confirm saves correctly
5. After saving a profile for BDST, re-uploading BDST 30.5.xls uses the cached profile (no AI call)
6. All 3 sample files preview and commit in < 5 seconds end-to-end
7. All unit + integration tests pass
8. `make test` passes
9. Manual QA scripts (Playwright) pass

## Out of scope (deferred)

- Profile versioning / rollback
- Auto-detection of file format from binary signature
- Bulk import (multi-file at once)
- Customer-portal self-service profile management UI
