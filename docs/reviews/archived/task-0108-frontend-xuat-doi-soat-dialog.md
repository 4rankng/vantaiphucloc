# Task 0108 — Frontend: Xuất đối soát dialog in TripList page

## Scope
Replace the "Xuất" button on `/accountant/trips` with a "Xuất đối soát" button that opens a dialog where the user selects a khách hàng, from date, and to date, then downloads the Excel report.

## Why
The accountant needs to generate per-customer reconciliation reports directly from the trips page. The current "Xuất" button exports all trips without customer-specific filtering or the reconciliation column format.

## Technical Implementation

### 1. Add API function
**File:** `frontend/src/services/api/tripOrders.api.ts`

Add:
```typescript
export async function exportDoiSoatExcel(
  partnerId: number,
  dateFrom: string,
  dateTo: string,
): Promise<Blob> {
  const params = new URLSearchParams()
  params.append('partner_id', String(partnerId))
  params.append('date_from', dateFrom)
  params.append('date_to', dateTo)
  const res = await api.get(`/trip-orders/export-doi-soat?${params.toString()}`, {
    responseType: 'blob',
  })
  return res.data
}
```

### 2. Add React Query mutation
**File:** `frontend/src/hooks/use-queries.ts`

Add:
```typescript
export function useExportDoiSoatExcel() {
  return useMutation({
    mutationFn: (params: { partnerId: number; dateFrom: string; dateTo: string }) =>
      apiClient.exportDoiSoatExcel(params.partnerId, params.dateFrom, params.dateTo),
  })
}
```

Make sure `apiClient` (the barrel import in use-queries) exposes `exportDoiSoatExcel`.

### 3. Add Xuất đối soát dialog component
**File:** `frontend/src/pages/accountant/DoiSoatExportDialog.tsx` (new file)

Create a dialog component with:
- **Props:** `open`, `onOpenChange`, `clients: Partner[]`
- **State:** `selectedClientId: number | null`, `dateFrom: string`, `dateTo: string`
- **UI:**
  - Dialog title: "Xuất đối soát"
  - InlineSelect for khách hàng (from `clients` prop)
  - Two date inputs (`<input type="date">`) for "Từ ngày" and "Đến ngày"
  - Default `dateFrom` = first day of current month, `dateTo` = today
  - "Xuất Excel" button (disabled until all 3 fields filled), calls `useExportDoiSoatExcel` mutation
  - On success: create blob URL, trigger download with filename from Content-Disposition header or default `doi_soat.xlsx`, close dialog
  - Show loading state on button while mutation is pending

### 4. Modify TripList page
**File:** `frontend/src/pages/accountant/TripList.tsx`

Changes:
1. **Import** the new `DoiSoatExportDialog` component and `useExportDoiSoatExcel` hook (if needed in this file).
2. **Add state:** `const [doiSoatOpen, setDoiSoatOpen] = useState(false)`
3. **Replace** the "Xuất" button text with "Xuất đối soát":
   - Desktop (KPI row): Change `<Download ... /> Xuất` → `<Download ... /> Xuất đối soát`
   - Director view: Same text change
4. **Update `handleExport`:** Change from calling `exportMutation.mutateAsync()` (which exports all) to opening the dialog: `setDoiSoatOpen(true)`
5. **Add dialog** to JSX (both desktop and mobile renders):
   ```tsx
   <DoiSoatExportDialog
     open={doiSoatOpen}
     onOpenChange={setDoiSoatOpen}
     clients={clients}
   />
   ```
6. **Remove** the old `useExportTripOrdersExcel` import and mutation if no longer used anywhere in this file. Keep it if it's used elsewhere.

## Testing Criteria
- No automated test required for UI. Manual verification:
  1. Navigate to `/accountant/trips`
  2. Click "Xuất đối soát" button → dialog opens
  3. Select a khách hàng, set date range
  4. Click "Xuất Excel" → file downloads
  5. Open the file → verify sheet name = khách hàng name, columns match: STT, Ngày chạy, Số cont, Loại, Điểm lấy, Điểm trả, Biển số xe
  6. Verify only MATCHED trips in the date range appear
  7. Verify dialog closes after successful download
