# Task 0056: Driver trip cards still show "Hôm nay" for all trips

**Type:** Bug (Regression — listed as fixed in prior round but still present)
**Layer:** Backend (data seeding / trip_date null)
**Severity:** Medium
**Affected Role/Flow:** Tài xế — Dashboard (trip list)

## Description

All trip cards on the driver dashboard show "Hôm nay · 09:16" regardless of when the trip actually occurred. This was listed as fixed (tasks 0046, 0051) but is still present on the live site.

Root cause (confirmed via API):

The `/api/v1/work-orders?driver_id=4` endpoint returns `trip_date: null` for all work orders. The frontend logic falls back to `created_at` when `trip_date` is null, and since all seed data was created on the same day (2026-05-11T01:16:25Z), every card shows "Hôm nay · 09:16".

The frontend fix (display `trip_date` if available, else fall back) may have been applied but the backend data still has `trip_date = null` for all rows. The fix must be confirmed at the DB level.

Additionally, the job detail page (`/driver/job/:id`) shows "Thời gian: 11/05/2026 09:16" for all trips — the same wrong date.

## Steps to Reproduce

1. Login as taixe / admin123
2. View the driver dashboard
3. All trip cards display "Hôm nay · 09:16"
4. Open any trip detail — "Thời gian" shows today's date and same time

## Expected

Each trip card should show its actual trip date (e.g., "03/05", "07/05", etc.). For trips not from today, "Hôm nay" should not appear.

## Actual

All trips show "Hôm nay · 09:16" — today's date and the same creation timestamp.

## Fix Hint

1. **Backend data fix:** Populate `trip_date` on existing work orders. The seed script or migration must assign realistic trip dates based on the work order schedule. Check `backend/app` for the seed script.

2. **Backend schema fix:** Ensure `trip_date` is not nullable without a default, or at minimum ensure seed data populates it.

3. **Frontend fallback (already in place per prior fix):** Confirm `WorkOrderCard` or equivalent component uses `trip_date ?? created_at` and formats dates relatively (today = "Hôm nay", yesterday = "Hôm qua", older = "DD/MM").

Key files:
- Seed data script — populate `trip_date`
- `frontend/src/components/shared/WorkOrderCard/WorkOrderCard.tsx` — date display logic
- `frontend/src/lib/date-utils.ts` — date formatting helpers
