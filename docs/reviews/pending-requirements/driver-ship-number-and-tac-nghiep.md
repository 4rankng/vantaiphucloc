# Driver account — Số tàu (vessel/ship number) + Tác nghiệp (operation type)

## Request (verbatim)

> Tài khoản tài xế: bổ sung thêm số tàu. Tài xế nắm được số tàu này, kế toán không nắm được khi vận chuyển. Thêm Tác nghiệp (các loại tác nghiệp Huyền sẽ mô tả)

## Current state

- `WorkOrder.vessel` (String 100, nullable) already exists in `backend/app/models/domain.py`.
  - Persisted by `CreateWorkOrder` + `UpdateWorkOrder` flows.
  - Currently visible on driver create/edit screens AND on accountant trip pages, the đối soát export, etc.
- No "tác nghiệp" / operation-type field exists anywhere. `work_type` (E20/E40/F20/F40) is the container equipment type, not the same concept.

## Gaps to close

1. **Số tàu (ship number)**
   - Confirm with PL whether the existing `vessel` field is the same concept as "số tàu" or whether a separate `ship_number` column is needed.
   - Hide / mask `vessel` from accountant view while the trip is still in `PENDING` status (driver-only knowledge during transport). Reveal it to accountant after MATCHED, or only inside the customer-facing đối soát export.
   - Update API serializers: strip `vessel` from accountant work-order list/detail responses pre-MATCH.
   - Frontend: remove vessel column from accountant trip table while WO is pre-MATCH; keep it on the driver app.

2. **Tác nghiệp (operation type)**
   - Add new field `operation_type` on `WorkOrder` (or per-container on `WorkOrderContainer` — to be decided based on Huyền's list).
   - Define enum of operation types. **BLOCKED on Huyền providing the list.**
   - DB migration + Pydantic schemas + driver UI dropdown + accountant filters.
   - Decide whether `operation_type` is reported in the customer đối soát export.

## Open questions for PL / Huyền

- Is "số tàu" identical to the existing `vessel` (vessel name + voyage), or a separate code (e.g. IMO number, voyage code)?
- Full list of `tác nghiệp` values, with Vietnamese label and short code.
- Should accountants ever see the ship number, or only the customer in the exported Excel?
- Is `tác nghiệp` per work order (one value per chuyến) or per container?

## Acceptance criteria (draft, pending answers above)

- Driver create-work-order form has both fields, required where appropriate.
- Accountant work-order list/detail does not show số tàu pre-MATCH.
- Đối soát Excel export keeps `Số tàu` column (already present) and adds `Tác nghiệp` if applicable.
- Unit tests cover field-level visibility and enum validation.
