# UX-OPEN-10 — "Chờ Ghép" Badge Clipped Behind Sibling Card

**Severity:** 🟢 Minor  
**Type:** Usability Issue  
**Layer:** Frontend  
**Affected Role/Flow:** taixe — `/driver/history` — trip card layout  
**Status:** ✅ Already Fixed — WorkOrderCard DriverCard has `overflow-visible` (line 124) and badge container has `relative z-10` (line 169). Badge has `shrink-0` class preventing compression.

---

## Issue

When two trip cards sit side-by-side at desktop width, the orange "Chờ ghép" badge on the right card is partially hidden behind the left card. Badge text becomes "Chờ..." with the rest cropped.

---

## QA v9 Finding

Bounding rect check showed all Chờ ghép badges within their parent card bounds at the tested viewport. The issue may be:
- Fixed in a recent build, OR
- Viewport-dependent (only triggers at specific screen widths between breakpoints), OR
- Only visible when the badge is near the card edge at certain zoom levels

---

## How to Reproduce (if still present)

1. Log in as `taixe` / `admin123`
2. Navigate to `/driver/history`
3. Resize browser to a wide-but-not-full-width viewport (e.g., 1100–1300px)
4. Look for a row where two trip cards appear side-by-side
5. Check if the "Chờ ghép" badge on the right card is fully visible or clipped

---

## Expected Behavior

Badge fully visible with no overlap. Check:
- `z-index` on badge vs card container
- `overflow: hidden` on card parent
- Badge positioning (absolute vs relative)

---

## Recommendation

If reproducible: set `z-index` higher on badge, ensure parent card does not have `overflow: hidden` at the badge boundary, or switch badge to `position: relative` flow instead of absolute overlay.
