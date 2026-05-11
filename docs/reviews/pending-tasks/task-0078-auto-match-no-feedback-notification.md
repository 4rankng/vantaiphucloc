# task-0078: "Tự động ghép" Button Gives No Feedback After Execution

**Type:** UX Friction
**Severity:** 🟡 Major
**Layer:** Frontend
**Affected Role/Flow:** ketoan - Ghép chuyến (/accountant/work-orders)
**URL:** https://phucloc.tingting.vip/accountant/work-orders
**Viewport:** all

## Observation
Clicking the "Tự động ghép" (Auto-match) button in the work orders page produces no visible feedback:
- No loading spinner or disabled state on the button during execution
- No success toast/notification showing how many matches were made
- No error message if the operation fails
- The work order list does not visibly refresh or indicate the operation completed
- The count badge still shows "19 chờ ghép" with no change

There is no way to know whether the button click was registered, whether the operation is running, or what the result was.

## Impact
Accountants cannot confirm whether auto-match ran and what it accomplished. They may click the button multiple times (triggering duplicate operations) or assume nothing happened. This is especially confusing when 0 new matches are made — the user needs feedback explaining why no matches were found.

## Recommendation
1. Show a loading state on the button during the operation (spinner, disabled + "Đang ghép...")
2. After completion, show a toast notification: "Đã ghép X chuyến" or "Không tìm thấy chuyến phù hợp để ghép tự động"
3. Refresh the work order list count after the operation completes
4. If 0 matches: show a brief explanation (e.g., "Tất cả chuyến chờ ghép đều có điểm phù hợp thấp hơn ngưỡng")
