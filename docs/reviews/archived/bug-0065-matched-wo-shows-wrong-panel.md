# Bug-0065: Matched Work Order Shows "Find Match" Panel Instead of Match Detail + Unmatch Button

**Type:** Interaction Bug  
**Layer:** Frontend  
**Severity:** 🔴 Critical  
**Affected Role/Flow:** Ke toan - Ghép chuyến (Đã khớp view)  
**Viewport:** all  
**Location:** https://phucloc.tingting.vip/accountant/work-orders — right panel when selecting an "Đã khớp" WO

## Observation
When switching to the "Đã khớp" filter tab and clicking on a matched work order (e.g. W001034), the right panel shows "Đơn hàng có thể ghép" (match candidates) with "Không tìm thấy đơn hàng phù hợp" and a "Tìm đơn hàng thủ công" button. The panel does NOT show: (1) which trip this WO is matched to, (2) match details/criteria breakdown, or (3) an "Hủy ghép" (Unmatch) button. No unmatch action is available anywhere in the UI.

## Impact
Accountants cannot review match details for already-matched WOs, and cannot undo an incorrect match. The unmatch workflow is entirely missing. This is a critical gap in the operations workflow — if an incorrect match was made (even via seeded data), there is no way to reverse it through the UI.

## Recommendation
The right panel should have two distinct modes: (1) "pending" mode showing match candidates with "Ghép" buttons, and (2) "matched" mode showing the linked trip details, the match score breakdown, and an "Hủy ghép" button with a confirmation dialog. Switch panel mode based on the WO's `status` field. The backend endpoint for unmatching is likely `DELETE /api/v1/operations/work-orders/{id}/match` or `POST .../unmatch`.
