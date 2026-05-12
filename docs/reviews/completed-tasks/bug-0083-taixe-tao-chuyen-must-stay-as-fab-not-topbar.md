# bug-0083 — Design Constraint: "Tạo chuyến" must stay as FAB in taixe view, never in topbar

**Type:** Design Constraint / Must-Not-Regress Rule  
**Layer:** Frontend  
**Severity:** 🟢 Minor — currently correct, document to prevent future regression  
**Affected Flow:** Tài xế — Home (`/driver`)

---

## Description

The user requirement states:
> "please dont put tao chuyen button in topbar of taixe view"

**Current state (correct ✅):**  
The "Tạo chuyến" action is rendered as a `FloatingActionButton` (green circle with `+`) at the **bottom-right** of the driver home screen. The topbar only contains: logo/greeting (left), bell icon + profile icon (right). No "Tạo chuyến" in the topbar.

**Risk:**  
During future refactors of the driver layout or DriverHome page, a developer might be tempted to move "Tạo chuyến" into the topbar as an `actions` prop (e.g. a `<Plus />` icon button). This must not happen.

---

## Rule

> The taixe topbar **must only contain**: greeting (name), bell notification icon, profile icon.  
> The "Tạo chuyến" button **must remain** as a bottom-right FAB on the driver home screen.  
> The FAB is defined in `frontend/src/pages/driver/DriverHome.tsx` (line ~253).

---

## Files to Protect

- `frontend/src/pages/driver/DriverHome.tsx` — FAB must remain, do not add `actions` prop to topbar
- `frontend/src/components/shared/DriverLayout/DriverLayout.tsx` — topbarProps must not include create-trip action
- `frontend/src/components/shared/AppSidebar.tsx` — `DRIVER_MENU` has "Tạo chuyến" entry; this is only relevant if AppSidebar is ever used for drivers (currently it is NOT used in DriverLayout — DriverLayout uses AppShell directly)

---

## Verification

When testing the taixe view:
1. Login as `taixe` / `admin123`
2. Navigate to `/driver`
3. Topbar should show only: greeting + bell + profile
4. "Tạo chuyến" appears only as the green FAB at bottom-right
5. Confirmed ✅ on localhost:5174 on 2026-05-12
