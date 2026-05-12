# Task 0107 — Backend: Xuất đối soát Excel endpoint

## Scope
Create a dedicated backend endpoint `GET /trip-orders/export-doi-soat` that generates a "đối soát" (reconciliation) Excel report per khách hàng (partner) within a date range.

## Why
The accountant needs to export a reconciliation report to send to customers, listing all completed trips for a specific khách hàng in a given date range. The current export endpoints don't produce the exact column format required.

## Technical Implementation

### 1. New Excel generator function
**File:** `backend/app/contexts/operations/infrastructure/excel.py`

Add function `generate_doi_soat_excel(db, partner_id, date_from, date_to) -> bytes`:

- Query `TripOrder` where `partner_id = partner_id`, `status = 'MATCHED'`, and `trip_date BETWEEN date_from AND date_to`.
- Load related: `TripOrderContainer` (for container number and work_type), `Location` (for pickup/dropoff names), `Reconciliation` + `WorkOrder` + `Vehicle` (for vehicle plate).
- Generate Excel with openpyxl:
  - **Sheet name:** partner's name (truncated to 31 chars, Excel limit)
  - **Columns:** `STT`, `Ngày chạy`, `Số cont`, `Loại`, `Điểm lấy`, `Điểm trả`, `Biển số xe`
  - **Data:** One row per container. STT is sequential. Date formatted as `YYYY-MM-DD`. Loại is container `work_type` (E20/E40/F20/F40). Plate comes from the WorkOrder's driver's active vehicle.
  - **Styles:** Blue header row with white bold font, auto-adjusted column widths.
- Return `(bytes, partner_name)` tuple.

### 2. New API endpoint
**File:** `backend/app/contexts/operations/interface/routers/trip_orders.py`

Add `GET /trip-orders/export-doi-soat`:

```python
@router.get("/trip-orders/export-doi-soat")
async def export_doi_soat_excel(
    partner_id: int = Query(..., description="Partner (khách hàng) ID"),
    date_from: date = Query(..., description="From date (YYYY-MM-DD)"),
    date_to: date = Query(..., description="To date (YYYY-MM-DD)"),
    current_user: User = Depends(require_permission("create", "TripOrder")),
    use_case: GetTripOrder = Depends(get_get_trip_order),
):
```

- Call `generate_doi_soat_excel(session, partner_id, date_from.isoformat(), date_to.isoformat())`
- Filename: `doi_soat_{slugify_vi(partner_name)}_{date_from}_{date_to}.xlsx`
- Return as `StreamingResponse` with proper MIME type and `Content-Disposition` header.
- **IMPORTANT:** Place this route BEFORE the `GET /trip-orders/{trip_order_id}` route to avoid path parameter conflicts.

### 3. Slugify utility
**File:** `backend/app/utils/text.py` — `slugify_vi` already exists from task-0106. No changes needed.

## Testing Criteria
- Integration test in `tests/integration/test_doi_soat_export.py`:
  - **TC1:** Create a partner, 3 trip orders (2 MATCHED, 1 PENDING) with containers, linked via Reconciliation to work orders with drivers/vehicles. Call endpoint with `partner_id`, `date_from`, `date_to`. Assert: response is valid Excel, sheet name = partner name, has 2 data rows (only MATCHED), columns match spec, STT is sequential, plate is correct.
  - **TC2:** Call endpoint with date range that has no matching trips. Assert: response is valid Excel with only header row.
  - **TC3:** Call endpoint with non-existent `partner_id`. Assert: returns valid Excel with only header row (no crash).
