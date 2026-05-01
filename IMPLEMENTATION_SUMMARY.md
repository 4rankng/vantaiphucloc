# Implementation Summary - Customer Feedback

## Overview
This document summarizes the implementation of the customer feedback requirements for the vantaiphucloc system.

## Requirements Summary

1. **Driver Section - Customer Display**: Change from customer name to customer code
2. **Driver Section - Route Display**: Split into 2 lines ("Điểm lấy" and "Điểm trả")
3. **Accountant Reconciliation - Excel Upload**: Accept Excel file from customer
4. **Duplicate Container Highlighting**: Highlight matching containers (exact match, normalized)
5. **"Đã chốt" (Confirmed) Checkbox**: Add confirmation checkbox (accountant only, reversible)
6. **Excel Export**: Export capability
7. **Potential Matches List**: Show potential TO matches for each WO
8. **Matching Logic**: 6-criteria matching with 80%+ threshold

---

## Implemented Changes

### 1. Database Migration ✅

**File**: `backend/alembic/versions/008_add_customer_code_route_fields_and_reconciliation.py`

**Changes**:
- Added `code` field to `clients` table (customer code)
- Added `pickup_location` and `dropoff_location` fields to `routes` table
- Added `is_confirmed`, `confirmed_by`, `confirmed_at` fields to `trip_orders` table
- Added indexes and foreign key constraints

**To apply migration** (when database is running):
```bash
cd /home/ubuntu/vantaiphucloc/backend
PYTHONPATH=/home/ubuntu/vantaiphucloc/backend .venv/bin/alembic upgrade head
```

### 2. Backend Models ✅

**File**: `backend/app/models/domain.py`

**Changes**:
- Updated `Client` model to include `code` field
- Updated `Route` model to include `pickup_location` and `dropoff_location` fields
- Updated `TripOrder` model to include reconciliation confirmation fields

### 3. Matching Service ✅

**File**: `backend/app/services/matching_service.py`

**Changes**:
- Updated to use 6-criteria matching:
  1. Container number (normalized to ISO 6346 format)
  2. Date (trip_date vs work_order.created_at)
  3. Pickup location (reserved for future WO fields)
  4. Dropoff location (reserved for future WO fields)
  5. Customer (client_id)
  6. Route

- **New matching logic**:
  - 6/6 (100%) = "full" confidence → auto-confirm
  - 5/6 (83.3%) = "partial" confidence → potential match
  - ≤4/6 (<80%) = "none" confidence → no match

- All criteria have equal weight (1/6 each)
- Container numbers are normalized using `normalize_container_number()` before comparison
- Only returns suggestions with "full" or "partial" confidence

---

## Still Needed (To Be Implemented)

### 4. API Endpoints

#### 4.1 Excel Upload Endpoint
**File**: `backend/app/api/v1/reconcile.py` (add new endpoint)

**Needed**:
```python
@router.post("/reconcile/upload-excel")
async def upload_customer_excel(
    file: UploadFile,
    client_id: int,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload Excel file from customer and compare with driver records.
    Returns list of containers with duplicate highlighting.
    """
    # 1. Parse Excel file
    # 2. Normalize container numbers
    # 3. Compare with WO containers
    # 4. Return results with duplicate highlighting
```

**Dependencies**:
- Add `openpyxl` to `requirements.txt`

#### 4.2 Confirmation Toggle Endpoint
**File**: `backend/app/api/v1/trip_orders.py` (add new endpoint)

**Needed**:
```python
@router.put("/trip-orders/{trip_order_id}/confirm")
async def toggle_confirmation(
    trip_order_id: int,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Toggle is_confirmed status for a trip order.
    Only accountants can call this.
    """
    # 1. Load trip order
    # 2. Toggle is_confirmed
    # 3. Set confirmed_by and confirmed_at
    # 4. Save and return
```

#### 4.3 Excel Export Endpoint
**File**: `backend/app/api/v1/reconcile.py` (add new endpoint)

**Needed**:
```python
@router.get("/reconcile/export-excel")
async def export_reconciliation_excel(
    client_id: int,
    date_from: date,
    date_to: date,
    current_user: User = Depends(require_roles("accountant", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Export reconciliation data to Excel file.
    Template to be provided later.
    """
    # 1. Query reconciliation data
    # 2. Generate Excel file
    # 3. Return file for download
```

### 5. Frontend Changes

#### 5.1 Driver Section - Customer Code Display
**Files to update**:
- `frontend/src/pages/driver/CreateWorkOrder.tsx`
- `frontend/src/pages/driver/DriverHistory.tsx`
- `frontend/src/pages/driver/DriverHome.tsx`
- Any component displaying customer name

**Changes**:
- Replace `clientName` with `clientCode` in driver-facing UI
- Update API calls to include `clientCode` in response

#### 5.2 Driver Section - Route Display (2 Lines)
**Files to update**:
- `frontend/src/pages/driver/CreateWorkOrder.tsx`
- `frontend/src/pages/driver/DriverHistory.tsx`
- `frontend/src/pages/driver/DriverHome.tsx`
- Any component displaying route

**Changes**:
- Split route display into 2 lines: "Điểm lấy" and "Điểm trả"
- Use `pickup_location` and `dropoff_location` from route data
- If route is still single string, parse it (e.g., "Hà Nội - Hồ Chí Minh")

**Example component**:
```tsx
<div className="flex flex-col gap-0.5">
  <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
    Điểm lấy: {route.pickupLocation || route.route.split(' - ')[0]}
  </div>
  <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
    Điểm trả: {route.dropoffLocation || route.route.split(' - ')[1]}
  </div>
</div>
```

#### 5.3 Matching Screen - Excel Upload
**File**: `frontend/src/pages/accountant/WorkOrderList.tsx` or create new page

**Changes**:
- Add "Tải lên file Excel" button
- Add file upload modal
- Display uploaded data with duplicate highlighting
- Show "Đã chốt" checkbox for each container

#### 5.4 Matching Screen - "Đã chốt" Checkbox
**Files to update**:
- `frontend/src/pages/accountant/MatchJob.tsx`
- `frontend/src/pages/accountant/TripDetail.tsx`

**Changes**:
- Add "Đã chốt" checkbox to trip order display
- Only show for accountants
- Toggle via API endpoint
- Show visual indicator (checkmark) when confirmed

#### 5.5 Matching Screen - Excel Export
**Files to update**:
- `frontend/src/pages/accountant/WorkOrderList.tsx`

**Changes**:
- Add "Xuất Excel" button
- Call export API endpoint
- Download generated Excel file

### 6. Schemas

#### 6.1 Update Client Schema
**File**: `backend/app/schemas/domain.py` (or clients schema)

**Changes**:
```python
class Client(Base):
    id: int
    code: Optional[str]  # Add this
    name: str
    type: str
    # ... other fields
```

#### 6.2 Update Route Schema
**File**: `backend/app/schemas/domain.py` (or routes schema)

**Changes**:
```python
class Route(Base):
    id: int
    route: str
    pickup_location: Optional[str]  # Add this
    dropoff_location: Optional[str]  # Add this
    # ... other fields
```

#### 6.3 Update TripOrder Schema
**File**: `backend/app/schemas/domain.py`

**Changes**:
```python
class TripOrder(Base):
    id: int
    # ... existing fields
    is_confirmed: bool  # Add this
    confirmed_by: Optional[int]  # Add this
    confirmed_at: Optional[datetime]  # Add this
```

#### 6.4 Add Reconciliation Schema
**File**: `backend/app/schemas/domain.py`

**Needed**:
```python
class ReconciliationResult(Base):
    container_number: str
    is_duplicate: bool
    work_order_id: Optional[int]
    trip_order_id: Optional[int]
    status: str  # "confirmed" | "pending" | "rejected"
```

---

## Deployment Steps

### 1. Database Migration
```bash
cd /home/ubuntu/vantaiphucloc/backend
PYTHONPATH=/home/ubuntu/vantaiphucloc/backend .venv/bin/alembic upgrade head
```

### 2. Install New Dependencies
```bash
cd /home/ubuntu/vantaiphucloc/backend
.venv/bin/pip install openpyxl
```

Update `requirements.txt`:
```
openpyxl>=3.1.0
```

### 3. Restart Backend Services
```bash
cd /home/ubuntu/vantaiphucloc
docker compose restart backend worker
```

### 4. Test Implementation
1. Test matching logic with 6 criteria
2. Test Excel upload and parsing
3. Test confirmation toggle
4. Test Excel export
5. Test driver UI with customer code and 2-line route display

---

## Notes

### Container Number Normalization
- All container numbers are normalized to ISO 6346 format (4 letters + 7 digits)
- Example: "MSKU1234567" → "MSKU1234567"
- This ensures exact matching works correctly
- Function: `app.utils.iso6346.normalize_container_number()`

### Matching Thresholds
- **Full match**: 6/6 criteria (100%) → auto-confirm
- **Potential match**: 5/6 criteria (83.3%) → requires manual review
- **No match**: ≤4/6 criteria (<80%) → not suggested

### Permissions
- Only accountants and superadmins can:
  - Upload Excel files
  - Toggle confirmation status
  - Export Excel files
  - Access reconciliation features

### Future Enhancements
- Add `pickup_location` and `dropoff_location` fields to `WorkOrder` model for location-based matching
- Implement auto-confirmation for 100% matches
- Add email notifications for reconciliation completion
- Add bulk confirmation feature

---

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] Client code field works in API responses
- [ ] Route pickup/dropoff fields work in API responses
- [ ] Confirmation fields work in trip orders
- [ ] Matching logic returns correct suggestions (6 criteria, 80%+ threshold)
- [ ] Excel upload parses correctly and highlights duplicates
- [ ] Confirmation toggle works (accountant only)
- [ ] Excel export generates correct file
- [ ] Driver UI shows customer code instead of name
- [ ] Driver UI shows route in 2 lines (Điểm lấy, Điểm trả)
- [ ] All permissions enforced correctly

---

## Questions for Customer

1. **Excel Template**: What should the Excel template for customer uploads look like? What columns are needed?

2. **Route Data**: Should existing routes be migrated to have pickup/dropoff locations, or should we parse the existing route field (e.g., "Hà Nội - Hồ Chí Minh")?

3. **Customer Codes**: How should customer codes be generated? Manual entry or auto-generated?

4. **Auto-Confirmation**: Should 100% matches (6/6 criteria) be auto-confirmed, or should all matches require manual confirmation?

5. **Export Template**: What fields should be included in the Excel export?
