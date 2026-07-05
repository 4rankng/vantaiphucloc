# OCR Failure Image Viewer

**Status:** Done (implemented 2026-07-05; verified — awaiting user commit decision)
**Started:** 2026-07-05
**Branch:** main (work directly on main per [[feedback_no_worktree]])

## Problem

The superadmin dashboard (`OcrPerformanceChart`) reports "Lỗi tài xế gặp phải · N / M lượt
tải ảnh — N ảnh không nhận được số cont." The N is a count of `ocr_driver_requests` rows
where `success=false`. Today there is **no way to see which photos** caused those failures:

- The OCR endpoint (`POST /delivered-trips/ocr-container`, `delivered_trips.py:191`)
  decodes the image, runs OCR, then **discards the bytes**.
- `ocr_driver_requests` stores only metadata (`user_id, success, attempts, numbers_found,
  latency_ms, provider`) — no photo, no trip link.

So the admin cannot diagnose *why* OCR fails on real captures.

## Goal

Persist the photo when an OCR run fails, and surface a clickable list of those photos on
the superadmin dashboard with preview + download via the existing `PhotoLightbox`.

## Decisions (user-confirmed 2026-07-05)

1. **Capture:** Save photo **only on failure** (`success=false`). Add nullable
   `cont_photo_url` to `ocr_driver_requests`. Existing 8 historical failures have no photo
   and stay image-less (already discarded) — feature works for failures after deploy.
2. **UI:** Make the "N ảnh không nhận được số cont." headline in `OcrPerformanceChart`
   clickable → opens a `Drawer` with a thumbnail grid → click thumbnail → `PhotoLightbox`.
3. **Roles:** New image-list endpoint is **superadmin-only**. Director/accountant are
   unaffected (they render `OcrTotalChart` only, which never showed the failure count).

## Phases

- [phase-01-persist-failed-photo.md](phase-01-persist-failed-photo.md) — migration 0018 +
  model column + save-on-failure in the OCR endpoint (backend)
- [phase-02-failure-endpoint.md](phase-02-failure-endpoint.md) — `GET /dashboard/ocr-failures`
  superadmin-only (backend)
- [phase-03-frontend-api-hook.md](phase-03-frontend-api-hook.md) — `OcrFailureItem` type +
  `getOcrFailures` + `useOcrFailures` (frontend)
- [phase-04-ui-drawer-lightbox.md](phase-04-ui-drawer-lightbox.md) — clickable headline +
  `OcrFailureDrawer` + `PhotoLightbox` integration (frontend)

## Dependencies / Order

Phases are strictly sequential: 1 → 2 → 3 → 4. Phase 4 cannot be verified end-to-end until
1+2 land (needs failure rows with photos).

## Acceptance Criteria

1. A driver OCR run that fails after deploy persists its photo; the row's `cont_photo_url`
   is populated. A successful OCR run stores nothing new.
2. `GET /dashboard/ocr-stats` and the OCR response payload are unchanged (no public-contract
   change).
3. `GET /dashboard/ocr-failures` returns failure rows that have a photo, newest first,
   superadmin-only — director/accountant get 403.
4. SuperAdmin dashboard: when `driverFailed > 0`, the "N ảnh không nhận được số cont." line
   is clickable and opens a drawer listing those photos (thumbnail + driver + time +
   provider + attempts). Clicking a thumbnail opens `PhotoLightbox` with working zoom +
   download.
5. When `driverFailed === 0` or no failures have photos yet, the drawer shows an empty
   state; the headline is not clickable.
6. Director and accountant dashboards are visually unchanged (no failure count, no drawer).
7. No regressions: backend tests pass, frontend typecheck clean, migration round-trips on
   SQLite.

## Risks / Rollback

- **Photo-save I/O on OCR path:** only on failure (rare). Wrapped in try/except so a save
  failure sets `cont_photo_url=None` and never breaks the OCR response or analytics write.
- **Migration:** additive nullable column — safe. Rollback = drop column.
- **Storage growth:** bounded by failure rate (~8/window). Negligible.

## Out of Scope

- Backfilling the 8 historical failures (images already gone).
- Storing the photo on successful OCR runs.
- Changes to director/accountant dashboards.
- Latency/P95 changes (already superadmin-only, untouched).
