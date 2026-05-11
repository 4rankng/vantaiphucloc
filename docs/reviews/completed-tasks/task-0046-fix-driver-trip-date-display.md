# Task 0046 — Fix Driver Home Trip Cards Showing Wrong Date ("Hôm nay")

**Type:** Bug
**Severity:** 🟡 Major
**Reporter:** UX Audit v6 (2026-05-11) — finding UX-09

## Problem

All trip cards on the driver home (`/driver`) display "Hôm nay · 09:16" as the date/time, including trips from April 24–30. Today is 2026-05-11 — these April trips cannot all be "today".

The timestamp shown appears to be the `created_at` field from when the seed data was inserted (2026-05-11 09:16), not the actual trip date.

## Affected Files

- `frontend/src/pages/driver/DriverHome.tsx` — trip card date rendering
- `frontend/src/components/driver/WorkOrderCard.tsx` (or similar) — the date field accessor
- The API response from `GET /api/v1/work-orders?driver_id=:id` — verify which date field is returned

## Acceptance Criteria

1. Trip cards display the trip's execution date, not the record's `created_at` timestamp
2. Only trips dated today show "Hôm nay · HH:MM"
3. Trips from previous dates show "DD/MM · HH:MM" (e.g., "28/04 · 09:16")
4. The date format is consistent with other date displays in the app

## Implementation Notes

The `work_order` table likely has two date fields:
- `date` or `trip_date` — the actual execution date of the trip (what to display)
- `created_at` — when the record was created (do NOT display)

```ts
// WRONG (current):
const displayDate = formatDate(workOrder.created_at);

// CORRECT:
const displayDate = formatDate(workOrder.date ?? workOrder.trip_date);
```

Date formatting logic:
```ts
function formatTripDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  if (isSameDay(date, today)) return `Hôm nay · ${format(date, 'HH:mm')}`;
  return format(date, 'dd/MM · HH:mm');
}
```

- Check the API response for `GET /api/v1/work-orders?driver_id=4` to confirm the correct field name
- Also fix on the driver job detail page (`/driver/job/:id`) which shows the same `created_at` timestamp
