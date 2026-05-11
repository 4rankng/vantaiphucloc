# Task 0069: Director Dashboard Shows Duplicate "đã ghép chuyến" Log Entries

**Type:** UX Friction / Data Display Bug  
**Severity:** 🟢 Minor  
**Layer:** Both (Backend audit log / Frontend display)  
**Affected Role/Flow:** giamdoc — Director Dashboard activity feed  
**URL:** `/director`

## Observation

The "Hoạt động gần đây" section of the Director Dashboard consistently shows two separate activity entries for a single ghép chuyến (match) operation:

```
Kế toán  đã ghép chuyến  #34   11-05 · 13:07
Kế toán  đã ghép chuyến        11-05 · 13:07   ← no record ID
```

Both entries have the same timestamp. The second entry has no `#recordId` suffix. A similar duplicate pattern appears at 09:30:

```
Kế toán  đã ghép chuyến   11-05 · 09:30
Kế toán  đã ghép chuyến   11-05 · 09:30
```

**Root cause (code analysis):** The backend generates two audit log rows per match operation — likely one for the `CREATE` action on `trip_order_work_orders` and a second `MATCH` action on `reconciliations`. Both map to the same Vietnamese label "ghép chuyến" via `ACTIVITY_LABELS` in `DirectorDashboard.tsx`:

```ts
CREATE: {
  trip_order_work_orders: 'ghép chuyến',
  reconciliations: 'ghép chuyến',
},
MATCH: {
  reconciliations: 'ghép chuyến',
},
```

## Impact

- Director sees double entries for every match, making the activity feed 2× noisier than reality.
- The feed fetches 8 items but shows only 4 real distinct events. Important earlier events are pushed off screen.
- Breaks trust in the activity log accuracy.

## Recommendation

Two options (pick one):

**Option A (Frontend):** Deduplicate consecutive entries in the activity feed by timestamp + action text before rendering. A simple pass over `auditLogs` to drop entries where `createdAt` is within 1 second of the previous and `activityText` is identical.

**Option B (Backend):** Consolidate the match operation into a single audit log write. When creating a reconciliation, write only one `CREATE_RECONCILIATION` (or `MATCH`) entry instead of two separate entries for different tables.

Option B is cleaner long-term because it fixes the source data.

## Resolution

Implemented frontend deduplication (Option A). Fetches 12 logs instead of 8 to provide buffer for dedup. Consecutive entries with same activity text and timestamps within 2 seconds are collapsed. Result is sliced to 8 for display.

**Files changed:**
- `frontend/src/pages/director/DirectorDashboard.tsx` — added dedup logic in `useEffect` after `getAuditLogs` fetch
