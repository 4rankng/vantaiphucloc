# Bug-0074: Driver Home — "Chờ ghép" Work Orders Show "—" Instead of Informative Placeholder for Earnings

**Type:** UX Friction  
**Layer:** Frontend  
**Severity:** 🟢 Minor  
**Affected Role/Flow:** Taixe - Trang chủ  
**Viewport:** 375px (mobile-first)  
**Location:** https://phucloc.tingting.vip/driver — work order list cards

## Observation
Work order cards for "Chờ ghép" (unmatched) items display "—" in the earnings position, while matched work orders show a green "+350.000 ₫" value. The "—" is semantically correct (no earnings assigned yet) but provides no context for drivers who may wonder why some cards show money and others show a dash.

## Impact
Drivers may not understand that "—" means "not yet matched" — they may think earnings data is missing or broken. There is no tooltip or label next to the dash explaining its meaning. This is especially confusing on mobile where card space is limited and the dash appears next to no other contextual text.

## Recommendation
Replace the bare "—" with a more informative placeholder, such as:
- A subtle label: "Chờ kế toán ghép" (Awaiting accountant match)
- Or a small grayed-out text: "Chưa có thu nhập"

Alternatively, show the "Chờ ghép" badge (already present) more prominently as a visual explanation for why earnings are absent, and remove the "—" entirely when the status is "Chờ ghép".
