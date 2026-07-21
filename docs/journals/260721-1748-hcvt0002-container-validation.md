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

The focused verification pass was clean: 96 tests plus lint and format checks passed. A full backend run landed at 455 passed with one unrelated order-sensitive `Doi Soat` export test failure; that test passed when rerun in isolation.

## Reflection

The incident looked like an input failure, but the underlying contract was too narrow. Testing the exact painted-code variants users type is necessary in addition to canonical ISO examples.

## Decisions

The driver path remains scoped to validation and regression coverage. No evergreen docs update was needed because `CONTEXT.md` already documents short painted codes. Review found that BookedTrip import paths still assume 11-character ISO numbers; that is a separate downstream compatibility issue rather than part of the driver-input fix.

## Next

Keep the new regression tests in place. Follow up separately on short-code support in BookedTrip imports and on the order-sensitive `Doi Soat` export test.

Status: DONE_WITH_CONCERNS
Summary: The painted-code driver regression is fixed and covered. One unrelated order-sensitive backend test failed only in the full run.
Concerns: BookedTrip imports still reject short painted codes, and the `Doi Soat` export ordering test needs separate follow-up.
