# bug-0079 — Frontend: Match panel allows selecting more orders than WO container count

**Type:** Interaction Bug / Missing Validation  
**Layer:** Frontend  
**Severity:** 🔴 High — allows users to commit logically impossible matches  
**Affected Flow:** Kế toán — Ghép chuyến (`/accountant/work-orders`)  
**Viewport:** 1440px (desktop split-panel)

---

## Description

The `MatchDetailPanel` has checkboxes on each suggestion card and a floating batch action bar showing "Đã chọn N đơn". There is **no enforcement** preventing the user from selecting more orders than the selected Work Order has containers.

**Observed:**  
- Selected WO: `29C-12345` — 2 containers (F20 MSCU1111111, F20 MSCU2222222)  
- User checked 3 suggestion cards → bottom bar shows **"Đã chọn 3 đơn"**  
- "Ghép tất cả" button remains **active and clickable**  
- No warning, no disabled state, no counter showing capacity

**Expected:**  
- A capacity counter should show "N / max_containers đơn đã chọn"  
- When `selected > container_count`: the batch button must be **disabled**  
- A clear inline error message: "Chuyến chỉ có X container — không thể ghép hơn X đơn"

---

## Steps to Reproduce

1. Login as `ketoan` → navigate to `/accountant/work-orders`
2. Click on WO `29C-12345` (Công ty TNHH HẢI AN — 2 containers: F20 MSCU1111111 + F20 MSCU2222222)
3. Check the first suggestion checkbox → "Đã chọn 1 đơn" (OK)
4. Check the second suggestion checkbox → "Đã chọn 2 đơn" (OK — at capacity)
5. Scroll down, check the third suggestion → **"Đã chọn 3 đơn"** (WRONG — over capacity)
6. "Ghép tất cả vào 29C-12345" button remains enabled

---

## Fix Required

**File:** `frontend/src/pages/accountant/work-orders/MatchDetailPanel.tsx`

1. Read `workOrder.containers.length` as `maxSelectable`.
2. Add a capacity counter label near the batch action bar: `{selectedToIds.length} / {maxSelectable} container`.
3. Disable the batch "Ghép tất cả" button when `selectedToIds.length > maxSelectable`.
4. Show inline warning text in red when over capacity.
5. Optionally: prevent checking additional boxes beyond capacity (disable unchecked checkboxes once at max).

```tsx
const containerCapacity = workOrder?.containers?.length ?? 0
const isOverCapacity = selectedToIds.length > containerCapacity

// In the batch action bar:
<span style={{ color: isOverCapacity ? 'var(--theme-status-error)' : 'inherit' }}>
  {selectedToIds.length} / {containerCapacity} container
</span>
<Button disabled={isOverCapacity || selectedToIds.length === 0} onClick={handleBatchMatch}>
  Ghép tất cả vào {workOrder?.code}
</Button>
{isOverCapacity && (
  <p style={{ color: 'var(--theme-status-error)' }}>
    Chuyến chỉ có {containerCapacity} container — bỏ chọn {selectedToIds.length - containerCapacity} đơn
  </p>
)}
```
