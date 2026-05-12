# Task 0044 — Fix Director Activity Log Copy (Untranslated / Duplicated)

**Type:** Bug
**Severity:** 🟡 Major
**Reporter:** UX Audit v6 (2026-05-11) — finding UX-10

## Problem

The "Hoạt động gần đây" section on the director dashboard renders audit log action strings directly without translation:

| Displayed | Problem | Should be |
|-----------|---------|-----------|
| "Ghép ghép chuyến #1" | Action word duplicated | "Đã ghép chuyến #1" |
| "Tạo reconciliations #2" | English word "reconciliations" leaked | "Đã tạo khớp chuyến #2" |
| "Cập nhật chuyến #1" | No actor identified | "Kế toán đã cập nhật chuyến #1" |
| "Cập nhật đơn hàng #32" | No actor identified | "Kế toán đã cập nhật đơn hàng #32" |

The audit log entries have their action type split across DOM elements (e.g., `<generic "Ghép">` + `<generic "ghép chuyến">`), causing the action word to appear twice.

## Root Cause

Two issues:
1. **DOM structure**: The action display is composed of `action_type` + `entity_description` rendered separately, causing "Ghép" + "ghép chuyến" = "Ghép ghép chuyến"
2. **Missing translation map**: `reconciliations` (English DB action type) is rendered raw instead of being mapped to Vietnamese

## Affected Files

- `frontend/src/pages/director/Dashboard.tsx` — the "Hoạt động gần đây" section
- Possibly a shared `auditLogFormatter.ts` or `activityFeed.ts` utility

## Acceptance Criteria

1. No duplicated words in activity entries
2. No English words visible (all action types translated to Vietnamese)
3. Each entry includes the actor name (e.g., "Kế toán" or the user's display name)
4. Format: `{ActorName} đã {action} {entity} #{id}` — e.g., "Kế Toán Test đã ghép chuyến #1"
5. Timestamp format "11/05 · 09:30" remains

## Implementation Notes

Action type mapping:
```ts
const AUDIT_ACTION_LABELS: Record<string, string> = {
  'CREATE_RECONCILIATION': 'ghép chuyến',
  'MATCH': 'ghép chuyến',
  'UPDATE_WORK_ORDER': 'cập nhật phiếu chuyến',
  'UPDATE_TRIP_ORDER': 'cập nhật đơn hàng',
  'CREATE_WORK_ORDER': 'tạo phiếu chuyến',
  'CREATE_TRIP_ORDER': 'tạo đơn hàng',
  // add as needed from audit_log.action enum
};

function formatActivityEntry(log: AuditLog): string {
  const action = AUDIT_ACTION_LABELS[log.action] ?? log.action.toLowerCase();
  const actor = log.user?.name ?? 'Hệ thống';
  return `${actor} đã ${action} #${log.record_id}`;
}
```

- Do not render the raw `action` field directly in JSX
- The DOM structure should be a single text node per activity entry, not split generics
