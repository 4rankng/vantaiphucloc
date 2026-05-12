# bug-0080 — Frontend: Checkbox selections persist when switching Work Orders

**Type:** Interaction Bug / State Management  
**Layer:** Frontend  
**Severity:** 🟡 Major — stale state causes confusing batch action bar and potentially wrong matches  
**Affected Flow:** Kế toán — Ghép chuyến (`/accountant/work-orders`)  
**Viewport:** 1440px (desktop split-panel)

---

## Description

When the user selects checkboxes in the Match Detail Panel for WO-A and then clicks on WO-B in the master list, the selected order count from WO-A persists in the bottom action bar. The action bar shows "Đã chọn N đơn — Ghép tất cả vào WO-B" with N coming from the previous WO's selections.

**Observed:**
1. Selected WO `29C-12345` → checked 3 suggestions → "Đã chọn 3 đơn"  
2. Clicked `PwdTest` WO (1 container, only 1 suggestion shown)  
3. Bottom bar still reads **"Đã chọn 3 đơn — Ghép tất cả vào PwdTest"**  
4. The 3 previously selected TOs from the old WO would be submitted against PwdTest

**Expected:** Switching to a different WO must reset `selectedToIds` to `[]`.

---

## Root Cause

In `MatchDetailPanel.tsx`, the `selectedToIds` state is local to the component. If `MatchDetailPanel` is kept mounted as the `workOrder` prop changes (not unmounted/remounted), the local state is never reset.

**File:** `frontend/src/pages/accountant/work-orders/MatchDetailPanel.tsx`

---

## Fix Required

Add a `useEffect` that resets the selection when the work order ID changes:

```tsx
useEffect(() => {
  setSelectedToIds([])
}, [workOrder?.id])
```

Alternatively, pass `key={workOrder?.id}` to `<MatchDetailPanel>` at its call site in `WorkOrderList.tsx` so React unmounts/remounts on WO change, clearing all local state automatically:

```tsx
<MatchDetailPanel
  key={selectedWoId}
  workOrder={selectedWo}
  onMatchSuccess={handleMatchSuccess}
/>
```
