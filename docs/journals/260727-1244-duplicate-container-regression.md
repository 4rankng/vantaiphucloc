---
date: 2026-07-27 12:44
severity: High
component: Delivered trip duplicate detection
status: Resolved
---

# Duplicate Detection Missed a Real Same-Day Duplicate

## What Happened

The app told the user there were no duplicate trips, but the same container was clearly duplicated in the delivered-trips list. The reported case was `UETU2790035`, and the backend endpoint `/api/v1/delivered-trips/duplicate-containers?date_from=2026-06-26&date_to=2026-07-25` returned `{"groups":[],"total_groups":0,"total_extra_rows":0}` even though the UI showed two identical rows for the same trip.

## Impact

The duplicate detector missed a case that was visibly present in the reconciliation table, giving accountants incorrect confidence that the period contained no duplicate containers. The failure was in the grouping logic, not in the displayed data.

## Technical Details

The regression came from `c1f70b78`, which made photo hash a hard grouping key. That silently split duplicates that should have stayed together, especially same-day trip pairs with missing or mismatched photo metadata. The fix changed the durable rule to group by:

- same normalized container + direction + same date, or
- same normalized container + direction + same non-empty photo hash, or
- same normalized container + direction when both rows have no photo

That keeps reversed-route round trips separate, and it still allows different-date or different-photo trips to remain distinct. The count logic also needed a connected-component correction so separate duplicate pairs do not collapse into one misleading group or inflate extra-row counts.

## What We Tried

We first traced the API response against the UI rows and confirmed the endpoint itself was returning empty groups. Then we tightened the grouping rule, preserved the reversed-direction and cross-date exclusions, and corrected the component counting so the detector reflects real duplicate clusters instead of a brittle pairwise match result.

## Root Cause Analysis

The root mistake was treating photo hash as an absolute identity key instead of one signal among several. That optimized for one class of records but broke the same-day container repeats the business needs to review, including rows without matching photo metadata.

## Lessons Learned

Duplicate detection needs to follow the business contract, not a convenient surrogate key. If a detector can return “none” while the table visibly shows duplicates, the grouping rule is wrong, not the user.

## Next Steps

Verification passed with 16 focused tests, adjacent suites at 12 and 11 tests, and the full backend suite at 472 passed, 37 skipped, 1 xfailed. `ruff check` passed, touched-file format passed, and the repo-wide format check still reports 9 pre-existing files that would reformat. No deployment was performed.

Status: DONE
Summary: Same-day duplicate detection now follows the container/date/photo contract instead of the broken photo-hash hard key, and the count logic correctly reports separate duplicate clusters.
Concerns: None.
