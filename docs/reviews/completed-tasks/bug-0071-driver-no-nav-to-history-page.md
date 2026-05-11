# Bug-0071: Driver Has No Navigation Link to History Page (/driver/history)

**Type:** Missing Feature  
**Layer:** Frontend  
**Severity:** 🟡 Major  
**Affected Role/Flow:** Taixe - Lịch sử chuyến  
**Viewport:** 375px (mobile-first)  
**Location:** https://phucloc.tingting.vip/driver — driver home screen header and body

## Observation
The `/driver/history` page exists and renders correctly (showing all work orders with totals: "16 cont, 3.270.000 ₫"), but there is no navigation link or button in the driver UI that leads to it. The driver home screen has three icon-only header buttons: "Tạo chuyến", "Thông báo", and "Tài khoản" (dropdown with "Thông tin cá nhân" and "Đăng xuất"). The earnings summary card (4.000.000 ₫, 11 chuyến) is a non-interactive `DIV`. No "Lịch sử" or "Xem tất cả" link is visible anywhere. The page is only reachable by directly typing the URL.

## Impact
Drivers cannot access their trip history or review past earnings from within the app. The only accessible routes are the home screen and individual job detail pages. This makes the history feature effectively hidden and unusable in normal operation.

## Recommendation
Add a "Lịch sử" navigation entry accessible from the driver home. Options:
1. Make the earnings summary card (`4.000.000 ₫ / 11 chuyến`) a clickable link to `/driver/history`.
2. Add a "Xem lịch sử" button below the work order list on the home screen.
3. Add "Lịch sử" to the "Tài khoản" dropdown menu alongside "Thông tin cá nhân".
Option 1 is the most discoverable as it leverages an existing prominent UI element.
