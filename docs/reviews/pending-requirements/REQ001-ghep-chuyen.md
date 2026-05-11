# REQ-001: Ghép chuyến — One WorkOrder to Many TripOrders

| Field       | Value                                    |
|-------------|------------------------------------------|
| **Status**  | Pending Review                           |
| **Priority**| P0 — Blocks daily reconciliation        |
| **Author**  | Product                                  |
| **Date**    | 2026-05-11                               |
| **Area**    | Operations > Reconciliation (Ghép chuyến) |

---

## 1. Problem Statement

### Current Behavior

Today, the **Ghép chuyến** (reconciliation) page enforces a **1-to-1** match between:

- **Chuyến đã đi** (WorkOrder — created by the driver app) and
- **Đơn hàng** (TripOrder — imported from Excel or created manually)

The accountant selects one WorkOrder, one TripOrder, and confirms the match.

### Why This Breaks

When a customer uploads an Excel file, **each container row becomes its own TripOrder** (đơn hàng), containing:

- Container number (e.g., `TGHU1234567`)
- Container type / WorkType (`E20`, `F20`, `E40`, `F40`)
- Pickup point
- Drop-off point

However, when a driver delivers goods, they organize **multiple containers onto one truck** in a single run. The driver creates **one WorkOrder** that references all the containers they hauled:

> e.g., Driver Tran loads two E20 containers (`TGHU1234567` + `MSKU9876543`) and drives from Cat Lai to Binh Duong → **1 WorkOrder** with **2 containers**.

These two containers correspond to **2 separate TripOrders** from the Excel import. When the accountant reconciles, they need to link this **one WorkOrder to both TripOrders**.

### Impact

- Accountants cannot complete reconciliation for multi-container trips.
- Workaround: manually creating duplicate WorkOrders — causes data integrity issues.
- Affects every trip where a driver carries 2× 20ft containers (twin lift), which is **very common** in Vietnamese logistics.

---

## 2. Proposed Solution

Allow **one WorkOrder to be matched with multiple TripOrders** during ghép chuyến.

The relationship changes from:

```
WorkOrder 1 ←→ 1 TripOrder     (current)
```

to:

```
WorkOrder 1 ←→ N TripOrders    (proposed)
```

While maintaining:

```
TripOrder 1 ←→ 1 WorkOrder     (unchanged — a TripOrder still matches at most one WorkOrder)
```

---

## 3. Domain Model (Current vs Proposed)

### Current State

```
┌──────────────┐     1:1     ┌──────────────┐
│  WorkOrder   │◄────────────│  TripOrder   │
│ (chuyến đi)  │             │ (đơn hàng)   │
├──────────────┤             ├──────────────┤
│ containers[] │             │ containers[] │
└──────────────┘             └──────────────┘
```

### Proposed State

```
┌──────────────┐     1:N     ┌──────────────┐
│  WorkOrder   │◄────────────│  TripOrder A │  container TGHU...
│ (chuyến đi)  │             ├──────────────┤
│              │◄────────────│  TripOrder B │  container MSKU...
│ containers[] │             ├──────────────┤
│  [TGHU...,   │             │  TripOrder C │  (if 3rd container)
│   MSKU...]   │             └──────────────┘
└──────────────┘
```

### Real-World Example

**Excel import produces 3 TripOrders:**

| TripOrder | Container    | Type | Route                |
|-----------|-------------|------|----------------------|
| TO-101    | TGHU1234567 | E20  | Cat Lai → Binh Duong |
| TO-102    | MSKU9876543 | E20  | Cat Lai → Binh Duong |
| TO-103    | OOLU5555555 | E40  | Cat Lai → Dong Nai   |

**Driver creates 2 WorkOrders:**

| WorkOrder | Containers              | Route                |
|-----------|------------------------|----------------------|
| WO-201    | TGHU1234567, MSKU9876543 | Cat Lai → Binh Duong |
| WO-202    | OOLU5555555              | Cat Lai → Dong Nai   |

**Expected reconciliation:**

- WO-201 → TO-101 + TO-102 (one WorkOrder, two TripOrders)
- WO-202 → TO-103 (one-to-one, as before)

---

## 4. Current Code Analysis

### 4.1 Backend — Already Partially Supported

The database and domain layer **already allow** WorkOrder → multiple TripOrders:

| Component | File | Status |
|-----------|------|--------|
| `reconciliations` table | `app/models/domain.py:316` | Allows multiple rows per `work_order_id` |
| `TripOrderWorkOrder` join table | `app/models/domain.py:297` | Composite PK `(trip_order_id, work_order_id)` — supports N:M |
| `MatchTripToWorkOrder` use case | `application/reconciliation.py:54` | Docstring says "WO may match multiple TOs" |
| `find_all_links_for_wo()` | `infrastructure/link_queries.py:50` | Already queries all links for a WO |
| `count_links_for_wo()` | `infrastructure/link_queries.py:62` | Already counts links for unmatch logic |

**Critical bugs that block the feature:**

1. **`find_link()` — breaks with multiple links** (`link_queries.py:33`)
   - Uses `scalar_one_or_none()` which crashes when a WO has >1 active reconciliations
   - Used by the `unmatch` use case → unmatch fails after multi-match

2. **`trip_order_has_link()` only checks TripOrder side** (`link_queries.py:21`)
   - Correct — but needs a sibling `work_order_has_link()` if we ever want to enforce a limit

3. **Missing `find_all_links_for_trip()`** — no way to list all WOs linked to a TO
   - Currently unnecessary since TO → 1 WO, but needed for the new match-suggester

### 4.2 Backend — Match Suggester Needs Update

| Component | File | Issue |
|-----------|------|-------|
| `suggest_trip_matches()` | `infrastructure/match_suggester.py` | Returns TO suggestions for a given WO; should exclude already-matched TOs |
| `suggest_wo_matches()` | `infrastructure/match_suggester.py` | Returns WO suggestions for a given TO; should work as-is |
| Container scoring | `match_suggester.py:467-527` | Scores container overlap; needs to handle partial matches (some containers already matched) |

### 4.3 Frontend — Needs Major Update

| Component | File | Issue |
|-----------|------|-------|
| `MatchTrip.tsx` | `pages/accountant/MatchTrip.tsx` | 1:1 UI — only tracks one `selectedJobId` and one `selectedTripId` |
| `use-match-trip.ts` | `hooks/use-match-trip.ts` | Returns single `selectedJob`/`selectedTrip`; calls `reconcile()` once |
| Container match check | `use-match-trip.ts:106-108` | Checks ALL trip containers exist in job — correct for 1:1, needs adjustment for 1:N |
| Work order list | `MatchTrip.tsx:388-527` | Filters out matched WOs entirely — should still show partially-matched WOs |

---

## 5. Requirements

### 5.1 Functional Requirements

#### FR-1: Multi-Match UI Flow

The accountant opens a **WorkOrder** (chuyến đã đi) and sees a list of **unmatched/partially-matched TripOrders** (đơn hàng). They can:

1. **Select multiple TripOrders** to match with the one WorkOrder
2. **See which containers** from the WorkOrder correspond to each TripOrder
3. **Confirm the match** in a single action

**Alternative flow (start from TripOrder):**
The accountant opens a **TripOrder** and selects a WorkOrder — same as today, but the WorkOrder may already be matched to other TripOrders. This is allowed.

#### FR-2: Partial Container Matching

When a WorkOrder has 3 containers but only 2 have corresponding TripOrders:
- Match the 2 that have matching TripOrders
- Leave the 3rd container unmatched (visible as pending)
- Do NOT block the match

#### FR-3: Unmatch One TripOrder at a Time

When unmatching:
- Unmatching one TripOrder from a multi-matched WorkOrder should NOT affect other matches
- The WorkOrder stays `MATCHED` as long as it has ≥1 active reconciliation
- The WorkOrder goes to `PENDING` only when ALL reconciliations are removed

#### FR-4: Auto-Match Enhancement

The auto-match algorithm should:
1. For each PENDING WorkOrder, find all matching PENDING TripOrders
2. Match ALL TripOrders whose containers are subsets of the WorkOrder's containers
3. A WorkOrder is "fully matched" when all its containers have corresponding TripOrders

#### FR-5: Pricing & Salary

- When a WorkOrder matches multiple TripOrders:
  - Use the **first TripOrder's pricing** (or the highest) for salary calculation
  - OR: keep the current model where pricing is per-TripOrder, and the driver earns salary from each matched TripOrder independently
- Driver salary calculation = sum of `driver_salary` from all matched TripOrders
- This needs product decision (see Open Questions)

#### FR-6: Bulk Match Support

The bulk-match endpoint (`POST /reconcile/bulk-match`) should accept:

```json
{
  "pairs": [
    { "work_order_id": 201, "trip_order_id": 101 },
    { "work_order_id": 201, "trip_order_id": 102 }
  ]
}
```

Multiple pairs may reference the same `work_order_id`.

### 5.2 Non-Functional Requirements

#### NFR-1: Backward Compatibility

- Existing 1:1 matches must continue to work without migration
- No database schema changes required (the `reconciliations` table already supports N:M)

#### NFR-2: Performance

- Match suggestions for a WorkOrder with N containers should complete in <500ms
- Frontend should handle up to 10 TripOrders being matched to one WorkOrder

#### NFR-3: Audit Trail

- Each reconciliation link (WO ↔ TO pair) gets its own audit log entry
- Unmatch operations log which specific pair was broken

---

## 6. Technical Design

### 6.1 Backend Changes

#### 6.1.1 Fix `find_link()` — Support Multiple Links

**File:** `app/contexts/operations/infrastructure/link_queries.py`

```python
async def find_link(
    session: AsyncSession,
    *,
    work_order_id: int | None = None,
    trip_order_id: int | None = None,
) -> ReconciliationORM | None:
```

This function is used by the `unmatch` use case. When a WorkOrder has multiple active links, calling `find_link(work_order_id=X)` would return multiple rows → `scalar_one_or_none()` crashes.

**Fix:** When only `work_order_id` is provided and multiple links exist, either:
- (A) Require both `work_order_id` AND `trip_order_id` for unmatch (recommended)
- (B) Change to `scalars().all()` and return the first

**Recommendation:** Option A — the unmatch request should always specify both IDs.

#### 6.1.2 Update Unmatch Use Case

**File:** `app/contexts/operations/application/reconciliation.py`

The `UnmatchTripFromWorkOrder` use case must:
1. Require both `work_order_id` and `trip_order_id` (no longer optional)
2. Delete only the specific reconciliation row
3. Check remaining links: if WO has no more active links → WO → PENDING
4. TO → PENDING (as before)

#### 6.1.3 Update Match Suggester

**File:** `app/contexts/operations/infrastructure/match_suggester.py`

- `suggest_trip_matches(db, wo)`: Exclude TripOrders that are already matched (already done via `matched_to_ids` set in auto-match, but not in the base function)
- Add container-level granularity: a WorkOrder's container `TGHU1234567` can match TripOrder A, while container `MSKU9876543` can match TripOrder B
- Score should account for "already-matched containers" — a TripOrder whose container is already claimed by another match should get a lower score

#### 6.1.4 New Endpoint: Batch Reconcile for One WorkOrder

**File:** `app/contexts/operations/interface/routers/reconcile.py`

```python
@router.post("/reconcile/batch-for-wo", response_model=BatchMatchResponse)
async def batch_reconcile_for_wo(
    body: BatchMatchForWORequest,
    ...
):
```

Where:
```python
class BatchMatchForWORequest(BaseModel):
    work_order_id: int
    trip_order_ids: list[int]
```

Matches multiple TripOrders to one WorkOrder in a single transaction.

#### 6.1.5 Update Auto-Match

**File:** `app/contexts/operations/interface/routers/reconcile.py` — `auto_match()`

Current logic: for each WO, find best TO, match 1:1.
New logic: for each WO, find ALL TOs whose containers are subsets of WO's containers, match them all.

### 6.2 Frontend Changes

#### 6.2.1 New Match Flow — Start from WorkOrder

**Current flow:** Select 1 TripOrder → Select 1 WorkOrder → Match

**New flow (primary):** Select 1 WorkOrder → Select N TripOrders → Match all

**Page:** `MatchTrip.tsx` or new `MatchWorkOrder.tsx`

```
┌─────────────────────────────────────────────────────────┐
│  Ghép chuyến đi                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─── Chuyến đã đi (WorkOrder) ──────────────────────┐ │
│  │  WO-201 · Tran Van A · Cat Lai → Binh Duong      │ │
│  │  [E20] TGHU1234567  [E20] MSKU9876543            │ │
│  └───────────────────────────────────────────────────┘ │
│                        ↕                                │
│  ┌─── Đơn hàng (TripOrders) ────────────────────────┐  │
│  │  ✅ TO-101 [E20] TGHU1234567  Cat Lai → BD      │  │
│  │     (container matched)                           │  │
│  │  ✅ TO-102 [E20] MSKU9876543  Cat Lai → BD      │  │
│  │     (container matched)                           │  │
│  │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │  │
│  │  ☐  TO-104 [E20] ABCD1111111  Cat Lai → BD      │  │
│  │     (suggested — same route)                      │  │
│  │  ☐  TO-105 [F40] XYZ...        Cat Lai → DN     │  │
│  │     (different route & type)                      │  │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  [Xác nhận ghép 2 đơn hàng]                            │
└─────────────────────────────────────────────────────────┘
```

#### 6.2.2 Container Matching Indicators

For each TripOrder in the list, show:

| Indicator | Meaning |
|-----------|---------|
| ✅ Green check | Container number exists in WorkOrder + route matches |
| ⚠️ Yellow | Container matches but route/partner differs |
| ❌ Red X | Container not found in WorkOrder |
| 🔵 Already matched | This TripOrder is already linked to another WorkOrder |

#### 6.2.3 Updated Match Confirmation

When the accountant clicks "Confirm match":

1. Frontend sends array of `{ work_order_id, trip_order_id }` pairs to the batch endpoint
2. Each pair is validated individually
3. Results show per-pair success/failure
4. On success: all matched TripOrders disappear from the pending list
5. The WorkOrder shows all linked TripOrders in its detail view

#### 6.2.4 Hook Changes — `use-match-trip.ts`

Replace single selection with multi-selection:

```typescript
// Before
const [selectedJobId, setSelectedJobId] = useState(0)

// After
const [selectedTripIds, setSelectedTripIds] = useState<number[]>([])
```

The `handleMatch()` function calls reconcile for each selected pair.

#### 6.2.5 WorkOrder Detail View — Show All Linked TripOrders

**File:** `TripDetail.tsx` or equivalent

When viewing a WorkOrder detail, show all matched TripOrders:

```
WO-201 · Tran Van A
├── TO-101 [E20] TGHU1234567  ✅ Matched
├── TO-102 [E20] MSKU9876543  ✅ Matched
└── (no more pending containers)
```

With an "Unmatch" button per TripOrder.

---

## 7. Acceptance Criteria

### AC-1: Multi-Match Happy Path

**Given** a WorkOrder with 2 containers (TGHU..., MSKU...)
**And** 2 TripOrders with matching containers
**When** the accountant selects the WorkOrder and both TripOrders
**And** clicks "Confirm match"
**Then** both TripOrders are linked to the WorkOrder
**And** the WorkOrder status is `MATCHED`
**And** both TripOrder statuses are `MATCHED`

### AC-2: Partial Match

**Given** a WorkOrder with 2 containers (TGHU..., MSKU...)
**And** only 1 TripOrder with container TGHU... exists
**When** the accountant matches the WorkOrder with the 1 TripOrder
**Then** TO-TGHU is `MATCHED`
**And** the WorkOrder is `MATCHED`
**And** container MSKU... remains unmatched (visible in the UI)

### AC-3: Unmatch One of Many

**Given** a WorkOrder matched with TO-101 and TO-102
**When** the accountant unmatches TO-101
**Then** TO-101 status → `PENDING`
**And** TO-102 remains `MATCHED`
**And** WorkOrder remains `MATCHED` (still has TO-102)

### AC-4: Unmatch Last One

**Given** a WorkOrder matched with only TO-101
**When** the accountant unmatches TO-101
**Then** TO-101 status → `PENDING`
**And** WorkOrder status → `PENDING`

### AC-5: Block Duplicate Match

**Given** TO-101 is already matched with WO-201
**When** the accountant tries to match TO-101 with WO-202
**Then** the system rejects with error "Trip order is already matched"

### AC-6: Auto-Match Multi-Container

**Given** WO-201 with containers [TGHU..., MSKU...]
**And** TO-101 with container [TGHU...], TO-102 with container [MSKU...]
**And** all criteria match (driver, client, route, container)
**When** auto-match runs
**Then** WO-201 is matched with both TO-101 and TO-102

### AC-7: Salary Calculation

**Given** WO-201 matched with TO-101 (salary 500k) and TO-102 (salary 500k)
**When** the system calculates driver earnings for the day
**Then** the driver earns 500k + 500k = 1,000k VND for this WorkOrder

---

## 8. Implementation Plan

### Phase 1: Backend Fixes (2-3 days)

| # | Task | Files | Priority |
|---|------|-------|----------|
| 1 | Fix `find_link()` to require both IDs for unmatch | `link_queries.py`, `reconciliation.py` | P0 |
| 2 | Update `UnmatchTripFromWorkOrder` to require both IDs | `reconciliation.py`, `dto.py` | P0 |
| 3 | Add `batch_reconcile_for_wo` endpoint | `reconcile.py`, `domain.py` (schemas) | P0 |
| 4 | Update auto-match to support multi-match per WO | `reconcile.py` | P1 |
| 5 | Update match suggester to exclude already-matched TOs | `match_suggester.py` | P1 |
| 6 | Update salary calculation for multi-matched WOs | `payroll/application/use_cases.py` | P1 |

### Phase 2: Frontend Redesign (3-4 days)

| # | Task | Files | Priority |
|---|------|-------|----------|
| 1 | Redesign MatchTrip.tsx for 1:N flow | `MatchTrip.tsx` | P0 |
| 2 | Add multi-select for TripOrders | `MatchTrip.tsx` | P0 |
| 3 | Container-level match indicators | `MatchTrip.tsx` | P0 |
| 4 | Update `use-match-trip.ts` hook for multi-select | `use-match-trip.ts` | P0 |
| 5 | Show linked TripOrders in WorkOrder detail | `TripDetail.tsx` | P1 |
| 6 | Add per-TO unmatch in detail view | `TripDetail.tsx` | P1 |

### Phase 3: Testing & Polish (1-2 days)

| # | Task | Priority |
|---|------|----------|
| 1 | Unit tests for multi-match reconciliation | P0 |
| 2 | Unit tests for partial unmatch | P0 |
| 3 | E2E test for full multi-match flow | P1 |
| 4 | Test salary calculation with multi-match | P1 |

**Estimated total: 6-9 days**

---

## 9. Open Questions

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | **Pricing for multi-match**: When a WO matches multiple TOs, which pricing applies? | A) First TO's pricing, B) Sum of all TOs' pricings, C) Highest pricing | **B** — each TO has its own pricing; driver earns sum of all |
| 2 | **UI entry point**: Should the primary flow start from WorkOrder or TripOrder? | A) WorkOrder-first (select WO, then add TOs), B) TripOrder-first (select TO, then pick WO — current), C) Both | **A** — WorkOrder-first is more natural since one WO maps to N TOs |
| 3 | **Container claiming**: Should a container in a WO be "claimed" once matched to a TO, preventing it from being matched again? | A) Yes — auto-exclude claimed containers, B) No — allow manual override | **A** — prevents double-counting |
| 4 | **Match suggestion confidence**: For multi-match, should the system suggest ALL possible TOs for a WO at once? | A) Yes — show all possible matches, B) No — show one at a time | **A** — show all with confidence scores |
| 5 | **WorkOrder status**: Should a WO with 2 containers matched to 1 TO (out of 2 possible) show `MATCHED` or a new `PARTIALLY_MATCHED` status? | A) `MATCHED` (current behavior), B) New `PARTIALLY_MATCHED` status | **A** — keep simple; unmatched containers visible in UI |

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Existing 1:1 matches break | Low | High | No schema changes; comprehensive regression tests |
| `find_link()` crash in production (WO already multi-matched) | Medium | High | Fix immediately in Phase 1 |
| Frontend UX confusion with multi-select | Medium | Medium | Clear container-level indicators; user testing |
| Salary double-counting | Medium | High | Clear product decision on pricing model (Question 1) |
| Performance with many containers | Low | Medium | Limit suggestions to top 10; paginate |

---

## 11. Out of Scope

- Changing the Excel import flow (each row = 1 container = 1 TripOrder remains)
- Modifying the driver app (WorkOrder creation stays the same)
- Adding a `PARTIALLY_MATCHED` status (keep existing statuses)
- WebSocket for real-time match updates (polling is sufficient)
