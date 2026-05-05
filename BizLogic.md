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

### 4.9 Reconciliation (`trip_order_work_orders`) — đối soát

Strict 1:1 join between TripOrder and WorkOrder. The kế toán performs this manually after Zalo coordination.

- **Composite PK:** `(trip_order_id, work_order_id)`.
- **Match criteria:** same `tractor_plate`, same route, same `work_type`, same `client`.
- **Effect of match:** both TO and WO get `is_locked=true`. TO becomes `COMPLETED`. WO becomes `MATCHED` then `COMPLETED` once TO is confirmed. Driver finally sees the income.
- **Unmatch:** allowed only if TO is not yet confirmed. Reverts both records to `PENDING` and unlocks them. Triggers salary recalculation.

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

Eight bounded contexts. Each owns its tables, its language, and a clear external contract.

| Context | Owns | One-line role |
|---|---|---|
| **Identity & Access** | `users`, `push_subscriptions` | auth, RBAC, sessions |
| **Fleet** | drivers (User where role=driver), `vendors` | drivers, vendors, tractor plates |
| **Catalog** | `clients`, `locations`, `location_aliases`, `routes` | master data shared by everyone |
| **Pricing** | `pricings`, `pricing_lines` | tariff lookup |
| **Operations** | `trip_orders`, `trip_order_containers`, `trip_container_photos`, `work_orders`, `work_order_containers`, `trip_order_work_orders` | đơn hàng + phiếu làm việc + đối soát |
| **Imports** | `customer_import_templates` + the file-ingestion pipeline | ACL for customer Excel files; produces commands for Operations |
| **Billing** | `payments`, generated BK SL settlement statements | money toward customers |
| **Payroll** | `salary_periods`, `salary_period_configs` | driver pay |

`audit_logs` is cross-cutting — every context emits to it.

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

### 9.7 Realized contexts

- **Identity & Access** — extracted to `backend/app/contexts/identity/` (commit 2026-05-05). Pure-Python `User` and `PushSubscription` domain entities; `BcryptPasswordHasher` + `JwtTokenIssuer` adapters in `infrastructure/security.py`; routers under `interface/routers/`. `app/models/base.py` and `app/models/push.py` remain as one-line shims so the rest of the codebase (still using `from app.models.base import User`) keeps compiling until each consuming context is itself extracted.

The remaining 7 contexts still live in the legacy folder layout (`app/models/`, `app/services/`, `app/repositories/`, `app/api/v1/`).

---

## 10. Open questions / things still to confirm

> Items where business reality is fuzzy and the kế toán needs to confirm before the code can lock them in.

- [Open question: NEWWAY's per-vessel pricing] settlement files show different `unit_price` per voyage on the same `(route, work_type)`. Current decision: store one `Pricing` row per vessel, but no real seeding done because the source is settlement data, not a clean tariff. Confirm with kế toán whether per-vessel rows are OK or if a baseline + adjustment shape would be preferred long-term.
- [Open question: TÁC NGHIỆP / Ghi chú on BK SL] the customer's PAN BK SL file has a column "TÁC NGHIỆP" with values `XUAT TAU`/`NHAP TAU`/`CHUYEN BAI`. We don't store an `operation_type` on `TripOrder` — the export leaves the column blank. Should we add `operation_type` to `TripOrder` (and derive from pickup/dropoff direction), or keep blank?
- [Open question: per-container pricing in BK SL] the customer file prices per-container; our schema prices per-trip. Current heuristic: split trip price evenly across containers in the export. Confirm whether equal-split is acceptable, or if we should add `unit_price` to `TripOrderContainer`.
- [Open question: customer_ref / Booking No] the import pipeline extracts Booking No / B/L into `customer_ref`, but `TripOrder` has no field for it — the value is dropped on commit. Add a column?
- ~~[Open question: 22-column drop] the prior schema audit identified 22 dead/denormalized columns.~~ **RESOLVED 2026-05-05** — executed in commit `refactor: schema overhaul + clean DDD OUT schemas with nested summaries`. Dropped: `routes.{type_20ft, type_40ft, is_two_way, pickup_location, dropoff_location}`, `trip_orders.{work_type, container_number, client_name, pickup_location, dropoff_location}`, `pricings.{client_name, route, pickup_location, dropoff_location}`, `work_orders.{client_name, client_code, driver_name, pickup_location, dropoff_location}`, `salary_periods.driver_name`, `audit_logs.{ip_address, user_agent}`. OUT schemas now compose nested `*SummaryOut` objects (see §4 read-DTO note).

---

## 11. Where to look in the code

| Concern | File |
|---|---|
| Models | `backend/app/models/domain.py`, `backend/app/models/audit_log.py`, `backend/app/models/base.py` |
| Migrations | `backend/alembic/versions/*.py` |
| Auth + RBAC | `backend/app/core/security.py`, `backend/app/core/deps.py`, `backend/app/policy.polar` |
| Audit log auto-recording | `backend/app/services/audit_service.py` |
| Pricing lookup | `backend/app/services/pricing_service.py` |
| Read-DTO summary loader | `backend/app/services/summary_loader.py` |
| Location resolver (alias system) | `backend/app/services/location_resolver.py` |
| Import pipeline | `backend/app/services/import_pipeline/` (canonical schema, sheet picker, header finder, column mapper, value parsers, llm fallback, pipeline orchestrator) |
| BK SL generation | `backend/app/services/customer_settlement_service.py`, `backend/app/services/excel_pan_bk_sl.py`, `backend/app/utils/number_to_words_vi.py` |
| Trip-order use cases | `backend/app/services/trip_order_service.py`, `backend/app/api/v1/trip_orders.py` |
| Reconciliation | `backend/app/services/matching_service.py`, `backend/app/api/v1/reconcile.py`, `backend/app/services/state_machine.py` |
| Salary calculation | `backend/app/services/salary_service.py` |
| Customer-Excel import API | `backend/app/api/v1/imports.py` |
| Reports (BK SL export endpoint) | `backend/app/api/v1/reports.py` |
| Driver mobile flow (work orders) | `backend/app/api/v1/work_orders.py`, `backend/app/services/work_order_service.py` |
| Background jobs | `backend/app/workers/` |
| CLI seeders | `scripts/seeds/` (customers, locations, pricing per format, routes) |
| Frontend domain types | `frontend/src/data/domain.ts` |
| Frontend API clients | `frontend/src/services/api/` |
| Frontend pages | `frontend/src/pages/{accountant,driver,director,superadmin}/` |
| Tests | `backend/tests/` |

---

*Last meaningful revision: 2026-05-04. Update this file when business rules change. If you change code without updating this doc, you've introduced drift — fix it.*
