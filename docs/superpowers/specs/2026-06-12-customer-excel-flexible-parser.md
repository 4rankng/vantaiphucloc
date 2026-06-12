# Customer Excel Flexible Parser — Design

**Date:** 2026-06-12
**Status:** Draft
**Author:** Sisyphus (brainstorming session)
**Scope:** Make the customer Excel import flow work for any customer template (BDST, VIPI, ultima, and future customers) through a hybrid heuristic + AI strategy with user-saved mapping profiles.

## Background

The current import pipeline at `backend/app/contexts/operations/infrastructure/import_pipeline/` is rigid:

- 6 hardcoded pattern extractors (bay_plan, loading_list, dual_panel, invoice, settlement_list, stacking_plan) — none match BDST/VIPI
- Generic fallback depends on a synonym dictionary in `canonical.py`; fails when headers are unknown
- AI extraction exists but only fires after the generic path raises, is gated on `GEMINI_ENABLE=True`, and returns silently on any failure
- Three latent bugs: xlrd `datemode` not normalized (causes 30 May / 31 May flicker), settlement_list `parse_date()` result discarded at `pattern_extractors.py:799`, pattern detection threshold too strict at 0.6

Customer templates vary widely. The 3 sample files analyzed:
- **BDST 30.5.xls / VIPI 28.5.xls**: 34-column terminal operations logs (Số Container, Hãng khai thác, Kích cỡ ISO, F/E, Nhập/xuất, Loại công việc, datetime in col 14)
- **ultima02.06.xlsx**: 9-column trip schedule (NGÀY ĐI, CHỦ HÀNG, SỐ CONTAINER, F20'/F40'/E20'/E40' pivots, TÁC NGHIỆP, TÊN TẦU)

All three must work through the existing `preview → confirm → save to booked_trips` flow.

## Goal

Every customer Excel template (today's and tomorrow's) imports correctly through the existing flow. Mappings are fast for known formats, inferred for unknowns, and reusable for repeat customers.

## Non-Goals

- Changing the `booked_trips` table schema
- Replacing the 6 existing pattern extractors
- Migrating historical imports
- Touching non-customer-Excel import paths

## Architecture (3 layers in `run_preview`)

```
run_preview(file) [pipeline.py:98]
│
├─ Layer 1: Pattern Detection [pattern_detector.py]  — fast, no AI
│    • 6 existing patterns + 1 NEW: "terminal_log" (handles BDST/VIPI-style)
│    • Lower threshold: DETECTION_THRESHOLD 0.6 → 0.5
│    • Match → call matching pattern extractor
│
├─ Layer 2: Heuristic Column Mapping [column_mapper.py]  — fast, no AI
│    • Try MappingProfile cache (sha256 of normalized headers)
│    • Expand canonical.SYNONYMS with new customer header variants
│    • Add Levenshtein-distance fuzzy match (max distance 2)
│    • Add value-pattern scoring for ISO container types, F/E, dates
│    • Output ColumnMapping with per-column confidence
│
├─ Layer 3: AI Header Inference [llm.py + ai_extractor.py]  — slow, costs tokens
│    • Trigger: any column has confidence < 0.6 after Layer 2
│    • Send headers + first 5 sample rows to Gemini
│    • Prompt includes the full CANONICAL_FIELDS schema
│    • Returns {col_idx → canonical_field, confidence} per column
│    • Cache result by header_signature (sha256 of normalized headers)
│
└─ Result: PreviewRow[] with {raw_value, canonical_field, confidence, source}
           source ∈ {"pattern", "synonym", "fuzzy", "value_pattern", "ai", "profile", "unmapped"}
```

## Components

### Backend

| Component | Location | Purpose |
|---|---|---|
| `MappingProfile` (ORM) | `app/contexts/operations/infrastructure/orm.py` | Saved per-customer column mapping |
| `MappingProfileRepository` | `app/contexts/operations/infrastructure/repositories.py` | CRUD for profiles |
| `extract_terminal_log()` | `app/contexts/operations/infrastructure/import_pipeline/pattern_extractors.py` | New pattern extractor for BDST/VIPI-style files |
| `_score_terminal_log()` | `app/contexts/operations/infrastructure/import_pipeline/pattern_detector.py` | Score terminal_log pattern (target ≥ 0.5 for BDST/VIPI) |
| `infer_schema_with_ai()` | `app/contexts/operations/infrastructure/import_pipeline/ai_extractor.py` | New function: Gemini-based column mapping |
| `HeaderSignature` | `app/contexts/operations/infrastructure/import_pipeline/canonical.py` | `sha256(concat(normalized_headers))` for cache key |
| `MappingProfilePicker` | `app/contexts/operations/infrastructure/import_pipeline/column_mapper.py` | Try cached profile first; fall through to synonyms/fuzzy/AI |
| `PreviewRow.confidence` | `app/contexts/operations/infrastructure/import_pipeline/pipeline.py` | New field on preview rows: float 0.0–1.0 |
| `PreviewRow.source` | `app/contexts/operations/infrastructure/import_pipeline/pipeline.py` | New field: which layer produced the mapping |
| `GET /customer-excel/profiles` | `app/contexts/operations/interface/routers/imports.py` | List saved profiles (filter by profile_name optional) |
| `POST /customer-excel/save-profile` | `app/contexts/operations/interface/routers/imports.py` | Save current ColumnMapping as a profile |
| Migration: `mapping_profiles` table | `backend/alembic/versions/0006_add_mapping_profiles.py` | New table (next sequential revision id after `0005_fk_ondelete_set_null`) |

### MappingProfile Schema

```python
class MappingProfile(Base):
    __tablename__ = "mapping_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    profile_name: Mapped[str] = mapped_column(String(64), index=True)  # free-form, e.g. "BDST Bãi Đình Vũ", "VIPI Customer", "MIPEC Ultima"
    template_filename: Mapped[str] = mapped_column(String(255))  # e.g. "BDST 30.5.xls"
    header_signature: Mapped[str] = mapped_column(String(64), index=True)  # sha256
    column_mapping_json: Mapped[str] = mapped_column(Text)  # {"0": "container_number", ...}
    pivot_columns_json: Mapped[str] = mapped_column(Text)  # ["F20'", "F40'", ...]
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    last_used_at: Mapped[datetime | None]
    use_count: Mapped[int] = mapped_column(default=0)
    is_active: Mapped[bool] = mapped_column(default=True)
```

`profile_name` is free-form because the source can be a terminal (bãi), a customer (chủ hàng), or a vessel operator — not always a "customer" in the system's `clients` table sense. When saving a profile, the user types a name (e.g. "BDST-Bãi-ST", "VIPI-Khách-Hàng", "MIPEC-Ultima").

Re-export from `app/models/__init__.py` per AGENTS.md convention.

### Frontend

| Component | Location | Purpose |
|---|---|---|
| `PreviewRow` confidence badge | `frontend/src/components/imports/PreviewRow.tsx` (new) | Green/yellow/red badge per row |
| Column drag-to-remap | `frontend/src/components/imports/ColumnMapper.tsx` (new) | Drop header onto canonical field |
| Save-profile dialog | `frontend/src/components/imports/SaveProfileDialog.tsx` (new) | After successful import: "Save as profile for this customer?" |
| Profile picker | `frontend/src/components/imports/ProfilePicker.tsx` (new) | On import: "Use saved profile for BDST?" |

All UI text in Vietnamese. Colors via `var(--theme-*)` CSS variables per AGENTS.md.

## Data Flow

### ultima02.06.xlsx (settlement_list format)

1. User uploads → `POST /customer-excel/preview`
2. `run_preview()`:
   - Layer 1: `settlement_list` scores 0.85 (4 pivot columns F20'/F40'/E20'/E40' present) ✓
   - `extract_settlement_list()` runs
   - With bug fix: `parse_date()` result stored in `ExtractedRow.trip_date` (was discarded)
3. Preview shows 371 rows with `trip_date`, `container_number`, `cont_type` (from pivot), `customer_code` (MIPEC), `work_type` (Xuất giao thẳng), `vessel_name` (ULTIMA 1047SN)
4. User clicks Confirm → rows saved to `booked_trips`

### BDST 30.5.xls (terminal_log format, new pattern)

1. User uploads → `POST /customer-excel/preview`
2. `run_preview()`:
   - Layer 1: `terminal_log` scores 0.75 (Số Container + Loại công việc + col 14 datetime) ✓
   - `extract_terminal_log()` runs, maps:
     - col 1 → `container_number`
     - col 2 → `vessel_name` (Hãng khai thác, used as vessel proxy)
     - col 3 → `cont_type` (45G0 → E40, 22G0 → E20)
     - col 4 → `freight_kind` (F/E)
     - col 5 → informational only (Import/Export)
     - col 6 → `work_type` (Dỡ tàu / Xếp tàu)
     - col 14 → `trip_date` (parsed via `parse_date()` with datemode-normalized path)
3. Preview shows rows with `confidence=1.0`, `source="pattern"`
4. User clicks Confirm → saved to `booked_trips`
5. Optional: "Save as profile for BDST?" → creates `MappingProfile` with `header_signature=hash(headers)`

### Unknown customer (no pattern, no synonyms, AI fallback)

1. User uploads → `POST /customer-excel/preview`
2. `run_preview()`:
   - Layer 1: no pattern scores ≥ 0.5
   - Layer 2: header "Mã kiện" not in SYNONYMS, fuzzy match fails, value pattern scores 0.4
   - Layer 3: `infer_schema_with_ai()` sends headers + 5 sample rows to Gemini
   - Gemini returns `{2: "container_number", 0: "trip_date", ...}` with confidences
3. Preview shows rows with `confidence=0.75` (yellow badge), `source="ai"`
4. User reviews, optionally drags a column to remap
5. User clicks Confirm → saved
6. Optional: "Save as profile for customer X?" → caches for next time

## Bug Fixes (in this same change)

1. **`workbook.py:100-105`** — Normalize `wb.datemode` to 0 (1900 system) before `xldate_as_tuple`:
   ```python
   effective_mode = 0  # always use 1900 system
   tup = xlrd.xldate_as_tuple(cell.value, effective_mode)
   ```
2. **`value_parsers.py:163-186`** — Add `datemode: int = 0` parameter; pass it through to `_excel_serial_to_date()`:
   ```python
   _EXCEL_EPOCHS = {0: datetime(1899, 12, 30), 1: datetime(1904, 1, 1)}
   ```
3. **`pattern_extractors.py:799`** — Store `parse_date()` result in `ExtractedRow.trip_date` (currently discarded). Also: settlement_list pattern should use `work_type_val` from pivot > 0 instead of hardcoded "CHUYỂN BÃI".
4. **`pattern_detector.py:16`** — Lower `DETECTION_THRESHOLD` from 0.6 to 0.5; if no pattern scores, fall through (do not return None on first non-match).

## Error Handling

- **No pattern matches AND heuristic fails AND AI disabled or fails**: Return best-effort mapping with `confidence=0` on unmapped columns. Frontend shows red badges. User can manually remap via drag-and-drop.
- **Critical fields missing** (`container_number`, `trip_date`): Return 422 with payload `{missing_field, affected_rows: [row_idx, ...]}`.
- **AI call fails**: Log warning, return heuristic-only result. Do not raise.
- **Profile not found by signature**: Silent fallthrough to heuristic + AI. Do not raise.

## Testing

### Unit tests (in `backend/tests/`)

- `test_terminal_log_pattern.py` — extract BDST/VIPI files correctly, all required fields populated
- `test_datemode_fix.py` — both 1900-system and 1904-system .xls files produce correct dates
- `test_settlement_date.py` — ultima02.06.xlsx has `trip_date` populated (regression test for bug fix)
- `test_ai_inference_cache.py` — same headers → cached result on second call; different headers → new call
- `test_profile_save_load.py` — save profile, list profiles, use profile to map same file
- `test_fuzzy_header_matching.py` — "Sô Cont" matches "Số Cont" (typo), "Só Container" matches "Số Container"
- Update `test_import_pipeline.py` with all 3 real files (BDST, VIPI, ultima) — each must preview and commit

### Integration tests (in `tests/integration/`)

- `test_imports_e2e.py` — POST `/customer-excel/preview` with each of the 3 files returns 200 with rows
- `test_imports_save_profile.py` — POST `/customer-excel/save-profile` creates a `MappingProfile`; subsequent preview picks it up
- `test_imports_commit.py` — POST `/customer-excel/commit` saves previewed rows to `booked_trips`

### Manual QA (in `qa/scripts/`)

- `qa/scripts/test_imports_ui.py` — Playwright script: upload BDST, verify preview shows correct mappings, click Confirm, verify rows in booked_trips
- `qa/scripts/test_imports_profile.py` — Upload BDST, save profile, re-upload BDST, verify profile is auto-applied

## Migration

```bash
cd backend && PYTHONPATH=. alembic revision --autogenerate -m "add_mapping_profiles"
```

Then `alembic upgrade head`. The table is new, no data migration needed.

## Acceptance Criteria

1. BDST 30.5.xls uploads → preview shows 547 rows, each with `container_number`, `cont_type`, `trip_date`, `work_type` populated; `confidence ≥ 0.9`; clicking Confirm saves to `booked_trips`
2. VIPI 28.5.xls uploads → same as BDST (633 rows)
3. ultima02.06.xlsx uploads → preview shows 371 rows, each with `trip_date` populated (regression: was None due to bug); all pivot-derived `cont_type` correct
4. A new unknown template (e.g. with headers like "Mã cont", "Ngày xếp") uploads → AI proposes mapping; preview shows yellow confidence badges; user can drag-remap; confirm saves correctly
5. After saving a profile for BDST, re-uploading BDST 30.5.xls uses the cached profile (Layer 2 hit, no AI call)
6. All 3 sample files preview and commit in < 5 seconds end-to-end
7. All unit + integration tests pass; manual QA scripts green

## Out of Scope (deferred)

- Customer-portal self-service profile management UI
- Profile versioning / rollback
- Auto-detection of file format from binary signature
- Schema for storing "skipped rows" with reasons (currently only rejected rows have reasons)

## Open Questions

None at design time. Implementation may surface questions about Gemini prompt tuning, confidence thresholds, and how to label AI-inferred rows in the UI for users.
