# Bug-0075: "Tự động ghép" Provides No Explanation When Zero Matches Are Made

**Type:** UX Friction  
**Layer:** Frontend  
**Severity:** 🟡 Major  
**Affected Role/Flow:** Ke toan - Ghép chuyến  
**Viewport:** all  
**Location:** https://phucloc.tingting.vip/accountant/work-orders — "Tự động ghép" button

## Observation
When clicking "Tự động ghép" (Auto-Match), the button currently makes no API call (see bug-0064). However, even assuming the API were fixed, there is no result feedback: no success toast ("Đã ghép N cặp"), no explanation if 0 matches are made (e.g. why no pairs were found — all work orders already matched, no candidates above threshold, etc.). The UI is silent regardless of outcome.

## Impact
Accountants clicking "Tự động ghép" and seeing no change have no way to know if: (1) it ran and found 0 matches, (2) it failed, or (3) it didn't run at all. This forces users to manually count before and after to detect any change, which is error-prone.

## Recommendation
After the auto-match API responds:
- **Success with N > 0 matches:** Show a green toast: "Đã tự động ghép X cặp."
- **Success with 0 matches:** Show an informational toast with a reason, e.g.: "Không tìm thấy cặp nào đủ điều kiện. Tất cả phiếu đã được ghép hoặc không có đơn hàng tương thích trong kỳ."
- **Error:** Show a red toast with the error message.

Add a loading spinner to the button during the API call.
