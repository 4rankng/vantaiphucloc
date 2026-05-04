# Bảng giá (price list / tariff) — data flow + import design

Companion to `PRICING_DATA_FLOW.md`. That doc explained how prices flow through the order/settlement pipeline; this one focuses on the **bảng giá itself**: where the rate cards live in our system today, how they get there, and how we'd preseed them from documents the user already has in `docs/`.

## Question 1 — current bảng giá pipeline

### Data model

Two tables already exist (`backend/app/models/domain.py`):

**`pricings`** — header row, one per (client × work_type × route)

| Column | Notes |
|---|---|
| `client_id` | FK Client. The customer this rate applies to. |
| `client_name` | denormalised |
| `work_type` | one of `E20`, `E40`, `F20`, `F40` (full/empty × 20/40) |
| `route` | free-text route label |
| `pickup_location` / `dropoff_location` | string + FK columns (`pickup_location_id`, `dropoff_location_id`) |
| `is_active` | soft-delete flag |

**`pricing_lines`** — child, one per quantity tier

| Column | Notes |
|---|---|
| `pricing_id` | FK to parent (CASCADE) |
| `quantity` | int — 1 or 2 (per BizLogic, only 20-foot allows 2; 40-foot is always 1) |
| `unit_price` | VND, what the customer pays |
| `driver_salary` | VND, base driver pay |
| `allowance` | VND, additional driver allowance |

So the canonical lookup key is `(client_id, work_type, route|pickup+dropoff, quantity)` → `(unit_price, driver_salary, allowance)`.

### Write paths (today)

There IS an admin UI for kế toán:

- `frontend/src/pages/accountant/PricingList.tsx` — list of all pricings, search/filter
- `frontend/src/pages/accountant/PricingDetail.tsx` — edit a single pricing + its tiered lines
- API: `backend/app/api/v1/pricings.py` — `GET/POST/PUT/DELETE /pricings`

CRUD only. **No bulk import today.** Every pricing row is hand-entered. With ~7 customers × ~30 routes × 4 work_types × 2 quantity tiers, that's ~1,680 rows the kế toán would have to type — clearly the gap that's prompting this design.

### Read paths (today)

**`pricing_service.find_pricing(...)`** (`backend/app/services/pricing_service.py:24`):

1. Resolve `pickup_location` and `dropoff_location` strings to `Location.id` via exact name match.
2. Try FK-based `(client_id, work_type, pickup_location_id, dropoff_location_id, is_active=true)` → return the row.
3. Fall back to string match on `(client_id, work_type, pickup_location, dropoff_location)`.
4. Fall back to route-string match on `(client_id, work_type, route)`.
5. Cached via Redis (`pricing_lookup:<hash>`).

**`find_tiered_pricing(...)`** wraps `find_pricing` then picks the `PricingLine` for the requested quantity (with fall-back to `quantity=1`).

### Consumers (where prices actually apply)

| Caller | When | What it does |
|---|---|---|
| `app/services/trip_order_service.create_trip_order` | When kế toán creates a TripOrder via the create-trip UI | Calls `find_tiered_pricing(client_id, work_type, qty, route, pickup, dropoff)`. If hit → fills `unit_price`, `driver_salary`, `allowance`, `pricing_id`. If miss → kế toán enters manually. |
| `app/services/excel_service.import_trip_orders` | The legacy "import trip orders from our internal Excel template" path | Same lookup, same fields filled. |
| Customer-Excel import (just built) | At commit time | **Currently bypassed** — TripOrders are created with `unit_price=0, status=DRAFT`. By design (per your earlier decision: pricing happens at the matching step). |
| `customer_settlement_service.load_settlement_data` (BK SL export) | At report time | **Reads** `TripOrder.unit_price` (which was set at create time). Doesn't re-lookup pricing. |

### Summary of the pipeline today

```
Manual entry (UI: PricingList → PricingDetail)
        │
        ▼
   pricings + pricing_lines  (active rate cards)
        │
        │   find_tiered_pricing(client, work_type, qty, route, pickup, dropoff)
        ▼
   TripOrder.unit_price set at TripOrder create
        │
        ▼
   BK SL settlement report sums TripOrder.unit_price
```

**One missing link** for the "customer-Excel import" path: between `import commit` (sets DRAFT, unit_price=0) and the actual settlement, there's no automated transition. The kế toán has to manually re-open each imported TripOrder and click "compute price" (which calls `find_tiered_pricing`). For 656 imported rows that's a lot of clicks. Worth surfacing as a UX issue but out of scope here — a "Apply pricing" bulk action button could handle it.

## Question 2 — what's in `docs/` that looks like bảng giá

I scanned `docs/`. There's no file with `bảng giá`/`báo giá`/`tariff` in the name, but **content scan turned up two with embedded rate cards**:

### File 1 — `Phúc Lộc - Shipside T4.26 HAP.xlsx` (HAP customer, April 2026)

| Sheet | What's there | Verdict |
|---|---|---|
| `Bảng kê SS` | Per-trip settlement detail (similar to PAN BK SL) | Output, not source |
| `HĐơn` | Invoice line breakdown | Output |
| `Sheet1` | Same as HĐơn (helper) | Output |
| `Sheet2` | Pivot summary | Output |
| **`CUOC`** | **🟢 Tariff/rate card** | **THIS IS A BẢNG GIÁ** |

**`CUOC` sheet structure** (decoded):

```
Row 1 header:  ĐỊA ĐIỂM VẬN CHUYỂN  | CƯỚC VẬN CHUYỂN HÀNG (VNĐ) | CƯỚC VẬN CHUYỂN VỎ (VNĐ)
Row 3 sub:                          |    20'    |    40'         |    20'    |    40'
Row 4+ data:
  1 | Hải An – Nam Hải, Đoạn Xá ...    | 308000  |  356000         |  194000  |  318000
  2 | Hải An – Nam Hải Đình Vũ        | 297000  |  345000         |  186000  |  308000
  3 | Hải An – Chùa Vẽ, Greenport ... | 273000  |  344000         |  166000  |  293000
  …
```

Layout: `(route) → (F20, F40, E20, E40 prices)` — 4 columns of rate per row. Mapping into our schema:

- One `Pricing` per (HAP, route, work_type) → 4 Pricings per row of CUOC sheet
- Each Pricing gets one `PricingLine` (quantity=1)

This file alone gives us **~33 routes × 4 work_types = ~132 PricingLines** for HAP. Sample header: `Hải An – Nam Hải, Đoạn Xá, …`. The pickup is "Hải An"; dropoffs vary. We extract pickup separately (always "Hải An") and split dropoff at the dash.

### File 2 — `BẢNG KÊ SẢN LƯỢNG XE PL & NEWWAY THÁNG 04.2026(HECHUN).xlsx` (NEWWAY)

This is mostly settlement data but **the per-row price column carries customer-specific contract rates**: column 12 "Đơn giá" with values like `520000`, `459999.999...`, `440000`. Different sheets (`Tháng 4`, `08.04`, `10.04`, `20.04`) cover different vessels — and Đơn giá *changes* per voyage (`520000` for HAIAN ALFA, `459999.99` for HAIAN BELL, `440000` for HAIAN LINK).

That last detail is interesting: this customer's pricing is **per-vessel** rather than fixed by route. Could be a fuel-price adjustment (col M = "Giá dầu" with values like `42840`, `32960`, `31040` — fuel price the rate was indexed to). Reverse-engineering: `520000 - 459999.99 ≈ 60000`, and `42840 - 32960 ≈ 9880` — not a clean ratio. So it's probably contract addenda per voyage rather than a formula.

This is **not a clean bảng giá** — it's settlement data with implicit prices. Useful as a *secondary* source ("here are 30 documented rate points for NEWWAY") but not authoritative.

### Files that do NOT contain pricing

- `LOADING LIST HAIAN DELL 037S 19.4.xlsx` — confirmed (per `PRICING_DATA_FLOW.md`)
- `DISCHARGING LIST HAIAN TIME 454W 6.4.xlsx` — confirmed
- `BDST 11.4.xls` — confirmed
- `2.GLORY SHANGHAI- 2612N.xlsx` — Sheet1 has no prices; `CONSCIENCE 2612N` has accountant-added scratch prices
- `PAN- BK SL T04.26 (HD).xlsx` — has prices on the `Trucking (HD)` sheet (PAN's rate card!) — see below

### File 3 — `PAN- BK SL T04.26 (HD).xlsx` (PAN, found earlier)

We already inspected this for `PRICING_DATA_FLOW.md`. Sheet **`Trucking (HD)`** is PAN's contract rate card:

```
Row 5 header AK: ĐƠN GIÁ T04.26 ĐÃ CỘNG GIÁ GỬI - KÝ PHỤ LỤC
Row 6 sub-headers: Vỏ | Hàng 20' | Hàng 40&45
Row 7+ data, e.g.:
  PAN HA – NAM ĐÌNH VŨ          → 436705 | 454158 | 489065
  PAN HA – NAM HẢI ĐÌNH VŨ      → 550151 | 576331 | 602510
  PAN HA – ĐÌNH VŨ/TÂN VŨ ICD   → 576331 | 593784 | 628690
  …
```

This is another beautiful tariff file. ~20 routes × 3 cont types = ~60 PricingLines for PAN.

### Recap — extraction targets

| File | Bảng giá present? | Approx rows we can extract |
|---|---|---|
| `Phúc Lộc - Shipside T4.26 HAP.xlsx` (sheet `CUOC`) | YES | ~33 routes × 4 types = ~132 PricingLines for HAP |
| `PAN- BK SL T04.26 (HD).xlsx` (sheet `Trucking (HD)`) | YES | ~20 routes × 3 types = ~60 PricingLines for PAN |
| `BẢNG KÊ SẢN LƯỢNG XE PL & NEWWAY THÁNG 04.2026(HECHUN).xlsx` | Partial | ~30 distinct rate points for NEWWAY across vessels — secondary source |
| Others | No | — |

Total starter kit: **~190 PricingLines for 2 customers (HAP, PAN)** plus secondary data for NEWWAY.

That's enough to bootstrap the bảng giá table for ~30% of our customers; the rest need contract documents the user hasn't uploaded yet.

## Proposed seeder design (NOT implementing yet)

Two questions to answer before code:

### Q: One-shot script or interactive UI?

I recommend **interactive UI**, modeled on the order-import we just built. Reasons:

1. **Schema variability.** PAN's tariff has `(Vỏ | Hàng 20' | Hàng 40)` columns; HAP's CUOC has `(Hàng 20', Hàng 40', Vỏ 20', Vỏ 40')`; NEWWAY's data is implicit in settlement rows. A single hard-coded parser breaks the moment a 4th customer arrives with `(Lane | 20DC | 40HC | 45HC)`.

2. **Confirmation matters.** Pricing errors mean we either undercharge or overcharge customers — directly money-affecting. The kế toán should review each row before commit.

3. **Reuses what we built.** Sheet picker / header detector / column mapper / preview UI all transfer directly. The canonical schema is just different (canonical fields = `route`, `pickup`, `dropoff`, `work_type`, `unit_price`, `driver_salary?`, `allowance?`, `quantity?`).

4. **Future-proof.** PDF / image / Word tariffs need OCR + LLM. The interactive flow can layer those in (preview pane shows OCR text → mapping table → confirm) without rewriting batch scripts.

### Q: How to handle layout variability?

Three patterns observed:

| Pattern | Example | Canonical mapping |
|---|---|---|
| **Wide grid** — one row per route, columns are work_types | HAP CUOC, PAN Trucking (HD) | One source row → 3 or 4 PricingLines (one per cont type column) |
| **Long form** — one row per (route × work_type) | hypothetical "lane-level" CSV | Direct 1:1 |
| **Per-trip implicit** — settlement data with rate per row | NEWWAY HECHUN | Group rows by (route, work_type) → distinct rate points → user confirms whether it's the contract rate |

The seeder needs to detect which pattern and apply the right reshape. Header sniffing handles wide-grid (cell with both "Hàng" and "Vỏ" as super-headers, two sub-rows of "20'/40'" → wide grid). Long-form detected when a single header row has all four canonical fields directly. Per-trip implicit is the catch-all when nothing else matches.

### Proposed `pricing_rule` schema (extension to existing `pricings`)

The existing `pricings` table is already flexible enough. We **don't** need a new `pricing_rule` table. The variability is in:

1. **Where the route is encoded** — sometimes split (pickup, dropoff cols), sometimes one cell with a dash. The seeder splits on dash if dropoff col is missing.
2. **Whether driver_salary/allowance are in the source** — usually NOT (the customer's tariff only shows their unit_price; we know our internal `driver_salary`/`allowance` separately). Sensible default: leave them at 0 and let the kế toán fill in our internal cost.
3. **Quantity tiering** — most customer tariffs are flat per cont type. We default to `quantity=1` and the kế toán can add a `quantity=2` line later if/when they're given combined-cont rates.

Single new column on `pricings` would help: `notes` (text) for "extracted from `Phúc Lộc - Shipside T4.26 HAP.xlsx` sheet CUOC row 4 on 2026-05-04 by user X" — provenance for audit.

### Implementation status (2026-05-04)

The PAN + HAP seeders shipped as a per-layout CLI script at
`scripts/seeds/seed_pricing_from_files.py` (NOT inside `backend/` —
ops tooling). Run via:

```bash
./scripts/seeds/seed_pricing_from_files.py --format pan --client-code PAN \
    --files "docs/PAN- BK SL T04.26 (HD).xlsx"
./scripts/seeds/seed_pricing_from_files.py --format hap --client-code HAP \
    --files "docs/Phúc Lộc - Shipside T4.26 HAP.xlsx"
```

Idempotent on `(client_id, work_type, pickup_location_id, dropoff_location_id)`.
See `scripts/seeds/README.md` for the master-data seed pipeline
(customers → locations → pricing → routes) and prod-safety flags.

### Suggested next steps (await user approval)

1. **Build a `pricings/import` UI** that mirrors the orders-import UI (3-pane: layout summary, mapping, preview). Canonical fields: `route`, `pickup_location`, `dropoff_location`, `work_type`, `quantity`, `unit_price`, `driver_salary`, `allowance`. Vendor's "wide grid" gets reshaped via a "this column is the price for `Hàng 40'`" mapping action.

2. **Seed PAN + HAP from the existing `docs/` files** as the first test of that UI, by hitting the new `pricings/import/preview` endpoint with each file. Numbers we'd commit:
   - PAN: ~60 PricingLines from `Trucking (HD)` sheet AK/AL/AM, rows 7–25.
   - HAP: ~132 PricingLines from `CUOC` sheet, rows 4–35.

3. **Add a "Apply pricing" bulk action** on the trip-import preview/results page that calls `find_tiered_pricing` for each created TripOrder and transitions DRAFT→PENDING with the price filled in. Covers the missing link surfaced earlier.

4. **For PDF / image / Word tariffs** when a customer's contract is a scanned annex — defer. We'd need OCR + structured extraction (LLM extracts a JSON of `{route, work_type, price}` rows). The UI flow stays the same — just the "Layer 1: load file" step swaps Excel for OCR. Prototype only after a real PDF tariff lands in `docs/`.

## Open questions for the user

1. **Which customer to seed first?** PAN or HAP? Both have clean tariffs in `docs/`. PAN is simpler (3 cont type columns); HAP has 4 (separate empty 20'/40').

2. **Driver_salary + allowance handling.** Customer tariffs only show their `unit_price`. Our internal cost split (`driver_salary`, `allowance`) is a Phúc Lộc business rule — should the import:
   - leave them at 0 and force the kế toán to fill in?
   - apply a default split (e.g., `driver_salary = unit_price * 0.30`)?
   - copy from the previous-period pricing for the same route if one exists?

3. **NEWWAY's per-vessel pricing** — store as multiple `Pricing` rows (one per vessel), or store a single rate and add a manual adjustment per voyage at TripOrder time? The schema today doesn't have a "vessel" axis, so the cleanest answer is "store the most-common rate as the contract baseline, and the kế toán adjusts per trip when needed". Confirm.

4. **Bulk-apply pricing button on the trip-import results.** Add it as part of the seeder work, or as a separate small task?

When approved, I'll fold "build the bảng giá import UI + seed PAN + HAP" into the queue between **B (location auto-create + alias)** and **the GPS-aware picker**, since the alias resolver is a prerequisite (the seeder needs to resolve `Hải An – Nam Đình Vũ` route strings into `(Location, Location)` pairs before storing them on `pricings`).
