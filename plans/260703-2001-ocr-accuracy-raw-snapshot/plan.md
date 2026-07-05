# Fix OCR accuracy metric — capture raw OCR value before correction

**Status:** DONE — implemented, verified (4 new tests + 57 shared-contract tests green), code-reviewed (DONE, no Critical/High; M1 doc comment applied). Frontend `rawOcrNumber` capture + backend write paths committed in HEAD. Selection-bias caveat recorded below.

**Follow-on (2026-07-03) — nullify pre-fix rows, shipped:** migration `0017_null_original_cont` (`UPDATE delivered_trips SET original_cont_number=NULL WHERE IS NOT NULL`) excludes the meaningless 0016 backfill from the metric denominator. Committed `310a43a1`, deployed to prod via `make deploy`: prod `alembic_head=0017`, 3738 rows / 807 matched / **0 non-null** `original_cont_number`. Dev repaired to the same state after a verification mishap. The 30-day age-out plan was superseded by active nullification. Authoring gotcha: first revision slug was 41 chars and failed the VARCHAR(32) stamp — see [[project_alembic_ops]].
**Branch:** main (edits directly, per [[feedback_no_worktree]])
**Origin:** `ck:predict` verdict CAUTION → 5 recommendations; user confirmed import-path treatment = NULL.

## Problem
`/dashboard/ocr-stats` accuracy is structurally always 100%. `original_cont_number` (meant to hold the raw OCR string) is written as `= cont_number` (the final, corrected value) on all 4 DeliveredTrip write paths. The frontend mutates the same `containerNumber` field for OCR text, auto-correct, manual edit, and suggestion-apply — so the raw OCR value never reaches the backend. Live DB: 807/807 matched rows have `original_cont_number = cont_number`, 0 corrections ever captured.

## Root cause
- Frontend leak: `useContainerManager.ts:163` puts OCR text into `containerNumber`; lines 194/249/333 overwrite that same field on correction/edit. No separate raw field.
- Backend leak: 4 write sites hardcode `original_cont_number = …cont_number` (`delivered_trips.py:212,426`, `bulk_import_service.py:475`, `vendor_import_service.py:482`).
- Migration 0016 backfill masked it (`SET original_cont_number = cont_number`).

## Solution (refined Shape 2 — frontend per-row snap + backend pass-through)
Capture the raw OCR value **once per container row** in frontend form state, make it immune to all later mutations (none reference it → immune by construction), and submit it as `original_cont_number`. Backend honors the submitted value on driver paths; NULLs it on import paths.

## Phases

### Phase 1 — Backend: accept + persist submitted snapshot
- `app/schemas/_delivered_trip.py` `DeliveredTripCreate`: add `original_cont_number: str | None = None`.
- `app/contexts/operations/application/dto.py:97` `DeliveredTripCreateInput`: add `original_cont_number: str | None = None`.
- `app/contexts/operations/interface/routers/delivered_trips.py:268`: pass `original_cont_number=body.original_cont_number` into `DeliveredTripCreateInput(...)`.
- `app/contexts/operations/application/delivered_trips.py:212`: `original_cont_number=data.original_cont_number`.
- `app/contexts/operations/application/delivered_trips.py:426`: `original_cont_number=item.original_cont_number`.
- (Bulk + single share `DeliveredTripCreateInput`, so both are covered by one DTO change.)

### Phase 2 — Backend: NULL import paths (user decision)
- `bulk_import_service.py:475`: `original_cont_number=None`.
- `vendor_import_service.py:482`: `original_cont_number=None`.
- Effect: Excel/vendor matched trips excluded from accuracy denominator via the query's `IS NOT NULL` gate.

### Phase 3 — Frontend: capture raw OCR per row + submit
- `useContainerManager.ts:16` `ContainerForm`: add `rawOcrNumber?: string`.
- `useContainerManager.ts:163-170` (OCR → rows map): set `rawOcrNumber: n` alongside `containerNumber: n`. Set **once**; no mutation handler references it.
- `services/api/deliveredTrips.api.ts:38` `DeliveredTripCreatePayload`: add `originalContNumber?: string | null`. (`createDeliveredTrip` already does `toSnake(rest)` → `original_cont_number`.)
- `useCreateDeliveredTrip.ts:266-279` create call: add `originalContNumber: cont.rawOcrNumber ?? null`.

### Phase 4 — Tests (CI = SQLite in-memory)
- **Primary regression (write path):** POST `/delivered-trips` with `cont_number="MSKU1234565"`, `original_cont_number="ABCU1234565"`; assert stored row `original_cont_number == "ABCU1234565"`. Fails today (stores cont_number).
- **Post-match survival:** create with `original≠cont`; run match-sync (`auto_match_service`); assert `original_cont_number` unchanged. (Prior obs 40415 confirms match overwrites `cont_number` — must prove it spares `original_cont_number`.)
- Existing `test_ocr.py:946` classification test stays green (unaffected — it sets the field directly).

## Acceptance criteria
1. New write-path test passes (snapshot holds submitted raw value, not cont_number).
2. Post-match survival test passes.
3. Full backend suite green (`make test` / pytest). No HTTP 500 (per [[feedback_no_500_in_tests]]).
4. `original_cont_number` repurposed to mean "raw OCR pre-correction"; documented in model/entity comment.
5. No new migration, no new column, no OCR-endpoint change, no dashboard query change.
6. Import paths emit NULL; driver paths honor submitted value or None.

## Out of scope
- No prod/dev backfill of the 807 existing rows (unsalvageable — raw OCR gone; 30-day window ages them out).
- No OCR-endpoint change, no new analytics table, no dashboard UI change.
- No frontend unit-test infra added (none exists for `useContainerManager`); regression covered at backend write-path level.

## Touchpoints
**Backend:** `_delivered_trip.py`, `dto.py`, `routers/delivered_trips.py`, `application/delivered_trips.py` (2 sites), `bulk_import_service.py`, `vendor_import_service.py`, `models/domain.py:363` (comment only), `domain/entities.py:65` (comment only).
**Frontend:** `useContainerManager.ts`, `deliveredTrips.api.ts`, `useCreateDeliveredTrip.ts`.
**Tests:** `backend/tests/test_ocr.py` (+ existing delivered-trips test file if a better home exists).

## Risks / rollback
- Risk: client spoofing `original_cont_number` → analytics-fidelity only, never affects `cont_number`/matching. Low; no mitigation.
- Risk: stakeholder reads post-fix accuracy drop as regression → the 100% was an artifact; communicate.
- Rollback: pure additive field pass-through; revert = restore `= …cont_number` on the 4 sites + drop the payload field. No schema change to undo.
