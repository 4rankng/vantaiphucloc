# Schema overhaul — column-level audit (Phase 1, **break-fast revision**)

> **Status: AUDIT ONLY.** No DB or code changes yet.
>
> **Updated rules (2026-05-04):** project is early-stage / break-fast / no backward compat. REVIEW items have been promoted to DROP unless the reference is obviously load-bearing (active driver-app write path, FK integrity, unique constraint). One combined migration. Forward-only — `downgrade()` is a stub. Code refactor (model + schemas + services + repos + frontend types + tests) ships in the same diff.

## Method

For every public table (excluding `alembic_version`):

1. Pulled the column list from `information_schema.columns`.
2. Counted non-null rows per column.
3. Counted code references via `grep -rln '<col>'` across:
   - `backend/app/` (models / services / api / repositories / schemas)
   - `backend/tests/` (test fixtures + assertions)
   - `backend/alembic/versions/` (migration history)
   - `frontend/src/` (TypeScript types + API clients + UI)
   - `scripts/` (seeders)
4. Cross-referenced model `# legacy` / `# denormalized` comments in `backend/app/models/domain.py`.

The reference counts are noisy for common names (`id`, `name`, `created_at`) — those are KEEP without further analysis. The signal is in **uncommon column names** with **low backend hits** AND/OR **0 non-null rows** AND/OR **explicit legacy comment**.

Classification rules:
- **KEEP** — actively referenced and populated; no semantic overlap.
- **MIGRATE** — clear semantic overlap with another column on a more-canonical table; data must move first.
- **REVIEW** — referenced but read path looks dead, OR overlaps but accountant currently relies on it for display, OR 0 non-null but not obviously dead.
- **DROP CANDIDATE** — no backend code reads it AND 0 non-null AND no FK in/out.

Risk levels:
- **low** — column has 0 non-null and 0 backend reads
- **med** — column has data but only used as denormalized display cache, can be replaced with JOIN
- **high** — column carries active business logic; refactor needed before drop

## Headline summary (break-fast revision)

Across **20 tables / 142 columns**:

| Category | Count | Action |
|---|---|---|
| **KEEP** | ~98 | Active in code + populated, or FK / unique-constraint, or active driver-app write path |
| **DROP** | **22** | Promoted from MIGRATE/REVIEW under break-fast rules — one combined migration |
| **KEEP for now (real-data flag)** | 4 | `work_order_containers.photo_*` — driver mobile app actively writes; coordinate with mobile-app diff |
| **REVIEW (still genuinely unclear)** | 0 | Re-read every prior REVIEW; nothing left ambiguous after break-fast. |

**The 22 to drop:**

| # | Table | Column | Why | Risk |
|---|---|---|---|---|
| 1 | `routes` | `type_20ft` | duplicates `pricing_lines.unit_price` for F20/E20 | low (7/49 rows non-zero, dev seed) |
| 2 | `routes` | `type_40ft` | same for F40/E40 | low |
| 3 | `routes` | `is_two_way` | 0 backend reads | low |
| 4 | `routes` | `pickup_location` (string) | duplicates `pickup_location_id → locations.name` | low |
| 5 | `routes` | `dropoff_location` (string) | same | low |
| 6 | `trip_orders` | `work_type` | model marks "legacy — derived from first container" | med (read sites) |
| 7 | `trip_orders` | `container_number` | model marks "legacy — use trip_order_containers" | med (read sites) |
| 8 | `trip_orders` | `client_name` | denormalized, FK is `client_id` | med (response shape) |
| 9 | `trip_orders` | `pickup_location` (string) | duplicates FK; **backfill FK first**, then drop | med (data backfill) |
| 10 | `trip_orders` | `dropoff_location` (string) | same | med |
| 11 | `pricings` | `client_name` | denormalized | low |
| 12 | `pricings` | `route` (string) | overlaps with FK pair | low |
| 13 | `pricings` | `pickup_location` (string) | duplicates FK | low |
| 14 | `pricings` | `dropoff_location` (string) | duplicates FK | low |
| 15 | `work_orders` | `client_name` | denormalized | med (response shape) |
| 16 | `work_orders` | `client_code` | denormalized via `clients.code` | med |
| 17 | `work_orders` | `driver_name` | denormalized via `users.full_name` | med |
| 18 | `work_orders` | `pickup_location` (string) | duplicates FK | med |
| 19 | `work_orders` | `dropoff_location` (string) | same | med |
| 20 | `salary_periods` | `driver_name` | denormalized | low |
| 21 | `audit_logs` | `ip_address` | populated, never displayed | low |
| 22 | `audit_logs` | `user_agent` | populated, never displayed | low |

FKs preserved: `client_id`, `driver_id`, `pickup_location_id`, `dropoff_location_id` everywhere they exist.

`work_order_containers.photo_url / photo_lat / photo_lng / photo_timestamp / photo_address` — KEEP for now. Driver mobile app writes them. Migrate to a parallel `work_order_container_photos` table later, in coordination with the mobile-app team.

---

## Per-table audit

### `audit_logs` — system audit trail

| Column | Cls | Non-null | Refs (be/te/al/fe) | Notes |
|---|---|---|---|---|
| id, created_at | KEEP | 9/9 | universal | — |
| user_id | KEEP | 9/9 | 43/2/4/0 | who did the action |
| action | KEEP | 9/9 | 22/0/2/29 | CREATE/UPDATE/MATCH enum |
| table_name | KEEP | 9/9 | 8/0/22/0 | which entity |
| record_id | KEEP | 9/9 | 8/0/2/0 | which row |
| old_value, new_value | KEEP | 5/9 | low but functional | diff payload |
| reason | KEEP | 1/9 | 26/0/2/5 | required on cancellations |
| **ip_address** | REVIEW | 9/9 | 6/0/2/0 | populated but no reader UI shows it. Keep until audit-UI plans clarify; risk **low** |
| **user_agent** | REVIEW | 9/9 | 12/0/4/1 | same — populated, never displayed. Risk **low** |

Recommendation: **no drops here.** Audit data is cheap and forensic.

### `clients` — customer master

| Column | Cls | Non-null | Notes |
|---|---|---|---|
| id, code, name, type, phone, is_active, created_at, updated_at | KEEP | high | core master data |
| tax_code, address, contact_person | KEEP | 5–6/23 | optional but rendered in UI |
| outstanding_debt | KEEP | 23/23 | money — used by the BK SL settlement summary |

No issues.

### `customer_import_templates` — Excel-import column-mapping cache

All columns are recent (migration 023/024) and actively referenced by `app/services/import_pipeline/templates.py`. **0 non-null in dev DB only because no kế toán has saved a template yet.** Don't drop.

### `location_aliases` — alias→canonical lookup

All columns active and unique-indexed. KEEP.

### `locations`

| Column | Cls | Non-null | Notes |
|---|---|---|---|
| id, name, is_active, created_at, updated_at | KEEP | 67/67 | core |
| lat, lng, geocoded_at, geocode_source | KEEP | 0/67 (3 stubbed) | populated by GPS picker (driver_pin) once mobile app ships. Migration 025 wired the schema in advance |
| pending_geocode | KEEP | 67/67 | read by future "geocode this" admin tool |
| created_via | KEEP | 36/67 | filterable column for admins ("auto-created from import") |
| created_by_id | KEEP | 0/67 | populated when resolver gets a real user_id (most resolver invocations to date came from seeders with user_id=None) |
| location_review_needed | KEEP | 0/67 | set by FUZZY_AUTO matches; no fuzzy match has fired in dev yet |

Recommendation: **no drops.** Several columns are pre-wired for the GPS / driver-pin flow.

### `payments`

All 7 columns active. KEEP.

### `pricing_lines`

| Column | Cls | Non-null | Notes |
|---|---|---|---|
| id, pricing_id, quantity, unit_price | KEEP | 271/271 | core |
| driver_salary, allowance | KEEP | 271/271 | active business logic |

No issues.

### `pricings`

| Column | Cls | Non-null | Notes |
|---|---|---|---|
| id, client_id, work_type, route, is_active | KEEP | high | core |
| **client_name** | **REVIEW** (denormalized) | 271/271 | duplicate of `clients.name` via `client_id`. Model comment: "denormalized for display". Used by UI fast-render. Risk **med** if we drop — every list view would need a JOIN. |
| **route** (string) | **REVIEW** | 271/271 | overlaps with `(pickup_location_id, dropoff_location_id)`. The string is a free-form description, the FKs are the canonical link. Currently both populated. |
| **pickup_location, dropoff_location** (string) | **REVIEW** | 211/271, 211/271 | overlap with `pickup_location_id`/`dropoff_location_id`. Pricing service falls back to string match when FK not set. Once Location resolver is in for all writes, FK is canonical. |
| pickup_location_id, dropoff_location_id | KEEP | 211/271 | the FK target |

Recommendation: **MIGRATE then drop** the three string columns once we backfill all `pricings` to have FK populated. Keep `client_name` until the UI's pricing list page is refactored to JOIN.

### `routes` — **the user's original ask**

| Column | Cls | Non-null | Action |
|---|---|---|---|
| id, route, pickup_location_id, dropoff_location_id, is_active, created_at, updated_at | KEEP | 49/49 | core path master |
| **type_20ft** | **MIGRATE → DROP** | 7/49 non-zero | denormalised reference price; data lives in `pricing_lines.unit_price` where `pricing.work_type IN (F20, E20)`. Risk **med** — UI may show this on a route list. |
| **type_40ft** | **MIGRATE → DROP** | 7/49 non-zero | same — `pricing_lines.unit_price` for `F40/E40` |
| **is_two_way** | REVIEW | 2/49 TRUE | only 2 rows TRUE; never read by backend code (grep returns 0 hits in `app/`). Probably never wired. Risk **low** to drop. |
| **pickup_location, dropoff_location** (string) | **REVIEW (denormalized)** | 49/49 | overlap with FK columns, same pattern as `pricings`. Already always populated alongside FK. |

**This is the cleanest target for the first migration round.** Detail in Phase 2 below.

### `salary_period_configs` / `salary_periods`

`configs`: singleton, all 4 columns used. KEEP.

`salary_periods`:

| Column | Cls | Non-null | Notes |
|---|---|---|---|
| id, driver_id, start_date, end_date, status | KEEP | 2/2 | core |
| **driver_name** | **REVIEW** (denormalized) | 2/2 | duplicate of `users.full_name`. Same call as other `*_name` denorm. |
| work_order_count, price_per_order, total_salary, total_allowance, total_deduction, net_pay | KEEP | 2/2 | calculated values |

### `trip_container_photos`

All columns active (migration 024). 0 rows but pre-wired for driver mobile flow. KEEP.

### `trip_order_containers`

| Column | Cls | Non-null | Notes |
|---|---|---|---|
| id, trip_order_id, container_number, work_type | KEEP | 1949/1949 | core |
| container_size, container_type, freight_kind, gross_weight_kg, seal_no, commodity, container_metadata | KEEP | 1872/1949 | populated by import pipeline; `work_type` is now a derived combo (`freight_kind + container_size`) but kept for backwards compat with existing services |

Note: `work_type` overlaps with `(freight_kind, container_size)`. Both populated. Worth a future REVIEW once all consumers move to the split fields.

### `trip_order_work_orders` — join table

Only `(trip_order_id, work_order_id)` — both active.

### `trip_orders`

| Column | Cls | Non-null | Notes |
|---|---|---|---|
| id, trip_date, client_id, route, status, unit_price, driver_salary, allowance, revenue, created_at, updated_at, is_locked, locked_at, locked_by, is_confirmed, confirmed_by, confirmed_at, code | KEEP | high | core |
| **client_name** | **REVIEW** (denormalized) | 1530/1530 | model comment: "denormalized" |
| **work_type** | **MIGRATE → DROP** | 1466/1530 | model comment: **"legacy — derived from first container"**. Replace reads with `(SELECT work_type FROM trip_order_containers WHERE trip_order_id = t.id LIMIT 1)`. |
| **container_number** | **MIGRATE → DROP** | 1440/1530 | model comment: **"legacy — use trip_order_containers"**. Same pattern as `work_type`. |
| pickup_location_id, dropoff_location_id | KEEP | 64/1530 | FK; populated by Location resolver. Old rows pre-resolver have NULL — backfill possible. |
| pickup_location, dropoff_location (string) | KEEP | 394/1530, 636/1530 | the canonical-name string after resolver runs (resolver writes `Location.name` into this column). Used by free-text fallback in `find_pricing`. Once all rows have FK, this becomes redundant — REVIEW. |
| **pickup_raw, dropoff_raw** | KEEP | 0/1530, 566/1530 | the original input string (immutable). pickup_raw is 0/1530 because earlier imports used pickup_location for raw + canonical (the resolver-aware path was added in migration 025). Newer imports populate it. |
| pricing_id | KEEP | 1/1530 | populated when Apply-Pricing finds a tariff |
| location_review_needed | KEEP | 0/1530 | flagged when fuzzy resolver auto-linked |

### `users`

| Column | Cls | Non-null | Notes |
|---|---|---|---|
| id, username, hashed_password, role, is_active, created_at, updated_at | KEEP | core |
| email, phone, full_name, cccd, vendor, tractor_plate | KEEP | mixed | optional identity / driver-side fields; all read by current code |

### `vendors`

All 10 columns populated by the seed. KEEP.

### `work_order_containers`

| Column | Cls | Non-null | Notes |
|---|---|---|---|
| id, work_order_id, container_number, work_type | KEEP | 89/89 | core |
| **photo_url** | **REVIEW** | 3/89 | per-container single photo. Mirrors the new `trip_container_photos` table pattern but only for the WO side. Still actively written by the driver mobile app (current contract). |
| **photo_lat, photo_lng, photo_timestamp, photo_address** | **REVIEW** | 2/89 | same — driver-app ingestion. Could be migrated to a `work_order_container_photos` parallel of `trip_container_photos` for consistency, but that's its own design decision. Risk **high** if dropped without app coordination. |

### `work_orders`

| Column | Cls | Non-null | Notes |
|---|---|---|---|
| id, route, driver_id, tractor_plate, status, unit_price, driver_salary, allowance, earning, code | KEEP | core |
| **client_name** | **REVIEW** (denormalized) | 113/113 | duplicate of `clients.name` via FK |
| **client_code** | **REVIEW** (denormalized) | 85/113 | duplicate of `clients.code` via FK; used by drivers' UI ("show me by client code") |
| **driver_name** | **REVIEW** (denormalized) | 113/113 | duplicate of `users.full_name` |
| pickup_location, dropoff_location, pickup_location_id, dropoff_location_id | KEEP | 86/113 (FK), 86/113 (string) | string + FK pair; same pattern as trip_orders |
| pricing_id, gps_lat, gps_lng, gps_address | KEEP | mixed | active driver-app data |
| is_locked, locked_at, locked_by | KEEP | 113/113, 0, 0 | reconciliation locking |

---

## Concrete drop targets (high confidence)

These are the columns where evidence is strong enough to plan a migration:

| # | Table | Column | Why drop | Risk | Data action |
|---|---|---|---|---|---|
| 1 | `routes` | `type_20ft` | duplicates `pricing_lines.unit_price` for F20/E20 work types | med | backfill into `pricing_lines` if not present, then drop |
| 2 | `routes` | `type_40ft` | duplicates `pricing_lines.unit_price` for F40/E40 | med | same |
| 3 | `routes` | `is_two_way` | 0 backend reads, 2 rows non-default, no UI surface | low | drop |
| 4 | `trip_orders` | `work_type` | model comment marks it "legacy — derived from first container" | high | refactor consumers to read from `trip_order_containers`, then drop |
| 5 | `trip_orders` | `container_number` | model comment marks it "legacy — use trip_order_containers" | high | same |

Lower-priority candidates (do NOT plan in first round):

- `pricings.client_name`, `trip_orders.client_name`, `work_orders.client_name`, `work_orders.client_code`, `work_orders.driver_name`, `salary_periods.driver_name` — denormalized display caches. Each drop forces a UI refactor to JOIN. The savings are marginal; flag for "later when we touch that screen anyway".
- `pricings.route` (string), `pricings.pickup_location` / `dropoff_location` strings — overlap with FK columns. Backfill all FK and confirm `find_pricing` fallback is dead before dropping.
- `routes.pickup_location` / `dropoff_location` strings — same pattern as pricings.
- `trip_orders.pickup_location` / `dropoff_location` once `pickup_raw/dropoff_raw` are uniformly populated (currently 0/566 — the raw cols are recent).

---

# Phase 2 — Migration plan (break-fast: one combined migration)

## Migration 026 — `schema_overhaul_drop_dead_columns`

**Single migration, single PR-shaped diff. Forward-only.**

### Up steps

```sql
-- 1. Backfill where dropping a column would lose data
-- 1a. trip_orders.pickup_location_id from .pickup_location (string) when FK NULL
UPDATE trip_orders to_
   SET pickup_location_id = l.id
  FROM locations l
 WHERE to_.pickup_location_id IS NULL
   AND to_.pickup_location IS NOT NULL
   AND lower(trim(to_.pickup_location)) = lower(trim(l.name));
-- 1b. trip_orders.dropoff_location_id similarly
UPDATE trip_orders to_
   SET dropoff_location_id = l.id
  FROM locations l
 WHERE to_.dropoff_location_id IS NULL
   AND to_.dropoff_location IS NOT NULL
   AND lower(trim(to_.dropoff_location)) = lower(trim(l.name));

-- 2. Drop columns (FK-safe — none of these are FK targets)
ALTER TABLE routes        DROP COLUMN type_20ft, DROP COLUMN type_40ft,
                           DROP COLUMN is_two_way,
                           DROP COLUMN pickup_location, DROP COLUMN dropoff_location;
ALTER TABLE trip_orders   DROP COLUMN work_type, DROP COLUMN container_number,
                           DROP COLUMN client_name,
                           DROP COLUMN pickup_location, DROP COLUMN dropoff_location;
ALTER TABLE pricings      DROP COLUMN client_name, DROP COLUMN route,
                           DROP COLUMN pickup_location, DROP COLUMN dropoff_location;
ALTER TABLE work_orders   DROP COLUMN client_name, DROP COLUMN client_code,
                           DROP COLUMN driver_name,
                           DROP COLUMN pickup_location, DROP COLUMN dropoff_location;
ALTER TABLE salary_periods DROP COLUMN driver_name;
ALTER TABLE audit_logs    DROP COLUMN ip_address, DROP COLUMN user_agent;
```

22 columns dropped. Backfill step preserves the location-FK link for ~330 trip rows that had string-only locations from pre-resolver imports.

### Down

```python
def downgrade():
    raise NotImplementedError(
        "Forward-only migration — break-fast rules. "
        "Restoring would require column shape (easy) AND the dropped string "
        "data which is gone. Roll back via DB snapshot if needed."
    )
```

### Code changes shipped in the same diff

**`backend/app/models/domain.py`** — remove 22 Column definitions from `Route`, `TripOrder`, `Pricing`, `WorkOrder`, `SalaryPeriod`, `AuditLog`.

**`backend/app/schemas/domain.py`** — remove from:
- `RouteCreate`/`RouteUpdate`/`RouteOut` — `type_20ft`, `type_40ft`, `is_two_way`, `pickup_location`, `dropoff_location` (string forms)
- `TripOrderCreate`/`Update`/`Out` — `work_type` (top-level), `container_number`, `client_name`, `pickup_location`, `dropoff_location`
- `PricingCreate`/`Update`/`Out` — `client_name`, `route`, `pickup_location`, `dropoff_location`
- `WorkOrderCreate`/`Update`/`Out` — `client_name`, `client_code`, `driver_name`, `pickup_location`, `dropoff_location`
- `SalaryPeriodOut` — `driver_name`
- `AuditLogOut` — `ip_address`, `user_agent`

**Backend services to refactor** (every read site of a dropped column):

| File | What changes |
|---|---|
| `app/services/trip_order_service.py:create_trip_order` | stop writing `work_type` / `container_number` / `client_name` on TripOrder; populate only via `TripOrderContainer` rows |
| `app/services/excel_service.py:import_trip_orders` | same as above |
| `app/services/excel_service.py:generate_trip_orders_excel` | sources `work_type` from first container; sources `client_name` via JOIN |
| `app/services/excel_service.py:generate_work_orders_excel` | same for `work_orders.client_name`, `driver_name` |
| `app/services/excel_pan_bk_sl.py` (BK SL exporter) | drop reads of `trip_orders.container_number` (was used for legacy invoice line; use `trip_order_containers[0]` instead) |
| `app/services/customer_settlement_service.py` | uses `client.name` already (not the denormalized cache); no change needed once `trip_orders.client_name` field is gone from the schema |
| `app/services/pricing_service.py:find_pricing` | drop the string-fallback path entirely (`Pricing.pickup_location == X`); only FK lookup remains. **Note:** any existing `pricings` row with FK NULL after the backfill will become unreachable by `find_pricing` — accept under break-fast |
| `app/services/code_service.py` | uses `client.code` directly via FK; no change |
| `app/api/v1/imports.py:commit_customer_excel` | drop writes of `client_name`, `pickup_location`, `dropoff_location` strings on `TripOrder` |
| `app/api/v1/trip_orders.py:_to_schema` | response no longer includes the dropped fields |
| `app/api/v1/work_orders.py` | same for WorkOrder responses |
| `app/api/v1/pricings.py` | same for Pricing responses |
| `app/api/v1/salary.py` | resolve `driver_name` via JOIN on `users` instead of denorm column |
| `app/repositories/work_order_repo.py`, `pricing_repo.py`, `route_repo.py`, `trip_order_repo.py` | remove any read of dropped columns; add JOINs where needed for display |

**Frontend types + UI**:

| File | What changes |
|---|---|
| `frontend/src/data/domain.ts` (TypeScript types for Route, TripOrder, Pricing, WorkOrder, SalaryPeriod, AuditLog) | remove dropped fields. Switch consumer code to read `trip.client.name` (via JOIN payload) where it used to read `trip.client_name`. |
| `frontend/src/pages/accountant/RouteList.tsx` / `PricingList.tsx` / `PricingDetail.tsx` / `TripList.tsx` / `TripDetail.tsx` / `WorkOrderList.tsx` / `SalarySetup.tsx` | column / cell expressions touched by the type change. Most are `<td>{trip.client_name}</td>` → `<td>{trip.client.name}</td>`. |
| `frontend/src/services/api/*.api.ts` | response-mapper code that referenced dropped fields |

**Tests**:

| File | Change |
|---|---|
| `backend/tests/test_models.py`, `test_pricing_service.py` | drop assertions on dropped fields |
| `backend/tests/test_customer_settlement.py` | one assertion on `trip.container_number` becomes `trip.containers[0].container_number` |
| `backend/tests/test_import_pipeline.py` | tests that committed via the import endpoint set `client_name` in the request body — drop that field |

**Scripts**:

| File | Change |
|---|---|
| `scripts/seeds/seed_routes_from_files.py` | already writes `type_20ft=0, type_40ft=0, is_two_way=False` — drop those kwargs |
| `scripts/seeds/seed_pricing_from_files.py` | drop the `client_name`, `route`, `pickup_location`, `dropoff_location` string assignments on the new Pricing object |

### What breaks (acceptable break-fast losses)

- **The 1530 - 64 = 1466 `trip_orders` rows where the old import wrote string-only locations** lose their location info if the backfill JOIN doesn't find a Location with a matching name. The backfill is a `lower(trim(...))` JOIN; rows that don't match get `NULL` FKs. Accountant fills in via UI when needed.
- **The string-fallback path in `find_pricing`** is deleted. Any Pricing row with FK-only (no string) is now correct; any string-only row becomes unreachable. PAN+HAP seeds populated FK already so this is a no-op there.
- **Audit-log forensics** lose `ip_address` / `user_agent`. If the user wants these back later, they're trivially re-added with another migration.

### T-shirt: **L** — total touch is one alembic migration + ~15 backend files + ~6 frontend files + ~4 test files. ~600–900 LoC diff.

---

# Phase 3 — STOP

No DB writes performed. No code changes performed.

**One approval gate**: reply with **`go 026`** to execute the combined migration above (alembic + model + schemas + services + repos + frontend + tests + seeders, all in one diff). Or amend the column list — say "drop everything except X, Y" and I'll re-cut the migration.

Once approved, the next turn will:
1. Write `backend/alembic/versions/026_schema_overhaul_drop_dead_columns.py`
2. Apply locally (`alembic upgrade head`)
3. Run the full test suite, fix what breaks
4. Strip the dropped fields from models / schemas / services / repos / frontend types / pages / tests / seeders
5. Run `tsc --noEmit` + `pytest` to a clean state
6. Report back with the PR-ready diff summary, total LoC delta, and any data-quality flags surfaced during backfill
