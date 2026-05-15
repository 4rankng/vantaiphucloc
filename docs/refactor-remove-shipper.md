# Refactor: Remove "Shipper" Concept

**Date:** 2025-05-14
**Goal:** Remove `shipper` from `partner_type`. Partners are only `client` (khách hàng/chủ hàng) or `vendor` (nhà thầu/xe ngoài). Remove `shipper_partner_id` from Pricing, WorkOrder, TripOrder. Remove `partner_role` column.

## Phase 1: Database Migration

**New migration:** `013_remove_shipper_partner_id.py`

### Steps:
1. **Drop FK constraints + columns:**
   - `pricings.shipper_partner_id` → DROP COLUMN
   - `work_orders.shipper_partner_id` → DROP COLUMN
   - `trip_orders.shipper_partner_id` → DROP COLUMN

2. **Update Pricing unique constraint:**
   - OLD: `uq_pricings_lane(partner_id, shipper_partner_id, operation_type, work_type, pickup_location_id, dropoff_location_id)`
   - NEW: `uq_pricings_lane(partner_id, operation_type, work_type, pickup_location_id, dropoff_location_id)`

3. **Drop `partner_role` column from `partners` table:**
   - Column no longer needed (was shipping_line/factory/transport/other)

4. **Update `partner_type` CHECK or comment:**
   - OLD: `client | vendor | shipper`
   - NEW: `client | vendor` only
   - Add CHECK constraint: `CHECK (partner_type IN ('client', 'vendor'))`

5. **Update existing data:**
   - Any partners with `partner_type = 'shipper'` → update to `'client'` (these are chủ hàng = khách hàng)
   - PHUCLOC partner: `partner_type = 'vendor'` → already correct (it's the company itself; but actually since Phúc Lộc IS the company, we should consider removing it from partners entirely. For now keep as vendor.)
   - Pricing records: `partner_id` currently points to PHUCLOC, `shipper_partner_id` points to client → **need to swap**: set `partner_id = client_id`, then drop `shipper_partner_id`

### Critical Data Migration:
```sql
-- Step 1: Update shipper-type partners to client
UPDATE partners SET partner_type = 'client' WHERE partner_type = 'shipper';

-- Step 2: Swap pricing partner_id to point to client (the actual chủ hàng)
UPDATE pricings SET partner_id = shipper_partner_id WHERE shipper_partner_id IS NOT NULL;

-- Step 3: Same for work_orders and trip_orders  
UPDATE work_orders SET partner_id = shipper_partner_id WHERE shipper_partner_id IS NOT NULL;
UPDATE trip_orders SET partner_id = shipper_partner_id WHERE shipper_partner_id IS NOT NULL;

-- Step 4: Now drop columns
ALTER TABLE pricings DROP CONSTRAINT IF EXISTS uq_pricings_lane;
ALTER TABLE pricings DROP COLUMN shipper_partner_id;
ALTER TABLE work_orders DROP COLUMN shipper_partner_id;
ALTER TABLE trip_orders DROP COLUMN shipper_partner_id;

-- Step 5: Recreate unique constraint without shipper
ALTER TABLE pricings ADD CONSTRAINT uq_pricings_lane 
  UNIQUE (partner_id, operation_type, work_type, pickup_location_id, dropoff_location_id);

-- Step 6: Drop partner_role
ALTER TABLE partners DROP COLUMN partner_role;

-- Step 7: Add CHECK constraint
ALTER TABLE partners ADD CONSTRAINT chk_partner_type 
  CHECK (partner_type IN ('client', 'vendor'));
```

---

## Phase 2: Backend Refactor

### 2.1 Models (`backend/app/models/domain.py`)

**Partner:**
```python
# REMOVE: partner_role column
# CHANGE: partner_type comment to "client | vendor"
partner_type = Column(String(20), nullable=False)  # client | vendor
```

**Pricing:**
```python
# REMOVE: shipper_partner_id column
# CHANGE: UniqueConstraint to (partner_id, operation_type, work_type, pickup_location_id, dropoff_location_id)
# partner_id now = client (khách hàng), not PHUCLOC
```

**WorkOrder:**
```python
# REMOVE: shipper_partner_id column
```

**TripOrder:**
```python
# REMOVE: shipper_partner_id column
```

### 2.2 Schemas (`backend/app/schemas/domain.py`)

Remove all `shipper_partner_id` fields from:
- `PricingCreate`, `PricingUpdate`, `PricingRead`, `PricingListItem`
- `WorkOrderCreate`, `WorkOrderUpdate`, `WorkOrderRead`
- `TripOrderCreate`, `TripOrderUpdate`, `TripOrderRead`

Change:
```python
# OLD
partner_type: Literal["client", "vendor", "shipper"]
# NEW
partner_type: Literal["client", "vendor"]
```

Remove `partner_role` from Partner schemas.

### 2.3 Customer Pricing Context

**`contexts/customer_pricing/domain/entities.py`:**
- Remove `shipper_partner_id` from `Pricing` entity
- Remove `partner_role` from `Partner` entity
- Update `partner_type` type hint to `Literal["client", "vendor"]`

**`contexts/customer_pricing/application/dto.py`:**
- Remove `shipper_partner_id` from `PricingCreateDTO`, `PricingUpdateDTO`
- Remove `partner_role` from `PartnerDTO`, `PartnerCreateDTO`, `PartnerUpdateDTO`
- Update `partner_type` to `Literal["client", "vendor"]`

**`contexts/customer_pricing/application/pricings.py`:**
- Remove `shipper_partner_id` from create/update logic

**`contexts/customer_pricing/application/partners.py`:**
- Remove `partner_role` handling
- Simplify `partner_type` filter

**`contexts/customer_pricing/infrastructure/mappers.py`:**
- Remove `shipper_partner_id` mapping in pricing mapper
- Remove `partner_role` mapping in partner mapper

**`contexts/customer_pricing/infrastructure/repositories.py`:**
- Remove `partner_role` from partner queries

**`contexts/customer_pricing/infrastructure/pricing_lookup.py` — MAJOR SIMPLIFICATION:**
- Remove `shipper_partner_id` parameter from all functions
- Simplify 4-level lookup to 3-level:
  1. `partner + operation_type + lane + work_type` (most specific)
  2. `partner + lane + work_type` (any operation type)
  3. Base rate: `partner + lane + work_type` (same as #2, so really just 2 levels)
  
  Actually with shipper gone:
  1. `partner + operation_type + lane + work_type`
  2. `partner + lane + work_type` (any op_type)
  
  Where `partner_id` = client (khách hàng)

**`contexts/customer_pricing/interface/schemas.py`:**
- Remove `shipper` from `partner_type` Literal
- Remove `partner_role` from schemas
- Remove `shipper_partner_id` from pricing schemas

**`contexts/customer_pricing/interface/routers/pricings.py`:**
- Remove `shipper_partner_id` from create/update endpoints

**`contexts/customer_pricing/interface/routers/partners.py`:**
- Remove `partner_role` from create/update

### 2.4 Operations Context

**`contexts/operations/application/dto.py`:**
- Remove `shipper_partner_id` from `WorkOrderCreateDTO`, `WorkOrderUpdateDTO`

**`contexts/operations/application/work_orders.py`:**
- Remove all `shipper_partner_id` references in create/update/apply-pricing

**`contexts/operations/interface/routers/work_orders.py`:**
- Remove `shipper_partner_id` from create/update endpoints

### 2.5 Seed Scripts

**`seed_ports_pricing.py`:**
- Partner type: already fixed to "client" ✓
- Remove `shipper_partner_id` from Pricing insert
- `partner_id` on Pricing = client (chủ hàng), not PHUCLOC
- Remove PHUCLOC as partner (it's the company, not a client/vendor)

**`seed_dev.py`:**
- Update Partner type: HAIAN stays client, PHUCLOC → remove or keep as company record
- Remove `shipper_partner_id` references if any
- Remove `partner_role` references

---

## Phase 3: Frontend Refactor

### 3.1 Types (`frontend/src/data/domain.ts`)

```typescript
// OLD
export type PartnerType = 'client' | 'vendor' | 'shipper'
// NEW
export type PartnerType = 'client' | 'vendor'
```

Remove `shipperPartnerId` from:
- `Pricing` type
- `PricingCreate` type
- `WorkOrder` type
- Any other types that have it

### 3.2 API Services

**`services/api/pricings.api.ts`:**
- Remove `shipperPartnerId` from types

**`services/api/workOrders.api.ts`:**
- Remove `shipperPartnerId` from types

**`services/api/partners.api.ts`:**
- No change needed (already takes `partnerType` param)

### 3.3 Components

**`components/shared/Pricing/PricingForm.tsx`:**
- REMOVE: shipper dropdown (`usePartners({ partnerType: 'shipper' })`)
- REMOVE: `shipperPartnerId` state and field
- Remove the entire shipper `<Select>` in the form

**`components/shared/Pricing/PricingClientDetail.tsx`:**
- REMOVE: grouping by `shipperPartnerId`
- Simplify grouping to: `pickup → dropoff | operationType`
- Remove `shipperPartnerId` display ("Chủ hàng #N")

**`pages/accountant/work-orders/TripDetailCard.tsx`:**
- REMOVE: inline shipper assignment component entirely
- This whole `ShipperAssigner` inline component can be deleted

**`pages/accountant/WorkOrderList.tsx`:**
- REMOVE: `NO_SHIPPER` filter option
- Remove `shipperPartnerId` from filter logic

**`pages/accountant/ClientsAndVendors.tsx`:**
- Already uses `PartnerKind = 'client' | 'vendor'` ✓
- May need to remove any `partner_role` form fields if present

### 3.4 Hooks

**`hooks/use-queries.ts`:**
- `usePartners` hook: no change needed (already generic)
- Remove any shipper-specific queries if they exist

---

## Phase 4: Seed Data Update

**`seed_ports_pricing.py` — Rewrite pricing insert logic:**
- `partner_id` = client (the chủ hàng from Excel), NOT PHUCLOC
- Remove `shipper_partner_id` entirely
- Remove PHUCLOC partner creation (company itself shouldn't be in partners table)
- Unique constraint: `(partner_id, operation_type, work_type, pickup_location_id, dropoff_location_id)`

**`seed_dev.py`:**
- Remove PHUCLOC partner (or repurpose)
- Remove `partner_role` fields
- Update `partner_type` to only use "client" or "vendor"

---

## Implementation Order

1. **Migration script first** (Phase 1) — with data migration SQL
2. **Backend models** (Phase 2.1) — update ORM models
3. **Backend entities/DTOs/schemas** (Phase 2.2-2.3) — remove fields
4. **Backend services/routers** (Phase 2.3-2.4) — remove from logic
5. **Pricing lookup simplification** (Phase 2.3) — biggest logic change
6. **Seed scripts** (Phase 4) — update to new model
7. **Frontend types** (Phase 3.1) — update domain.ts
8. **Frontend components** (Phase 3.2-3.3) — remove shipper UI
9. **Test everything** — run backend, frontend, verify pricing lookup works

---

## Risk Areas

1. **Pricing lookup** — most complex change; 4-level → 2-level fallback. Must ensure existing pricing data still resolves correctly after migration.
2. **Data migration** — swapping `partner_id` on pricing rows is critical. Must backup first.
3. **WorkOrder/TripOrder partner_id swap** — if any existing WO/TO had `partner_id = PHUCLOC` and `shipper_partner_id = client`, after migration `partner_id` should point to the actual client.
4. **Seed data** — the 557 pricing records just seeded use PHUCLOC as partner_id. Need to update them post-migration.
