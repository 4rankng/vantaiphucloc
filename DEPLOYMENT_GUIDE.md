# Deployment Guide - Customer Feedback Implementation

## Quick Start

### 1. Apply Database Migration

```bash
cd /home/ubuntu/vantaiphucloc/backend
PYTHONPATH=/home/ubuntu/vantaiphucloc/backend .venv/bin/alembic upgrade head
```

**Expected output**: Should show migration 008 applied successfully.

### 2. Install New Dependencies

```bash
cd /home/ubuntu/vantaiphucloc/backend
.venv/bin/pip install openpyxl>=3.1.0
```

### 3. Add New API Endpoints

Copy the following files into the backend API directory:

1. **Excel Service**:
   ```bash
   cp app/services/excel_service.py app/services/
   ```

2. **New Reconciliation Endpoints**:
   - Merge `app/api/v1/reconcile_new.py` content into `app/api/v1/reconcile.py`
   - The new endpoints are:
     - `POST /api/v1/reconcile/upload-excel`
     - `GET /api/v1/reconcile/export-excel`

3. **Confirmation Toggle**:
   - Merge `app/api/v1/trip_orders_confirmation.py` content into `app/api/v1/trip_orders.py`
   - The new endpoint is:
     - `PUT /api/v1/trip-orders/{id}/confirm`
   - Add import at top: `from datetime import datetime, timezone`

### 4. Update API Router Registration

Edit `backend/app/api/v1/__init__.py` to include the new endpoints if needed.

### 5. Restart Services

```bash
cd /home/ubuntu/vantaiphucloc
docker compose restart backend worker
```

### 6. Verify Deployment

```bash
# Check backend logs
docker compose logs -f backend

# Check worker logs
docker compose logs -f worker
```

---

## Detailed Steps

### Step 1: Database Migration

The migration adds the following fields:

**Clients table**:
- `code` (string, nullable, unique) - Customer code

**Routes table**:
- `pickup_location` (string, nullable) - Pickup location
- `dropoff_location` (string, nullable) - Dropoff location

**TripOrders table**:
- `is_confirmed` (boolean, default false) - Reconciliation confirmation
- `confirmed_by` (integer, FK to users) - Who confirmed
- `confirmed_at` (datetime, timezone) - When confirmed

**Indexes**:
- `ix_clients_code` (unique)
- `ix_trip_orders_is_confirmed`
- `ix_trip_orders_confirmed_by`

**Foreign Key**:
- `fk_trip_orders_confirmed_by_users`

### Step 2: Backend Changes

#### Files Modified:
1. `backend/app/models/domain.py` - Updated Client, Route, TripOrder models
2. `backend/app/services/matching_service.py` - Updated matching logic (6 criteria, 80% threshold)
3. `backend/requirements-base.txt` - Added openpyxl dependency

#### Files Created:
1. `backend/app/services/excel_service.py` - Excel processing service
2. `backend/alembic/versions/008_add_customer_code_route_fields_and_reconciliation.py` - Migration

#### Files to Update (Manual Merge Required):
1. `backend/app/api/v1/reconcile.py` - Add Excel upload/export endpoints
2. `backend/app/api/v1/trip_orders.py` - Add confirmation toggle endpoint

### Step 3: Frontend Changes

#### Files to Update:

1. **Driver Pages** (Customer Code Display):
   - `frontend/src/pages/driver/CreateWorkOrder.tsx`
   - `frontend/src/pages/driver/DriverHistory.tsx`
   - `frontend/src/pages/driver/DriverHome.tsx`

   **Change**: Replace `clientName` with `clientCode` in displays

2. **Driver Pages** (Route Display - 2 Lines):
   - `frontend/src/pages/driver/CreateWorkOrder.tsx`
   - `frontend/src/pages/driver/DriverHistory.tsx`
   - `frontend/src/pages/driver/DriverHome.tsx`

   **Change**: Split route into "Điểm lấy" and "Điểm trả"

3. **Accountant Pages** (Excel Upload):
   - `frontend/src/pages/accountant/WorkOrderList.tsx` (or create new page)

   **Add**:
   - Upload button
   - File upload modal
   - Display results with duplicate highlighting

4. **Accountant Pages** (Confirmation Checkbox):
   - `frontend/src/pages/accountant/MatchJob.tsx`
   - `frontend/src/pages/accountant/TripDetail.tsx`

   **Add**:
   - "Đã chốt" checkbox
   - Toggle via API
   - Visual indicator

5. **Accountant Pages** (Excel Export):
   - `frontend/src/pages/accountant/WorkOrderList.tsx`

   **Add**:
   - "Xuất Excel" button
   - Download functionality

#### API Service Updates:

Update `frontend/src/services/api/tripOrders.api.ts` to add:

```typescript
export async function uploadCustomerExcel(
  file: File,
  clientId: number,
  dateFrom?: string,
  dateTo?: string
): Promise<ApiResponse<ReconciliationResult[]>> {
  const formData = new FormData()
  formData.append('file', file)
  const params = new URLSearchParams()
  params.append('client_id', String(clientId))
  if (dateFrom) params.append('date_from', dateFrom)
  if (dateTo) params.append('date_to', dateTo)

  const res = await api.post(`/reconcile/upload-excel?${params.toString()}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return ok(toCamel(res.data.data))
}

export async function exportReconciliationExcel(
  clientId: number,
  dateFrom?: string,
  dateTo?: string
): Promise<Blob> {
  const params = new URLSearchParams()
  params.append('client_id', String(clientId))
  if (dateFrom) params.append('date_from', dateFrom)
  if (dateTo) params.append('date_to', dateTo)

  const res = await api.get(`/reconcile/export-excel?${params.toString()}`, {
    responseType: 'blob'
  })
  return res.data
}

export async function toggleTripConfirmation(
  tripOrderId: number
): Promise<ApiResponse<TripOrder>> {
  const res = await api.put(`/trip-orders/${tripOrderId}/confirm`)
  return ok(toCamel(res.data))
}
```

#### Schema Updates:

Update `frontend/src/data/domain.ts` to add:

```typescript
export interface ReconciliationResult {
  containerNumber: string
  normalizedNumber: string
  workOrderId?: number
  tripOrderId?: number
  status: 'confirmed' | 'pending' | 'rejected'
  isDuplicate: boolean
}

// Update TripOrder interface
export interface TripOrder {
  // ... existing fields
  isConfirmed: boolean
  confirmedBy?: number
  confirmedAt?: string
}
```

### Step 4: Testing

#### Backend Tests:

1. **Database Migration**:
   ```bash
   cd backend
   PYTHONPATH=. .venv/bin/alembic current
   # Should show: 008
   ```

2. **Matching Logic**:
   ```bash
   # Test the /suggest-matches/{work_order_id} endpoint
   curl -H "Authorization: Bearer <token>" \
        http://localhost:8000/api/v1/suggest-matches/1
   ```

3. **Excel Upload**:
   ```bash
   curl -X POST \
        -H "Authorization: Bearer <token>" \
        -F "file=@test.xlsx" \
        "http://localhost:8000/api/v1/reconcile/upload-excel?client_id=1"
   ```

4. **Confirmation Toggle**:
   ```bash
   curl -X PUT \
        -H "Authorization: Bearer <token>" \
        http://localhost:8000/api/v1/trip-orders/1/confirm
   ```

5. **Excel Export**:
   ```bash
   curl -H "Authorization: Bearer <token>" \
        "http://localhost:8000/api/v1/reconcile/export-excel?client_id=1" \
        --output reconciliation.xlsx
   ```

#### Frontend Tests:

1. **Customer Code Display**:
   - Login as driver
   - Navigate to Create Work Order
   - Verify customer code is displayed instead of name

2. **Route Display (2 Lines)**:
   - Navigate to Driver History
   - Verify route shows "Điểm lấy" and "Điểm trả" on separate lines

3. **Excel Upload**:
   - Login as accountant
   - Navigate to Work Order List
   - Click "Tải lên file Excel"
   - Upload a test file
   - Verify duplicates are highlighted

4. **Confirmation Toggle**:
   - Navigate to Trip Detail
   - Click "Đã chốt" checkbox
   - Verify status changes
   - Verify only accountants can toggle

5. **Excel Export**:
   - Navigate to Work Order List
   - Click "Xuất Excel"
   - Verify file downloads

---

## Rollback Plan

If issues arise, you can rollback the changes:

### 1. Rollback Database Migration

```bash
cd /home/ubuntu/vantaiphucloc/backend
PYTHONPATH=/home/ubuntu/vantaiphucloc/backend .venv/bin/alembic downgrade 007
```

### 2. Restore Backend Files

```bash
git checkout backend/app/models/domain.py
git checkout backend/app/services/matching_service.py
rm backend/app/services/excel_service.py
git checkout backend/requirements-base.txt
```

### 3. Restore Frontend Files

```bash
git checkout frontend/
```

### 4. Restart Services

```bash
cd /home/ubuntu/vantaiphucloc
docker compose restart backend worker
```

---

## Troubleshooting

### Issue: Database migration fails

**Solution**:
1. Check database connection:
   ```bash
   docker compose logs postgres
   ```

2. Check migration status:
   ```bash
   cd backend
   PYTHONPATH=. .venv/bin/alembic current
   ```

3. Manually check if columns exist:
   ```bash
   psql -h localhost -U postgres -d vantaihanghoa -c "\d clients"
   psql -h localhost -U postgres -d vantaihanghoa -c "\d routes"
   psql -h localhost -U postgres -d vantaihanghoa -c "\d trip_orders"
   ```

### Issue: Excel upload returns error

**Solution**:
1. Check openpyxl is installed:
   ```bash
   .venv/bin/pip list | grep openpyxl
   ```

2. Check file format:
   - Must be .xlsx or .xls
   - Must have "Container Number" or "Số Container" column

3. Check logs:
   ```bash
   docker compose logs -f backend | grep excel
   ```

### Issue: Matching not working correctly

**Solution**:
1. Check matching service logs:
   ```bash
   docker compose logs -f backend | grep matching
   ```

2. Verify container number normalization:
   ```python
   from app.utils.iso6346 import normalize_container_number
   print(normalize_container_number("MSKU1234567"))
   # Should print: MSKU1234567
   ```

3. Check that container numbers in database match ISO 6346 format

### Issue: Frontend not showing customer code

**Solution**:
1. Check API response includes `clientCode`:
   ```bash
   curl -H "Authorization: Bearer <token>" \
        http://localhost:8000/api/v1/clients
   ```

2. Check frontend console for errors
3. Verify component is using `clientCode` instead of `clientName`

---

## Performance Considerations

### Database Indexes

The migration adds indexes to improve query performance:
- `ix_clients_code` - Faster customer code lookups
- `ix_trip_orders_is_confirmed` - Faster filtering by confirmation status
- `ix_trip_orders_confirmed_by` - Faster filtering by who confirmed

### Excel Processing

- Large Excel files may take time to process
- Consider adding file size limits (e.g., 10MB max)
- Consider adding row count limits (e.g., 10,000 rows max)

### Matching Algorithm

- The 6-criteria matching is more complex than before
- For large datasets, consider:
  - Adding caching
  - Paginating results
  - Using background jobs for matching

---

## Security Considerations

### File Uploads

- Validate file type (.xlsx, .xls only)
- Limit file size
- Scan for malware (if needed)
- Store files securely (if persisting)

### Permissions

- Only accountants and superadmins can:
  - Upload Excel files
  - Toggle confirmation
  - Export Excel files

### Input Validation

- Sanitize all Excel data before processing
- Validate date formats
- Validate container number format (ISO 6346)

---

## Monitoring

### Key Metrics to Monitor

1. **Excel Upload Success Rate**:
   - Track successful vs failed uploads
   - Alert if error rate > 5%

2. **Matching Performance**:
   - Track average response time for `/suggest-matches`
   - Alert if > 1s

3. **Confirmation Rate**:
   - Track how many trip orders are confirmed
   - Alert if confirmation rate drops

4. **Database Query Performance**:
   - Monitor slow queries
   - Add indexes if needed

### Logging

Key log messages to monitor:

```python
# Excel upload
"Excel headers: {...}"
"Parsed X rows from Excel file"
"Comparison complete: X containers, Y duplicates found"

# Confirmation
"TripOrder #{id} confirmed by user #{user_id}"
"TripOrder #{id} unconfirmed by user #{user_id}"

# Matching
"WO_OCR_BASE64_DECODE_FAILED"
"WO_OCR_ATTEMPTS_EXHAUSTED"
```

---

## Next Steps

1. **Get Excel Template from Customer**:
   - What columns are needed?
   - What format?

2. **Test with Real Data**:
   - Upload actual customer Excel files
   - Verify matching accuracy
   - Get feedback from accountants

3. **Frontend Implementation**:
   - Update driver UI components
   - Create Excel upload interface
   - Add confirmation checkbox

4. **User Training**:
   - Train accountants on new features
   - Document workflows
   - Create user guides

5. **Performance Optimization**:
   - Add caching
   - Optimize queries
   - Consider background jobs for large files

---

## Support

If you encounter issues:

1. Check logs: `docker compose logs -f backend`
2. Review this guide
3. Check IMPLEMENTATION_SUMMARY.md
4. Contact development team

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-01 | Initial implementation guide created |
