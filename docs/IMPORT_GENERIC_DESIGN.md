# Generic customer-file import — design

**Goal.** Drop ANY customer's loading list / discharging list / order spreadsheet onto our import page and have the system extract trucking-order rows. No per-customer parser code. The 4 sample files in `docs/` (`LOADING LIST HAIAN DELL …`, `DISCHARGING LIST HAIAN TIME …`, `BDST 11.4.xls`, `2.GLORY SHANGHAI- 2612N.xlsx`) are training data — they exist to let us validate the algorithm, not to seed format-specific code.

> The earlier `docs/SPEC_IMPORT_DANH_SACH_DON_HANG.md` documents the per-file analysis. Treat that as the catalogue of "shapes we've seen so far"; **this** doc is the source of truth for the algorithm.

## Hard constraints

- **No vessel info.** No vessel name, voyage, ATA/ATB/ATD/ETA/ETB/ETD, port of loading/discharge, bay/slot, crane code, connecting vessel, sales/mkt region. If a column matches any of those, it's classified as `__skip__` with a reason.
- **Open set of customers.** New customers have new headers in new languages (Vietnamese, English, abbreviations, occasionally Thai/Chinese). The algorithm must degrade gracefully.
- **Deterministic + cacheable.** Identical files re-imported produce identical mappings (idempotency). Same customer + similar layout → mapping cached, no re-classification.

## The 5 layers

```
file bytes
   │
   ▼
┌──────────────────────────────────────────┐
│ Layer 1 — Sheet picker                   │  → list of (sheet, score) sorted desc
├──────────────────────────────────────────┤
│ Layer 2 — Header-row detector            │  → row index inside the chosen sheet
├──────────────────────────────────────────┤
│ Layer 3 — Column → canonical mapper      │  → {column_idx: (canonical_field, confidence, source)}
│   3a heuristic dictionary (fast path)    │
│   3b column-content pattern check        │
│   3c LLM fallback (cached, gated)        │
├──────────────────────────────────────────┤
│ Layer 4 — Per-cell value normalization   │  → typed values
├──────────────────────────────────────────┤
│ Layer 5 — Row validation + bucketing     │  → accepted[], rejected[] (with reasons)
└──────────────────────────────────────────┘
   │
   ▼
preview JSON  ──→  user confirms/edits ──→  commit ──→ TripOrder rows
```

Each layer's output is JSON-serializable and feeds the preview UI.

## Canonical schema

Single dict, all the algorithm cares about. **No vessel/voyage fields.**

| Canonical field | Type | Required | Notes |
|---|---|---|---|
| `container_no` | str | **yes** | ISO 6346 normalized (UPPER, no hyphens). Validates 4 letters + 7 digits. |
| `container_size` | `"20"` \| `"40"` | **yes** | derived from size cell or ISO code |
| `freight_kind` | `"F"` \| `"E"` | **yes** | Full / Empty. Defaults to `F` when omitted. |
| `container_type_iso` | str | no | original ISO code (e.g. `45G1`) for reference |
| `gross_weight_kg` | float | no | Verified Gross Mass / weight in kg |
| `seal_no` | str | no | |
| `pickup_location` | str | no | source point (yard/customer) |
| `dropoff_location` | str | no | destination point |
| `pickup_date` | date | no | |
| `dropoff_date` | date | no | |
| `trip_date` | date | no | generic single date when pickup/dropoff dates not split |
| `customer_ref` | str | no | booking #, B/L, work order, etc. |
| `consignee` | str | no | shipper / consignee free text |
| `commodity` | str | no | description of goods |
| `driver_name` | str | no | driver person name (if present) |
| `tractor_plate` | str | no | truck license plate |
| `remarks` | str | no | free text |

**Derived:** `work_type` (`F20`/`F40`/`E20`/`E40`) = `freight_kind + container_size`.

## Synonym dictionary (English + Vietnamese + a few neighbours)

Lives in `app/services/import_pipeline/canonical.py`. Matching is case-insensitive, accent-folded (NFD strip combining marks), whitespace-collapsed.

Excerpt:

```python
SYNONYMS: dict[str, list[str]] = {
    "container_no": [
        "container", "container no", "container number", "cont", "contno",
        "contno.", "cont no", "container id", "ctr no",
        "so container", "số container", "so cont", "số cont",
        "ma cont", "mã cont",
        "หมายเลขตู้",            # Thai
    ],
    "container_size": [
        "size", "kich thuoc", "kích thước", "kích cỡ", "kich co",
    ],
    "container_type_iso": [
        "iso", "iso size", "iso code", "kich co iso", "kích cỡ iso",
        "loai hop", "loại hộp", "loai cont", "loại cont",
    ],
    "freight_kind": [
        "f/e", "freight kind", "full/empty", "full empty", "f e",
        "rong/hang", "rỗng/hàng", "hang/rong", "hàng/rỗng",
    ],
    "gross_weight_kg": [
        "weight", "vgm", "vgm (kgm)", "gross weight", "gross weight (kg)",
        "trong luong", "trọng lượng", "kg", "kgm",
    ],
    "seal_no":           ["seal", "seal no", "seal number", "sealno", "sealno.", "so niem phong", "số niêm phong"],
    "pickup_location":   ["pickup", "from", "origin", "diem di", "điểm đi", "diem lay", "điểm lấy", "noi lay", "nơi lấy", "lay", "lấy", "from terminal", "cy"],
    "dropoff_location":  ["dropoff", "drop off", "to", "destination", "diem den", "điểm đến", "diem tra", "điểm trả", "noi tra", "nơi trả", "tra", "trả", "to terminal", "del port", "delivery", "hop di dau", "hộp đi đâu"],
    "pickup_date":       ["pickup date", "from date", "ngay lay", "ngày lấy", "loading date", "ngay di", "ngày đi"],
    "dropoff_date":      ["dropoff date", "to date", "delivery date", "ngay tra", "ngày trả", "ngay den", "ngày đến", "discharge date"],
    "trip_date":         ["date", "trip date", "ngay", "ngày", "ngay chay", "ngày chạy", "thoi gian", "thời gian"],
    "customer_ref":      ["booking", "booking no", "booking number", "ref", "reference", "bl", "b/l", "bill of lading", "so van don", "số vận đơn"],
    "consignee":         ["consignee", "shipper", "customer", "khach hang", "khách hàng", "chu hang", "chủ hàng"],
    "commodity":         ["description", "description of goods", "goods", "commodity", "mat hang", "mặt hàng", "loai hang", "loại hàng"],
    "driver_name":       ["driver", "tai xe", "tài xế", "lai xe", "lái xe", "nguoi lai", "người lái"],
    "tractor_plate":     ["plate", "license plate", "bks", "bien so", "biển số", "so xe", "số xe", "dau keo", "đầu kéo"],
    "remarks":           ["remark", "remarks", "note", "notes", "ghi chu", "ghi chú"],
}
```

Skip patterns (vessel/voyage/port/stowage etc.):

```python
SKIP_PATTERNS = [
    "vessel", "voyage", "voy", "tau", "tàu", "ten tau", "tên tàu",
    "ata", "atd", "eta", "etb", "etd", "etc",
    "port", "pol", "pod", "load port", "loading port", "discharge port", "disch port",
    "port of loading", "port of discharge", "port of discharging",
    "bay", "slot", "cell", "stowage",
    "crane", "qc",
    "sales", "mkt", "sales/mkt",
    "connecting vessel",
    "class", "temperature", "temp", "nhiet do", "nhiệt độ", "reefer",
    "flag", "shipping agent",
    "chuyen bay", "chuyến bay",
]
```

### Adding a new synonym

When the system fails to map a header for a new customer, the user goes to the preview screen, picks the right canonical field from a dropdown, and clicks "Save mapping". This:

1. **Persists** the (header_text → canonical_field) under a `customer_import_template` row keyed by `(customer_id, structure_hash)`.
2. **Optionally seeds the global dictionary**: a `superadmin`-only "Promote to global synonym" toggle adds the header to `SYNONYMS[field]` (via a JSON config table loaded at startup, NOT a code change).

That second path is intentionally one extra click — most mappings are customer-specific (e.g., a Thai header) and shouldn't pollute the global dictionary.

## Layer 1 — Sheet picker

For every visible sheet:
- count rows where ≥ 4 cells are non-empty (`tabular_density`)
- count cells matching ISO 6346 regex `^[A-Z]{4}\d{7}$` (`container_hits`)
- count cells matching size strings (`20DC|20GP|22G\d|40HC|40DC|45G\d|42G\d|45R\d|45HC|22R\d|22T\d`) (`size_hits`)
- penalty if every cell is a formula or `#REF!`

`score = container_hits * 5 + size_hits + tabular_density * 0.1 - formula_error_count * 2`

Hidden sheets are kept (Loading List has `TOTAL` consolidating hidden per-port templates), but `state="veryHidden"` empty sheets are skipped.

If two sheets are within 10 % of each other we return both for user disambiguation.

## Layer 2 — Header-row detector

In the chosen sheet, scan rows 1–25:

For row r, compute:

```
synonym_hits   = sum over cells: 1 if cell text matches any SYNONYM/SKIP_PATTERN entry
non_empty      = count of non-empty short string cells (≤ 60 chars)
data_below     = average non-empty count over rows r+1 .. r+5
type_diversity = 1 if cells below have varied types (str/int/date), else 0
```

```
row_score = synonym_hits * 4 + non_empty + data_below * 0.5 + type_diversity * 2
```

Pick the max-scoring row. If max < 3 synonym hits, the file likely has a non-standard layout — fail fast and ask the user.

For the 4 sample files this gives:
- BDST `Sheet1` → row 1 (10+ synonym hits)
- Discharging `Sample Sheet` → row 1 (8+ hits)
- Loading `TOTAL` → row 10 (`SQ`, `POD`, `OPR`, `LINE`, `CONTNo.`, `SEAL`, `SIZE`, `VGM`, `Booking No`, `Shipper` — most via skip-patterns or synonyms)
- Glory `Sheet1` → row 1 (Vietnamese + Thai headers, container_no via Thai synonym)

## Layer 3 — Column → canonical mapper

For every column index of the header row:

1. **Heuristic match** — accent-fold + lowercase + trim the header cell value, then lookup in:
   - `SKIP_PATTERNS` first (vessel filter takes priority) → `(__skip__, 1.0, "skip_dict")`
   - `SYNONYMS[field]` (longest match wins) → `(field, 1.0, "synonym_dict")`
   - substring fallback → `(field, 0.7, "synonym_substr")`

2. **Pattern fallback** — if heuristic fails, scan the first 8 data cells in this column. Patterns that score:
   - 4 letters + 7 digits → `container_no` (0.9)
   - all-numeric, range 1000–60000 → `gross_weight_kg` (0.6)
   - parseable date → `trip_date` (0.5)
   - matches `/^(20|40|45|22|42).{0,3}$/` and small alphabet → `container_size` (0.7)
   - matches `^[FE]$` or `^(FULL|EMPTY|F|E)$` → `freight_kind` (0.9)

3. **LLM fallback** — only invoked when heuristic + pattern both yield confidence < 0.5. The interface:

   ```python
   class HeaderClassifier(Protocol):
       async def classify(
           self,
           header_text: str,
           sample_values: list[str],
           candidates: list[str],
       ) -> tuple[str | None, float]: ...
   ```

   Default implementation = `NullHeaderClassifier` (returns `(None, 0.0)`). When `IMPORT_LLM_FALLBACK_ENABLED=true` in settings, swap in `GeminiHeaderClassifier` (calls the existing `app/services/ai_service.py` Gemini client). Cached by `sha256(header_text + str(sample_values))`.

   Result is stored alongside the heuristic mapping with `source="llm"` and the LLM-reported confidence.

4. **Confidence threshold** — columns with final confidence < 0.5 are surfaced as "needs review" in the preview UI. Columns mapped by `__skip__` are listed under "Skipped (vessel/admin)".

The complete `column_mapping` dict is the artifact we cache per customer-template.

## Layer 4 — Value normalization

| Canonical field | Parser | Behaviour |
|---|---|---|
| `container_no` | `normalize_container_number` (already in `app/utils/iso6346.py`) — uppercase, drop hyphens; reject if it doesn't match `^[A-Z]{4}\d{7}$` |
| `container_size` | strip ISO code `^(\d{2})` → `20` if 20/22, else `40` |
| `freight_kind` | first letter uppercased; map `FULL→F`, `EMPTY→E`; default `F` if blank |
| `gross_weight_kg` | strip thousands separators (both `,` and `.`); accept decimal `,` or `.`; reject if not finite or negative |
| dates | try `dd/mm/yyyy`, `d/m/yyyy`, `dd-mm-yyyy`, `dd.mm.yyyy`, `yyyy-mm-dd`, Excel serial; prefer DMY if ambiguous (Vietnamese files are DMY) |
| seal/locations/refs | trim, collapse whitespace |
| commodity / remarks | trim, truncate 500 chars |

If a row has a date column that's blank, fall back to `default_trip_date` chosen by the user (filename hint or today).

## Layer 5 — Row validation & bucketing

A row is **accepted** when:
- `container_no` is non-empty and matches ISO 6346 shape, AND
- `container_size` resolves to `20` or `40`, AND
- `freight_kind` resolves to `F` or `E`.

Otherwise the row goes into `rejected` with one or more reasons:

- `missing_container_no`
- `bad_container_no` (e.g., `#REF!`, `Please input data !`)
- `unknown_size`
- `unknown_freight_kind`
- `bad_date`
- `duplicate_in_file` (same container twice in the same upload)

Rejected rows are returned in the preview JSON so the user sees what got dropped.

## Idempotency on commit

Before INSERT, look up `TripOrder + TripOrderContainer` where:
`(client_id, trip_date, container_number=normalized)`. Match → row marked `duplicate_in_db`, skipped (or overwritten when the user opts in). Counters in the response: `created`, `skipped_duplicates`, `errors`.

## Customer template cache

Table `customer_import_templates`:

```
id                   PK
client_id            FK → clients.id, NULLABLE  (NULL = template not yet associated)
template_name        varchar(255)
structure_hash       char(64)   -- sha256 of [sheet_name, header_row_normalized_cells]
sheet_name           varchar(255)
header_row_index     integer
column_mapping       jsonb      -- { col_idx: { canonical_field, confidence, source, header_text } }
last_used_at         timestamptz
last_used_by         FK → users.id
created_at, updated_at, created_by_id
UNIQUE(client_id, structure_hash)
```

On preview, the pipeline computes `structure_hash` after layers 1+2. If a row exists for `(picked_client_id, structure_hash)`, we skip layer 3 and reuse the saved `column_mapping`. The user can still override.

On commit, `last_used_at` is bumped and a new row is upserted if the user changed any mapping.

## Files added

```
backend/app/services/import_pipeline/__init__.py
backend/app/services/import_pipeline/canonical.py     # schema + synonyms + skip
backend/app/services/import_pipeline/sheet_picker.py  # Layer 1
backend/app/services/import_pipeline/header_finder.py # Layer 2
backend/app/services/import_pipeline/column_mapper.py # Layer 3 (heuristic + LLM stub)
backend/app/services/import_pipeline/value_parsers.py # Layer 4
backend/app/services/import_pipeline/pipeline.py      # Layer 5 + orchestrator
backend/app/services/import_pipeline/llm.py           # HeaderClassifier protocol + Null/Gemini impls
backend/app/services/import_pipeline/templates.py     # cache lookup/upsert
backend/app/api/v1/imports.py                         # POST /imports/preview, /commit, GET /templates
backend/alembic/versions/023_add_customer_import_templates.py
backend/tests/test_import_pipeline.py
frontend/src/services/api/imports.api.ts
frontend/src/pages/accountant/ImportOrders.tsx
```

Modified:
```
backend/app/api/v1/router.py
backend/app/models/domain.py
frontend/src/services/api/index.ts
frontend/src/routes.ts
frontend/src/router.ts
frontend/src/components/shared/AccountantSidebar/AccountantSidebar.tsx
```

## Open questions for the user

1. **LLM fallback model.** The Gemini key is configured for OCR. Same key, same model? Or do we want a smaller/cheaper model just for header classification? (Header classification ≤ 200 tokens per call.)
2. **Trip grouping.** v1 = one container = one TripOrder. Confirm or specify the grouping rule (e.g., merge by `(date, customer, dropoff)`).
3. **Auto-pricing on commit.** Existing `import_trip_orders` calls `find_tiered_pricing` to auto-set unit_price. For these wider-source files, the pickup/dropoff strings rarely match a `Location` row exactly. v1 leaves unit_price=0, status=DRAFT for the accountant to set. OK?
4. **Promote-to-global synonyms.** Confirm the user-facing toggle wording (`Áp dụng cho mọi khách hàng`?) and gate to `superadmin` only.

---

## Decisions taken (resolved 2026-05-04)

The user confirmed the following, captured here as the new source of truth:

- **LLM fallback** — enable Gemini, reuse OCR `GEMINI_API_KEY` + `GEMINI_MODEL`. Cache LLM-resolved mappings per `customer_import_template.llm_cache` so a second file from the same customer never re-pays the cost. The interface (`GeminiHeaderClassifier`) is wired but defaults off via `IMPORT_LLM_FALLBACK_ENABLED`. Toggle to `true` once the user is comfortable.
- **Trip grouping** — implemented in `pipeline.group_rows_into_trips`. Rule: when a row carries a `tractor_plate` OR `customer_ref`, group rows sharing that signal **plus** trip_date and dropoff. Otherwise 1 row = 1 trip. Verified on Glory Shanghai: 109 containers → 34 trips, 30 multi-container.
- **Pricing** — defer to a separate "Apply pricing" step (button on the import-results screen). Import commit always leaves `status=DRAFT, unit_price=0`. Endpoint: `POST /imports/apply-pricing` runs `find_tiered_pricing` over the chosen TripOrders.
- **Synonym dictionary** — stays in code (`canonical.py`). No UI for editing.
- **BDST K–M duplicate columns** — pipeline picks the higher-confidence column at column-mapper time; both source patterns (TOS join vs accountant copy) tolerated.

## Location resolver (added 2026-05-04, see also `PRICING_DATA_FLOW.md`)

`app/services/location_resolver.py` is the **shared** service used from both the import-commit path and the TripOrder create/update path. Resolution chain: exact name → exact alias → fuzzy (auto-link if ≥0.92, ambiguous if ≥0.85) → new. The customer-Excel preview endpoint returns `location_resolutions` per unique pickup/dropoff string so the UI can render `(có sẵn)` / `(gợi ý)` / `(mới)` / `(trùng lặp?)` badges. New columns on TripOrder: `pickup_raw`, `dropoff_raw` (immutable provenance), `location_review_needed` (set when the resolver auto-linked via fuzzy).

## Sample-file location seeder

`scripts/seeds/seed_locations_from_files.py` (at repo root, NOT inside `backend/`) extracts every distinct pickup/dropoff string from the supplied Excel files via the existing pipeline preview, clusters fuzzy-similar strings, picks the longest variant as canonical, and upserts `locations` + `location_aliases` rows with `created_via='seed'`, `source='seed_confirmed'`. **Idempotent.** First run added 10 new Locations on top of the 21 starter rows from migration 025. After seeding, all 12 unique location strings across the 4 sample files resolve as `exact_name` or `exact_alias` — zero `(mới)` cases on re-import.

**See `scripts/seeds/README.md`** for the full master-data seed sequence (customers → locations → pricing → routes) and CLI flag reference.

## Next batch — bảng giá (see `BANG_GIA_DATA_FLOW.md`)

Decision: instead of an interactive bảng giá import UI (deferred until we have ≥ 3 more tariff samples), bootstrap via a per-customer seeder script `scripts/seeds/seed_pricing_from_files.py` (one extractor per known layout, dispatched by `--format pan|hap|newway`). Layouts diverge enough that one generic parser would be brittle. Initial seed: 131 PricingLines for PAN + HAP. NEWWAY's tariff is implicit in settlement data — best-effort yields 0 cleanly-extractable rows; flagged for manual entry via the existing PricingDetail UI.
