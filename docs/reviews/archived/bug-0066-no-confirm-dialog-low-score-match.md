# Bug-0066: No Confirmation Dialog When Matching Low-Score (≤3/6) Work Order

**Type:** UX Friction  
**Layer:** Frontend  
**Severity:** 🟡 Major  
**Affected Role/Flow:** Ke toan - Ghép chuyến  
**Viewport:** all  
**Location:** https://phucloc.tingting.vip/accountant/work-orders — "Ghép" button on 2/6 and 3/6 score candidates

## Observation
When clicking "Ghép" on a match candidate with a score of 2/6 or 3/6, no confirmation dialog appears before executing the match. The match proceeds immediately (or in this case fails silently per bug-0063). For low-confidence matches, the user should be warned: a 2/6 match means 4 out of 6 criteria do not align (e.g. mismatched dates, route, container type).

## Impact
Accountants can accidentally create poor-quality matches without any friction. This leads to downstream data quality issues in salary calculation, invoicing, and settlement. A 2/6 score match between WO Hiệp Phước→Cát Lái and Trip Đồng Nai→Cát Lái has a different pickup point — creating this match without confirmation is error-prone.

## Recommendation
Add a confirmation dialog for matches with score ≤ 3/6 (or below a configurable threshold). The dialog should clearly state the mismatched criteria, e.g.: "Tuyến đường không khớp: Phiếu yêu cầu Hiệp Phước → Cát Lái, đơn hàng có Đồng Nai → Cát Lái. Vẫn tiếp tục ghép?" with Cancel and Confirm buttons. High-confidence matches (4–6/6) can proceed without a dialog.
