# Task 0066 — Fix Nhà thầu "Loại" Column Shows "Cá nhân" for Company Vendors

**Type:** Bug
**Severity:** Medium
**Source:** QA v9 Finding 1 (2026-05-11)

## Problem

The "Nhà thầu" (Vendors) page at `/accountant/settings/vendors` shows "Cá nhân" in the Loại column for all vendors including companies like "Công ty TNHH HAP", "Công ty TNHH HẢI AN", etc.

The same companies correctly show "Công ty" on the Khách hàng (Clients) page. The `isCompany()` heuristic fix from task-0059 was applied to `ClientList.tsx` but not to the vendor list component.

## Affected Files

- `frontend/src/pages/accountant/VendorList.tsx` — Loại column rendering

## Acceptance Criteria

1. Company vendors (names containing "công ty", "tnhh", etc.) show "Công ty" in the Loại column
2. Individual vendors show "Cá nhân"
3. Same `isCompany()` heuristic used on both Clients and Vendors pages

## Resolution

Extracted `isCompany()` to a shared utility at `frontend/src/lib/utils.ts` and applied it to both `ClientList.tsx` and `VendorList.tsx`.

**Files changed:**
- `frontend/src/lib/utils.ts` — added shared `isCompany()` function
- `frontend/src/pages/accountant/ClientList.tsx` — replaced local `isCompany` with import from `@/lib/utils`
- `frontend/src/pages/accountant/VendorList.tsx` — imported `isCompany` from `@/lib/utils`, applied to table column (line 114) and detail dialog (line 202)
