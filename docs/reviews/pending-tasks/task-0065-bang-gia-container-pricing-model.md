# Task 0065 — Feature: Bảng Giá Must Support Per-Container Pricing (Size + Type + Fuel Surcharge)

**Type:** Missing Feature / Pricing Model Gap  
**Priority:** High  
**Affects:** ketoan — Bảng giá, Backend — pricing engine  
**Source:** Product owner instruction (2026-05-11) + CUOC sheet analysis from `Phúc Lộc - Shipside T4.26 HAP.xlsx`

---

## Background: How Real Pricing Works (from CUOC sheet)

The client's pricing table (`sheet: CUOC`) defines prices by **route × container size × cargo type**, then adjusts by a **fuel surcharge index**.

### Pricing Dimensions

| Dimension | Values | Example |
|-----------|--------|---------|
| Route | Pickup → Dropoff location pair | "Hải An – Nam Hải Đình Vũ" |
| Container size | 20ft or 40ft | `LOẠI = 20` or `40` |
| Cargo type | Full (hàng) or Empty (vỏ) | `H/R = H` or `R` |
| Fuel surcharge | Monthly index band (1–10+) | Index 5 = +30% |

### Pricing Table Structure (CUOC sheet)

```
STT | ĐỊA ĐIỂM VẬN CHUYỂN          | F20    | F40    | E20    | E40
----|-------------------------------|--------|--------|--------|--------
 1  | Hải An – Nam Hải,Đoạn Xá,TVN | 308000 | 356000 | 194000 | 318000
 2  | Hải An – Nam Hải Đình Vũ,VGP  | 297000 | 345000 | 186000 | 308000
 3  | Hải An – Chùa vẽ, Greenport   | 273000 | 344000 | 166000 | 293000
...
```

Where:
- **F20** = Full cargo, 20ft container (base price)
- **F40** = Full cargo, 40ft container (base price)
- **E20** = Empty container, 20ft (base price)
- **E40** = Empty container, 40ft (base price)

### Fuel Surcharge Table

A separate section in the CUOC sheet shows surcharge multipliers by fuel price band:

```
Fuel price band (VND/liter) | F20 price  | F40 price | Surcharge
----------------------------|-----------|-----------|----------
22–25k                      | 326,700   | 379,500   | +10%
25–28k                      | 341,550   | 396,750   | +15%
28–31k                      | 356,400   | 414,000   | +20%
31–34k                      | 371,250   | 431,250   | +25%
34–37k                      | 386,100   | 448,500   | +30%  ← April 2026 (avg fuel 34,832₫)
37–40k                      | 400,950   | 465,750   | +35%
40–43k                      | 415,800   | 483,000   | +40%
...
```

Base contract price for route "Hải An – Nam Hải Đình Vũ": F20 = 297,000₫  
At fuel index 5 (34–37k band, +30%): **297,000 × 1.30 = 386,100₫** ✓  
For 40ft at same band: **345,000 × 1.30 = 448,500₫** ✓

---

## Current System Gap

The current bảng giá (pricing table) likely stores a **single price per route**, which is insufficient. Real pricing requires **4 prices per route** (F20, F40, E20, E40) plus a **monthly fuel surcharge** applied globally.

---

## Required Changes

### 1. Bảng Giá: Store 4 Prices Per Route Per Client

Each pricing entry must store:
```
client_id + route (pickup + dropoff) →
  price_f20: int   (full cargo, 20ft, base price)
  price_f40: int   (full cargo, 40ft, base price)
  price_e20: int   (empty container, 20ft, base price)
  price_e40: int   (empty container, 40ft, base price)
```

### 2. Monthly Fuel Surcharge Configuration

Add a system-level setting (under ketoan Settings or per salary period):
```
fuel_surcharge_index: int       (e.g., 5)
fuel_avg_price: int             (e.g., 34,832 VND/liter)
fuel_surcharge_pct: float       (e.g., 0.30 for 30%)
```

The surcharge is applied uniformly to all routes for that billing period:
```
effective_price = base_price × (1 + fuel_surcharge_pct)
```

### 3. Pricing Lookup in Import / Matching

When a đơn hàng is imported (or matched), the system should auto-calculate or verify the unit price using:
```
price = lookup(client, route, container_size, cargo_type) × (1 + fuel_surcharge_pct)
```

If the Excel file already contains `ĐƠN GIÁ` (unit price), it should be stored as-is and optionally cross-referenced against the lookup table for validation.

### 4. Bảng Giá UI Updates

The pricing entry form and table at `/accountant/settings/pricing` (or equivalent) must:
- Show 4 price fields per entry (F20, F40, E20, E40) instead of 1
- Allow setting the monthly fuel surcharge index globally
- Show the **effective price** (base × surcharge) as a computed read-only field for reference

---

## Acceptance Criteria

- [ ] Database schema: pricing table has `price_f20`, `price_f40`, `price_e20`, `price_e40` columns (or equivalent structure)
- [ ] UI: pricing entry form shows all 4 price fields labeled clearly
- [ ] System settings: fuel surcharge index and percentage are configurable per billing period
- [ ] During Excel import: unit price from `ĐƠN GIÁ` column is stored; optionally validated against pricing table
- [ ] When auto-pricing trip orders, the correct price variant is selected based on container size (`LOẠI`) and type (`H/R`)
- [ ] Effective price calculation: base × (1 + fuel_surcharge_pct) is shown to accountant for verification

---

## Reference: Concrete Price Examples

| Route | Size | Type | Base | Fuel +30% | Effective |
|-------|------|------|------|-----------|-----------|
| Hải An → Nam Hải ĐV | 20ft | Full (H) | 297,000 | +89,100 | **386,100** |
| Hải An → Nam Hải ĐV | 40ft | Full (H) | 345,000 | +103,500 | **448,500** |
| Hải An → Nam Hải ĐV | 20ft | Empty (R) | 186,000 | +55,800 | **241,800** |
| Hải An → Nam Hải ĐV | 40ft | Empty (R) | 308,000 | +92,400 | **400,400** |
| Hải An → Nam Hải,Đoạn Xá | 20ft | Full (H) | 308,000 | +92,400 | **400,400** |
| Hải An → PANHAIAN | 20ft | Full (H) | 308,000 | +92,400 | **400,400** |

VAT (8%) is added on top of effective price for the final invoice total.

## Blocker

This is a major feature request requiring database schema changes (4 price columns per route), backend pricing engine overhaul, fuel surcharge system, and UI redesign. Too large for bug-fix workflow. Requires dedicated sprint planning and implementation.
