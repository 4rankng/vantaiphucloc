# BizLogic — Phúc Lộc Transport

> **Single source of truth** for the business logic, domain model, and architecture of this system. When this doc and the code disagree, this doc is the brief — fix the code or fix the doc and don't leave both wrong.

---

## 1. What this system is

Phúc Lộc Transport (Công ty TNHH AMT Phúc Lộc, MST 0201965047) is a Vietnamese container-trucking company in Hải Phòng. The system tracks the trucking lifecycle from **customer order** → **truck dispatch** → **driver completion** → **monthly settlement**. Single tenant — Phúc Lộc is the only company; no `company_id` FKs.

- **Currency:** Vietnamese Dong (VND), stored as `Integer` (no decimals).
- **Language:** all user-facing UI in Vietnamese; code identifiers in English; this doc bilingual.
- **Stack:** FastAPI + SQLAlchemy 2 (async) + Postgres + Alembic, Redis + arq for background jobs, openpyxl for Excel I/O, Gemini (Google) for OCR + LLM-fallback, JWT auth, Oso for RBAC.

---

## 2. Glossary (Vietnamese ↔ English)

Alphabetised. The right column is the code identifier we standardise on.

| Vietnamese | English | Code identifier | Notes |
|---|---|---|---|
| bảng giá | price list / tariff | `Pricing` + `PricingLine` | per (customer, work_type, route, qty) |
| bảng kê thanh toán (BK SL) | settlement statement | `SettlementStatement` | the monthly Excel sent to the customer |
| chuyến / chuyến xe | trip | `TripOrder` | aliased to "đơn hàng" — same row |
| container, cont | container | `Container` (entity), `ContainerNumber` (VO) | ISO 6346 |
| đầu kéo, biển số | tractor plate | `TractorPlate` (VO) | VN plate format |
| điểm đi / điểm trả | pickup / dropoff | `pickup_location_id` / `dropoff_location_id` | FK → Location |
| điều hành / lệnh điều hành | dispatch / dispatch order | `TripOrder` (synonym) | — |
| đối soát | reconciliation | `Reconciliation` | TripOrder ↔ WorkOrder 1:1 |
| đơn giá | unit price | `unit_price` (VND) | on `PricingLine` |
| đơn hàng | customer order | `TripOrder` | what the customer booked |
| F/E (full/empty) | freight kind | `FreightKind` (VO: `F` \| `E`) | — |
| hàng / vỏ | full / empty container | `F` / `E` | — |
| hãng tàu | shipping line | (operational, not stored as entity) | scrubbed from imports as vessel info |
| HD (hợp đồng) | contract | (filename suffix) | e.g. `*_HD.xlsx` for contract-priced files |
| kế toán | accountant | role on `User.role = 'accountant'` | manages clients, pricing, trips, reconciliation, salary |
| khách hàng | customer | `Client` | the company we ship for |
| kỳ lương | salary period | `SalaryPeriod` | 26th of prev month → 25th of month, configurable |
| nhà thầu | vendor | `Vendor` | external trucking partner |
| phiếu làm việc | work order | `WorkOrder` | what the driver actually did |
| sản lượng (SL) | volume / quantity sheet | (sheet name in BK SL) | per-trip detail |
| số xe | vehicle plate | `tractor_plate` | string on Driver/WorkOrder |
| tài xế | driver | `User` with `role='driver'` | optionally tied to a `Vendor` |
| tuyến đường | route | `Route` | (pickup_location_id, dropoff_location_id) pair |
| vận chuyển | transport | (the business itself) | — |

Two notes on naming:

- **TripOrder ≡ đơn hàng.** Earlier internal docs called it "Lệnh điều hành"; the kế toán's term is "đơn hàng" and the system follows the kế toán. The DB table is `trip_orders`; the class is `TripOrder`. They are the customer order.
- **WorkOrder ≡ phiếu làm việc.** Driver-side: "what I did". Distinct from TripOrder. They reconcile 1:1 at the end.

---

## 3. Actors

| Actor (VN) | Role | Permissions |
|---|---|---|
| **Quản trị (superadmin)** | full system access | Everything — CRUD on all entities, manage users, configure salary, delete vendors |
| **Giám đốc (director)** | view-only | Dashboards + reports + view all entities. Cannot reconcile, create work orders, or change salary config |
| **Kế toán (accountant)** | operational owner | CRUD on clients, routes, pricing, trip orders. Reconciles. Calculates salary. Runs imports + exports. Manages vendors + drivers. Cannot manage user accounts |
| **Tài xế (driver)** | mobile-app user | Submits WorkOrders (single + batch). Views own work orders + own salary. Sees income per trip ONLY after Match. Cannot see other drivers' data |
| **Customer (entity, not user)** | — | Has no login. Receives the BK SL settlement statement by file. Identified by `Client.code` (e.g. PAN, HAP, HAIAN, NEWWAY) |

Authentication: JWT bearer. Authorization: Oso policy at `app/policy.polar`. Login by phone, email, OR username — all unique.

---

## 4. Domain entities

> **Read-DTO shape.** Domain DB stores only FKs — there are NO denormalized display strings (`client_name`, `driver_name`, `pickup_location` text, etc.) at any layer. Read APIs compose nested `*SummaryOut` objects (`ClientSummaryOut`, `LocationSummaryOut`, `DriverSummaryOut`) into responses via batch JOIN at the application layer. Frontend types match the nested shape: `trip.client.name`, `trip.pickupLocation.name`, `wo.driver.name`, `salaryPeriod.driver.name`, etc. Create/Update payloads keep flat FK ids (`client_id`, `pickup_location_id`, `driver_id`, …) since IN schemas don't need nested objects. See `backend/app/services/summary_loader.py` for the batch loader and `backend/app/schemas/domain.py` for the summary types.


### 4.1 Customer (`Client` table `clients`)

Master record. Created by kế toán or auto-seeded from import-file metadata.

- **Key fields:** `code` (unique short code, e.g. `PAN`), `name`, `type` (`company` | `individual`), `phone`, `tax_code` (mã số thuế), `address`, `outstanding_debt` (VND), `is_active`.
- **Lifecycle:** Created → optionally `is_active=false` (soft delete; never hard-deleted while there's any TripOrder, WorkOrder, or Pricing referencing it).
- **Rules:** `code` is unique when set. Drivers see `code` instead of full name.

### 4.2 Driver (`User` where `role='driver'`)

A `User` row with the `driver` role and optionally a `tractor_plate`.

- **Key fields:** `phone` / `email` / `username` (any can be used to log in), `full_name`, `cccd` (CCCD = Vietnamese citizen ID, 12 digits), `vendor` (FK string label — `"Phúc Lộc"` for internal, vendor name for external).
- **Rules:** Driver per-trip salary visibility is gated on Reconciliation — the driver sees the income amount only after the kế toán matches the WorkOrder to a TripOrder.

### 4.3 Vendor (`Vendor` table `vendors`)

External trucking partner.

- **Key fields:** `name` (unique), `phone`, `tax_code`, `address`, `contact_person`, `is_active`.
- **Rules:** Cannot delete a vendor that has drivers — soft delete only. Default vendor for internal drivers: `"Phúc Lộc"`.

### 4.4 Location + LocationAlias (`locations`, `location_aliases`)

Canonical place records (port, yard, customer site).

- **`Location` fields:** `name` (unique), `lat`/`lng` (nullable), `geocode_source` (`manual` | `google` | `osm` | `driver_pin` | `seed`), `pending_geocode`, `created_via` (`manual` | `seed` | `import` | `customer_order` | `driver_pin`), `created_by_id`, `location_review_needed` (true when fuzzy-resolver linked it).
- **`LocationAlias` fields:** `location_id` (FK CASCADE), `alias`, `alias_normalized` (unique), `source` (`manual` | `seed` | `seed_confirmed` | `import_pending` | `import_confirmed` | `customer_order_pending` | `customer_order_confirmed` | `driver_pin`).
- **Resolution order** for any incoming string (import row, đơn hàng form, …):
  1. exact match on `Location.name` (normalized: NFD-fold, lowercase, whitespace-collapse, strip `đ→d` and punctuation)
  2. exact match on any `LocationAlias.alias_normalized`
  3. fuzzy match — `difflib.SequenceMatcher.ratio() ≥ 0.92` auto-link (with `location_review_needed=true`); `≥ 0.85` ambiguous (kế toán picks)
  4. no match — auto-create new `Location` with `created_via=<caller>` and the raw string as a new alias with `source='<caller>_pending'`
- **Idempotency:** running the resolver twice with the same string in the same request returns the same `Location.id` (in-process cache + alias write).

### 4.5 Route (`Route` table `routes`)

Pickup → dropoff pair. Master data.

- **Key fields:** `route` (display label), `pickup_location_id` / `dropoff_location_id` (FK), `type_20ft` / `type_40ft` (legacy reference prices — slated for removal; pricing belongs on PricingLine), `is_two_way`, `is_active`.
- **Rules:** Pickup + dropoff together define a route. Soft delete only when referenced by Pricing/TripOrder/WorkOrder.

### 4.6 Pricing + PricingLine (`pricings`, `pricing_lines`) — bảng giá

Per-customer tariff, looked up by `(client, work_type, pickup, dropoff, quantity)`.

- **`Pricing` (header) fields:** `client_id`, `work_type` (`E20` | `E40` | `F20` | `F40`), `pickup_location_id`, `dropoff_location_id`, `is_active`.
- **`PricingLine` (child) fields:** `quantity` (1 or 2 — only 1 for 40-foot, 1 or 2 for 20-foot), `unit_price` (VND), `driver_salary` (VND), `allowance` (VND).
- **Lookup:** `find_tiered_pricing(client_id, work_type, qty, pickup, dropoff)` resolves locations through the alias system, looks up `Pricing` row, then picks the matching tier (falls back to `quantity=1` when the exact tier isn't defined).
- **Seeding:** the per-customer CLI seeders at `scripts/seeds/seed_pricing_from_files.py` (PAN, HAP, NEWWAY layouts).

### 4.7 TripOrder + TripOrderContainer + TripContainerPhoto (`trip_orders`, `trip_order_containers`, `trip_container_photos`) — đơn hàng

Customer-facing order. The largest aggregate.

- **`TripOrder` fields:** `trip_date`, `client_id`, `code` (e.g. `PAN0011`), `pickup_location_id` / `dropoff_location_id`, `pickup_raw` / `dropoff_raw` (immutable original strings), `pricing_id`, `unit_price` / `driver_salary` / `allowance` / `revenue` (VND), `status`, `is_confirmed`, `is_locked`, `location_review_needed`.
- **`TripOrderContainer` fields:** `container_number` (ISO 6346), `work_type` (E20/E40/F20/F40), plus detail captured by the import pipeline: `container_size` (20/40), `container_type` (ISO code like 22G0), `freight_kind` (F/E), `gross_weight_kg`, `seal_no`, `commodity`, `container_metadata` (JSONB free-form).
- **`TripContainerPhoto`:** `kind` (`pickup` | `dropoff` | `seal` | `eir` | `other`), `file_url`, `caption`, `uploaded_at`, `uploaded_by`. Populated by the driver mobile flow (not yet shipped) or accountant UI.
- **Status machine:** `DRAFT → PENDING → COMPLETED → CONFIRMED`, with `CANCELLED` from any pre-confirm state. Lock on Match.
- **Invariants:**
  - All containers in a TripOrder share the same `work_type` (no mixed E20+F40 in one order).
  - 40-foot orders carry exactly 1 container. 20-foot orders carry 1 or 2.
  - `pickup_raw`/`dropoff_raw` are immutable provenance — never edited after the row is created.
  - Once `is_confirmed=true`, the row is permanently locked. No edits, no unmatch.

### 4.8 WorkOrder + WorkOrderContainer (`work_orders`, `work_order_containers`) — phiếu làm việc

Driver-side record of a trip actually performed.

- **`WorkOrder` fields:** `client_id`, `code` (e.g. `ABC0011`), `route`, `pickup_location_id` / `dropoff_location_id`, `driver_id`, `tractor_plate`, `gps_lat` / `gps_lng` / `gps_address`, `unit_price` / `driver_salary` / `allowance` / `earning` (VND), `pricing_id`, `status` (`PENDING` → `MATCHED` → `COMPLETED` → `CANCELLED`), `is_locked`.
- **`WorkOrderContainer` fields:** `container_number`, `work_type`, `photo_url` + `photo_lat`/`photo_lng`/`photo_timestamp`/`photo_address` (the driver's pickup-proof photo).
- **Driver visibility rule:** `driver_salary` / `allowance` / `earning` are HIDDEN from the driver until reconciliation matches their WorkOrder to a TripOrder.

### 4.9 Reconciliation (`reconciliations`) — đối soát

N:M join between TripOrder and WorkOrder via the `reconciliations` link table. The kế toán performs this manually after Zalo coordination.

- **Direction:** 1 WorkOrder ↔ N TripOrders (one "chuyến" can carry containers from multiple "đơn hàng"). The reverse (1 TO → N WOs) is currently blocked — see DECISION-001.
- **Link table columns:** `trip_order_id`, `work_order_id`, `is_active`, `match_score`, `matched_by`, `matched_at`, `unmatched_by`, `unmatched_at`, `reason`.
- **Unique constraint:** `(trip_order_id, work_order_id, is_active)`.
- **Match criteria:** same route, same `work_type`, same partner, container number overlap. Score-based via `suggest_trip_matches`.
- **Effect of match:** WO gets `is_locked=true`, status → `MATCHED`. TO gets `is_locked=true`, status → `COMPLETED`. Pricing snapshot accumulates on WO (unit_price, driver_salary, allowance are summed per matched TO).
- **Multi-match:** `POST /reconcile/batch-for-wo` accepts `{work_order_id, trip_order_ids[]}` to bind one WO to multiple TOs in a single call.
- **Unmatch:** `POST /reconcile/unmatch` requires both `work_order_id` and `trip_order_id`. If the WO still has other active links, only the specific TO's salary values are subtracted from accumulated WO totals. If it was the last link, WO resets to `PENDING` with all values zeroed.
- **Unmatch restriction:** allowed only if the TO is not yet confirmed (`is_confirmed=false`).
- **Auto-match:** `POST /reconcile/auto-match` iterates all PENDING WOs and matches ALL full-score TOs (not just top 1).

### 4.10 SalaryPeriod + SalaryPeriodConfig (`salary_periods`, `salary_period_configs`) — kỳ lương

- **`SalaryPeriodConfig`** is a singleton (one row): `from_day`, `to_day` (1–28). Controls when the kỳ starts/ends.
- **`SalaryPeriod`:** per-driver-per-period bucket — `start_date`, `end_date`, `work_order_count`, `price_per_order`, `total_salary` / `total_allowance` / `total_deduction` / `net_pay` (VND), `status` (`OPEN` → `CALCULATED` → `PAID`).
- **Calculation:** sum of `WorkOrder.earning` for matched WOs in `[start_date, end_date]`.
- **Default cycle** (matches BK SL): from_day = 26, to_day = 25.

### 4.11 Payment (`payments`)

Customer payment receipt: `client_id`, `amount` (VND), `payment_method`, `reference`, `created_by_id`. Reduces `Client.outstanding_debt`.

### 4.12 SettlementStatement (BK SL — Bảng kê thanh toán)

Generated artifact, not a table. Two-sheet Excel produced by `app/services/excel_pan_bk_sl.py`:

- **Sheet `BKTT T{MM}.{YY}`** — settlement summary by `(route × cont type)`.
- **Sheet `SL T{MM}.{YY}`** — per-container detail.

Filename: `{CLIENT_CODE}_BK_SL_T{MM}.{YY}_HD.xlsx`. Uses VAT 8%. Period: 26-of-prev-month → 25-of-month.

### 4.13 CustomerImportTemplate (`customer_import_templates`)

Cached column-mapping per `(client_id, structure_hash)` for the customer-Excel import. `structure_hash` = sha256 of (sheet_name, normalized header cells). Stores `column_mapping` (list of per-column canonical-field assignments) + optional `llm_cache` so the same Gemini header-classification call isn't made twice.

### 4.14 AuditLog (`audit_logs`)

Cross-cutting forensic record. Auto-emitted by SQLAlchemy session listener. Captures `user_id`, `action` (`CREATE` | `UPDATE` | `CANCEL` | `CONFIRM` | `LOCK` | `MATCH` | `UNMATCH`), `table_name`, `record_id`, `old_value` / `new_value` (JSON), `reason` (required for `CANCEL` / `UNMATCH`).

### 4.15 PushSubscription (`push_subscriptions`)

Web-push tokens per user (driver mobile app). Standard P-256 keys.

---

## 5. Core workflows

### 5.1 Customer Excel arrives → đơn hàng created

1. Kế toán uploads file via `Nhập từ Excel` page in the accountant UI.
2. Backend runs the **5-layer detection pipeline** (`app/services/import_pipeline/`):
   - **Layer 1 — Sheet picker.** Score every visible sheet; penalize stowage diagrams (rows with ≥2 container numbers, side-by-side repeated headers).
   - **Layer 2 — Header row finder.** Within the chosen sheet, scan the first ~25 rows; pick the row with most synonym hits + diverse data below.
   - **Layer 3 — Column mapper.** Per column: heuristic dictionary lookup → substring synonym → value-pattern check → LLM fallback (Gemini, gated by `IMPORT_LLM_FALLBACK_ENABLED`).
   - **Layer 4 — Value parsers.** ISO 6346 normalize, container size from ISO code or token, F/E with VN aliases, weights with EU/US thousands separators, dates with DMY priority + Excel serial fallback.
   - **Layer 5 — Row validation + bucketing.** Required: `container_no`, `container_size`, `freight_kind`. Other reasons → `rejected[]` with reason codes.
3. Frontend shows 3-pane preview: layout summary + editable column mapping + parsed rows with `(có sẵn)` / `(gợi ý)` / `(mới)` / `(trùng lặp?)` location badges.
4. Kế toán reviews + commits. Each accepted row groups into TripOrders by `(date, dropoff, tractor_plate-or-customer_ref)` if any grouping signal is present, else 1 row = 1 TripOrder.
5. TripOrders are created with `status=DRAFT`, `unit_price=0` — pricing is a separate step.
6. **Idempotency key:** `(client_id, trip_date, container_no)`. Re-running the same import is a no-op.

Excluded by design: vessel name, voyage, ATA/ATD/ETA/ETB/ETD, port codes, bay/slot, crane code, sales/marketing region. The ACL drops these.

### 5.2 Pricing applied to a draft đơn hàng

Either:
- Kế toán hits **Áp giá theo bảng giá** on the import-results screen → `POST /imports/apply-pricing` runs `find_tiered_pricing(...)` per draft TripOrder. Hits fill `unit_price` / `driver_salary` / `allowance` / `pricing_id` and transition `DRAFT → PENDING`. Misses are listed for manual handling.
- OR kế toán fills the price manually via the trip detail UI.

### 5.2a Bảng giá imported from a customer tariff Excel

Kế toán uploads a customer tariff file via `Nhập bảng giá` (`/accountant/import-pricing`):

1. Pick customer + (optional) format (PAN/HAP/NEWWAY) — auto-detected from filename if omitted.
2. `POST /imports/customer-pricing/preview` parses the format-specific layout (PAN's `Trucking (HD)`, HAP's `CUOC`, NEWWAY best-effort) and returns a list of `(pickup, dropoff, work_type, unit_price, qty, driver_salary, allowance)` rows plus per-route location resolutions (same shape as orders import).
3. Kế toán reviews, edits, deletes rows in the 3-pane UI.
4. `POST /imports/customer-pricing/commit` upserts `Pricing` headers (idempotent on `(client_id, work_type, pickup_location_id, dropoff_location_id)`) and `PricingLine` rows (idempotent on `(pricing_id, quantity)`). Existing lines are left alone unless `update_existing_lines=true`.

Driver_salary + allowance default to 0 — customer tariffs only carry `unit_price`; the internal cost split stays manual via PricingDetail.

### 5.3 Driver completes the trip (mobile app)

1. Driver opens the mobile app, picks a TripOrder for them (by truck plate + route).
2. App captures container number (OCR-assisted), container photo (with GPS + timestamp), pickup confirmation.
3. Submitted as a `WorkOrder` with `status=PENDING`.

(The mobile UI is not yet shipped; the backend endpoints are ready.)

### 5.4 Reconciliation (đối soát)

1. Kế toán reviews unmatched `PENDING` TripOrders and `PENDING` WorkOrders side-by-side.
2. Matches one-to-one by `(tractor_plate, route, work_type, client)`.
3. System creates a `trip_order_work_orders` row, locks both records, transitions WO to `MATCHED`. WO `earning` syncs from TO.
4. Driver now sees the trip income on the mobile app.
5. Salary recalculation auto-queued (arq job).

### 5.5 Confirmation

Kế toán clicks **Xác nhận với khách** on a TripOrder. `is_confirmed=true`. Permanent — no edits, no unmatch. WO becomes `COMPLETED`.

### 5.6 Settlement (BK SL)

End of period (default 26-of-prev-month → 25-of-month):

1. Kế toán opens **Báo cáo khách hàng** → picks customer + period + clicks **Xuất Excel**.
2. Backend (`app/services/customer_settlement_service.py` + `excel_pan_bk_sl.py`):
   - Pulls all confirmed TripOrders for `(client_id, period)`.
   - Aggregates by `(pickup, dropoff)` for the BKTT sheet.
   - Renders SL sheet (per-container detail).
   - Computes VAT 8%, rounds, writes the Vietnamese amount-in-words.
   - Filename: `{CODE}_BK_SL_T{MM}.{YY}_HD.xlsx`.
3. File streamed to browser.

### 5.7 Salary

Background job sums each driver's matched WorkOrder earnings for the period and creates / updates the `SalaryPeriod` row. Kế toán reviews on the **Kỳ lương** screen and marks `PAID` after payout.

---

## 6. Non-obvious business rules

- **BK SL period is NOT a calendar month.** It's 26-of-prev-month → 25-of-month. Configurable via `SalaryPeriodConfig`. Both salary and settlement default to this cycle.
- **VAT is 8%** at present (subject to government policy).
- **Container number normalization:** uppercase, drop hyphens. ISO 6346 shape validation `^[A-Z]{4}\d{7}$` is enforced; the check digit is NOT, because real customer files frequently contain typos and the system prefers ingesting a flagged row over rejecting it.
- **Container size from ISO code:** prefix digits 22 → 20-foot, 42/45 → 40-foot. Type suffix (G0/G1/R0/R1/T0/U0) preserved on the container row but doesn't affect work_type.
- **Trip grouping during import:** signal precedence is `tractor_plate` first, then `customer_ref`. If neither, 1 row = 1 trip.
- **Location alias source semantics:**
  - `_pending` — auto-created via fuzzy match or new-row creation; admin should review.
  - `_confirmed` — kế toán confirmed it in the UI.
  - `seed` — added by the migration's starter set.
  - `seed_confirmed` — extracted by the sample-file seeder (treated as accountant-verified by virtue of being from a real customer file).
- **Driver_salary / allowance default to 0** when seeding pricing from customer tariff sheets. Customer tariffs only carry `unit_price`; the internal cost split is a Phúc Lộc rule the kế toán enters via the `PricingDetail` UI.
- **TripOrder ↔ WorkOrder is strict 1:1.** A WorkOrder cannot be partially matched, cannot be split across multiple TripOrders, and cannot be matched to a TripOrder from a different client.
- **Status side-effects of confirmation are permanent.** Once `TripOrder.is_confirmed=true`, the linked WorkOrder cannot be unmatched and the kế toán cannot revise the trip price. To correct an error, cancel-and-recreate.

---

## 7. External integrations

| System | Purpose | Adapter |
|---|---|---|
| **Gemini (Google Generative Language)** | (a) OCR on container photos, (b) header classification fallback in the import pipeline | `app/services/ai_service.py` (OCR), `app/services/import_pipeline/llm.py` (header classifier) — both gated by env flags |
| **Web Push** | driver mobile notifications | `app/services/push_service.py` + `vapid` keys |
| **Customer email (planned)** | send the BK SL settlement file | not yet wired — currently the kế toán downloads + emails manually |
| **GPS feed (planned)** | driver location stream | `Location.lat/lng` + `geocode_source='driver_pin'` schema is ready; consumer endpoint `POST /locations/pin` exists; mobile-app producer pending |

The customer Excel files themselves are an external system. The 5-layer import pipeline is the anti-corruption layer; nothing about a customer's column naming or sheet layout leaks into the domain.

---

## 8. What is NOT in scope yet

- Driver mobile app (Capacitor) — backend ready, app pending.
- Automated geocoding (Google / OSM) — schema ready (`pending_geocode`, `geocode_source`); fill via driver-pin and admin-tool button only for now.
- Cross-process message bus — events dispatch in-process synchronously.
- Multi-tenant — single tenant by design.
- Customer self-service portal — customers receive the BK SL by file; no login.
- CQRS / read models / event sourcing — see architecture section, deliberately deferred.

---

## 9. Architecture (DDD)

The backend follows Domain-Driven Design with strict layer boundaries.

### 9.1 Bounded contexts

Seven bounded contexts plus a thin platform layer for cross-cutting reads.
Each owns its tables, its language, and a clear external contract.

| Context | Owns | One-line role |
|---|---|---|
| **Identity & Access** | `users`, `push_subscriptions` | auth, RBAC, sessions |
| **Fleet** | drivers (User where role=driver) | driver master, tractor plates |
| **Customer & Pricing** | `clients`, `locations`, `location_aliases`, `routes`, `pricings`, `pricing_lines`, `vendors` | merged Catalog + Pricing + Vendor (the import pipeline couples them) |
| **Operations** | `trip_orders`, `trip_order_containers`, `trip_container_photos`, `work_orders`, `work_order_containers`, `trip_order_work_orders`, `customer_import_templates` (+ import_pipeline as infra) | đơn hàng + phiếu làm việc + đối soát + customer-Excel ingestion |
| **Billing** | generated BK SL settlement statements (read aggregate composed from operations + customer master) | money toward customers |
| **Payroll** | `salary_periods`, `salary_period_configs` | driver pay |
| **Platform** | (presentation only) | dashboard summary + audit-log readout — read views that span multiple contexts |

`audit_logs` is cross-cutting — every context emits to it via `app/core/audit.py`.

### 9.2 Layer rules

Within each context:

- **Domain** — pure Python entities, value objects, domain services, events, repository ABCs. No SQLAlchemy / FastAPI / Pydantic / openpyxl imports.
- **Application** — use cases, ports, unit-of-work. Knows transactions; contains no business rules.
- **Infrastructure** — SQLAlchemy ORM + concrete repositories + external adapters (Gemini, openpyxl, …).
- **Interface** — FastAPI routers + Pydantic schemas. Calls use cases, never repos directly.

**Dependency rule:** dependencies point inward only. Domain imports nothing project-internal; application imports domain; infrastructure implements domain ABCs; interface imports application.

### 9.3 Aggregates (one transaction modifies one aggregate root)

Per-context list, abbreviated: `User`, `Driver`, `Vendor`, `Customer`, `Location` (with aliases inside), `Route`, `PricingTable` (with lines inside), `TripOrder` (with containers + photos inside), `WorkOrder` (with containers + GPS inside), `Reconciliation`, `ImportRun`, `CustomerImportTemplate`, `Payment`, `SettlementStatement`, `SalaryPeriod`, `SalaryPeriodConfig`.

Cross-aggregate consistency uses domain events (in-process, synchronous within the request, dispatched after commit).

### 9.4 Repositories

Per-aggregate-root, abstract in domain, concrete in infrastructure. The repository surface is **only what use cases need** — not "every CRUD method generated for the table".

### 9.5 Anti-patterns rejected

- Anemic domain models — entities have business methods (`trip.confirm()`, `pricing.apply_to(trip)`).
- God services — every use case is its own file.
- Pydantic-as-domain / SQLAlchemy-as-domain — domain entities are plain Python; mappers translate to/from ORM rows.
- Routers calling DB directly — banned.
- Cross-context imports of internal modules — only public ports.

### 9.6 Deferred (textbook DDD parts we intentionally don't build)

CQRS read/write split, event sourcing, dedicated message bus, polyglot persistence, saga orchestrators, heavyweight DI container, cross-context choreography via events as primary integration. Single Postgres, in-process events, FastAPI `Depends` for wiring.

### 9.7 Composition + cross-cutting

- **Composition root**: `backend/app/main.py` builds the FastAPI app. `app/api/v1/router.py` is the API-version composition file — it imports each context's interface routers and assembles the `/api/v1` surface. No business logic lives there.
- **Core / cross-cutting** (`backend/app/core/`):
  - `audit.py` — auto-recording of `audit_logs` via SQLAlchemy session events; every context calls into this.
  - `summaries.py` — batch loaders for nested `*SummaryOut` DTOs (Client / Location / Driver) consumed across contexts so list endpoints stay O(1) on round-trips. See §4.
  - `base_repository.py` — generic CRUD base class still used by a couple of context legacy-style repos (`identity/infrastructure/user_legacy_repo.py`, `customer_pricing/infrastructure/client_legacy_repo.py`); each will dissolve as those contexts finish their domain APIs.
  - `deps.py`, `security.py`, `redis.py`, `cache.py`, `worker.py`, `audit_context.py`, `oso.py`, `rate_limit.py`, `identifier.py` — request-scope auth + Redis + arq pool + rate-limiting + ID generation.
- **C6 (Imports) decision** — *not* extracted as a standalone context. The customer-Excel ingestion pipeline (`backend/app/contexts/operations/infrastructure/import_pipeline/`) lives inside Operations because every consumer is an operations use case (trip-order import, customer-pricing import via the operations router). No other context calls it. If a settlement-import flow is ever added, that's the moment to promote it.

### 9.8 Realized contexts

- **Identity & Access** — extracted to `backend/app/contexts/identity/` (commit 2026-05-05). Pure-Python `User` and `PushSubscription` domain entities; `BcryptPasswordHasher` + `JwtTokenIssuer` adapters in `infrastructure/security.py`; routers under `interface/routers/`. `app/models/base.py` and `app/models/push.py` remain as one-line shims so the rest of the codebase (still using `from app.models.base import User`) keeps compiling until each consuming context is itself extracted.
- **Customer & Pricing** — extracted to `backend/app/contexts/customer_pricing/` (initial commit 2026-05-05; finished 2026-05-05). Catalog (`Catalog` in §9.1) and `Pricing` were merged into a single bounded context because the import pipeline couples them tightly — every tariff row references customer + lane + container_type. State:
  - **Domain layer**: pure-Python aggregates `Customer`, `Location` (with aliases inside), `Pricing` (with `PricingLine` tiers inside, `line_for_quantity` business method), `Route`, `Vendor`. Repository ABCs in `domain/repositories.py`. No SQLAlchemy/Pydantic/FastAPI imports.
  - **Infrastructure layer**: ORM tables still physically in `app/models/domain.py` for now, re-exported via `infrastructure/orm.py` under `XxxORM` aliases. Mappers in `infrastructure/mappers.py`; concrete `Sql*Repository` impls in `infrastructure/repositories.py` (Customer, Vendor, Location with aliases, Route, Pricing with lines — `SqlPricingRepository.save` now reconciles tiers: update + insert + delete-orphan).
  - **Application layer**: full CRUD use cases for **all five** aggregates (Customer, Vendor, Location, Pricing, Route), plus `PinDriverLocation` and `ListAllActiveLocations` for the driver picker. The two read-only helpers shared with Operations — `pricing_lookup.find_pricing` / `find_tiered_pricing` and the `LocationResolverService` (alias chain for import + trip-order creation) — now live under `application/pricing_lookup.py` and `application/location_resolver.py`. Operations callers import them from the context path; they still talk ORM directly so `AsyncSession` flows through unchanged. A real port + repository abstraction can replace the direct ORM access during C3.
  - **Interface layer**: `/clients`, `/vendors`, `/locations` (incl. `/locations/all`, `/locations/nearby`, `/locations/pin`), `/routes`, `/pricings` all route through `app.contexts.customer_pricing.interface.routers.*`. Wired in `app/api/v1/router.py`. Pydantic schemas live in `interface/schemas.py`. Error translation maps `NotFound`/`AlreadyExists`/`LocationInUse`/`PricingNotMatched` to HTTPException in `interface/error_translation.py`.
  - **Cross-context guard** (Customer delete): the legacy SQL check for work_orders/trip_orders survives in the new router as a thin `text()` call. To be replaced by an `OperationsRefsPort` ABC once C3 lands.
  - **Legacy code deleted**: `app/api/v1/{clients,vendors,locations,routes,pricings}.py`, `app/services/{location_resolver,pricing_service}.py`, `app/repositories/{vendor,location,pricing,route}_repo.py`. The `app/repositories/` folder still holds `client_repo.py` (used by Operations' trip_orders router) plus `trip_order_repo`, `work_order_repo`, `user_repo`, `salary_repo` — those will move when their owning context lands.
- **Operations** — fully extracted to `backend/app/contexts/operations/` (commit 2026-05-05). All four layers in place:
  - **Domain layer**: pure-Python aggregates `TripOrder` (with `TripOrderContainer` + `TripContainerPhoto` inside, plus a `matched_work_order_ids` join) and `WorkOrder` (with `WorkOrderContainer` inside). Value objects + enums in `domain/value_objects.py` (TripOrder/WorkOrder/WorkType statuses). Status transitions enforced as methods (`fill_info`/`complete`/`reopen`/`cancel`/`confirm_reconciliation`/`lock` on TripOrder; `match`/`unmatch`/`complete`/`cancel`/`lock` on WorkOrder) — invalid transitions raise `InvalidStateTransition`. Container quantity rules (40ft ⇒ 1, 20ft ⇒ ≤2) enforced inside `add_container`. `TripOrderLocked`/`WorkOrderLocked` exceptions block mutation on locked aggregates. Repository ABCs in `domain/repositories.py`.
  - **Infrastructure layer**: ORM tables still physically in `app/models/domain.py`, re-exported via `infrastructure/orm.py`. Mappers in `infrastructure/mappers.py`. `SqlTripOrderRepository` and `SqlWorkOrderRepository` implement the ABCs with id-based reconciliation for child collections (containers + photos + matched-WO links).
  - **Application layer**: callable use cases for TripOrder (`Create`/`Get`/`List`/`Update`/`Cancel`/`Confirm`/`Delete`/`CreateTripOrderFromImport`/`ApplyPricingToTrips`) and WorkOrder (`Create`/`Get`/`List`/`Update`/`Cancel`/`BatchCreate`). Reconciliation flow in `application/reconciliation.py` (`MatchTripToWorkOrder` / `UnmatchTripFromWorkOrder`) — pre-conditions raise `ReconciliationConflict` (→ HTTP 409). The 6-criteria match suggester moved into `application/match_suggester.py`. Cross-context calls go to `customer_pricing.application.pricing_lookup` and `customer_pricing.application.location_resolver`.
  - **Interface layer**: routers under `interface/routers/{trip_orders,work_orders,reconcile,imports}.py` serve `/trip-orders`, `/work-orders`, `/reconcile`, `/suggest-matches`, `/suggest-wos`, `/upload-excel`, `/export-excel`, and `/imports/*` (customer-Excel preview/commit, apply-pricing, customer-pricing tariff import). Schemas reused from shared `app.schemas.domain` since they nest cross-context `*SummaryOut` shapes. Domain exceptions translated to HTTPException in `interface/error_translation.py`.
  - **Legacy code deleted**: `app/api/v1/{trip_orders,work_orders,reconcile,imports}.py`, `app/services/{trip_order_service,work_order_service,matching_service,state_machine}.py`, `app/repositories/{trip_order_repo,work_order_repo}.py`. The `state_machine` library decorator approach was wholly replaced by domain methods on the aggregates.
  - **Tests**: `backend/tests/contexts/operations/test_domain.py` covers domain invariants; `test_application.py` covers use-case integration (create/list/cancel/match/unmatch/confirm/update + container validation) against the in-memory SQLite test DB.
- **Fleet** — extracted to `backend/app/contexts/fleet/` (commit 2026-05-06). Drivers in this codebase are `User` rows with `role='driver'`; Fleet provides the driver-scoped use cases and the public `/drivers` router on top of Identity's User aggregate. ORM is re-exported via `infrastructure/orm.py` as `DriverORM` so Fleet doesn't import Identity internals. Use cases: `ListDrivers`, `CreateDriver`. There is no separate `Vehicle` / `Trailer` aggregate yet — when one is added it will land here.
- **Billing** — extracted to `backend/app/contexts/billing/` (commit 2026-05-06). Aggregate is `SettlementStatement` (read-side, computes VAT + totals from a `route_summary`) built from operations + customer-master tables by `SqlSettlementDataLoader`. Excel writer (BKTT + SL workbook) sits in `infrastructure/excel_writer.py`. Use case: `GenerateCustomerSettlement`. Endpoint: `/reports/customer-settlement/export`.
- **Payroll** — extracted to `backend/app/contexts/payroll/` (commit 2026-05-06). Aggregates: `SalaryPeriod` (with `recalculate()` enforcing `net_pay = total_salary + total_allowance - total_deduction`) and the `SalaryPeriodConfig` singleton. Use cases: `CalculateSalary` (called from the arq worker), `ListSalaryPeriods`, `ListSalaryPeriodsForDateRange`, `UpdateSalaryPeriod`, `GetOrCreateSalaryConfig`, `UpdateSalaryConfig`. The legacy `salary_service.get_salary_period_dates` helper became `payroll.domain.entities.period_dates_for`.
- **Platform (cross-cutting reads)** — `backend/app/contexts/platform/interface/routers/` hosts the dashboard summary and audit-log readout. No domain layer — these are pure presentation views over multiple bounded contexts.

All legacy `app/services/`, `app/repositories/`, and `app/api/v1/{drivers,reports,salary,salary_config,audit,dashboard}.py` directories are gone (commit 2026-05-06). Files relocated:

- `services/audit_service.py` → `core/audit.py`
- `services/summary_loader.py` → `core/summaries.py`
- `services/{code_service,photo_storage,ocr_service,ai_service,excel_service,geocoding}.py` → `contexts/operations/infrastructure/{codes,photo_storage,ocr,ai,excel,geocoding}.py`
- `services/import_pipeline/` → `contexts/operations/infrastructure/import_pipeline/`
- `services/pricing_import.py` → `contexts/customer_pricing/infrastructure/pricing_import.py`
- `services/push_service.py` → `contexts/identity/infrastructure/push_notifications.py`
- `repositories/base.py` → `core/base_repository.py`
- `repositories/user_repo.py` → `contexts/identity/infrastructure/user_legacy_repo.py`
- `repositories/client_repo.py` → `contexts/customer_pricing/infrastructure/client_legacy_repo.py`
- `api/v1/audit.py`, `api/v1/dashboard.py` → `contexts/platform/interface/routers/`

---

## 10. Open questions / things still to confirm

> Items where business reality is fuzzy and the kế toán needs to confirm before the code can lock them in.

- [Open question: NEWWAY's per-vessel pricing] settlement files show different `unit_price` per voyage on the same `(route, work_type)`. Current decision: store one `Pricing` row per vessel, but no real seeding done because the source is settlement data, not a clean tariff. **Confirmed 2026-05-05**: `pricings` has 0 rows for `client.code='NEWWAY'` in local dev. Need a real NEWWAY tariff document from kế toán before the bảng giá import UI can ingest it; until then, NEWWAY trip-import → apply-pricing will always report 100% unpriced.
- [Open question: HAP "numeric" locations] HAP's tariff (`Phúc Lộc - Shipside T4.26 HAP.xlsx`, sheet `CUOC`) seeded 12 locations with bare numeric names (`19`, `22`, `25`, `28`, `31`, `34`, `37`, `40`, `43`, `46`, `49`, `52`) and 19 HAP pricings reference them as consecutive lanes (`22→25`, `25→28`, ...). These are not parser debris — they are live customer pricing rows. Likely they are district/yard codes the HAP source compresses to bare integers (e.g. cell `KCN Quận 22`). Action: re-read the HAP source with kế toán, decide on the real human-readable name for each numeric location, then `UPDATE locations SET name=...` in place rather than deleting.
- [Open question: TÁC NGHIỆP / Ghi chú on BK SL] the customer's PAN BK SL file has a column "TÁC NGHIỆP" with values `XUAT TAU`/`NHAP TAU`/`CHUYEN BAI`. We don't store an `operation_type` on `TripOrder` — the export leaves the column blank. Should we add `operation_type` to `TripOrder` (and derive from pickup/dropoff direction), or keep blank?
- [Open question: per-container pricing in BK SL] the customer file prices per-container; our schema prices per-trip. Current heuristic: split trip price evenly across containers in the export. Confirm whether equal-split is acceptable, or if we should add `unit_price` to `TripOrderContainer`.
- [Open question: customer_ref / Booking No] the import pipeline extracts Booking No / B/L into `customer_ref`, but `TripOrder` has no field for it — the value is dropped on commit. Add a column?
- ~~[Open question: 22-column drop] the prior schema audit identified 22 dead/denormalized columns.~~ **RESOLVED 2026-05-05** — executed in commit `refactor: schema overhaul + clean DDD OUT schemas with nested summaries`. Dropped: `routes.{type_20ft, type_40ft, is_two_way, pickup_location, dropoff_location}`, `trip_orders.{work_type, container_number, client_name, pickup_location, dropoff_location}`, `pricings.{client_name, route, pickup_location, dropoff_location}`, `work_orders.{client_name, client_code, driver_name, pickup_location, dropoff_location}`, `salary_periods.driver_name`, `audit_logs.{ip_address, user_agent}`. OUT schemas now compose nested `*SummaryOut` objects (see §4 read-DTO note).

---

## 11. Where to look in the code

| Concern | File |
|---|---|
| Models (ORM tables) | `backend/app/models/domain.py`, `backend/app/models/audit_log.py`, `backend/app/models/base.py` |
| Migrations | `backend/alembic/versions/*.py` |
| Auth + RBAC | `backend/app/core/security.py`, `backend/app/core/deps.py`, `backend/app/policy.polar` |
| Audit log auto-recording | `backend/app/core/audit.py` |
| Read-DTO summary loaders | `backend/app/core/summaries.py` |
| Composition root | `backend/app/main.py`, `backend/app/api/v1/router.py` |
| Identity (auth, users, push) | `backend/app/contexts/identity/` |
| Fleet (drivers) | `backend/app/contexts/fleet/` |
| Customer & Pricing (clients, vendors, locations, routes, pricings) | `backend/app/contexts/customer_pricing/` |
| Pricing lookup | `backend/app/contexts/customer_pricing/application/pricing_lookup.py` |
| Location resolver (alias system) | `backend/app/contexts/customer_pricing/application/location_resolver.py` |
| Operations (đơn hàng, phiếu làm việc, đối soát, imports) | `backend/app/contexts/operations/` |
| Import pipeline | `backend/app/contexts/operations/infrastructure/import_pipeline/` |
| Trip-order Excel + work-order Excel + reconciliation Excel | `backend/app/contexts/operations/infrastructure/excel.py` |
| Container OCR (Gemini-backed) | `backend/app/contexts/operations/infrastructure/ocr.py`, `ai.py` |
| TO/WO code generation | `backend/app/contexts/operations/infrastructure/codes.py` |
| Billing (BK SL settlement export) | `backend/app/contexts/billing/` |
| Payroll (salary periods + config + worker calc) | `backend/app/contexts/payroll/` |
| Platform (dashboard + audit readout) | `backend/app/contexts/platform/interface/routers/` |
| Background jobs (arq) | `backend/app/workers/` |
| CLI seeders | `scripts/seeds/` (customers, locations, pricing per format, routes) |
| Frontend domain types | `frontend/src/data/domain.ts` |
| Frontend API clients | `frontend/src/services/api/` |
| Frontend pages | `frontend/src/pages/{accountant,driver,director,superadmin}/` |
| Tests | `backend/tests/` |

---

*Last meaningful revision: 2026-05-04. Update this file when business rules change. If you change code without updating this doc, you've introduced drift — fix it.*
