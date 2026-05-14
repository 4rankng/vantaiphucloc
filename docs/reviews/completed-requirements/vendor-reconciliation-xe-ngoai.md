# Vendor (xe ngoài) trips + monthly reconciliation

## Request (verbatim)

> Còn 1 vấn đề nữa là bên e cũng sẽ gọi xe ngoài chạy, cuối tháng họ sẽ gửi file excel cho bên e để bên e đối chiếu với khách hàng, xem có khớp số cont hay không.

## Flow

1. For some trips, PL hires an **external transport company** ("xe ngoài") instead of using an in-house driver.
2. At month end, the external company sends PL an **Excel file** listing the containers/trips they ran on PL's behalf.
3. PL must **reconcile** that vendor file against PL's own records (which is what PL bills the customer) — do container numbers match? Did the vendor over- or under-claim?
4. PL then reconciles with the customer using PL's confirmed record.

## Current state

- `Partner` table already supports `partner_type="vendor"` with `partner_role="transport"` — vendor identities exist but no transactional table links them to actual trips.
- `WorkOrder.driver_id` is `nullable=False` — every WO assumes an in-house driver. No path for a vendor-run trip.
- `CustomerReconciliationImport` + `CustomerReconciliationRow` exist for the customer-side flow. **No vendor-side analog exists.**
- Đối soát export joins TripOrder → Reconciliation → WorkOrder → Vehicle → driver plate. A vendor-run trip would currently have no WO and would not appear with a plate.

## Gaps to close

### A. Record vendor-run trips

Make `WorkOrder` polymorphic over "who delivered":

- `WorkOrder.driver_id` → `nullable=True`.
- New `WorkOrder.vendor_partner_id` → `Integer, ForeignKey("partners.id"), nullable=True, index=True`.
- New `WorkOrder.vehicle_external_plate` → `String(20), nullable=True` — vendor's plate, free text since we don't manage their fleet.
- DB-level check: exactly one of `driver_id` or `vendor_partner_id` is set per row.
- Status flow stays the same (PENDING → MATCHED via Reconciliation).
- Đối soát export uses `vehicle_external_plate` when `vendor_partner_id IS NOT NULL`, else current driver→vehicle plate lookup. Customer-facing output stays opaque (single "Biển số xe" column) unless PL wants vendor vs. internal flagged.

### B. Vendor reconciliation pipeline (mirror of customer side)

New tables:

- `vendor_reconciliation_imports`: id, vendor_partner_id (FK partners), period_from, period_to, filename, file_url, status (PENDING_REVIEW | APPLIED | DISCARDED), uploaded_at, uploaded_by, applied_at, applied_by, totals (row_count, matched_count, vendor_only_count, our_only_count), notes.
- `vendor_reconciliation_rows`: id, import_id, container_number, work_type, route_text, trip_date, vendor_amount (Integer VND, nullable), match_status (MATCHED | VENDOR_ONLY | OUR_ONLY | DISPUTED | IGNORED), matched_work_order_id (nullable FK), reviewer_note.

Pipeline:

1. Accountant uploads vendor's Excel under `/accountant/vendors/<id>/reconciliation` and picks the period.
2. Parser reuses the same column-mapper / pattern-detector infrastructure used for customer imports (extract container number + route + date + amount per row).
3. Matcher attempts to match each row by container number against `WorkOrder` rows where `vendor_partner_id == this_vendor` AND `trip_date` in period (or `WorkOrderContainer.container_number` if container-level).
4. Match outcomes:
   - **MATCHED** — vendor row ↔ our WO with same container.
   - **VENDOR_ONLY** — vendor claims a delivery we have no record of. Accountant either creates a missing WO or marks DISPUTED.
   - **OUR_ONLY** — we attributed a container to this vendor for the period, vendor didn't include it. Accountant either drops the attribution or marks DISPUTED.
5. Accountant reviews, resolves, then APPLIES the import — at which point vendor_amounts land on the matched WOs (or on a separate `VendorInvoiceLine` table — see C).

### C. Vendor cost in P&L

Vendor cost is a new ingredient in the P&L (`docs/reviews/pending-requirements/profit-and-loss.md`):

- Add a 5th vehicle-cost category: `XE_NGOAI` (or a sibling top-level "CP Xe Ngoài" line, depending on PL's accounting preference).
- Cost amount source: confirmed `vendor_amount` from the applied vendor reconciliation (or a per-trip fixed rate maintained per vendor — TBD with PL).
- Per-vehicle P&L: vendor-run trips don't roll up to a PL-owned vehicle. They roll up to a virtual "Xe ngoài (<vendor name>)" bucket so the P&L view stays complete.

### D. UI

- New page `/accountant/vendors/<id>/reconciliation` listing imports for that vendor (similar to existing customer reconciliation page if any, else mirror its structure).
- Upload form: pick file + period.
- Review screen: 3 tabs (Matched / Vendor only / Our only), each row resolvable inline.
- On the trip create/edit flow (accountant side), allow attributing a trip to a vendor partner instead of a driver (`Switch: nội bộ ⟷ xe ngoài` → reveals vendor dropdown + external plate input).

## Open questions for PL

- How does PL pay vendors — fixed price list per route, per actual invoice, or per the reconciled monthly total?
- Are vendor amounts agreed at container level or trip level?
- Does PL bill the customer the same rate regardless of who drove?
- Should the customer-facing đối soát export reveal that a trip was vendor-run, or stay opaque?
- Are there per-vendor pricing tables similar to `Pricing` for customers? If yes, mirror that structure for vendor cost.
- Vendor Excel — is the format/columns stable across vendors, or does each vendor send a different layout (would push us toward the LLM-assisted import path already used for customer imports)?

## Acceptance criteria

- A trip can be attributed to a vendor partner at creation time; driver_id is no longer mandatory.
- Đối soát export to the customer still shows a plate for vendor-run trips (the external plate).
- Vendor reconciliation import → review → apply round-trip works end-to-end, parallel to `CustomerReconciliationImport`.
- P&L includes vendor costs and does not double-count them against an internal vehicle.
- Tests cover: vendor WO creation, parser on a sample vendor Excel, matcher producing the 3 outcomes, apply step writing back vendor_amount.
