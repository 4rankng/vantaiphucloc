# Vendor Reconciliation: Preview-Commit Import Workflow

**Date:** 2026-05-23
**Status:** Approved

## Problem

The ExcelImportDrawer supports three import types. Client (Chủ hàng) and Driver (Lái xe nội bộ) already use a two-phase preview→commit workflow with a 3-step UI (Upload → Preview → Done). Vendor (Nhà xe) still does a direct upload with no preview step, skipping straight to "done". This is inconsistent and prevents the user from reviewing vendor data before committing.

## Solution

Add preview→commit endpoints for vendor reconciliation, reusing the existing `ReconciliationImportService` methods that already accept `vendor_id`. Wire the frontend through the same 3-step flow as client and driver imports.

## Changes

### Backend — `vendor_reconciliation.py`

Two new endpoints:

1. **`POST /vendor-reconciliation/preview`**
   - Input: `file` (UploadFile) + `vendor_id` (Form field)
   - Validates vendor exists and is active
   - Calls `ReconciliationImportService(db).preview_reconciliation_excel(content, filename)`
   - Returns the same preview structure as driver reconciliation

2. **`POST /vendor-reconciliation/commit`**
   - Input: JSON body `{ vendor_id: int, rows: list[dict] }`
   - Calls `ReconciliationImportService(db).commit_reconciliation_rows(rows, vendor_id=vendor_id)`
   - Returns `VendorImportResponse` (same as current direct-upload)

New Pydantic models: `VendorCommitRow`, `VendorCommitRequest`, matching the driver pattern.

### Frontend — API Layer

**`imports.api.ts`:**
- `previewVendorReconciliation(file: File, vendorId: number): Promise<ApiResponse<PreviewResultDto>>`
- `commitVendorReconciliation(vendorId: number, rows: Record<string, unknown>[]): Promise<ApiResponse<VendorImportResponse>>`

**`imports.ts` (RTK Query hooks):**
- `usePreviewVendorReconciliation()` — mutation hook for preview
- `useCommitVendorReconciliation()` — mutation hook for commit

### Frontend — `ExcelImportDrawer.tsx`

- `startPreview()`: Add vendor branch that calls `previewVendorRecon.mutate({ file, vendorId })` and maps preview data to same columns as driver
- `handleFileSelect()`: Route vendor through `startPreview()` instead of direct upload (require vendorId first)
- `handleImport()`: Route vendor through `commitVendorRecon` instead of `uploadVendorRecon`
- Footer: Include `previewVendorRecon.isPending` / `commitVendorRecon.isPending` in loading states
- Done step: Show vendor commit result stats

## Scope

- 5-6 files touched, all surgical additions
- No new service code — reuses existing `ReconciliationImportService` methods
- No structural changes to ExcelImportDrawer — extends existing branching
