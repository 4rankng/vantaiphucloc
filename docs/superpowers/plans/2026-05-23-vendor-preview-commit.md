# Vendor Reconciliation Preview-Commit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add preview→commit workflow for vendor (Nhà xe) Excel import, matching the existing driver reconciliation pattern.

**Architecture:** Reuse existing `ReconciliationImportService` methods (which already accept `vendor_id`). Add two new backend endpoints, wire frontend API + hooks, update ExcelImportDrawer routing so vendor follows the same 3-step flow as client and driver.

**Tech Stack:** FastAPI (backend), React/TypeScript + RTK Query (frontend)

---

### Task 1: Backend — Add vendor preview and commit endpoints

**Files:**
- Modify: `backend/app/contexts/operations/interface/routers/vendor_reconciliation.py`

- [ ] **Step 1: Add Pydantic schemas for vendor commit**

Add `VendorCommitRow`, `VendorCommitRequest`, and `VendorCommitResponse` to `vendor_reconciliation.py` after the existing `VendorImportResponse` schema (line 33). These mirror `DriverCommitRow`/`DriverCommitRequest`/`DriverCommitResponse` from `driver_reconciliation.py:35-67`.

```python
class VendorCommitRow(BaseModel):
    container_no: str
    container_size: str = ""
    freight_kind: str = ""
    cont_type: str = "E20"
    work_type: str = "CHUYỂN BÃI"
    container_type_iso: str = ""
    gross_weight_kg: float | None = None
    seal_no: str = ""
    pickup_location: str = ""
    dropoff_location: str = ""
    pickup_date: date | None = None
    dropoff_date: date | None = None
    trip_date: date
    customer_ref: str = ""
    consignee: str = ""
    commodity: str = ""
    driver_name: str = ""
    vehicle_plate: str = ""
    freight_charge: float | None = None
    remarks: str = ""


class VendorCommitRequest(BaseModel):
    vendor_id: int
    rows: list[VendorCommitRow]


class VendorCommitResponse(BaseModel):
    created: int
    matched: int
    fraud_skipped: int
    errors: list[str] = Field(default_factory=list)
    details: list[dict] = Field(default_factory=list)
```

Also add `from datetime import date` to the imports at line 4 (after `import logging`), and add `Body` to the FastAPI imports (line 7).

- [ ] **Step 2: Add preview endpoint**

Add before the existing `upload_vendor_excel` endpoint (before line 41):

```python
@router.post("/vendor-reconciliation/preview")
async def preview_vendor_excel(
    vendor_id: int = Form(..., description="Vendor (nha xe) ID"),
    file: UploadFile = File(..., description="Vendor Excel file (.xlsx)"),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    """Parse vendor Excel file and return preview. No data saved to DB."""
    vendor = (await db.execute(
        select(Vendor).where(Vendor.id == vendor_id, Vendor.is_active == True)  # noqa: E712
    )).scalar_one_or_none()
    if vendor is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhà xe.")

    if file.filename is None:
        raise HTTPException(status_code=400, detail="Tệp tải lên không có tên.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Tệp tải lên rỗng.")

    from app.contexts.operations.infrastructure.vendor_import_service import (
        ReconciliationImportService,
    )

    service = ReconciliationImportService(db)

    try:
        return await service.preview_reconciliation_excel(content, file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
```

- [ ] **Step 3: Add commit endpoint**

Add after the preview endpoint, before the legacy upload endpoint:

```python
@router.post(
    "/vendor-reconciliation/commit",
    response_model=VendorCommitResponse,
)
async def commit_vendor_excel(
    body: VendorCommitRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_roles("accountant", "superadmin")),
):
    """Take confirmed rows from preview, create DeliveredTrips and auto-match."""
    if not body.rows:
        raise HTTPException(status_code=400, detail="Không có dòng nào để tạo.")

    from app.contexts.operations.infrastructure.vendor_import_service import (
        ReconciliationImportService,
    )

    service = ReconciliationImportService(db)
    result = await service.commit_reconciliation_rows(
        rows=[r.model_dump() for r in body.rows],
        vendor_id=body.vendor_id,
    )

    return VendorCommitResponse(
        created=result.created,
        matched=result.matched,
        fraud_skipped=result.fraud_skipped,
        errors=result.errors,
        details=result.details,
    )
```

- [ ] **Step 4: Verify backend starts**

Run: `cd backend && python -c "from app.contexts.operations.interface.routers.vendor_reconciliation import router; print('OK')"`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add backend/app/contexts/operations/interface/routers/vendor_reconciliation.py
git commit -m "feat: add vendor reconciliation preview and commit endpoints"
```

---

### Task 2: Frontend — Add vendor preview/commit API functions

**Files:**
- Modify: `frontend/src/services/api/imports.api.ts`
- Modify: `frontend/src/services/api/index.ts`

- [ ] **Step 1: Add vendor commit response type and API functions**

In `imports.api.ts`, after the existing `uploadVendorReconciliation` function (after line 285), add:

```typescript
export async function previewVendorReconciliation(
  file: File,
  vendorId: number,
): Promise<ApiResponse<PreviewResultDto>> {
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('vendor_id', String(vendorId))
    const res = await api.post('/vendor-reconciliation/preview', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return ok(toCamel<PreviewResultDto>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function commitVendorReconciliation(
  vendorId: number,
  rows: Record<string, unknown>[],
): Promise<ApiResponse<VendorImportResponse>> {
  try {
    const res = await api.post('/vendor-reconciliation/commit', {
      vendor_id: vendorId,
      rows,
    })
    return ok(toCamel<VendorImportResponse>(res.data))
  } catch (err) {
    return fail(err)
  }
}
```

- [ ] **Step 2: Export new functions in apiClient**

In `index.ts`, after line 152 (`uploadVendorReconciliation: importsApi.uploadVendorReconciliation,`), add:

```typescript
  previewVendorReconciliation: importsApi.previewVendorReconciliation,
  commitVendorReconciliation: importsApi.commitVendorReconciliation,
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/api/imports.api.ts frontend/src/services/api/index.ts
git commit -m "feat: add vendor reconciliation preview/commit API functions"
```

---

### Task 3: Frontend — Add RTK Query hooks

**Files:**
- Modify: `frontend/src/hooks/queries/imports.ts`
- Modify: `frontend/src/hooks/use-queries.ts`

- [ ] **Step 1: Add vendor preview and commit hooks**

In `imports.ts`, after `useUploadVendorReconciliation` (after line 73), add:

```typescript
export function usePreviewVendorReconciliation() {
  return useMutation({
    mutationFn: ({ file, vendorId }: { file: File; vendorId: number }) =>
      apiClient.previewVendorReconciliation(file, vendorId).then(unwrap),
  })
}

export function useCommitVendorReconciliation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { vendorId: number; rows: Record<string, unknown>[] }) =>
      apiClient.commitVendorReconciliation(body.vendorId, body.rows).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
      qc.invalidateQueries({ queryKey: ['booked-trips'] })
      qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
      qc.invalidateQueries({ queryKey: ['monthly-pnl'] })
    },
  })
}
```

- [ ] **Step 2: Export from use-queries.ts**

In `use-queries.ts`, line 21, update the imports export to include the two new hooks:

Change:
```
useUploadVendorReconciliation, useUploadDriverReconciliation, usePreviewDriverReconciliation, useCommitDriverReconciliation
```

To:
```
useUploadVendorReconciliation, usePreviewVendorReconciliation, useCommitVendorReconciliation, useUploadDriverReconciliation, usePreviewDriverReconciliation, useCommitDriverReconciliation
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/queries/imports.ts frontend/src/hooks/use-queries.ts
git commit -m "feat: add vendor reconciliation preview/commit hooks"
```

---

### Task 4: Frontend — Wire ExcelImportDrawer for vendor preview→commit

**Files:**
- Modify: `frontend/src/components/shared/ExcelImportDrawer.tsx`

This is the main UI change. The drawer currently routes `vendor` type through direct upload. We need to route it through preview→commit instead.

- [ ] **Step 1: Import new hooks**

At line 30, update the imports to add `usePreviewVendorReconciliation` and `useCommitVendorReconciliation`:

```typescript
import {
  useClients,
  useCreateClient,
  usePreviewCustomerExcel,
  useCommitCustomerExcel,
  useUploadVendorReconciliation,
  usePreviewVendorReconciliation,
  useCommitVendorReconciliation,
  useUploadDriverReconciliation,
  usePreviewDriverReconciliation,
  useCommitDriverReconciliation,
  useVendors,
} from '@/hooks/use-queries'
```

- [ ] **Step 2: Add hook instances and vendor commit result state**

After line 96 (`const commitDriverRecon = useCommitDriverReconciliation()`), add:

```typescript
const previewVendorRecon = usePreviewVendorReconciliation()
const commitVendorRecon = useCommitVendorReconciliation()
```

- [ ] **Step 3: Update startPreview to handle vendor type**

In the `startPreview` callback (line 106), after the `else if (importType === 'driver')` block (after line 204), add a new `else if (importType === 'vendor')` branch:

```typescript
} else if (importType === 'vendor') {
  if (!vendorId) {
    setError('Vui lòng chọn nhà thầu trước khi phân tích file.')
    return
  }
  previewVendorRecon.mutate(
    { file: f, vendorId: Number(vendorId) },
    {
      onSuccess: (data) => {
        setPreviewResult(data)
        const cols = ['Ngày đi', 'Chủ hàng', 'Số Cont', 'Loại Cont', 'Số xe chạy', 'Điểm đi', 'Điểm đến', 'Cước', 'Ghi chú']
        const rows = (data.accepted ?? []).map(r => ({
          'Ngày đi': r.values.trip_date,
          'Chủ hàng': r.values.consignee,
          'Số Cont': r.values.container_no,
          'Loại Cont': r.values.cont_type ?? `${r.values.freight_kind ?? ''}${r.values.container_size ?? ''}`,
          'Số xe chạy': r.values.vehicle_plate,
          'Điểm đi': r.values.pickup_location,
          'Điểm đến': r.values.dropoff_location,
          'Cước': r.values.freight_charge,
          'Ghi chú': r.values.remarks,
        }))
        const dups = (data.rejected ?? [])
          .filter(r => r.reasons?.includes('duplicate_in_file') || r.reasons?.some(reason => reason.includes('duplicate')))
          .map((r) => ({
            type: 'exact' as const,
            rowIndices: [r.source_row_index],
            containers: [String((r.raw as Record<string, unknown>)?.container_no ?? '')],
            message: `Dòng ${r.source_row_index + 1}: Trùng dòng`
          }))
        const warns = data.warnings ?? []

        setPreviewColumns(cols)
        setPreviewData(rows)
        setDuplicateGroups(dups)
        setPreviewWarnings(warns)
        setStep('preview')
      },
      onError: (err) => setError(err instanceof Error ? err.message : 'Lỗi khi phân tích file'),
    }
  )
}
```

Also update the `startPreview` dependency array (line 206) to include `previewVendorRecon` and `vendorId`:

```typescript
}, [importType, previewClientExcel, previewDriverRecon, previewVendorRecon, clientId, vendorId, clients])
```

- [ ] **Step 4: Update handleFileSelect to route vendor through preview**

In `handleFileSelect` (line 208), change line 212 from:

```typescript
if (importType === 'client' || importType === 'driver') {
  startPreview(f)
} else if (importType === 'vendor') {
```

To:

```typescript
if (importType === 'client' || importType === 'driver' || importType === 'vendor') {
  startPreview(f)
} else {
```

This makes all three types go through `startPreview`. Remove the entire vendor direct-upload block (lines 214-229) since it's now handled in `startPreview`. The `handleFileSelect` function becomes:

```typescript
const handleFileSelect = useCallback((f: File | null) => {
  if (!f) return
  setFile(f)
  setError(null)
  startPreview(f)
}, [startPreview])
```

- [ ] **Step 5: Update handleImport to route vendor through commit**

In `handleImport` (line 248), replace the `else if (importType === 'vendor')` block (lines 266-280) with:

```typescript
} else if (importType === 'vendor') {
  commitVendorRecon.mutate(
    { vendorId: Number(vendorId), rows: (previewResult?.accepted ?? []).map(r => r.values as Record<string, unknown>) },
    {
      onSuccess: (data) => {
        setReconResult(data)
        setStep('done')
      },
      onError: (err) => setError(err instanceof Error ? err.message : 'Lỗi khi lưu dữ liệu'),
    }
  )
```

- [ ] **Step 6: Update footer loading states**

In the footer (line 392), update the loading check to include `previewVendorRecon.isPending`:

```typescript
{(previewClientExcel.isPending || previewDriverRecon.isPending || previewVendorRecon.isPending) && (
  <div className="flex items-center gap-2" style={{ color: 'var(--ink-2)', fontSize: 13 }}>
    <Loader2 className="h-4 w-4 animate-spin" />
    Đang phân tích tệp...
  </div>
)}
```

In the preview footer button (line 430), update disabled and loading to include vendor:

```typescript
disabled={importType === 'client' ? (commitClientExcel.isPending || !clientId) : (commitDriverRecon.isPending || commitVendorRecon.isPending)}
```

```typescript
{commitClientExcel.isPending || commitDriverRecon.isPending || commitVendorRecon.isPending ? (
```

```typescript
{commitClientExcel.isPending || commitDriverRecon.isPending || commitVendorRecon.isPending ? 'Đang lưu...' : 'Lưu dữ liệu'}
```

- [ ] **Step 7: Update done step stats for vendor**

The done step already renders vendor stats from `reconResult` (lines 1072-1092). Since `commitVendorRecon` will now set `reconResult` via `setReconResult(data)`, the existing rendering logic should work. Verify the `VendorImportResponse` from the commit endpoint matches what the done step expects.

The commit endpoint returns `VendorCommitResponse` (created, matched, fraud_skipped, errors, details) but the done step reads `reconResult?.totalRows` which doesn't exist on `VendorCommitResponse`. Fix: the done step should still use the existing `VendorImportResponse` type. Since we're calling `setReconResult(data)` with the commit response, ensure the `VendorImportResponse` type is used consistently. The commit function already returns `ApiResponse<VendorImportResponse>`.

Actually, update the done step's vendor section (lines 1072-1092) to not show `totalRows` (which doesn't exist on the commit response). Change the bottom row:

```typescript
<div className="col-span-2 p-2.5 rounded-lg border border-solid" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
  <p className="text-[14px] font-semibold m-0" style={{ color: 'var(--ink)' }}>
    Tổng số dòng xử lý: {(previewResult?.accepted?.length ?? 0) + (previewResult?.rejected?.length ?? 0)}
  </p>
</div>
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/shared/ExcelImportDrawer.tsx
git commit -m "feat: wire vendor reconciliation through preview-commit flow in ExcelImportDrawer"
```

---

### Task 5: Verify — Run lint and build

- [ ] **Step 1: Run frontend lint**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -30`
Expected: No type errors

- [ ] **Step 2: Run frontend build**

Run: `cd frontend && npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Fix any errors and commit**

If there are type errors, fix them and commit with message `fix: resolve type errors in vendor preview-commit flow`.
