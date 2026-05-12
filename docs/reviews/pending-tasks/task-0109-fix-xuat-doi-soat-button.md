# Task 0109 — Fix: "Xuất đối soát" button does nothing on /accountant/trips

## Scope
The "Xuất đối soát" button on `/accountant/trips` (logged in as `ketoan`) does nothing when clicked — no dialog opens, no console errors.

## What was already done
- Backend endpoint `GET /api/v1/trip-orders/export-doi-soat` works correctly (verified with curl, returns valid .xlsx)
- Frontend `DoiSoatExportDialog.tsx` component exists with proper dialog UI
- Frontend `TripList.tsx` has `handleExport` → `setDoiSoatOpen(true)`, `DoiSoatExportDialog` rendered in both desktop and mobile paths
- No TypeScript compilation errors

## Possible causes to investigate
1. **Stale browser cache** — frontend might be serving old JS without the dialog code. Try hard refresh first.
2. **Button `onClick` not firing** — `btn-ghost` class or parent element might be swallowing clicks (CSS pointer-events, z-index overlay, etc.)
3. **Dialog rendering issue** — dialog might open but be invisible (z-index behind sidebar, opacity 0, viewport off-screen)
4. **Radix Dialog issue** — `open` state change might not trigger re-render if state is set but component doesn't receive updated prop

## Steps to debug
1. Open `/accountant/trips` with hard refresh (Cmd+Shift+R)
2. Open browser DevTools → Console
3. Click "Xuất đối soát" button
4. Check if `doiSoatOpen` state changes — add `console.log` in `handleExport` if needed
5. Check Elements panel — search for `DoiSoatExportDialog` content in DOM after click
6. If dialog is in DOM but hidden → CSS/z-index issue
7. If dialog is NOT in DOM → React state not updating or component not re-rendering

## Fix
Fix whatever is preventing the dialog from showing, then verify:
- Click button → dialog opens with "Xuất đối soát" title
- Select khách hàng, date range, click "Xuất Excel"
- Excel file downloads successfully
- Dialog closes after download

## Files to check
- `frontend/src/pages/accountant/TripList.tsx` (button + dialog state)
- `frontend/src/pages/accountant/DoiSoatExportDialog.tsx` (dialog component)
- `frontend/src/components/ui/Dialog/Dialog.tsx` (base dialog)
- `frontend/src/components/ui/Button/Button.tsx` (button component)
