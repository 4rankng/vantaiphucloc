# Bug-0076: Driver App Header Buttons Are Icon-Only With No Visible Labels

**Type:** UX Friction  
**Layer:** Frontend  
**Severity:** 🟢 Minor  
**Affected Role/Flow:** Taixe - All screens  
**Viewport:** 375px (mobile-first)  
**Location:** https://phucloc.tingting.vip/driver — header bar (all driver pages)

## Observation
The driver app header has three action buttons — "Tạo chuyến" (Create Trip), "Thông báo" (Notifications), and "Tài khoản" (Account) — that render as icon-only buttons with no visible text label. The buttons do have correct `aria-label` attributes, so they pass basic accessibility checks, but on a mobile screen without tooltips, a new driver cannot identify the icons' functions at a glance.

The icons used are:
- "Tạo chuyến": likely a plus/add icon
- "Thông báo": a bell icon  
- "Tài khoản": a user/person icon

These icons are reasonably standard, but "Tạo chuyến" (Create Trip) is the primary action and its icon alone may not communicate "create a work order submission" to non-technical drivers.

## Impact
Driver users (often non-tech-savvy truck drivers) may not immediately recognize icon meanings, especially "Tạo chuyến". This could lead to missed feature discovery or accidental taps. The accessibility tree shows button text as empty `""` with only `aria-label` as the name.

## Recommendation
Add visible text labels below or beside the icons in the header, at least for the primary "Tạo chuyến" action. On a 375px viewport, a compact layout with icon + short label (e.g., "+ Tạo chuyến") is feasible and increases discoverability significantly. Alternatively, add a prominent floating action button (FAB) for "Tạo chuyến" which is standard mobile UX for primary create actions.
