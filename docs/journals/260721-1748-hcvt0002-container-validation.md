---
date: 2026-07-21 17:48
severity: Medium
component: Driver container code input
status: Resolved
---

# Container Validation Regression

## Context

The driver reported that painted code `HCVT0002` could not be entered. The historical root cause was the pre-`71df610d` ISO-only 11-character validation path, which rejected valid shorthand input in both the driver form and validation endpoint.

## What Happened

Current source and the deployed frontend bundle already accept generic `AAAA9999`-style input, and backend direct repro now accepts `HCVT0002`, `HCVT 0002`, and `hcvt-0002`. The regression coverage was added in `backend/tests/test_iso6346_suggestions.py` and `backend/tests/test_ocr.py`.

The follow-up aligned BookedTrip imports on the shared exact validator. Preview, sheet/column/pattern detection, joined cells, the AI prompt, legacy token extraction, and `CommitRow` normalization now accept short painted codes while rejecting malformed near-misses. Review also found and fixed a compatibility gap in legacy token extraction.

Strict ISO checks remain available for paths that intentionally require canonical ISO 6346 codes. Focused verification passed 196 tests; the full backend suite passed 468 tests with 37 skipped and 1 expected failure.

## Reflection

The incident looked like an input failure, but the underlying contract was too narrow and duplicated across import stages. A shared exact validator plus coverage at every ingestion boundary is safer than fixing only the first visible rejection.

## Decisions

Generic container-code ingestion uses the shared exact validator; legacy strict ISO validation remains unchanged for explicit ISO-only workflows. No evergreen docs update was needed because `CONTEXT.md` already documents short painted codes.

## Next

Keep the regression matrix across direct entry and BookedTrip import stages. Treat future validator changes as a shared contract change and run both focused and full backend suites.

Status: DONE
Summary: Short painted codes are accepted consistently across driver entry and BookedTrip imports, malformed variants remain rejected, and focused plus full backend verification passed.
Concerns: None.
