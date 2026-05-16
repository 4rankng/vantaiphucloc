# Pending Tasks — P0 Accountant Pages

## Task 1: Backend — Add `GET /vehicles` endpoint

**File**: `backend/app/contexts/fleet/interface/routers/vehicles.py` (NEW)

- `GET /vehicles` — list all active vehicles (id, plate, is_active)
- Returns `list[VehicleOut]` (schema already exists in `schemas/domain.py`)
- Filter: `active_only: bool = Query(True)`
- Register router in `backend/app/contexts/fleet/interface/__init__.py`
- Register in `backend/app/api/v1/router.py`

---

## Task 2: Backend — Add `PUT /drivers/{id}` endpoint

**File**: `backend/app/contexts/fleet/interface/routers/drivers.py` (MODIFY)

- `PUT /drivers/{driver_id}` — update driver fields (username, full_name, phone)
- Accepts `{ username?, full_name?, phone? }` — all optional
- Internally updates the User record (driver = user with role=driver)
- Invalidates `drivers` cache namespace
- Returns `DriverOut`
- Permission: `require_permission("update", "Driver")`

---

## Task 3: Frontend — Redesign Driver Detail Dialog

**File**: `frontend/src/pages/accountant/DriversPage.tsx` (MODIFY)

### Reference design:
`demo/components/driver_profile_edit_modal_v2.html`

### Layout (follow demo exactly):

```
┌──────────────────────────────────────────┐
│  Thông tin tài xế                     ✕  │
├──────────────────────────────────────────┤
│                                          │
│  [🟢 CH]  HỌ VÀ TÊN                     │
│           [Chu Đức Anh_____________]     │
│                                          │
├──────────────────┬───────────────────────┤
│ 📋 TÊN ĐĂNG NHẬP│ 🚗 XE ĐANG LÁI       │
│ [@anhcd________] │ [15H18753 ▾] [+]     │
├──────────────────┼───────────────────────┤
│ 📞 SỐ ĐIỆN THOẠI│ 💰 LƯƠNG CƠ BẢN      │
│ [0917177008____] │ [5.500.000] đ         │
├──────────────────┴───────────────────────┤
│                                          │
│  LỊCH SỬ LƯƠNG            [+ Điều chỉnh]│
│  ┌──────────────────────────────────────┐│
│  │ 5.500.000 đ           từ 2026-01-01 ││
│  └──────────────────────────────────────┘│
│                                          │
├──────────────────────────────────────────┤
│  [      Đóng      ]  [  Lưu thay đổi   ]│
└──────────────────────────────────────────┘
```

### Key design rules from the demo:
1. **Header row**: Initial circle (brand-primary bg, 2-letter white text) + editable full name in a single row
2. **2-col grid** for the 4 fields: (username | vehicle) and (phone | base salary)
3. **Each cell**: icon + uppercase label (10px, tracking-wider) + inline input
4. **Cell focus**: `background: var(--theme-bg-tertiary)` on `:focus-within`
5. **Input style**: `border: none, background: transparent, font-size: 13px, font-weight: 500`
6. **Salary section**: background card with current value + date, "+ Điều chỉnh" link
7. **Footer**: "Đóng" (outline) + "Lưu thay đổi" (brand-primary, flex-2)
8. **Single save**: All changes batch into one `PUT /drivers/{id}` call on "Lưu thay đổi"
9. **No per-field save buttons** — one unified save action

### Vehicle field specifics:
- `<select>` dropdown from `GET /vehicles` (NOT free text)
- "+" link button next to dropdown → opens mini "Tạo xe mới" dialog
- New vehicle calls `PUT /drivers/{id}/vehicle` with new plate (backend auto-creates)
- After create → refresh vehicle list, auto-select new vehicle

### New frontend hooks needed:
- `useUpdateDriver()` — calls `PUT /drivers/{id}`
- `useVehicles()` — calls `GET /vehicles`

### New frontend API service:
- `vehicles.api.ts` — `getVehicles()`

---

## Task 4: Frontend — Fix TransportersPage vehicle tab

**File**: `frontend/src/pages/accountant/TransportersPage.tsx`

- Replace inline `fetchVehicleDrivers()` + `fetchDrivers()` with proper hooks from `use-queries.ts`
- Use `useVehicles()` hook once Task 1 is done
- Vehicle creation in "Thêm xe" dialog should call `POST /vehicle-drivers` or a proper vehicle creation endpoint

---

## Task 5: Backend — Add `GET /vendors/{vendor_id}/summary` endpoint

**File**: `backend/app/contexts/operations/interface/routers/vendor_reconciliation.py` (MODIFY) or new router

- `GET /vendors/{vendor_id}/summary?date_from=&date_to=`
- Returns aggregated data for a vendor's slide-sheet:
  ```json
  {
    "vendor": { "id", "name", "phone", "taxCode", "address" },
    "stats": {
      "tripCount": 24,
      "containerCount": 156,
      "totalPaid": 45200000,
      "totalAmount": 50000000
    },
    "drivers": [
      {
        "plate": "15C-88888",
        "tripCount": 12,
        "containerCount": 15,
        "totalPaid": 8500000
      }
    ],
    "reconciliations": [
      {
        "importId": 5,
        "periodFrom": "2026-04-01",
        "periodTo": "2026-04-30",
        "containerCount": 45,
        "status": "APPLIED"
      }
    ]
  }
  ```
- **Logic** (all backend, no frontend aggregation):
  - `stats` → aggregate `WorkOrder` where `vendor_id = X` and date range
  - `drivers` → group WorkOrders by `vehicle_external_plate`, aggregate per plate
  - `reconciliations` → `VendorReconciliationImport` where `vendor_id = X`, ordered by period desc
- Permission: `get_current_user` (same as other vendor endpoints)

### Data sources:
- `WorkOrder` (ORM) has `vendor_id` and `vehicle_external_plate` fields
- `VendorReconciliationImport` tracks reconciliation history per vendor
- `WorkOrderContainer` provides container counts

---

## Task 6: Frontend — Vendor Detail Slide-Sheet

**File**: `frontend/src/pages/accountant/VendorsPage.tsx` (MODIFY)

### Changes:
- Clicking a vendor row opens a `<Sheet>` (slide-over from right) instead of a dialog
- Sheet content (all data from `GET /vendors/{vendor_id}/summary`):

#### Section 1: Vendor Info
- Name, MST, phone, address, contact person
- Edit button to update vendor fields

#### Section 2: KPI Stats (3 cards)
- Trip count (chuyến)
- Container count (cont)
- Total paid (đã thanh toán)

#### Section 3: External Drivers (Lái xe của nhà thầu)
- List of `vehicle_external_plate` grouped from WorkOrders
- Each row: plate badge + trip count + total paid
- These are NOT our internal drivers — they're the vendor's own trucks

#### Section 4: Reconciliation History (Lịch sử đối soát)
- List of past reconciliation imports
- Each row: period + container count + status badge (APPLIED / PENDING / DISCARDED)

#### Footer actions:
- "Xuất đối soát" button → calls `exportVendorTripsExcel()`
- "Đóng" button

### New frontend hooks needed:
- `useVendorSummary(vendorId, dateFrom?, dateTo?)` — calls `GET /vendors/{vendor_id}/summary`

### New frontend API service:
- `vendors.api.ts` — `getVendorSummary(vendorId, params?)`

### UI component:
- Use `<Sheet>` + `<SheetContent>` from `@/components/ui/Sheet` (already exists)
- Follow DashboardCard pattern for sections inside the sheet
- Mobile: full-screen sheet
- Desktop: slide-over from right (~400px width)



Use /Users/dev/Documents/projects/vantaiphucloc/demo/components/driver_profile_edit_modal_v2.html for driver detail dialog
