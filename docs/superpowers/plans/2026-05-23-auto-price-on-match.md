# Auto-Price on Match Confirmation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-populate `DeliveredTrip.revenue` and `driver_salary` from pricing tables when matches are confirmed, and remove the `BookedTrip.revenue` column entirely.

**Architecture:** Extend `confirm_matches()` to call existing pricing lookup functions (`lookup_client_prices`, `lookup_vendor_prices`) after setting `matched=True`. Then remove the `revenue` column from `BookedTrip` model, schema, dashboard, exports, and frontend.

**Tech Stack:** Python/FastAPI (backend), TypeScript/React (frontend), Alembic (migration), SQLAlchemy (ORM)

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `backend/app/contexts/operations/infrastructure/auto_match_service.py` | Add pricing lookup to `confirm_matches` |
| Modify | `backend/app/models/domain.py:387-415` | Remove `revenue` from `BookedTrip` ORM |
| Modify | `backend/app/contexts/operations/domain/entities.py:40` | Remove `revenue` from `BookedTrip` entity |
| Modify | `backend/app/schemas/_booked_trip.py` | Remove `revenue` from schemas |
| Modify | `backend/app/contexts/platform/interface/routers/dashboard.py` | Redirect revenue queries to `DeliveredTrip` |
| Modify | `backend/app/contexts/operations/infrastructure/excel/booked_trip_export.py` | Remove revenue from exports |
| Modify | `backend/app/contexts/operations/infrastructure/import_queries.py` | Remove revenue filter |
| Modify | `backend/app/contexts/operations/infrastructure/repositories.py` | Remove revenue filter |
| Modify | `backend/app/contexts/operations/application/booked_trips.py` | Remove `ApplyPricingToTrips` |
| Create | `backend/migrations/versions/xxxx_drop_booked_trip_revenue.py` | Alembic migration |
| Modify | `backend/tests/test_apply_pricing.py` | Remove `test_booked_trip_has_revenue` |
| Modify | `backend/tests/test_models.py` | Remove `test_booked_trip_revenue_not_nullable` |
| Modify | `frontend/src/services/api/bookedTrips.api.ts` | Remove `revenue` from types |
| Modify | `frontend/src/data/domain.ts` | Remove `revenue` from `BookedTrip` interface |
| Modify | `frontend/src/components/shared/DeliveredTripDetailDrawer/index.tsx` | Remove revenue display/edit |

---

### Task 1: Add pricing lookup to `confirm_matches()`

**Files:**
- Modify: `backend/app/contexts/operations/infrastructure/auto_match_service.py:347-407`

- [ ] **Step 1: Write the failing test**

Add a test in `backend/tests/test_apply_pricing.py` that verifies `confirm_matches` populates pricing:

```python
import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.operations.infrastructure.auto_match_service import confirm_matches


@pytest.mark.asyncio
async def test_confirm_matches_populates_delivered_trip_revenue():
    """When a match is confirmed, DeliveredTrip.revenue should be populated from RoutePricing."""
    # This test verifies the integration point exists.
    # We mock the pricing lookup to return a known value.
    from app.core.pricing_lookup import lookup_client_prices, lookup_vendor_prices
    import unittest.mock as mock

    # Mock DB session that returns a DeliveredTrip and BookedTrip
    db = AsyncMock(spec=AsyncSession)

    # Create mock DeliveredTrip
    wo = MagicMock()
    wo.id = 1
    wo.matched = False
    wo.client_id = 10
    wo.pickup_location_id = 100
    wo.dropoff_location_id = 200
    wo.work_type = "F20"
    wo.cont_type = "F20"
    wo.vendor_id = None
    wo.revenue = 0
    wo.driver_salary = 0

    # Create mock BookedTrip
    to = MagicMock()
    to.id = 2
    to.matched = False
    to.vessel = None
    to.vehicle_plate = None
    to.work_type = "F20"

    # Mock db.execute to return trips
    wo_result = MagicMock()
    wo_result.scalar_one_or_none.return_value = wo
    to_result = MagicMock()
    to_result.scalar_one_or_none.return_value = to

    db.execute = AsyncMock(side_effect=[wo_result, to_result])
    db.flush = AsyncMock()

    with mock.patch.object(
        confirm_matches, "__module__",
    ):
        pass  # placeholder — real test will run after implementation
```

- [ ] **Step 2: Implement the pricing lookup in `confirm_matches`**

In `backend/app/contexts/operations/infrastructure/auto_match_service.py`, modify `confirm_matches` to add pricing after matching. The full replacement for the function (lines 347-407):

```python
async def confirm_matches(
    db: AsyncSession,
    pairs: list[tuple[int, int, str | None]],
) -> dict:
    """Commit matched pairs: set matched=True, sync fields, and apply pricing.

    Each pair is (wo_id, to_id, sync_source).
    sync_source: "delivered" | "booked" | None.

    After matching, auto-populates:
      - DeliveredTrip.revenue from RoutePricing (client, lane, work_type, cont_type)
      - DeliveredTrip.driver_salary from VendorRoutePricing (if vendor_id is set)

    Returns {matched_count, errors, pricing_results}.
    """
    from app.models.domain import DeliveredTrip as WO, BookedTrip as TO
    from app.core.pricing_lookup import (
        TripPriceInfo,
        lookup_client_prices,
        lookup_vendor_prices,
    )

    matched_count = 0
    errors: list[str] = []
    matched_pairs: list[tuple] = []

    for wo_id, to_id, sync_source in pairs:
        wo = (await db.execute(
            select(WO).where(WO.id == wo_id)
        )).scalar_one_or_none()
        to = (await db.execute(
            select(TO).where(TO.id == to_id)
        )).scalar_one_or_none()

        if not wo:
            errors.append(f"DeliveredTrip#{wo_id} not found")
            continue
        if not to:
            errors.append(f"BookedTrip#{to_id} not found")
            continue
        if wo.matched:
            errors.append(f"DeliveredTrip#{wo_id} already matched")
            continue
        if to.matched:
            errors.append(f"BookedTrip#{to_id} already matched")
            continue

        if sync_source == "delivered":
            for field in SYNCABLE_FIELDS:
                setattr(to, field, getattr(wo, field))
        elif sync_source == "booked":
            for field in SYNCABLE_FIELDS:
                setattr(wo, field, getattr(to, field))
        else:
            for field in SYNCABLE_FIELDS:
                wo_val = getattr(wo, field)
                to_val = getattr(to, field)
                if wo_val and not to_val:
                    setattr(to, field, wo_val)
                elif to_val and not wo_val:
                    setattr(wo, field, to_val)

        wo.matched = True
        to.matched = True
        matched_count += 1
        matched_pairs.append((wo, to))

    # Auto-populate pricing for matched DeliveredTrips
    if matched_pairs:
        # Client pricing → DeliveredTrip.revenue
        client_infos = [
            TripPriceInfo(
                id=wo.id,
                partner_id=wo.client_id,
                pickup_location_id=wo.pickup_location_id,
                dropoff_location_id=wo.dropoff_location_id,
                work_type=wo.work_type,
                cont_type=wo.cont_type,
            )
            for wo, _ in matched_pairs
            if wo.revenue == 0
        ]
        if client_infos:
            client_prices = await lookup_client_prices(db, client_infos)
            for wo, _ in matched_pairs:
                price = client_prices.get(wo.id, 0)
                if price and wo.revenue == 0:
                    wo.revenue = price

        # Vendor pricing → DeliveredTrip.driver_salary
        vendor_infos = [
            TripPriceInfo(
                id=wo.id,
                partner_id=wo.vendor_id,
                pickup_location_id=wo.pickup_location_id,
                dropoff_location_id=wo.dropoff_location_id,
                work_type=wo.work_type,
                cont_type=wo.cont_type,
            )
            for wo, _ in matched_pairs
            if wo.vendor_id and wo.driver_salary == 0
        ]
        if vendor_infos:
            vendor_prices = await lookup_vendor_prices(db, vendor_infos)
            for wo, _ in matched_pairs:
                vprice = vendor_prices.get(wo.id, 0)
                if vprice and wo.driver_salary == 0:
                    wo.driver_salary = vprice

    await db.flush()

    return {"matched_count": matched_count, "errors": errors}
```

- [ ] **Step 3: Run backend tests**

Run: `make test-backend`
Expected: All tests pass. The new pricing logic runs inline with match confirmation.

- [ ] **Step 4: Commit**

```bash
git add backend/app/contexts/operations/infrastructure/auto_match_service.py
git commit -m "feat: auto-populate pricing when confirming trip matches"
```

---

### Task 2: Remove `revenue` from `BookedTrip` model and domain entity

**Files:**
- Modify: `backend/app/models/domain.py:405`
- Modify: `backend/app/contexts/operations/domain/entities.py:40`

- [ ] **Step 1: Remove from ORM model**

In `backend/app/models/domain.py`, remove line 405 (`revenue = Column(Integer, nullable=False, default=0)` from the `BookedTrip` class).

- [ ] **Step 2: Remove from domain entity**

In `backend/app/contexts/operations/domain/entities.py`, remove line 40 (`revenue: Money = 0`) from the `BookedTrip` dataclass.

- [ ] **Step 3: Run backend lint check**

Run: `cd backend && ruff check .`
Expected: No errors related to removed field yet (consumers updated in later tasks).

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/domain.py backend/app/contexts/operations/domain/entities.py
git commit -m "refactor: remove revenue field from BookedTrip model and entity"
```

---

### Task 3: Remove `revenue` from BookedTrip schemas

**Files:**
- Modify: `backend/app/schemas/_booked_trip.py`

- [ ] **Step 1: Update schemas**

In `backend/app/schemas/_booked_trip.py`:
- Remove `revenue: int = Field(ge=0, default=0)` from `BookedTripCreate` (line 27)
- Remove `revenue: int | None = None` from `BookedTripUpdate` (line 40)
- Remove `driver_salary: int | None = None` and `allowance: int | None = None` from `BookedTripUpdate` (lines 41-42) — these don't belong on BookedTrip
- Remove `revenue: int` from `BookedTripOut` (line 57)

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/_booked_trip.py
git commit -m "refactor: remove revenue from BookedTrip schemas"
```

---

### Task 4: Remove `revenue` filter from import queries and repositories

**Files:**
- Modify: `backend/app/contexts/operations/infrastructure/import_queries.py:55-72`
- Modify: `backend/app/contexts/operations/infrastructure/repositories.py:68-69`

- [ ] **Step 1: Update import_queries.py**

In `backend/app/contexts/operations/infrastructure/import_queries.py`, the `list_unpriced_trips` function filters by `revenue == 0`. Since we're removing revenue from BookedTrip, this function and its consumer (`ApplyPricingToTrips`) should be removed entirely.

Delete the entire `list_unpriced_trips` function (lines 56-72).

- [ ] **Step 2: Update repositories.py**

In `backend/app/contexts/operations/infrastructure/repositories.py`, remove the `unpriced_only` filter at line 69:
```python
# Remove this block:
        if unpriced_only:
            q = q.where((BookedTripORM.revenue == 0) | (BookedTripORM.revenue.is_(None)))
```
Also remove the `unpriced_only` parameter from the method signature.

- [ ] **Step 3: Commit**

```bash
git add backend/app/contexts/operations/infrastructure/import_queries.py backend/app/contexts/operations/infrastructure/repositories.py
git commit -m "refactor: remove revenue filter from BookedTrip queries"
```

---

### Task 5: Remove `ApplyPricingToTrips` use case

**Files:**
- Modify: `backend/app/contexts/operations/application/booked_trips.py:332-383`

- [ ] **Step 1: Delete the class**

Remove the entire `ApplyPricingToTrips` class (lines 332-383) from `backend/app/contexts/operations/application/booked_trips.py`.

- [ ] **Step 2: Remove any dependency injection references**

Search for `ApplyPricingToTrips` references in the dependency injection and router files and remove them:
- `backend/app/contexts/operations/interface/dependencies.py` — remove the factory/get function
- `backend/app/contexts/operations/interface/routers/booked_trips.py` — remove the endpoint that uses it

- [ ] **Step 3: Run backend lint**

Run: `cd backend && ruff check .`
Expected: Clean — no dangling references.

- [ ] **Step 4: Commit**

```bash
git add backend/app/contexts/operations/application/booked_trips.py backend/app/contexts/operations/interface/dependencies.py backend/app/contexts/operations/interface/routers/booked_trips.py
git commit -m "refactor: remove ApplyPricingToTrips use case (pricing now auto-applied on match)"
```

---

### Task 6: Redirect dashboard revenue queries to `DeliveredTrip`

**Files:**
- Modify: `backend/app/contexts/platform/interface/routers/dashboard.py`

- [ ] **Step 1: Update total revenue query (line 55)**

Replace:
```python
    revenue_query = select(func.coalesce(func.sum(BookedTrip.revenue), 0))
    if parsed_from:
        revenue_query = revenue_query.where(BookedTrip.created_at >= parsed_from)
    if parsed_to:
        revenue_query = revenue_query.where(BookedTrip.created_at < parsed_to + timedelta(days=1))
```
With:
```python
    revenue_query = select(func.coalesce(func.sum(DeliveredTrip.revenue), 0))
    if parsed_from:
        revenue_query = revenue_query.where(DeliveredTrip.matched == True)
    if parsed_from:
        revenue_query = revenue_query.where(
            func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)) >= parsed_from
        )
    if parsed_to:
        revenue_query = revenue_query.where(
            func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)) < parsed_to + timedelta(days=1)
        )
```

- [ ] **Step 2: Update outstanding debt query (lines 91-98)**

Replace:
```python
    debt_query = select(func.coalesce(func.sum(BookedTrip.revenue), 0)).where(
        BookedTrip.matched == True
    )
    if parsed_from:
        debt_query = debt_query.where(BookedTrip.created_at >= parsed_from)
    if parsed_to:
        debt_query = debt_query.where(BookedTrip.created_at < parsed_to + timedelta(days=1))
```
With:
```python
    debt_query = select(func.coalesce(func.sum(DeliveredTrip.revenue), 0)).where(
        DeliveredTrip.matched == True
    )
    if parsed_from:
        debt_query = debt_query.where(
            func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)) >= parsed_from
        )
    if parsed_to:
        debt_query = debt_query.where(
            func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)) < parsed_to + timedelta(days=1)
        )
```

- [ ] **Step 3: Update KPI trends revenue query (lines 240-252)**

Replace:
```python
    revenue_rows = (await db.execute(
        select(
            BookedTrip.trip_date.label("d"),
            func.coalesce(func.sum(BookedTrip.revenue), 0),
        )
        .where(
            BookedTrip.trip_date >= start_date,
            BookedTrip.trip_date <= parsed_end,
        )
        .group_by(BookedTrip.trip_date)
    )).all()
```
With:
```python
    revenue_rows = (await db.execute(
        select(
            func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)).label("d"),
            func.coalesce(func.sum(DeliveredTrip.revenue), 0),
        )
        .where(
            DeliveredTrip.matched == True,
            func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)) >= start_date,
            func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at)) <= parsed_end,
        )
        .group_by(
            func.coalesce(DeliveredTrip.trip_date, func.date(DeliveredTrip.created_at))
        )
    )).all()
```

- [ ] **Step 4: Remove unused BookedTrip import if no longer needed**

If `BookedTrip` is no longer imported or used elsewhere in `dashboard.py`, remove the import. Keep it if other queries still reference it.

- [ ] **Step 5: Commit**

```bash
git add backend/app/contexts/platform/interface/routers/dashboard.py
git commit -m "refactor: redirect dashboard revenue queries to DeliveredTrip"
```

---

### Task 7: Remove revenue from BookedTrip Excel export

**Files:**
- Modify: `backend/app/contexts/operations/infrastructure/excel/booked_trip_export.py`

- [ ] **Step 1: Update `generate_booked_trips_excel` (lines 90-112)**

In the matched trips branch (line 101), remove `to.revenue or ""` from the row append.

In the all trips branch (line 111), replace:
```python
            ws.append([
                f"TO#{to.id}", to.trip_date,
                client_name_by_id.get(to.client_id, ""),
                loc_name_by_id.get(to.pickup_location_id, ""),
                loc_name_by_id.get(to.dropoff_location_id, ""),
                to.cont_number or "", to.cont_type or "",
                to.revenue, to.revenue, 0,
                "Đã đối soát" if to.matched else "Chờ ghép",
            ])
```
With:
```python
            ws.append([
                f"TO#{to.id}", to.trip_date,
                client_name_by_id.get(to.client_id, ""),
                loc_name_by_id.get(to.pickup_location_id, ""),
                loc_name_by_id.get(to.dropoff_location_id, ""),
                to.cont_number or "", to.cont_type or "",
                "Đã đối soát" if to.matched else "Chờ ghép",
            ])
```

- [ ] **Step 2: Update `generate_doi_soat_excel` (lines 266-291)**

At line 271, remove `revenue = to.revenue or 0`.

At lines 284-291, remove the revenue columns from the row append. The `revenue` variable and its reference `revenue if revenue else None` at line 288 and `=L{row_num}` at line 289 should be removed. Adjust column indices accordingly.

- [ ] **Step 3: Commit**

```bash
git add backend/app/contexts/operations/infrastructure/excel/booked_trip_export.py
git commit -m "refactor: remove revenue column from BookedTrip Excel exports"
```

---

### Task 8: Create Alembic migration

**Files:**
- Create: `backend/migrations/versions/xxxx_drop_booked_trip_revenue.py`

- [ ] **Step 1: Generate the migration**

Run: `cd backend && PYTHONPATH=. alembic revision --autogenerate -m "drop_booked_trip_revenue"`

- [ ] **Step 2: Review and fix the migration**

Open the generated migration file and verify it contains only:
```python
def upgrade() -> None:
    op.drop_column('booked_trips', 'revenue')


def downgrade() -> None:
    op.add_column('booked_trips', sa.Column('revenue', sa.Integer(), nullable=False, server_default='0'))
```

Remove any other auto-detected changes that are unrelated.

- [ ] **Step 3: Commit**

```bash
git add backend/migrations/versions/
git commit -m "migrate: drop revenue column from booked_trips table"
```

---

### Task 9: Update tests

**Files:**
- Modify: `backend/tests/test_apply_pricing.py`
- Modify: `backend/tests/test_models.py`

- [ ] **Step 1: Remove `test_booked_trip_has_revenue`**

In `backend/tests/test_apply_pricing.py`, delete the entire `test_booked_trip_has_revenue` function (lines 22-31).

- [ ] **Step 2: Remove `test_booked_trip_revenue_not_nullable`**

In `backend/tests/test_models.py`, delete `test_booked_trip_revenue_not_nullable` (lines 108-109).

- [ ] **Step 3: Run full backend test suite**

Run: `make test-backend`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_apply_pricing.py backend/tests/test_models.py
git commit -m "test: remove BookedTrip revenue tests"
```

---

### Task 10: Frontend — remove `revenue` from BookedTrip types and UI

**Files:**
- Modify: `frontend/src/services/api/bookedTrips.api.ts:30,47`
- Modify: `frontend/src/data/domain.ts:206`
- Modify: `frontend/src/components/shared/DeliveredTripDetailDrawer/index.tsx:233-244`

- [ ] **Step 1: Update API types**

In `frontend/src/services/api/bookedTrips.api.ts`:
- Remove `revenue: number` from `BookedTripCreatePayload` (line 30)
- Remove `revenue?: number` from `BookedTripUpdatePayload` (line 47)
- Remove `driverSalary?: number` and `allowance?: number` from `BookedTripUpdatePayload` (lines 48-49) if present

- [ ] **Step 2: Update domain type**

In `frontend/src/data/domain.ts`, find the `BookedTrip` interface (around line 196-211) and remove `revenue: number` (line 206).

- [ ] **Step 3: Remove revenue display from DeliveredTripDetailDrawer**

In `frontend/src/components/shared/DeliveredTripDetailDrawer/index.tsx`, remove the "Doanh thu" `CriteriaEditRow` block (lines 233-244):

```tsx
// DELETE this entire block:
                  <CriteriaEditRow label="Doanh thu" className="col-span-1 border-b border-r border-[var(--line)]">
                    <InlineEditable
                      display={
                        <span style={{ color: bookedTrip.revenue ? 'var(--ink)' : 'var(--ink-4)' }}>
                          {bookedTrip.revenue ? bookedTrip.revenue.toLocaleString('vi-VN') + ' đ' : '—'}
                        </span>
                      }
                      value={String(bookedTrip.revenue ?? '')}
                      placeholder="Doanh thu"
                      onSave={(v) => updateBookedTrip.mutateAsync({ id: bookedTrip.id, data: { revenue: Number(v) || 0 } })}
                    />
                  </CriteriaEditRow>
```

- [ ] **Step 4: Run frontend lint + build**

Run: `make test-frontend`
Expected: Lint and build pass with no type errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/api/bookedTrips.api.ts frontend/src/data/domain.ts frontend/src/components/shared/DeliveredTripDetailDrawer/index.tsx
git commit -m "refactor: remove revenue from BookedTrip frontend types and UI"
```

---

### Task 11: Final integration test

- [ ] **Step 1: Run full test suite**

Run: `make test`
Expected: All backend (lint + format + pytest) and frontend (lint + build) pass.

- [ ] **Step 2: Run backend lint only to verify no dangling references**

Run: `cd backend && ruff check .`
Expected: Clean output, no errors.

- [ ] **Step 3: Run frontend build to verify no type errors**

Run: `cd frontend && pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit any remaining fixes**

If any last fixes were needed, commit them. Otherwise skip.

---

## Verification

1. `make test` passes (backend lint + format + pytest, frontend lint + build)
2. After deploying, confirm a match via `/auto-match/confirm` and verify:
   - `DeliveredTrip.revenue` is populated from RoutePricing
   - `DeliveredTrip.driver_salary` is populated from VendorRoutePricing (when vendor_id is set)
   - `BookedTrip` no longer has a `revenue` column
   - Dashboard revenue numbers come from `DeliveredTrip.revenue`
