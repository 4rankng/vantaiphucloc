# Task 0054 — Fix Salary Period Display Off By One Day

**Type:** Bug
**Severity:** 🟡 Major
**Source:** BizFlow QA v6 BF-04 / UIUX v6 UX-06

## Problem

Salary config: fromDay=26, toDay=25 ("Ngày 26 tháng này → ngày 25 tháng sau").
"Kỳ hiện tại" shows `25/04 → 24/05` — one day early.
Expected: `26/04 → 25/05`.

Today is 2026-05-11. With fromDay=26:
- `getSalaryPeriodDates(2026-05-11, { fromDay: 26, toDay: 25 })` 
- Should return startDate=2026-04-26, endDate=2026-05-25

## File to Check

`frontend/src/utils/salaryPeriod.ts` — `getSalaryPeriodDates()` function.
The logic appears correct in the source. The off-by-one may be in how the returned
`startDate`/`endDate` (Date objects) are converted to ISO strings and then re-parsed
for display.

## Likely Root Cause

In `frontend/src/lib/format.ts` or wherever `formatDateRange` is defined, the function
likely does:
```ts
new Date(isoString)  // e.g. new Date("2026-04-26")
```
`new Date("2026-04-26")` parses as UTC midnight, which is `2026-04-25 in UTC+7` context.
When formatted with local date methods, it shows April 25 instead of April 26.

The `toISODate()` in `salaryPeriod.ts` already uses LOCAL date components, so the ISO
string is correct. But if `formatDateRange` re-parses it as UTC, the day shifts.

## Fix

In `formatDateRange` (or wherever the period dates are displayed), parse the ISO date
string as local, not UTC:
```ts
// Wrong: new Date("2026-04-26") → UTC midnight → local Apr 25 in UTC+7
// Right: parse with local timezone:
function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)  // local midnight
}
```

Apply this fix in `formatDateRange` or in `SalarySetup.tsx` where the period dates
are converted back to display strings.

## Acceptance Criteria

- Salary config fromDay=26, toDay=25 → displays "Kỳ hiện tại: 26/04 → 25/05"
- On May 26, the period rolls over to "26/05 → 25/06"
