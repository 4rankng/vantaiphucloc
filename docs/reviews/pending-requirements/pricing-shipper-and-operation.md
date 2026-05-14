# MOVED — implemented, see completed-requirements/pricing-shipper-and-operation.md

# Pricing — add chủ hàng (shipper) + tác nghiệp dimensions

## Request (verbatim)

> Về cước tuyến này, có thể tuyến giống nhau, nhưng chủ hàng lại khác nhau, nên giá cũng sẽ khác nhau - Em đang không biết là có cần ghi cụ thể cho a biết không, vì nhiều khi e cũng ko nắm được chủ hàng là ai, phải đi hỏi a đội trưởng và giám đốc mới nắm được tuyến đó là chủ hàng nào a ạ.
>
> Thêm nữa, 1 số tuyến chạy đảo chiều đi và đến, cước tính như nhau, nhưng có 1 số tuyến chạy ngược lại sẽ là tác nghiệp khác (Xuất/ nhập tàu hoặc là Chuyển bãi) - và giá cước cũng sẽ khác - cái này em có thể ghi chú lại cho a được nếu a cần ạ.

## Two new pricing dimensions

1. **Chủ hàng (shipper)** — the actual owner of the cargo, distinct from the customer PL invoices. Same route + same customer can price differently depending on chủ hàng.
2. **Tác nghiệp (operation type)** — `Xuất tàu`, `Nhập tàu`, `Chuyển bãi` (list confirmed by Huyền; check if more). Same lane in reverse direction is often a different tác nghiệp at a different rate.

## Current state

`Pricing` table is keyed on:

```
UNIQUE (partner_id, work_type, pickup_location_id, dropoff_location_id)
```

— customer × container-size × directional-lane. No shipper, no operation type. Reverse-direction pricing already supported via the directional pickup/dropoff keys.

## Schema changes

### A. Chủ hàng entity

Two reasonable options — leaning toward Option 1:

**Option 1 (recommended):** Reuse `partners` with a new value `partner_type = "shipper"`. Free-form many-to-many between customer and shipper through `Pricing` rows; no extra mapping table needed. Pros: no new table, search/list reuses partner UI.

**Option 2:** Dedicated `shippers` table with `(id, code, name, is_active)`. Pros: cleaner schema if shipper has different attributes than partners. Cons: yet another lookup table.

In either case, `shipper_partner_id` (or `shipper_id`) is a nullable FK on `Pricing`, `WorkOrder`, and `TripOrder`.

### B. `Pricing` additions

```python
shipper_partner_id   = Column(Integer, ForeignKey("partners.id"), nullable=True, index=True)
operation_type       = Column(String(20), nullable=True, index=True)  # XUAT_TAU | NHAP_TAU | CHUYEN_BAI | (other)
```

New unique constraint:

```
UNIQUE (partner_id, shipper_partner_id, operation_type, work_type,
        pickup_location_id, dropoff_location_id)
```

`NULL`s in unique keys behave differently per DB — on Postgres they're treated as distinct, which is actually what we want here (a row with `shipper=NULL` is the fallback / "applies to any shipper"). Document this clearly.

### C. `WorkOrder` / `TripOrder` additions

Both gain `shipper_partner_id` (nullable) and `operation_type` (nullable). The driver-facing flow already needs `operation_type` per [driver-ship-number-and-tac-nghiep.md](./driver-ship-number-and-tac-nghiep.md); `shipper_partner_id` is filled in later by đội trưởng / giám đốc.

## Pricing-lookup logic (most-specific wins)

Try in order, stop on first match:

1. `partner` + `shipper` + `operation_type` + lane + size
2. `partner` + `shipper` + lane + size (any tác nghiệp)
3. `partner` + `operation_type` + lane + size (any shipper)
4. `partner` + lane + size (current behaviour — base rate)
5. No match → unpriced; surface in "trips with no pricing" worklist.

This way Huyền can create a trip with no chủ hàng and still get a price (level 3 or 4), and as soon as leadership assigns a chủ hàng the more specific rate (level 1 or 2) kicks in.

## Workflow — chủ hàng assignment

- Trips created by drivers / Huyền have `shipper_partner_id = NULL` allowed.
- Accountant UI shows a worklist filter "Chưa gán chủ hàng" so đội trưởng / giám đốc can sweep it periodically.
- When a chủ hàng is set, the system **re-evaluates pricing** for that trip (driver_salary, unit_price, allowance may shift if a more specific Pricing row applies) and writes an audit-log entry.
- Setting/changing chủ hàng on a MATCHED trip is allowed but logged; if pricing shifts, the system flags the reconciliation row as "rate-changed, needs re-confirm".

## UI

- **Cài đặt → Chủ hàng**: list + create + edit + deactivate. (Or fold into existing Đối tác page if Option 1, with a "Loại = Chủ hàng" filter.)
- **Cài đặt → Cước**: existing pricing page gains shipper and tác nghiệp columns + filters; ability to define a base rate (shipper=NULL, tác nghiệp=NULL) and overrides.
- **Trip create/edit**: `Chủ hàng` and `Tác nghiệp` dropdowns; `Chủ hàng` optional.
- **Accountant trips page**: add a tab/filter "Chưa gán chủ hàng".
- **Bulk-assign chủ hàng** action for the director/đội trưởng (multi-select trips → set shipper) — saves time vs. row-by-row.

## Tác nghiệp value list (working set)

Source: Huyền (this message). Confirm completeness before locking the enum.

- `XUAT_TAU` — Xuất tàu (ship export)
- `NHAP_TAU` — Nhập tàu (ship import)
- `CHUYEN_BAI` — Chuyển bãi (yard transfer)
- `KHAC`? — Catch-all / other (TBD)

## Open questions for PL / Huyền

- Is the tác nghiệp list above complete, or are there more (e.g. internal moves, empty repositioning, customs hold)?
- Chủ hàng: is each chủ hàng tied to exactly one customer, or can the same chủ hàng appear under different customers? (Affects whether shipper has a partner_id back-reference.)
- When the đội trưởng/giám đốc sets chủ hàng late, is it acceptable for the system to recompute the unit price + driver salary, or should the original captured price be preserved?
- Examples please — Huyền offered to write down the concrete cases of "same route, different chủ hàng, different price" and "reverse direction = different tác nghiệp = different price". These are gold for validating the fallback rules.

## Acceptance criteria

- Pricing table supports `(customer, shipper, tác nghiệp, lane, size)` rows including fallback rows with NULL shipper or NULL tác nghiệp.
- Pricing-lookup picks the most specific applicable row.
- Trips can be created without chủ hàng; "Chưa gán chủ hàng" worklist exists; bulk-assign works.
- Re-pricing on chủ hàng change is logged in audit_log and (if MATCHED) flags the reconciliation.
- Tests cover the full fallback chain and the workflow of late chủ hàng assignment.
