# Bug-0077: Work Order Score Chips Use Only Color to Convey Match Quality

**Type:** Visual Bug  
**Layer:** Frontend  
**Severity:** 🔵 Enhancement  
**Affected Role/Flow:** Ke toan - Ghép chuyến  
**Viewport:** all  
**Location:** https://phucloc.tingting.vip/accountant/work-orders — score chips on WO list cards

## Observation
Match quality scores are indicated by color alone:
- 0/6 score: gray text (`rgb(161, 161, 170)`)
- 2/6 and 3/6 scores: orange text (`rgb(234, 88, 12)`)

There is no icon, pattern, or shape difference to distinguish quality levels beyond color. The orange color used for medium scores (2–3/6) is visually identical regardless of whether the score is "acceptable" or "poor." There are no green chips for high scores (4–6/6) visible in the current dataset.

## Impact
Users with red-green color blindness (deuteranopia/protanopia, affecting ~8% of males) may not reliably distinguish orange from gray. There is no visual hierarchy beyond color — a 1/6 score looks the same as a 5/6 score if both render in the same color family. The score number alone (without color context) does not convey urgency.

## Recommendation
Add a secondary visual indicator beyond color:
- Use a distinct background chip color for score ranges: red chip (0–1/6), orange chip (2–3/6), green chip (4–6/6).
- Or add a small icon alongside the score: ✗ for 0/6, ~ for 1–2/6, ✓ for 4–6/6.
- Consider adding a tooltip on hover/tap that explains the score meaning, e.g. "3 trong 6 tiêu chí khớp."
