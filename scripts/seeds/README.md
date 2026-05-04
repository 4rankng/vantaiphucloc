# scripts/seeds — master-data seeders

Standalone CLI scripts for seeding **master / reference data** into the
backend database. They live OUTSIDE `backend/` on purpose — see
"Deployment policy" below.

## Master data vs transactional data

| Category | What's in it | Seedable? |
|---|---|---|
| **Master / reference** | `clients`, `locations`, `location_aliases`, `routes`, `pricings`, `pricing_lines` | ✅ Yes — these scripts |
| **Transactional** | `trip_orders` (đơn hàng), `trip_order_containers` (chuyến đã đi), `trip_container_photos`, `work_orders`, `audit_logs`, `payments` | ❌ No — created by real customer file imports through the kế toán's interactive UI |

Why: master data is reusable across many imports, low risk, must be the
same on dev / staging / prod for testing. Transactional data is
operational truth — seeding fake đơn hàng / trips would pollute reports
and confuse the kế toán. Real orders only ever come through the
`/imports/customer-excel/preview` + commit flow when an actual customer
file arrives.

## Scripts

| Script | What it seeds | Source |
|---|---|---|
| `seed_customers.py` | `clients` (khách hàng) | A built-in default list (HAIAN, PAN, HAP, NEWWAY) plus optional consignee/shipper extraction from sample files via `--from-files` |
| `seed_locations_from_files.py` | `locations` + `location_aliases` | Distinct pickup/dropoff strings extracted from Excel files via the import pipeline preview |
| `seed_routes_from_files.py` | `routes` (tuyến đường) | Distinct (pickup, dropoff) tuples derived from Excel files AND existing `pricings` rows. Resolves through the alias table — does not create new Locations. |
| `seed_pricing_from_files.py` | `pricings` + `pricing_lines` (bảng giá) | Customer tariff Excel files — one extractor per layout (`--format pan|hap|newway|auto`) |

## Deployment policy

These scripts:

- ✅ Live OUTSIDE `backend/` so they're NOT bundled into the Docker image (`backend/Dockerfile` does `COPY . .` from `backend/` only).
- ✅ Are versioned in the repo so dev + droplet runs are reproducible.
- ❌ MUST NOT be imported by any backend code (FastAPI routes, alembic migrations, tests, app startup). Grep guarantees: nothing under `backend/app/` should `import scripts.seeds.*`.
- ❌ MUST NOT be auto-run on container start. They are operator-driven.

The scripts CAN read from `backend/app/*` (models, services, the
location resolver) — they prepend `<repo_root>/backend` to `sys.path` at
import time so `from app.models.domain import ...` resolves correctly.

## Common CLI flags

Every script accepts:

- `--dry-run` — parse and report planned inserts; don't write.
- `--prod` — required confirmation when `DATABASE_URL` host is not localhost.
- `--log-level DEBUG|INFO|WARNING|ERROR` — stdout log level (default INFO).
- `--files PATH [PATH ...]` — for the file-driven scripts, source Excel files.
- `--allow-missing-files` — skip files that don't exist instead of aborting.

## Environment

Reads `DATABASE_URL` from env. Falls back to `app.config.settings.DATABASE_URL`
(the dev default). Examples:

```bash
# dev — uses settings default localhost
./scripts/seeds/seed_customers.py

# dev with explicit URL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vantaihanghoa \
    ./scripts/seeds/seed_customers.py

# droplet — non-local host requires --prod
DATABASE_URL=postgresql://user:pass@phucloc.tingting.vip:5432/db \
    ./scripts/seeds/seed_customers.py --prod
```

## Recommended seed sequence

The scripts are ordered so dependencies (Locations → Routes / Pricing) are
in place before downstream consumers run:

```bash
cd <repo-root>

# 1. Customers — master rows the others FK to
./scripts/seeds/seed_customers.py --from-files docs/*.xlsx docs/*.xls

# 2. Locations + aliases — extracted from order + tariff files
./scripts/seeds/seed_locations_from_files.py \
    --files docs/*.xlsx docs/*.xls

# 3. Pricing (per customer, by layout). NEWWAY may produce 0 rows —
#    that's expected; settlement-shape source has no clean tariff sheet.
./scripts/seeds/seed_pricing_from_files.py \
    --format pan --client-code PAN \
    --files "docs/PAN- BK SL T04.26 (HD).xlsx"
./scripts/seeds/seed_pricing_from_files.py \
    --format hap --client-code HAP \
    --files "docs/Phúc Lộc - Shipside T4.26 HAP.xlsx"
./scripts/seeds/seed_pricing_from_files.py \
    --format newway --client-code NEWWAY \
    --files "docs/BẢNG KÊ SẢN LƯỢNG XE PL & NEWWAY THÁNG 04.2026(HECHUN).xlsx"

# 4. Routes — derives (pickup, dropoff) tuples from order files +
#    existing pricings. Run AFTER pricing so pricings-derived routes
#    are picked up.
./scripts/seeds/seed_routes_from_files.py --files docs/*.xlsx docs/*.xls
```

All four are idempotent. Re-run any time without duplication.

## Adding a new seeder

When a new master entity needs seeding (rare):

1. Drop a new `seed_<entity>_from_files.py` (or `seed_<entity>.py`) in
   this directory.
2. Reuse `_common.py` for argparse + DB session + prod-safety boilerplate.
3. Idempotency key: pick the natural unique key for the entity and skip
   on conflict.
4. Add an entry to the table at the top of this README + a section in
   the "Recommended seed sequence" if it has dependencies.
5. **Don't** add it to backend imports / startup / Dockerfile.

## Why orders are NOT here

Trip orders (đơn hàng) and TripContainer rows are operational data. The
import flow that creates them lives in the backend at
`backend/app/api/v1/imports.py` and the kế toán drives it through the UI:

1. Upload Excel via the **Nhập từ Excel** page in the accountant UI.
2. Review the preview pane (column mappings, location resolutions, parsed rows).
3. Confirm + commit.

If you ever DO need a one-off bulk-import script for testing, write it
as a test fixture under `backend/tests/`, not here. This directory is
deliberately scoped to **master data only**.
