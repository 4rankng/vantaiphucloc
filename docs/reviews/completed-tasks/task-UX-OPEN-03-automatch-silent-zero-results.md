# UX-OPEN-03 — Auto-Match Silent on 0 Results

**Severity:** 🟢 Minor  
**Type:** Usability Issue  
**Layer:** Frontend  
**Affected Role/Flow:** ketoan — `/accountant/work-orders` — "Tự động ghép" button  
**Status:** ✅ Already Implemented — WorkOrderList.tsx `handleAutoMatch` (lines 125-142) shows `toast.info` for 0 results and `toast.success` for positive results. QA v9 likely tested stale deployment.

---

## Issue

Clicking "Tự động ghép" with no full-match candidates silently succeeds (HTTP 200) but provides zero user feedback — no loading spinner, no success toast, no result summary.

The user cannot distinguish between:
- "The request didn't fire"
- "It ran but found 0 matches"
- "An error occurred"

**QA v9 evidence:** Clicked "Tự động ghép" — waited 2 seconds — 0 toasts, 0 dialogs, 0 loading indicators. Work order count unchanged.

---

## Expected Behavior

- While the API call is in flight: show a loading indicator on the button (spinner or disabled state)
- On success: always show a toast result — `"Đã tự động ghép {n} cặp"` (even if n = 0)
  - If n = 0: `"Không tìm thấy cặp ghép đủ điều kiện"`
  - If n > 0: `"Đã tự động ghép {n} cặp thành công"`
- On error: show error toast with reason

---

## Recommendation

1. Wrap the auto-match API call in a loading state (`isLoading` on the button)
2. Use the API response count field to generate the appropriate toast message
3. Ensure the toast fires on both success and error paths
