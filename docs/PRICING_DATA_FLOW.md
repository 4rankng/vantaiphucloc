# Pricing & order-data flow — design clarification

Answers two questions raised during the import-pipeline build:

1. How do customer đơn hàng records relate to imported trips, matching, and the BK SL settlement export?
2. Do the customer source files actually carry prices? If so, where, and are they original or accountant-added?

Each section is backed by file/sheet/row evidence so the proposed design isn't speculation.

---

## Question 1 — đơn hàng vs TripOrder vs WorkOrder

### Existing schema — what's there today

After inspecting `backend/app/models/domain.py` and `BizLogic.md`:

- **There is NO separate `CustomerOrder` / `DonHang` model.**
- `BizLogic.md` line 474 explicitly states: `TripOrder (đơn hàng) — created by accountant`. So **`TripOrder` IS đơn hàng** in this codebase.
- The same entity is also called "Lệnh điều hành" in `BizLogic.md` §3.6. Two Vietnamese names, one English class.

The trucking lifecycle uses three entities:

| Entity | Created by | Purpose |
|---|---|---|
| `WorkOrder` (Phiếu làm việc) | Driver mobile app | "I, the driver, performed this trip" — has `tractor_plate`, `driver_id`, GPS, photos |
| `TripOrder` (đơn hàng / lệnh điều hành) | Accountant / import | "What the customer booked" — has `unit_price` (revenue), `driver_salary`, `allowance`, container list |
| `TripOrderWorkOrder` | Accountant (reconcile step) | Strict 1:1 join WO ↔ TO when accountant confirms the driver's actual work matches the booking |

### What the import currently does

The customer-Excel import (just built) parses a customer file and **creates new `TripOrder` records** (status `DRAFT`, `unit_price=0`). Idempotency key in v1: `(client_id, trip_date, container_no)`.

So the import is **already creating đơn hàng records.** No separate model is needed.

### Matching key — when does an imported row hit an existing đơn hàng?

The user's question presumes this happens. It can, in two cases:

1. **Customer pre-books with us** (Zalo / phone) → accountant creates a DRAFT `TripOrder`. Then the customer sends the loading list a few days later. We want to match — not duplicate.
2. **Customer sends a corrected list** that updates a previous import. Same need.

Candidate keys, ranked by reliability:

| Key | Reliability | Why |
|---|---|---|
| `container_no` (normalized ISO 6346) | **High** | Globally unique. Same container = same trip if same client. |
| `customer_ref` (Booking No / B/L) | **High** when present | The customer's own ID for the shipment. Loading List has it as `Booking No` (col P), Glory has it as `Số vận đơn` (col 9). Discharging List and BDST have ref-shaped columns but not always populated. |
| `(client_id, trip_date, container_no)` | **High** — current idempotency key | Composite. Best for detecting "same row twice" within a date. |
| `(client_id, trip_date, dropoff_location, work_type)` | **Low** | Many distinct trips can share these. Useful only when container_no is missing. |
| `(tractor_plate, trip_date, driver_name)` | **Medium** for grouping into one TripOrder, **not** a matching key | Used by the new grouping rule we're adding (one truck multiple containers = one TO with N TripContainers). |

**Recommendation:** keep current idempotency on `(client_id, trip_date, container_no)`. Add an **upsert mode** to commit so re-imports update existing DRAFT/PENDING TripOrders rather than skipping. Out of scope for v1 — flag for v2.

### End-to-end flow (today, with the new import)

```
                      ┌──────────────────────────────────────┐
                      │  Customer sends Excel file            │
                      │  (loading / discharging / BDST / yard)│
                      └────────────────┬─────────────────────┘
                                       ↓
                         /imports/customer-excel/preview
                         (5-layer detection, no DB writes)
                                       ↓
                         user reviews mapping + rows in UI
                                       ↓
                         /imports/customer-excel/commit
                                       ↓
                         TripOrder rows created — status=DRAFT, unit_price=0
                                       ↓
       ┌───────────────────────────────┴────────────────────────────────┐
       ↓                                                                  ↓
 Accountant manually completes the đơn hàng                Driver fulfils the trip
   - sets pickup/dropoff, unit_price                          - mobile app creates a WorkOrder
   - find_tiered_pricing(client, route, work_type, qty)         - submits photos, GPS, container number
     → fills unit_price, driver_salary, allowance              - WorkOrder.status = PENDING
   - status DRAFT → PENDING                                   - WorkOrder.is_locked = false
       ↓
       └──────────────┬─────────────────────────────┬─────────────────────┘
                      ↓                             ↓
            Reconciliation step
            - accountant matches TO ↔ WO (1:1) by tractor_plate + route + work_type + client
            - TripOrderWorkOrder row created
            - Both records locked (is_locked=true)
            - TO.status = COMPLETED
                      ↓
            Accountant clicks "Confirm with client"
            - TO.is_confirmed = true
            - Permanent — no unmatch, no edits
                      ↓
            End of month — accountant exports BK SL settlement
            - /reports/customer-settlement/export
            - groups all CONFIRMED/COMPLETED TripOrders for (client_id, period)
            - sums TripOrder.unit_price by (pickup, dropoff)
            - emits Excel mirroring customer's PAN_BK_SL layout
```

### Where the data lives at each step

| Step | Data lives in |
|---|---|
| Customer file | filesystem only (uploaded blob) — never persisted |
| Import preview | server memory, returned to the UI |
| Import commit | `trip_orders`, `trip_order_containers` rows (status DRAFT, unit_price=0) |
| Pricing applied | same `trip_orders` row updated (status DRAFT → PENDING, unit_price set) |
| Driver work | `work_orders`, `work_order_containers` |
| Reconciliation match | `trip_order_work_orders` join row, both parents locked |
| Confirmation | `trip_orders.is_confirmed = true` |
| BK SL export | reads `trip_orders.unit_price` summed by route × cont_type |

### Schema gaps — proposals (NOT implementing yet, awaiting approval)

The flow works today **except** for these friction points discovered during the build:

1. **Per-container pricing.** Pricing is at the TripOrder level today. The customer's BK SL file (see Q2 evidence) prices **per container** based on contract rates per (route × work_type). With one TripOrder carrying N containers of mixed work_type, we can't represent per-container price accurately. The earlier BK SL builder (`customer_settlement_service.py`) splits the trip-level price evenly across containers as a workaround.

   **Proposal:** add `unit_price` and `revenue` columns to `trip_order_containers` so each container can carry its own price. `TripOrder.unit_price` becomes a pre-calculated sum (or denormalised total).

   Tradeoff: adds a column on a hot table, mildly complicates pricing logic. Cleanly fixes the per-container price question.

2. **Customer reference / booking number.** The import pipeline extracts `customer_ref` (Booking No, B/L) into the canonical schema. We need a column on `trip_orders` to store it. Currently the import drops it on commit because `TripOrder` has no field for it.

   **Proposal:** add `customer_ref` (string, nullable) to `trip_orders`. Index for de-duplication and customer-side reconciliation.

3. **Re-import upsert mode.** When the customer sends a corrected file, we want to update the existing draft TripOrder by `(client_id, trip_date, container_no)` rather than skip the row.

   **Proposal:** the commit endpoint already has `overwrite_duplicates: bool`. Currently it would re-create — change semantics to "update in place when DRAFT or PENDING".

4. **Nothing else.** The schema as-is supports the full flow. No new entity needed.

---

## Question 2 — where prices live in source files and the BK SL report

### Source files (4 customer-supplied files)

I scanned each sheet for money-shaped numbers (1,000–100,000,000 range), inspected formulas, and cross-referenced with what the BK SL output uses.

#### `LOADING LIST HAIAN DELL 037S 19.4.xlsx` — sheet `TOTAL`

**No price column.** Header row 10:

```
SQ | POD | POL | OPR | LINE | CONTNo. | SEAL | CELL | F | SIZE | VGM (KGM) |
DESCRIPTION OF GOODS | CY | REMARKS | (blank) | Booking No | Shipper | SALES/MKT
```

The only money-shaped column is `VGM (KGM)` — but those are weights (15.66, 25.66, 28.95) in tonnes. Not money. Verified by sample row 11:

```
1 | SGSIN | VNHPH | HACT | ONE | DRYU6018669 | VN58476AQ | 06-02-86 | F | 40HC |
15.6643 | PRINTER OR TYPEWRITER CARTRIDGES & RIBBONS | SAO A | … | HANG16054600 | ONE
```

Verdict: **no price** in this file. Original customer data only.

#### `DISCHARGING LIST HAIAN TIME 454W 6.4.xlsx` — sheet `Sample Sheet`

**No price column.** Header row 1:

```
Disch Port | Bay | Slot | Container Id | Line Operator | Size | Weight | Weight Vermas |
Freight Kind | Class | ISO | Load Port | Del Port | Temperature | Remark
```

Money-shaped numbers detected in `Slot` (numeric slot codes — `260184`) and `Weight` (kg — `32000`). Both non-monetary. Sample row 2:

```
VNHPH | 26 | 260184 | CAAU6413398 | HATW | 40 | 32000 | (blank) | FULL | (blank) | 45G1 | CNQZH | VNHPH
```

Verdict: **no price.** Original customer data only.

#### `BDST 11.4.xls` — sheet `Sheet1`

**No price column.** 34 columns, only A–AC carry data. Header row 1:

```
(blank) | Số Container | Hãng khai thác | Kích cỡ ISO | F/E | Nhập/xuất | Loại công việc |
Phương thức ra | Loại hàng | Hàng nội/ngoại | (repeats) | …
```

Money-shaped detections: cols 20, 23 — both turn out to be reference codes (`033073`, `070302`), not money. Sample row 2 col 24 = `070302` (a CY position code).

Verdict: **no price.** Port operations log, terminal-side. Original customer data only.

#### `2.GLORY SHANGHAI- 2612N.xlsx`

Two sheets. Different stories.

**`Sheet1` (yard movement log)** — **no price column**. 67 columns of operational data: container #, plate, seal, B/L, yard #, driver name, dates, … No money values. Original customer data.

**`CONSCIENCE 2612N` (the stowage diagram + accountant's pricing)** — **has prices, accountant-added**:

Row 1 cell `X` = `GIÁ DẦU 35,440` (fuel price annotation — clearly internal kế-toán scratch).

Row 4 (header): `STT | Hãng tàu | Container | Vị trí hộp | Kích thước | Loại hộp | (no header)` × 3 sub-tables side-by-side. The 7th column in each sub-table is unlabelled but holds the price.

Row 5: 
```
1 | SJJ | TCNU2473728 | B-30-10-2 | 40 | HC | 440000 |
1 | SJJ | TWCU8162720 | A-34-06-2 | 40 | HC | 440000 |
1 | SJJ | TWCU2201599 | A-21-05-4 | 20 | DC | 244000 |  9680000
```

Row 7 col AA (rightmost cumulative): `=SUM(AA4:AA6)` — running total formula.

Pattern: `40 HC` → 440000 VND, `20 DC` → 244000 VND. Single price per cont type, copy-pasted across all rows in the sub-table. **No formula** linking these to a master table — they're hand-typed.

Verdict: **prices present, accountant-added.** The pre-accountant file (which arrives from Glory Shipping yard) does not include them — Sheet1 has the operational data, the kế toán re-keyed prices into `CONSCIENCE 2612N` while doing pivot-matching against our internal contract. We should not import these into the system.

### BK SL report file (`PAN- BK SL T04.26 (HD).xlsx`) — formulas decoded

This is what the kế toán exports to send to the customer. Three sheets matter for pricing:

#### Sheet `Trucking (HD)` — contract price matrix

Row 5 col AK header: `ĐƠN GIÁ T04.26 ĐÃ CỘNG GIÁ GỬI - KÝ PHỤ LỤC` (April 2026 contract rate including delivery fee — signed addendum).

Row 6 sub-headers under it: `Vỏ | Hàng 20' | Hàng 40&45`.

Row 7 cols AK/AL/AM = `436705 | 454158 | 489065` for route "PAN HA – NAM ĐÌNH VŨ" (col B).

These are the **contract rates** — what the customer agreed to pay per (route × cont type). Hard-typed by the kế toán; cell to the left has `=AE7+140000` formula (showing the rate is mechanically derived from a base + Giá dầu/Giá gửi adjustments).

This sheet IS the customer's tariff. In our schema, this is `Pricing` + `PricingLine`.

#### Sheet `BKTT T4.26` — settlement summary

Row 12 (first data row, route "PAN HA → HẢI AN"):

| Cell | Value or formula | Meaning |
|---|---|---|
| B12 | `PAN HA` | route origin |
| C12 | `HẢI AN` | route destination |
| D12 | `Chuyến` | unit |
| E12 | `=SUMIFS('SL T4.26'!E$11:E$2017, …)` | F20' count |
| F12 | `=SUMIFS('SL T4.26'!F$11:F$2017, …)` | F40' count |
| G12 | `=SUMIFS('SL T4.26'!G… + H…)` | empty count |
| I12 | `=E12+F12+G12+H12` | total qty |
| J12 | `=K12/I12` | avg unit price (calculated) |
| K12 | `=SUMIFS('SL T4.26'!N$11:N$2017, …)` | total revenue (sums col N from SL) |
| **N12** | **`654871`** (hard-typed!) | **contract reference unit price for this route × cont type** |
| O12 | `=J12-N12` | variance (actual − contract) |

The cached values: J12 = 654871, K12 = 217,417,172, N12 = 654871. So J equals N here — actual matches contract.

**The N column is the key.** The kế toán hand-types it by copying from `Trucking (HD)`. It's the per-(route × cont type) contract rate.

#### Sheet `SL T4.26` — per-container detail

Row 12 (first data row):

| Cell | Value or formula |
|---|---|
| B12 | `2026-03-26 00:00:00` (date) |
| C12 | `PAN` (customer code) |
| D12 | `OBLU3323816` (container #) |
| E12 | `1` (F20' marker) |
| I12 | `15C17442` (truck plate) |
| J12 | `PAN HA` (origin) |
| K12 | `NDV` (destination) |
| L12 | `=E12+F12+G12+H12` (always 1) |
| **M12** | **`=INDEX('BKTT T4.26'!$N$12:$N$55, MATCH(V12, 'BKTT T4.26'!$A$12:$A$55, 0), 0)`** |
| N12 | `=L12*M12` (= qty × price) |

So per-container price M12 is a **lookup** from BKTT col N by row index (V12 is a helper concatenated key). Cached value M12 = 454158, N12 = 454158.

#### Pricing data flow in the BK SL file (decoded)

```
   Trucking (HD) sheet — contract rates (typed by kế toán, refreshed monthly)
        │
        │  manually copy-paste contract rates into BKTT col N
        ▼
   BKTT col N  (hard-typed reference price per route × cont_type)
        │
        │  INDEX/MATCH lookup by row
        ▼
   SL col M (CƯỚC CHUYẾN)  per-container price
        │
        │  qty × price
        ▼
   SL col N (TỔNG TT)  per-container revenue
        │
        │  SUMIFS by route + cont type
        ▼
   BKTT col K (Thành tiền)  per-route revenue
        │
        │  SUM
        ▼
   BKTT K56 (TỔNG CƯỚC CHƯA VAT)  → K57 (VAT 8%) → K58 (TỔNG CÓ VAT)
```

So for the **customer's** BK SL: the price flow is **tariff-lookup-at-report-compose-time**. The kế toán refreshes BKTT col N each month from `Trucking (HD)`, and INDEX/MATCH cascades the price into every SL row.

### Comparison — how OUR system handles it today

In our backend (`customer_settlement_service.py` + `excel_pan_bk_sl.py`):

- `TripOrder.unit_price` is the price source.
- It's set when the TripOrder transitions DRAFT → PENDING via `find_tiered_pricing(client_id, work_type, qty, route)` → reads `Pricing/PricingLine` table.
- BK SL export reads `TripOrder.unit_price`, splits across containers (current heuristic: equal split), aggregates by route × cont_type.

So **our system stores the priced value on the đơn hàng (TripOrder)**, looked up from the Pricing table at TripOrder save time. The customer's file looks it up at report-compose time. Functionally equivalent — both use the contract tariff as source of truth.

### Verdict on Q2

| File | Has price? | Original or accountant? | Action |
|---|---|---|---|
| Loading List | No | n/a | nothing to import |
| Discharging List | No | n/a | nothing to import |
| BDST | No | n/a | nothing to import |
| Glory Shanghai Sheet1 | No | n/a (original) | nothing to import |
| Glory Shanghai CONSCIENCE | Yes (440000 / 244000) | **accountant-added** internal scratch | **NOT** to import |
| BK SL output (PAN file) | Yes (full pricing) | calculated from contract tariff via INDEX/MATCH | n/a — that's the OUTPUT of our system |

**Bottom line: customer source files do NOT carry prices.** Pricing is added by the kế toán internally, against our contract `Pricing` table. The user's earlier decision to defer pricing in the import (leave `unit_price=0`, `status=DRAFT`) is **correct** — there's no price to extract from the import data.

The accountant's workflow after import is:

1. Review parsed TripOrders in the import preview.
2. Commit as DRAFT.
3. For each DRAFT TripOrder, the system can auto-call `find_tiered_pricing` (or a manual "Tính giá" action does it on demand) and transition DRAFT → PENDING with the contract price filled in.
4. Or: the accountant manually fills unit_price for one-off deals not in the Pricing table.

This is exactly what the design now does. No change needed.

---

## Open questions back to user

Given the above, I have three follow-ups before continuing implementation:

1. **Per-container pricing.** Is the equal-split-across-containers heuristic acceptable for v1, or do you want me to add `trip_order_containers.unit_price` so each container can carry its own contract-derived price? (Adds a column; cleanly removes the heuristic.)

2. **`customer_ref` on TripOrder.** Currently the import extracts Booking No / B/L into `customer_ref`, but TripOrder has no field for it so the value is dropped on commit. Want me to add a column? Index it for cross-customer reconciliation?

3. **Auto-price after import.** Do you want the import commit endpoint to call `find_tiered_pricing` for each newly-created TripOrder (filling unit_price + driver_salary + allowance + transitioning DRAFT → PENDING when a tariff match exists), or strictly leave them DRAFT for the kế toán to price manually? Current code does the latter.

When approved, I'll resume the implementation thread (LLM fallback enable, multi-container with photos, grouping rule, doc updates).
