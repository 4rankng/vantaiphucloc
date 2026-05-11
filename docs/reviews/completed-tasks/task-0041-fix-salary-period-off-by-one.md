# Task 0041 — Fix Salary Period Off-by-One Display

**Type:** Bug
**Severity:** 🟡 Major
**Reporter:** BizFlow QA v6 (2026-05-11) — finding BF-04 / UX-06

## Problem

The salary configuration shows Từ ngày=26, Đến ngày=25 with description "Ngày 26 tháng này → ngày 25 tháng sau". But "Kỳ hiện tại" displays `25/04 → 24/05` — one day early.

- **Expected:** from=26 → Kỳ hiện tại = 26/04/2026 → 25/05/2026
- **Actual:** Kỳ hiện tại shows 25/04/2026 → 24/05/2026

Today is 2026-05-11. The period calculation subtracts 1 from the configured day.

## Root Cause

The period calculation function likely uses 0-based day indexing or does `day - 1` when constructing the period date.

```ts
// WRONG (likely current):
const periodStart = new Date(year, month, fromDay - 1);  // off by one

// CORRECT:
const periodStart = new Date(year, month, fromDay);
```

Or the period boundaries use exclusive vs inclusive semantics incorrectly.

## Affected Files

- `frontend/src/utils/salaryPeriod.ts` (or equivalent salary period calculation utility)
- `frontend/src/pages/accountant/settings/SalaryPage.tsx` — where "Kỳ hiện tại" is computed and displayed
- **Backend:** `backend/app/contexts/payroll/` — salary calculation should use the same period; verify backend and frontend agree

## Acceptance Criteria

1. With Từ ngày=26, Đến ngày=25: "Kỳ hiện tại" shows `26/04 → 25/05` (when today is between 26/04 and 25/05)
2. The description label "Ngày 26 tháng này → ngày 25 tháng sau" matches the displayed dates
3. After saving a different configuration (e.g., fromDay=1, toDay=31), the displayed period updates correctly to match the new config
4. Backend salary calculations use the same date range (verify `GET /api/v1/salary/current-period` response, if it exists)

## Implementation Notes

- This is a one-line fix once the calculation function is located
- Verify the fix applies to edge cases: fromDay=1 (starts first of month), fromDay=31 (not all months have 31 days)
- Write a unit test for the period calculation with at least 3 date scenarios
