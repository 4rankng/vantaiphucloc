# UX-OPEN-02 — No Manual Fallback When 0 Candidates Suggested

**Severity:** 🟡 Major  
**Type:** Usability Issue  
**Layer:** Frontend  
**Affected Role/Flow:** ketoan — `/accountant/work-orders` — match right panel empty state  
**Status:** ⚠️ Still Present (verified QA v9, 2026-05-11)

---

## Issue

When a work order has 0 suggested trip orders, the accountant sees:

> "Không tìm thấy đơn hàng phù hợp / Kiểm tra ngày, tuyến đường, hoặc container"

There is no way to browse all trip orders, search by container number, or manually pick across months. The work order is stuck — no action is possible from the UI.

**QA v9 evidence:** Work order W001040 (score 0/6) — right panel showed static message only. No search box, no "assign anyway" button, no fallback action.

---

## Expected Behavior

When 0 candidates are suggested, the match panel should offer a manual search fallback:
- A "Tìm thủ công" / "Tìm đơn hàng" button or search input that opens a full trip order search
- Search should support: container number, PO reference, client name, date range
- Results should allow cross-month picking (not filtered to current period only)
- Selecting a trip order from manual search proceeds to the same confirm flow as a suggested match

---

## Recommendation

1. Add a "Tìm đơn hàng thủ công" CTA to the empty state panel
2. On click, open a modal/drawer with a searchable trip order list (reuse existing trip list component with search)
3. Allow selection and confirm — treat as score 0/6 match, triggering the low-confidence dialog from UX-OPEN-01
