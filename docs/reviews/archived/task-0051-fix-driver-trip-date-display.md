# Task 0051 — Fix Driver Trip Cards Showing "Hôm nay" for Old Trips

**Type:** Bug
**Severity:** 🟡 Major
**Source:** UIUX v6 UX-09

## Problem

All trip cards on the driver home page show "Hôm nay · 09:16" as the date even for
trips from April and early May. The issue is `createdAt` (seed timestamp) being used
instead of the trip's actual `date` field.

## File to Fix

`frontend/src/pages/driver/DriverHome.tsx` — the trip card date display logic.

Look for how the date label is computed for each trip card. It likely uses something like:
```ts
const isToday = new Date(trip.createdAt).toDateString() === new Date().toDateString()
const dateLabel = isToday ? 'Hôm nay' : format(new Date(trip.createdAt), ...)
```

## Fix

Use `trip.date` (the actual trip execution date) instead of `trip.createdAt`:
```ts
const tripDate = new Date(trip.date)  // use work order's date field, not createdAt
const isToday = tripDate.toDateString() === new Date().toDateString()
const dateLabel = isToday
  ? `Hôm nay · ${tripDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
  : `${String(tripDate.getDate()).padStart(2,'0')}/${String(tripDate.getMonth()+1).padStart(2,'0')} · ${tripDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
```

Check the `WorkOrder` interface in `frontend/src/data/domain.ts` for the correct date field name
(it may be `date`, `tripDate`, or `workDate`).

## Acceptance Criteria

- Trip from April 26 shows "26/04 · HH:MM" not "Hôm nay · ..."
- Trip created today shows "Hôm nay · HH:MM" correctly
