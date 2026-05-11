# Task 0047 — Fix Director "Đã khớp" KPI counter = 0

**Type:** Bug
**Severity:** 🔴 Critical
**Source:** BizFlow QA v6 BF-02 / UIUX v6 UX-02

## Problem

Director dashboard shows "Đã khớp: 0" KPI despite matched trip orders existing.
The recent orders panel on the same page correctly shows T0032 as "Đã khớp".

## Root Cause

`frontend/src/pages/director/DirectorDashboard.tsx` line 46-53:
```ts
const monthlyTrips = useMemo(() => {
  return trips.filter(t => {
    const d = new Date(t.createdAt)  // ← WRONG: uses createdAt
    return d.getFullYear() === month.year && d.getMonth() + 1 === month.month
  })
}, [trips, month])
```

All seeded trips were created on the same day (seed run date), so filtering by `createdAt`
causes all trips to appear in only one month. Fix: use `tripDate` instead.

## Fix

In `frontend/src/pages/director/DirectorDashboard.tsx`, change:
```ts
const d = new Date(t.createdAt)
```
to:
```ts
const d = new Date(t.tripDate)
```

## Acceptance Criteria

- Director dashboard "Đã khớp" KPI shows correct count (≥1 for the current dataset)
- Tổng chuyến, Chờ xử lý counts are also correct per selected month
- Month navigation still works correctly
