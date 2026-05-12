# Task 0109 — Fix: "Xuất đối soát" button does nothing on /accountant/trips

## Root Cause
**Missing `<DoiSoatExportDialog>` component in the first desktop render path of `TripList.tsx`.**

The component has 3 render branches (desktop-1, mobile, desktop-2). The first desktop branch had the "Xuất đối soát" button calling `handleExport` → `setDoiSoatOpen(true)`, but the `DoiSoatExportDialog` component was only rendered in the second desktop and mobile branches. The state was set correctly but nothing was listening to it in that render path.

## Fix
Added `<DoiSoatExportDialog open={doiSoatOpen} onOpenChange={setDoiSoatOpen} clients={clients} />` after `{detailDialog}` in the first desktop render path.

Committed in `87cee5d`.

## Verification
- ✅ Playwright test: button click → dialog opens with correct fields (Khách hàng, Từ ngày, Đến ngày, Đóng, Xuất Excel)
- ✅ Agent-browser: dialog renders with dark overlay
- ✅ No console errors
- ✅ Screenshot confirms visual dialog appearance
