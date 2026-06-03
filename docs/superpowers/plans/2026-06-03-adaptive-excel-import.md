# Adaptive Excel Import + Async Preview with Polling

**Goal:** Make the customer-Excel import pipeline robust to minor header variations (e.g., `SỐ CONTAINER ` with a trailing space) and to completely novel column names, and convert the preview endpoint to async with status polling so the frontend can show progress during AI-assisted extraction.

**Architecture:** Three layered changes in the existing `import_pipeline` package.

1. **Match normalization.** One `normalize_for_match()` helper (strip diacritics + drop whitespace) used in every pattern-detection header comparison. Unblocks the existing `settlement_list` extractor against files where `SỐ CONTAINER` has internal whitespace.
2. **Gemini batch fallback.** When generic mapping leaves ≥3 columns unmapped or required fields are missing, call Gemini once with all unmapped headers + 3-row samples in a single prompt; merge results; re-run. Cached by structure_hash in-process.
3. **Async preview endpoint.** `POST /preview-async` enqueues to the existing arq worker; frontend polls `GET /jobs/{job_id}`. The fast-path `POST /sheets` listing stays sync (no AI needed).

**Tech Stack:** FastAPI, arq + Redis, openpyxl, httpx (Gemini), TanStack Query polling, AGENTS.md DDD layout.

---

## Root cause of the failing file

`docs/real-life-data/ultima02.06.xlsx` is a `settlement_list` pattern (pivoted F20/F40/E20/E40 indicator columns, one `1` per row). The codebase already has `extract_settlement_list` + `_score_settlement_list` for this shape, but their substring checks (`"SỐCONT" in t`) don't match the actual header `SỐ CONTAINER ` (with a space). So pattern detection returns `None`, falls through to generic, F20/F40/E20/E40 are unmapped, 100% of rows fail `unknown_size`.

---

## File changes

### Backend

| Path | Change |
|---|---|
| `app/contexts/operations/infrastructure/import_pipeline/canonical.py` | Add `normalize_for_match()` |
| `app/contexts/operations/infrastructure/import_pipeline/pattern_detector.py` | Use new normalizer in `is_container_header`, `_score_loading_list`, `_score_invoice`, `_score_settlement_list` |
| `app/contexts/operations/infrastructure/import_pipeline/pattern_extractors.py` | Use new normalizer in settlement/invoice header & col mapping functions |
| `app/contexts/operations/infrastructure/import_pipeline/llm.py` | Add `BatchHeaderClassifier` Protocol + `GeminiBatchClassifier` + `CachedBatchHeaderClassifier` |
| `app/contexts/operations/infrastructure/import_pipeline/pipeline.py` | Call batch classifier when `unmapped >= 3` or required fields missing; silent fall-back on Gemini failure |
| `app/workers/tasks/imports.py` (new) | `import_excel_preview_task` |
| `app/workers/worker.py` | Register the new task |
| `app/workers/__init__.py` | Add `import_preview_job_id()` |
| `app/contexts/operations/interface/routers/imports.py` | Add `POST /customer-excel/preview-async` + `GET /customer-excel/jobs/{job_id}` |

### Frontend

| Path | Change |
|---|---|
| `src/services/api/imports.api.ts` | Add `enqueueCustomerExcelPreview()` + `getCustomerExcelPreviewStatus()` |
| `src/hooks/queries/imports.ts` | Add `useCustomerExcelPreviewStatus(jobId)` polling hook |
| `src/components/shared/overlays/ExcelImportDrawer.tsx` | Switch to enqueue + polling, show progress UI |

### Fixtures

- `docs/templates/ultima02.06.xlsx` — copy of failing file for regression tests

---

## Tasks (TDD, frequent commits)

### Task 1 — `normalize_for_match` helper
- Add to `canonical.py`. Returns lowercased, accent-folded, whitespace-stripped string.
- Test: `SỐ CONTAINER ` → `socontainer`, `F20'` → `f20`, `''` → `''`, `NGÀY ĐI` → `ngaydi`.
- Commit: `feat(import): add normalize_for_match helper`

### Task 2 — Switch all pattern-comparison sites
Replace substring checks in 8 sites listed above with the new normalizer.
- Test: detect + extract `ultima02.06.xlsx` end-to-end with zero rejected rows.
- Commit: `fix(import): match headers by normalize_for_match`

### Task 3 — Batch Gemini classifier
- Add `BatchHeaderClassifier` Protocol + `GeminiBatchClassifier` + `CachedBatchHeaderClassifier`.
- Test: parse JSON response, missing field → unmapped, httpx error → empty dict.
- Commit: `feat(import): batch Gemini header classifier`

### Task 4 — Wire fallback into `_run_generic_preview`
- Test: mock httpx; assert call count is 1, returned mapping merges; assert no call when settings disabled; assert preview still works when httpx raises.
- Commit: `feat(import): Gemini batch fallback for unmapped columns`

### Task 5 — `import_excel_preview_task`
- Test: arq fake pool + run task directly, assert returned dict shape.
- Commit: `feat(workers): import_excel_preview_task`

### Task 6 — Async preview endpoint
- Test: enqueue returns job_id, repeat upload returns same id, polling returns status.
- Commit: `feat(imports): async preview endpoint with polling`

### Task 7 — Frontend API client
- Commit: `feat(imports): frontend async preview client`

### Task 8 — Polling hook
- Commit: `feat(imports): preview status polling hook`

### Task 9 — ExcelImportDrawer async UI
- Manual test: upload `ultima02.06.xlsx` and confirm 100% accepted, no warning.
- Commit: `feat(imports): async preview UI in ExcelImportDrawer`

### Task 10 — Full test + lint pass
- `cd backend && make test` + `make lint`
- Manual: upload `ultima02.06.xlsx` via the running app; verify zero rejected, zero warnings, cont_type F20/F40/E20/E40, vessel "ULTIMA 1047SN".

---

## Out of scope

- Per-customer persistent mapping cache (`customer_import_templates` table). The existing `compute_structure_hash` already covers the in-process case.
- Auto-commit on preview success.
- Vendor/driver imports (different flow, no failure mode).
