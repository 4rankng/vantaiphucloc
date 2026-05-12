# Bug-MASTER-LIST-ZERO: Master list shows literal "0" under "Đã khớp" status chip

**Type:** UI Bug / Misleading State
**Layer:** Frontend
**Severity:** 🟡 Major
**Affected Role/Flow:** Kế toán — Ghép chuyến (left master list)
**Viewport:** desktop + mobile
**Location:** `http://localhost:5174/accountant/work-orders` — left column WO list

## Observation

In the work-orders master list, every WO with status `MATCHED` but `matchedTripCount === 0` renders a stack like:

```
┌──────────┐
│ Đã khớp  │
│    0     │
└──────────┘
```

The plain **"0"** sits directly under the "Đã khớp" pill in the 44 × 44 status chip. Per the current code (`WorkOrderMasterList.tsx` line 140) the count is guarded:

```tsx
{wo.status === 'MATCHED' && wo.matchedTripCount && wo.matchedTripCount >= 1 && (
  <span className="text-[9px] font-bold" …>
    {wo.matchedTripCount} ĐH
  </span>
)}
```

That conditional should NOT render anything when the count is 0 or undefined. Yet the screenshot shows "0" anyway, which means one of:

1. The conditional is being bypassed somewhere (maybe `StatusBadgePro` itself renders a count when it receives one).
2. A separate element (not the one in this file) is rendering the "0" — possibly `StatusBadgePro` has a built-in count badge that renders even when 0.
3. The component is receiving `matchedTripCount={0}` instead of `undefined` and a different conditional uses `?? 0`.

## Impact

- Visual confusion: "Đã khớp 0" is a contradiction (matched, but zero orders).
- Directly compounds the **bug-MATCHED-EMPTY** issue — users see "0" both in the chip and in the right panel header, with no path to recovery.

## Steps to Reproduce

1. Login as ketoan / admin123.
2. Navigate to `/accountant/work-orders`.
3. Switch the filter to "Đã khớp".
4. Observe rows in the left list — most show "Đã khớp" with a "0" underneath.

## Expected

- If `matchedTripCount === 0` or undefined: do NOT render the second line. Show only the status pill, centered in the 44 × 44 chip.
- If `matchedTripCount === 1`: show `1 ĐH` (text-[10px] success bold).
- If `matchedTripCount >= 2`: show `N ĐH`.

## Actual

A literal "0" appears under "Đã khớp" with no unit suffix.

## Fix Hint

1. Inspect `frontend/src/components/shared/StatusBadgePro.tsx` — does it accept a `count` prop and render it unconditionally? If yes, this is the source.
2. Add a defensive guard around the count span:

   ```tsx
   const count = wo.matchedTripCount ?? 0
   …
   {wo.status === 'MATCHED' && count > 0 && (
     <span className="text-[10px] font-bold tabular-nums" style={{ color: 'var(--theme-status-success)' }}>
       {count} ĐH
     </span>
   )}
   ```
3. If the "0" is coming from a different element, hunt it down with React DevTools — inspect the `<div>` at line 132–146 of `WorkOrderMasterList.tsx` and identify the actual node rendering "0".
4. Once fixed, the **bug-MATCHED-EMPTY** issue becomes more visible — these two bugs should be debugged together because they share data (the count).

## Coordinate with

- `bug-MATCHED-empty-orders.md` (same file, same data path). Both should ideally be fixed in one PR.
- `task-typography-work-orders-page.md` (TYPO-WO-01) — the typography task also touches this chip and may resolve this incidentally if the chip is restructured to a single-line layout.

## Key files

- `frontend/src/pages/accountant/work-orders/WorkOrderMasterList.tsx` (lines 130–146)
- `frontend/src/components/shared/StatusBadgePro.tsx`
- `frontend/src/data/domain.ts` (`matchedTripCount` definition)

## Don't

- Don't suppress the "0" with CSS (`display: none` when value is 0). Fix the conditional at the source.
- Don't change `matchedTripCount` to a string — keep it as `number | undefined` and use a real boolean guard.


Also no trip order is moved to MATCHED when no matching with don hang, this is serious biz bug
