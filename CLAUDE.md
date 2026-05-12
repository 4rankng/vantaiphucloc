# CLAUDE.md - Vận Tải Hàng Hóa (TTransport)

> **Long-Term Memory for AI Agents**
> This file provides context, patterns, and commands for working with the TTransport freight logistics system.

---

## 📋 Project State

### ✅ Recently Completed (2026-05-12) — Auto-heal Persistence Fix + Integration Tests (tasks 0102, 0103)

**2 task specs completed:**

1. **task-0102** — Root cause of stale "Đã khớp" with 0 orders: auto-heal in `_load_many` modified domain entity `w.status` in memory, but domain objects are plain dataclasses (not ORM). `session.commit()` did not persist the change.
   - Fix: replaced in-memory mutation with `sqlalchemy.update(WorkOrderORM)` to directly persist status change to DB before commit.
   - File: `backend/app/contexts/operations/interface/routers/work_orders.py` `_load_many()`

2. **task-0103** — Added 5 integration tests for auto-heal mechanism (`test_stale_matched_heal.py`):
   - TC1-TC5 covering: stale heal, legitimate match preserved, individual GET heal, mixed states, normal unmatch flow.
   - All 5 tests pass standalone and within full suite.

**Test suite:** 174 passed, 1 skipped, 0 failures (was 169 tests, now 174).

### ✅ Previously Completed (2026-05-12) — Stale MATCHED Fix + Typography Polish

**3 task specs completed:**

1. **bug-MATCHED-empty-orders** — WO shows MATCHED but 0 linked TripOrders.
   - Backend root cause: stale WO status after reconciliation link deactivated without resetting WO.
   - Fix: auto-heal in `_load_many` (work_orders.py) — detects MATCHED WOs with 0 active links, resets to PENDING, commits.
   - Frontend defense: MatchDetailPanel shows error state with "Đặt lại trạng thái PENDING" recovery button when `isStaleMatched`.
   - Added `useUpdateWorkOrder` import to MatchDetailPanel.

2. **bug-master-list-zero-count-badge** — Literal "0" rendered under "Đã khớp" chip.
   - Root cause: classic React bug — `{0 && <JSX/>}` renders "0" as text (0 is a valid React child).
   - Fix: changed guard to `matchedTripCount > 0` (boolean result, not numeric).

3. **task-typography-work-orders-page** — Unified type scale across work-orders page.
   - Score/status chips: 44×44 → 36×36, `text-[11px] font-bold tabular-nums`
   - Section headings: `text-sm` → `text-[13px] font-semibold`
   - Count badges: `text-[10px] font-semibold tabular-nums`
   - TripDetailCard: plate `text-sm` → `text-xs`, KH label `text-[10px] uppercase`
   - MatchCard: score chip → 36×36, criterion label `text-[11px] w-24`, "Ghép" button `font-semibold`
   - WorkOrderList: header buttons `h-9` → `h-8`, "Nhập đơn" demoted to outline style
   - Master list: `py-2.5` → `py-2`, `border-left 3px` → `2px`

**Files changed:**
- `backend/app/contexts/operations/interface/routers/work_orders.py` (auto-heal in `_load_many`)
- `frontend/src/pages/accountant/work-orders/WorkOrderMasterList.tsx`
- `frontend/src/pages/accountant/work-orders/MatchDetailPanel.tsx`
- `frontend/src/pages/accountant/work-orders/TripDetailCard.tsx`
- `frontend/src/pages/accountant/work-orders/MatchCard.tsx`
- `frontend/src/pages/accountant/WorkOrderList.tsx`

**Tests:** 169 passed, 0 failed.

---

### ✅ Recently Completed (2026-05-12) — Remove Tuyến đường + Multi-Container Scoring (task specs)

**3 task specs completed in one cron run:**

1. **Remove Tuyến đường field everywhere** — `route`/`tuyen_duong` removed from AutoMatch DTOs (both backend Pydantic and frontend TypeScript). All frontend displays now compute `pickupLocation → dropoffLocation` inline. Match criteria reduced from 6 to 5 (max_score=5). Removed `route` from `TripOrderCreatePayload` and `CreateTrip.tsx` submission.

2. **Simplify match comparison to single column** — `MatchCard.tsx` already had single-column layout (✅/❌ icons, subtle bg, hover tooltips, match counter). No additional changes needed.

3. **Split multi-container orders** — `match_suggester.py` now emits one `MatchSuggestion` per `(TO × container)` tuple. Added `_score_to_container_against_wo` and `_used_container_ids_for_tos` helper functions to score per-container and track which TO containers are already matched.

**Key bug fix:** The match suggester was calling `_used_container_ids_for_tos` and `_score_to_container_against_wo` but these functions were never defined, causing 500 errors on `/match-scores` and `/suggest-matches`. Both functions implemented.

**Files changed:**
- Backend: `match_suggester.py`, `reconcile.py` router, `domain.py` schemas
- Frontend: `AutoMatchDialog.tsx`, `RouteDisplay.tsx`, `TripOrderCard.tsx`, `TripSummaryDialog.tsx`, `CreateTrip.tsx`, `TripDetail.tsx`, `TripList.tsx`, `MatchCard.tsx`, `MatchPanel.tsx`, `use-match-trip.ts`, `domain.ts`, `tripOrders.api.ts`
- Director pages: `DriverJobs.tsx`, `ClientJobs.tsx`, `DirectorDashboard.tsx`

**Tests:** 169 passed, 0 failed.

### ✅ Recently Completed (2026-05-12) — TO-Centric Matching Model (bug-0078..0083, task-0099..0101)

**Major model inversion:** Changed from WO-centric (1 WO → N TOs) to TO-centric (1 TO → N WOs).
TripOrder has N containers and may match N WorkOrders. WorkOrder is 1:1 with TripOrder.

**Backend changes:**
- `reconciliation.py`: `MatchTripToWorkOrder` — capacity check via `count_links_for_to`, WO 1:1 check via `work_order_has_link`. TO stays MATCHED when additional WOs linked. Pricing snapshot is overwrite (not accumulation) on WO.
- `reconciliation.py`: `UnmatchTripFromWorkOrder` — WO always resets to PENDING. TO resets only when last link removed. Uses `count_links_for_to` instead of `count_links_for_wo`.
- `entities.py`: `TripOrder.match()` is idempotent (MATCHED→MATCHED is no-op). `TripOrder.unmatch()` accepts PENDING as no-op. `WorkOrder.apply_pricing_snapshot()` overwrites (no accumulation).
- `link_queries.py`: Added `count_links_for_to`, `work_order_has_link`, `find_all_links_for_to`.
- `match_suggester.py`: `suggest_trip_matches` filters TOs by remaining capacity. `suggest_wo_matches` excludes already-matched WOs.
- `reconcile.py` router: New `POST /reconcile/batch-for-to` endpoint with capacity validation.
- `domain.py` schemas: `BatchMatchForTORequest/Response/Result` added.
- Status: COMPLETED removed from match flow. PENDING ↔ MATCHED only.

**Frontend changes:**
- `MatchDetailPanel.tsx`: Capacity guard (disable checkboxes beyond `containerCapacity`), capacity counter in batch bar, reset `selectedToIds` on WO change (useEffect), removed COMPLETED from `isMatched` check.
- `use-queries.ts`: Added `useBatchReconcileForTO` hook.
- `tripOrders.api.ts`: Added `batchReconcileForTO` API function.
- `domain.ts`: Added `BatchMatchForTOResult/Response` types.

**Tests:**
- `test_multi_match_reconciliation.py`: Rewritten for TO-centric model (AC1-AC7: capacity, unmatch, MATCHED status, pricing).
- `test_reconcile.py`: Fixed COMPLETED → MATCHED assertion.
- `test_workflows.py`: Fixed COMPLETED → MATCHED assertions (2 locations).
- Full suite: 169 passed, 0 failed.

**Bug found and fixed:** `TripOrderRepository._hydrate` wasn't returning `matched_by` from reconciliation records, causing FK violation (`matched_by=0`) on unmatch. Fixed by fetching `matched_by` from `ReconciliationORM` during hydration.

**Design constraint (bug-0083):** Driver "Tạo chuyến" button must stay as FAB, not topbar. Documentation-only.

---

### ✅ Completed (2026-05-12) — Ghép chuyến 1:N (REQ-001)

1. **Multi-match reconciliation** — COMMITTED
   Tasks 0090–0098 all completed. Full 1 WO → N TOs matching feature.

   **Backend changes:**
   - `link_queries.py`: `find_link()` uses `scalars().first()` to avoid `MultipleResultsFound` crash
   - `entities.py` (WorkOrder): `apply_pricing_snapshot()` now accumulates salary values instead of overwriting
   - `reconciliation.py`: unmatch subtracts salary on partial unmatch, resets fully when last link removed
   - `dto.py` / `domain.py` schemas: `UnmatchInput`/`UnmatchRequest` require both `work_order_id` and `trip_order_id`
   - `match_suggester.py`: scores based on unclaimed containers (excludes already-matched TOs)
   - `reconcile.py` router: batch-for-wo endpoint already existed; unmatch validation simplified

   **Frontend changes:**
   - `use-match-trip.ts`: refactored for multi-TO selection (`selectedTripIds[]`, `toggleTripSelection`, `getTripMatchStatus`)
   - `MatchTrip.tsx`: redesigned for 1:N flow (pick 1 WO → pick N TOs with checkboxes)
   - `MatchDetailPanel.tsx`: per-TO unmatch + suggestions for matched WOs + checkbox multi-select

   **Tests:**
   - `test_multi_match_reconciliation.py`: 9 integration tests covering AC-1 through AC-7
   - Full suite: 167 passed, 0 regressions

### ✅ Completed (2026-05-12) — Multi-Match FE Fixes (MULTI-MATCH-00..04)

Tasks resolved by autonomous cron agent:

1. **MULTI-MATCH-01** — Show suggestions for adding TOs to already-matched WO
   - Removed `isMatched` guard on `useSuggestMatches` in `MatchDetailPanel.tsx`
   - Added "Thêm đơn hàng khác cho chuyến này" section in matched mode
   - Backend `match_suggester.py` already supports MATCHED WOs (calculates unclaimed containers)

2. **MULTI-MATCH-02** — Fix broken navigation `/accountant/match` → `/accountant/match-trip`
   - `AccountantDashboard.tsx` had wrong route path (`/match/` vs `/match-trip/`)
   - Fixed both navigation calls (lines 298, 420)

3. **MULTI-MATCH-03** — Checkbox multi-select + batch action bar in MatchDetailPanel
   - Added `selectedToIds` state with toggle callback
   - Checkbox overlay on each `MatchCard` (both matched & unmatched modes)
   - Floating batch action bar calls `useBatchReconcileForWO` → `POST /reconcile/batch-for-wo`
   - Single "Ghép" buttons still work for one-by-one flow

4. **MULTI-MATCH-04** — Deploy pending (NOT executed, requires user approval)
   - Commits ahead of origin need `git push origin main && make push-all && make deploy-all`

5. **Test fix** — Updated TO status assertions MATCHED→COMPLETED
   - Commit `1d99b22` changed TO lifecycle: `PENDING → COMPLETED` on match (skipping MATCHED)
   - Fixed 5 test assertions across 3 files

**Key lesson:** TripOrder status goes directly to COMPLETED on match (not MATCHED). WorkOrder goes to MATCHED.

**Files modified:**
   - `frontend/src/pages/accountant/work-orders/MatchDetailPanel.tsx`
   - `frontend/src/pages/accountant/AccountantDashboard.tsx`
   - `tests/integration/test_multi_match_reconciliation.py`
   - `tests/integration/test_reconcile.py`
   - `tests/integration/test_workflows.py`

### ✅ Recently Completed (2026-05-11) — QA v8 Cycle

1. **QA v8 Full Audit + Fixes** — COMMITTED, PENDING DEPLOYMENT
   - QA found 4 issues (tasks 0059–0062)
   - All 4 fixed in commit `705d7eb`
   - **⚠️ DEPLOY NEEDED:** Run `make push-all && make deploy-all` from project root
   
   Fixes:
   - `task-0059`: Client "Loại" column fix (isCompany heuristic) — was already in code, deployment issue
   - `task-0060`: Driver earnings 403 — name collision in `salary.py` import shadowed by route handler; renamed import to `_get_driver_earnings_dep`
   - `task-0061`: Match "Tuyến đường" always "—" — `match_suggester.py` hardcoded `wo_route=None`; now builds from pickup/dropoff names
   - `task-0062`: Work order route truncated — changed `truncate` → `line-clamp-2` in `WorkOrderMasterList.tsx`

   Key files changed:
   - `backend/app/contexts/payroll/interface/routers/salary.py`
   - `backend/app/contexts/operations/infrastructure/match_suggester.py`
   - `frontend/src/pages/accountant/work-orders/WorkOrderMasterList.tsx`

### ✅ Recently Completed (2026-05-06)

1. **Tech Lead + QA Review** - COMPLETED
   - Document: `TECH_LEAD_QA_REVIEW.md`
   - Overall readiness: 50%
   - Critical bug identified: Driver login broken (missing React import)
   - Test coverage: <30% (needs improvement)
   - No CI/CD pipeline
   - No monitoring/alerting

2. **Database Transaction Fix** - COMPLETED
   - Added `await session.commit()` in `database.py`
   - Prevents silent rollbacks
   - Commit: c740100

### 🎯 Next Steps (Priority Order)

1. **🔴 DEPLOY PENDING COMMIT 705d7eb**
   - Run: `cd /Users/dev/Documents/projects/vantaiphucloc && make push-all && make deploy-all`
   - This deploys QA v8 fixes (driver earnings 403, match route display, etc.)
   - Then re-run QA scheduled task to verify fixes are live

2. **🔴 CRITICAL: Fix Driver Login Bug (if still present)**
   - File: `frontend/src/pages/DriverDashboard.tsx` (or similar)
   - Issue: Missing `import { useEffect } from 'react'`
   - Impact: BLOCKS all freight operations
   - Time: 15 minutes

2. **Increase Test Coverage**
   - Current: <30%
   - Target: >70%
   - Add API endpoint tests
   - Add frontend component tests
   - Add E2E tests with Playwright
   - Time: 2-3 weeks

3. **Implement CI/CD Pipeline**
   - Set up GitHub Actions or GitLab CI
   - Automated testing on push
   - Automated deployment
   - Time: 1-2 weeks

4. **Add Monitoring & Alerting**
   - Application metrics (Prometheus)
   - Error tracking (Sentry)
   - Log aggregation
   - Uptime monitoring
   - Time: 1 week

5. **Security Enhancements**
   - Add security headers
   - Implement rate limiting
   - Add CSRF protection
   - Time: 2-3 days

6. **Documentation**
   - API documentation update
   - Deployment guide
   - Troubleshooting guide
   - Time: 3-5 days

---

## 🎨 Style Guide

### Tech Stack

**Backend (Python):**
- **FastAPI** - Web framework
- **SQLAlchemy async** - ORM
- **PostgreSQL** - Primary database
- **Redis** - Caching & session storage
- **Celery** - Background tasks
- **python-statemachine** - Workflow engine
- **Pydantic** - Data validation
- **Alembic** - Database migrations
- **Uvicorn** - ASGI server

**Frontend (React):**
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router v6** - Routing
- **Axios** - HTTP client
- **@tanstack/react-query** - Data fetching

**Infrastructure:**
- **Docker** - Containerization
- **Docker Compose** - Local development
- **GitHub Actions** - CI/CD (to be added)

### Architecture

**DDD (Domain-Driven Design) - 6 Bounded Contexts:**

```
backend/app/
├── identity/          # Authentication & authorization
├── customer_pricing/  # Customer pricing management
├── operations/        # Trip operations & fleet management
├── fleet/            # Vehicle management
├── billing/          # Invoicing & payments
└── payroll/          # Driver payroll
```

**Workflow Engine:**
- 8-step trip status workflow
- State machine implemented with `python-statemachine`
- State stored in database (`state` and `event` columns)

**GPS Tracking:**
- Every 30 seconds via Capacitor native plugin
- Haversine formula for distance calculation
- Driver heartbeat: 2 minutes when idle
- Dashboard polling: 30 seconds (no WebSocket)

### Code Conventions

**Python Backend:**

**File Naming:**
- Use `snake_case` for files and directories
- Use `PascalCase` for classes
- Use `snake_case` for functions and variables

**Import Order:**
```python
# 1. Standard library
import os
from typing import Optional

# 2. Third-party
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

# 3. Local application
from app.identity.models import User
from app.operations.schemas import TripCreate
from app.core.database import get_db
```

**Function Definitions:**
```python
async def create_trip(
    trip_data: TripCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TripResponse:
    """Create a new trip.

    Args:
        trip_data: Trip creation data
        db: Database session
        current_user: Authenticated user

    Returns:
        Created trip data
    """
    # Implementation
    return trip_response
```

**Error Handling:**
```python
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

try:
    # Database operation
    result = await db.execute(query)
    await db.commit()
except IntegrityError as e:
    await db.rollback()
    raise HTTPException(
        status_code=400,
        detail="Duplicate entry"
    )
except Exception as e:
    await db.rollback()
    raise HTTPException(
        status_code=500,
        detail=f"Internal server error: {str(e)}"
    )
```

**Database Operations:**
```python
# Always use async/await
async def get_trip(trip_id: int, db: AsyncSession) -> Optional[Trip]:
    result = await db.execute(
        select(Trip).where(Trip.id == trip_id)
    )
    return result.scalar_one_or_none()

# Always commit after write operations
async def create_trip(trip_data: TripCreate, db: AsyncSession) -> Trip:
    trip = Trip(**trip_data.dict())
    db.add(trip)
    await db.commit()
    await db.refresh(trip)
    return trip

# Always rollback on error
try:
    db.add(trip)
    await db.commit()
except Exception:
    await db.rollback()
    raise
```

**Type Hints:**
```python
from typing import List, Optional, Dict, Any
from datetime import datetime

def get_active_trips(
    start_date: datetime,
    end_date: Optional[datetime] = None,
    limit: int = 100,
) -> List[Trip]:
    """Get active trips within date range."""
    pass
```

**React Frontend:**

**Component Structure:**
```tsx
// 1. Imports
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

// 2. Types
interface TripCardProps {
  trip: Trip;
  onStatusChange: (id: number, status: string) => void;
}

// 3. Component
export function TripCard({ trip, onStatusChange }: TripCardProps) {
  // 4. Hooks
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: driver } = useQuery({
    queryKey: ['driver', trip.driver_id],
    queryFn: () => api.drivers.get(trip.driver_id),
  });

  // 5. Handlers
  const handleStatusChange = (status: string) => {
    onStatusChange(trip.id, status);
  };

  // 6. Render
  return (
    <div className="border rounded-lg p-4">
      {/* JSX */}
    </div>
  );
}
```

**State Management:**
```tsx
// Use React Query for server state
const { data: trips, isLoading, error } = useQuery({
  queryKey: ['trips', { status: 'active' }],
  queryFn: () => api.trips.list({ status: 'active' }),
});

// Use local state for UI state
const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
```

### Linting & Formatting

**Python:**
```bash
# Format code
black app/ tests/

# Check linting
flake8 app/ tests/

# Type checking
mypy app/

# Sort imports
isort app/ tests/

# Run all checks
black app/ tests/ && flake8 app/ tests/ && mypy app/
```

**JavaScript/TypeScript:**
```bash
# Format code
pnpm format

# Check linting
pnpm lint

# Type check
pnpm type-check

# Run all checks
pnpm check
```

### Git Conventions

**Commit Message Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding tests
- `docs`: Documentation
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `driver`: Driver app changes
- `dashboard`: Dashboard changes

**Examples:**
```
feat(operations): implement trip status workflow

fix(driver): resolve useEffect missing import error

refactor(fleet): consolidate vehicle management logic

test(billing): add invoice generation tests
```

---

## 🛠️ Command Cheat Sheet

### Backend Development

**Install dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

**Start development server:**
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Run with Docker:**
```bash
cd backend
docker compose up -d
```

**Run migrations:**
```bash
cd backend
alembic upgrade head
```

**Create new migration:**
```bash
cd backend
alembic revision --autogenerate -m "description"
```

**Rollback migration:**
```bash
cd backend
alembic downgrade -1
```

**Run tests:**
```bash
cd backend
pytest

# With coverage
pytest --cov=app --cov-report=html
```

**Check code quality:**
```bash
cd backend
black app/ tests/
flake8 app/ tests/
mypy app/
isort app/ tests/
```

### Frontend Development

**Install dependencies:**
```bash
cd frontend
pnpm install
```

**Start development server:**
```bash
cd frontend
pnpm dev
```

**Build for production:**
```bash
cd frontend
pnpm build
```

**Run tests:**
```bash
cd frontend
pnpm test

# E2E tests
pnpm test:e2e
```

**Check code quality:**
```bash
cd frontend
pnpm lint
pnpm type-check
```

### Database

**Connect to PostgreSQL:**
```bash
docker exec -it ttransport-postgres psql -U ttransport -d ttransport
```

**Run seed data:**
```bash
cd backend
python scripts/seed_data.py
```

**Backup database:**
```bash
docker exec ttransport-postgres pg_dump -U ttransport ttransport > backup.sql
```

**Restore database:**
```bash
cat backup.sql | docker exec -i ttransport-postgres psql -U ttransport -d ttransport
```

### Background Tasks (Celery)

**Start Celery worker:**
```bash
cd backend
celery -A app.core.celery worker --loglevel=info
```

**Start Celery beat (scheduler):**
```bash
cd backend
celery -A app.core.celery beat --loglevel=info
```

**Monitor Celery:**
```bash
# If using Flower
celery -A app.core.celery flower
```

### Docker Commands

**Start all services:**
```bash
docker compose up -d
```

**Stop all services:**
```bash
docker compose down
```

**View logs:**
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

**Rebuild services:**
```bash
docker compose up -d --build
```

**Remove all volumes:**
```bash
docker compose down -v
```

### Useful Aliases

```bash
# Backend aliases
alias tt-dev='cd ~/vantaiphucloc/backend && uvicorn app.main:app --reload'
alias tt-migrate='cd ~/vantaiphucloc/backend && alembic upgrade head'
alias tt-test='cd ~/vantaiphucloc/backend && pytest'
alias tt-lint='cd ~/vantaiphucloc/backend && black app/ tests/ && flake8 app/ tests/'

# Frontend aliases
alias tt-fe-dev='cd ~/vantaiphucloc/frontend && pnpm dev'
alias tt-fe-build='cd ~/vantaiphucloc/frontend && pnpm build'
alias tt-fe-test='cd ~/vantaiphucloc/frontend && pnpm test'

# Docker aliases
alias tt-up='cd ~/vantaiphucloc && docker compose up -d'
alias tt-down='cd ~/vantaiphucloc && docker compose down'
alias tt-logs='cd ~/vantaiphucloc && docker compose logs -f'
```

---

## 📚 Key Files & Patterns

### Important Files

**Backend:**
- `backend/app/main.py` - FastAPI application entry point
- `backend/app/core/database.py` - Database configuration
- `backend/app/core/config.py` - Configuration settings
- `backend/alembic.ini` - Alembic configuration
- `backend/requirements.txt` - Python dependencies
- `backend/Dockerfile` - Docker image definition
- `backend/docker-compose.yml` - Docker services

**Frontend:**
- `frontend/src/main.tsx` - React entry point
- `frontend/src/App.tsx` - Main app component
- `frontend/vite.config.ts` - Vite configuration
- `frontend/package.json` - Dependencies
- `frontend/Dockerfile` - Docker image definition

**Documentation:**
- `TECH_LEAD_QA_REVIEW.md` - Comprehensive review
- `requirements.md` - Feature requirements
- `user-stories.md` - User stories
- `scenarios.md` - Test scenarios

### Common Patterns

**1. FastAPI Route with Dependencies:**
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/trips", tags=["trips"])

@router.post("/", response_model=TripResponse)
async def create_trip(
    trip_data: TripCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TripResponse:
    """Create a new trip."""
    trip = Trip(**trip_data.dict())
    db.add(trip)
    await db.commit()
    await db.refresh(trip)
    return trip
```

**2. SQLAlchemy Async Query:**
```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

async def get_active_trips(
    db: AsyncSession,
    limit: int = 100,
) -> List[Trip]:
    """Get active trips."""
    result = await db.execute(
        select(Trip)
        .where(Trip.status == "active")
        .limit(limit)
    )
    return result.scalars().all()
```

**3. Pydantic Schema:**
```python
from pydantic import BaseModel, Field, validator
from datetime import datetime

class TripCreate(BaseModel):
    origin: str = Field(..., min_length=1, max_length=255)
    destination: str = Field(..., min_length=1, max_length=255)
    distance_km: float = Field(..., gt=0)

    @validator('distance_km')
    def validate_distance(cls, v):
        if v > 10000:
            raise ValueError('Distance cannot exceed 10000 km')
        return v

class TripResponse(BaseModel):
    id: int
    origin: str
    destination: str
    distance_km: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
```

**4. React Query Hook:**
```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useTrips(filters?: TripFilters) {
  return useQuery({
    queryKey: ['trips', filters],
    queryFn: () => api.trips.list(filters),
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.trips.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}
```

**5. State Machine Transition:**
```python
from statemachine import StateMachine, State

class TripStateMachine(StateMachine):
    """Trip workflow state machine."""

    # States
    draft = State('draft', initial=True)
    assigned = State('assigned')
    in_transit = State('in_transit')
    delivered = State('delivered')
    cancelled = State('cancelled')

    # Transitions
    assign = draft.to(assigned)
    start_transit = assigned.to(in_transit)
    complete_delivery = in_transit.to(delivered)
    cancel = draft.to(cancelled) | assigned.to(cancelled)

# Usage in model
class Trip(Base):
    __tablename__ = "trips"

    status = Column(String(50), default='draft')

    def transition_to(self, event: str):
        """Transition to new state."""
        sm = TripStateMachine(initial_state=self.status)
        getattr(sm, event)()
        self.status = sm.state
```

---

## 🔍 Troubleshooting

### Common Issues

**1. Driver login broken (useEffect error):**
```bash
# Find the file
grep -r "useEffect" frontend/src/pages/

# Check for missing imports
grep -B5 "useEffect" frontend/src/pages/Driver*.tsx

# Fix: Add import
# import { useEffect } from 'react';
```

**2. Database connection issues:**
```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Check logs
docker compose logs postgres

# Restart PostgreSQL
docker compose restart postgres

# Check connection string
cat backend/.env | grep DATABASE_URL
```

**3. Migrations not applying:**
```bash
# Check migration status
cd backend
alembic current

# Check migration history
alembic history

# Force apply specific migration
alembic upgrade <revision>
```

**4. Celery tasks not processing:**
```bash
# Check if worker is running
ps aux | grep celery

# Check Redis connection
docker compose exec redis redis-cli ping

# View queued tasks
docker compose exec redis redis-cli LRANGE celery 0 -1
```

**5. Frontend build errors:**
```bash
# Clear cache
cd frontend
rm -rf node_modules .vite pnpm-lock.yaml
pnpm install

# Check TypeScript errors
pnpm type-check

# Check for missing imports
grep -r "useEffect" src/ | grep -v "import"
```

---

## 📖 Additional Resources

### Documentation
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Async](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Docker Documentation](https://docs.docker.com/)

### Internal Documentation
- `TECH_LEAD_QA_REVIEW.md` - Comprehensive tech review
- `requirements.md` - Feature requirements
- `user-stories.md` - User stories
- `scenarios.md` - Test scenarios (33 scenarios)

---

## 🔄 Updating This File

**When to update CLAUDE.md:**

1. **After completing major features:** Update "Project State" section
2. **After architectural changes:** Update "Architecture Patterns" section
3. **After adding new commands:** Update "Command Cheat Sheet" section
4. **After changing conventions:** Update "Style Guide" section
5. **After discovering new patterns:** Add to "Common Patterns" section

**Template for updates:**

```markdown
### ✅ Recently Completed (YYYY-MM-DD)

1. **Feature Name** - Status
   - Key files changed
   - Important notes

### 🎯 Next Steps

1. **Next Feature** - Priority
   - Description
```

---

### ✅ Completed (2026-05-12) — Auto-Match Preview + Confirm + Driver Auto-Fill

Both specs fully implemented in codebase prior to this cron run.

**Auto-Match Interactive Feedback (preview + confirm flow):**
- Backend: `POST /reconcile/auto-match` is read-only preview, `POST /reconcile/auto-match/confirm` commits selected pairs
- Frontend: `AutoMatchDialog.tsx` renders candidates with checkboxes, criteria chips, score badges, confirm action
- Fix applied: `test_reconcile.py` assertions updated from old shape (`auto_matched`) to new shape (`candidates`)
- Files: `reconcile.py`, `AutoMatchDialog.tsx`, `WorkOrderList.tsx`, `tripOrders.api.ts`, `use-queries.ts`

**Driver Auto-Fill Personalization (Phase 1 + GPS bonus):**
- Backend: `GET /drivers/me/suggested-routes` — frequency × recency scoring with GPS proximity bonus, global popular fallback
- Frontend: `RecentTripSuggestions` component with source badges (Quen thuộc/Gần đây/Phổ biến), loading skeleton
- GPS: Auto-requested on page mount with graceful fallback
- Files: `suggested_routes.py`, `useCreateWorkOrder.ts`, `RecentTripSuggestions.tsx`, `workOrders.api.ts`

---

**Last Updated:** 2026-05-12
**Maintained By:** Orbit (AI Agent)
**Version:** 1.0
