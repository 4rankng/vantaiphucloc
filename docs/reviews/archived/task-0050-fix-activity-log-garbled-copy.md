# Task 0050 — Fix Director Activity Log Garbled Copy

**Type:** Bug
**Severity:** 🟡 Major
**Source:** BizFlow QA v6 (giamdoc flow) / UIUX v6 UX-10

## Problem

The "Hoạt động gần đây" section on the director dashboard shows untranslated/garbled entries:
- "Ghép ghép chuyến #1" — action word "Ghép" duplicated
- "Tạo reconciliations #2" — English word "reconciliations" leaked
- No actor name shown on any entry

## File to Fix

`frontend/src/pages/director/DirectorDashboard.tsx` — the audit log renderer.

Look for the section around line 390-440 that maps audit log action types to display strings.

Current mapping (approximate):
```ts
reconciliations: 'ghép chuyến',
trip_orders: 'tạo đơn hàng',  // or similar
```

The table name "reconciliations" is being used as a display string, producing "Tạo reconciliations".
The action "Ghép" is being prepended to "ghép chuyến", producing "Ghép ghép chuyến".

## Fix

Replace the audit log action/table rendering with a proper translation map:

```ts
// Map audit_log.action + table_name → Vietnamese display string
const ACTION_LABELS: Record<string, Record<string, string>> = {
  CREATE: {
    reconciliations: 'Kế toán ghép chuyến',
    work_orders: 'Tạo phiếu chuyến',
    trip_orders: 'Tạo đơn hàng',
  },
  UPDATE: {
    work_orders: 'Cập nhật phiếu chuyến',
    trip_orders: 'Cập nhật đơn hàng',
  },
  DELETE: {
    work_orders: 'Huỷ phiếu chuyến',
    trip_orders: 'Huỷ đơn hàng',
  },
}
```

Also include the actor name from `audit_log.user_id` or `audit_log.user_name` if available in the API response.

## Check Audit Log API

Review `frontend/src/services/api/audit.api.ts` to see what fields are returned per entry.
Then update the renderer in DirectorDashboard.tsx accordingly.

## Acceptance Criteria

- Activity feed shows "Kế toán ghép chuyến #X" (not "Ghép ghép chuyến")
- No English words in activity feed
- Actor name shown where available
