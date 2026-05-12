# Task 0106 — Export danh sách chuyến đã chạy theo khách hàng

## Scope
**Requirement:** "Can export the list of chuyen da chay (belong to each customer) regardless if matched or not matched"

Currently `GET /trip-orders/export` exports all trip orders filtered by date/status. The new requirement adds **per-customer (partner) export**: given a `partner_id`, export all trip orders belonging to that customer, including both matched and unmatched trips.

This supports the business workflow where kế toán sends a list of completed containers/trips to a customer for reconciliation against the customer's own Excel file.

## Technical Implementation

### Backend
1. **`backend/app/contexts/operations/interface/routers/trip_orders.py`**:
   - Add `partner_id: int | None = None` query parameter to the existing `export_trip_orders_excel` endpoint (line ~246).
   - Pass `partner_id` through to `generate_trip_orders_excel()`.

2. **`backend/app/contexts/operations/infrastructure/excel.py`**:
   - Update `generate_trip_orders_excel()` to accept `partner_id` parameter.
   - When `partner_id` is provided, filter trip orders by `TripOrder.partner_id == partner_id`.
   - The export should include ALL statuses (not just matched), so do NOT filter by status unless explicitly passed.
   - Columns in the exported Excel:
     - STT
     - Số container
     - Tuyến đường (điểm đi → điểm đến)
     - Ngày chạy
     - Biển số xe
     - Trạng thái khớp (Đã khớp / Chưa khớp)
     - Đơn giá (if pricing snapshot exists)
   - Include the partner name in the filename: `chuyen_khach_hang_{partner_name}_{date}.xlsx`

3. **`backend/app/contexts/operations/domain/repositories.py`**:
   - Ensure the repository's list/query method supports `partner_id` filtering (it already does per line 35 of repositories.py — `partner_id: int | None = None`).

### Frontend
4. **`frontend/src/pages/accountant/TripList.tsx`** or **Client detail page**:
   - Add an "Xuất Excel" button that calls the export endpoint with the selected `partner_id`.
   - This could be on the existing client list page or as an action on each client's detail view.
   - Use `window.open()` or `<a>` download approach for file download (same pattern as existing import).

## Testing Criteria
- [ ] `GET /trip-orders/export?partner_id=X` returns Excel file with only that partner's trips
- [ ] Excel includes both matched and unmatched trip orders
- [ ] Excel columns: STT, Số cont, Tuyến, Ngày, Biển số, Trạng thái, Đơn giá
- [ ] Filename includes partner name and date
- [ ] `GET /trip-orders/export` without `partner_id` still works as before (backward compatible)
- [ ] Integration test: create trips for 2 partners, export one, verify only that partner's trips appear
