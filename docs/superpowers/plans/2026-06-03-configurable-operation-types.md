# Configurable Operation Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make operation types (tác nghiệp) configurable via an admin settings page instead of hardcoded.

**Architecture:** New `operation_types` DB table + flat backend router (no DDD bounded context) + simple frontend CRUD settings page. Existing hardcoded constants refactored to read from API.

**Tech Stack:** SQLAlchemy/Alembic (backend), FastAPI router, React Query hooks, React settings page

---

## File Structure

### New files
| File | Responsibility |
|---|---|
| `backend/alembic/versions/0007_operation_types.py` | Migration: create `operation_types` table + seed data |
| `backend/app/models/operation_type.py` | SQLAlchemy model for `operation_types` |
| `backend/app/contexts/platform/interface/routers/operation_types.py` | CRUD router (GET/POST/PUT/DELETE) |
| `frontend/src/services/api/operationTypes.api.ts` | API client functions |
| `frontend/src/hooks/queries/operation-types.ts` | React Query hooks |
| `frontend/src/pages/accountant/settings/OperationTypesPage.tsx` | Settings page (list + add/edit/delete) |

### Modified files
| File | Change |
|---|---|
| `backend/app/models/__init__.py` | Import new model so Alembic detects it |
| `backend/app/api/v1/router.py` | Register operation_types router |
| `frontend/src/data/domain.ts` | Add `OperationType` interface; `getWorkTypeLabel` reads from cache |
| `frontend/src/hooks/query-keys.ts` | Add `operationTypes` key + invalidation helper |
| `frontend/src/services/api/index.ts` | Register operationTypes API functions |
| `frontend/src/routes.ts` | Add lazy import for `OperationTypesPage` |
| `frontend/src/router.ts` | Add route for settings/tac-nghiep |
| `frontend/src/pages/accountant/SettingsPage.tsx` | Add card for "Loại tác nghiệp" |

---

## Task 1: Backend — DB Model + Migration

**Files:**
- Create: `backend/app/models/operation_type.py`
- Create: `backend/alembic/versions/0007_operation_types.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Create the SQLAlchemy model**

Create `backend/app/models/operation_type.py`:

```python
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from app.database import Base


class OperationType(Base):
    """Configurable work/operation types (tác nghiệp)."""
    __tablename__ = "operation_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)   # e.g. "ĐÓNG KHO"
    label = Column(String(50), nullable=False)                # e.g. "Đóng kho"
    is_active = Column(Boolean, nullable=False, default=True)
```

- [ ] **Step 2: Register model in `__init__.py`**

Add import in `backend/app/models/__init__.py`:

```python
from app.models.operation_type import OperationType  # noqa: F401
```

- [ ] **Step 3: Create Alembic migration**

```bash
cd backend && alembic revision --autogenerate -m "add operation_types table"
```

Then edit the generated migration to include seed data in `upgrade()`:

```python
def upgrade() -> None:
    op.create_table(
        "operation_types",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("label", sa.String(length=50), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_operation_types_id"), "operation_types", ["id"], unique=False)

    # Seed existing operation types
    op.bulk_insert(
        sa.table(
            "operation_types",
            sa.column("id", sa.Integer),
            sa.column("name", sa.String),
            sa.column("label", sa.String),
            sa.column("is_active", sa.Boolean),
        ),
        [
            {"id": 1, "name": "XUẤT/NHẬP TÀU", "label": "Xuất / Nhập tàu", "is_active": True},
            {"id": 2, "name": "CHUYỂN BÃI", "label": "Chuyển bãi", "is_active": True},
            {"id": 3, "name": "ĐÓNG KHO", "label": "Đóng kho", "is_active": True},
            {"id": 4, "name": "LẤY VỎ HẠ HÀNG", "label": "Lấy vỏ hạ hàng", "is_active": True},
            {"id": 5, "name": "CHẠY SÀ LAN", "label": "Chạy sà lan", "is_active": True},
        ],
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_operation_types_id"), table_name="operation_types")
    op.drop_table("operation_types")
```

- [ ] **Step 4: Run migration**

```bash
cd backend && alembic upgrade head
```

Expected: Migration runs, `operation_types` table created with 5 rows.

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/operation_type.py backend/app/models/__init__.py backend/alembic/versions/0007_operation_types.py
git commit -m "feat: add operation_types table with seed data"
```

---

## Task 2: Backend — CRUD Router

**Files:**
- Create: `backend/app/contexts/platform/interface/routers/operation_types.py`
- Modify: `backend/app/api/v1/router.py`

- [ ] **Step 1: Create the router**

Create `backend/app/contexts/platform/interface/routers/operation_types.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from app.core.deps import get_current_user
from app.database import get_session
from app.models.operation_type import OperationType
from app.models.base import User

router = APIRouter(prefix="/operation-types", tags=["operation-types"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class OperationTypeOut(BaseModel):
    id: int
    name: str
    label: str
    is_active: bool

    model_config = {"from_attributes": True}


class OperationTypeCreate(BaseModel):
    name: str
    label: str


class OperationTypeUpdate(BaseModel):
    name: str | None = None
    label: str | None = None
    is_active: bool | None = None


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", response_model=list[OperationTypeOut])
async def list_operation_types(
    active_only: bool = False,
    _user: User = Depends(get_current_user),
):
    """List all operation types. Pass ?active_only=true to filter."""
    with get_session() as s:
        stmt = select(OperationType)
        if active_only:
            stmt = stmt.where(OperationType.is_active == True)
        stmt = stmt.order_by(OperationType.id)
        rows = s.execute(stmt).scalars().all()
        return rows


@router.post("", response_model=OperationTypeOut, status_code=201)
async def create_operation_type(
    body: OperationTypeCreate,
    _user: User = Depends(get_current_user),
):
    with get_session() as s:
        # Check duplicate name
        exists = s.execute(
            select(OperationType).where(OperationType.name == body.name)
        ).scalar_one_or_none()
        if exists:
            raise HTTPException(409, f"Tác nghiệp '{body.name}' đã tồn tại")
        obj = OperationType(name=body.name, label=body.label)
        s.add(obj)
        s.commit()
        s.refresh(obj)
        return obj


@router.put("/{type_id}", response_model=OperationTypeOut)
async def update_operation_type(
    type_id: int,
    body: OperationTypeUpdate,
    _user: User = Depends(get_current_user),
):
    with get_session() as s:
        obj = s.get(OperationType, type_id)
        if not obj:
            raise HTTPException(404, "Không tìm thấy tác nghiệp")
        if body.name is not None:
            obj.name = body.name
        if body.label is not None:
            obj.label = body.label
        if body.is_active is not None:
            obj.is_active = body.is_active
        s.commit()
        s.refresh(obj)
        return obj


@router.delete("/{type_id}")
async def delete_operation_type(
    type_id: int,
    _user: User = Depends(get_current_user),
):
    with get_session() as s:
        obj = s.get(OperationType, type_id)
        if not obj:
            raise HTTPException(404, "Không tìm thấy tác nghiệp")

        # Check if used in any trip or pricing
        from app.models.domain import DeliveredTrip, BookedTrip, RoutePricing, VendorRoutePricing
        name = obj.name
        for Model, label in [
            (DeliveredTrip, "chuyến đã giao"),
            (BookedTrip, "chuyến đặt"),
            (RoutePricing, "cước tuyến"),
            (VendorRoutePricing, "cước xe ngoài"),
        ]:
            count = s.execute(
                select(func.count()).select_from(Model).where(Model.work_type == name)
            ).scalar()
            if count > 0:
                raise HTTPException(
                    409,
                    f"Không thể xóa — đang được dùng trong {count} {label}. "
                    f"Ẩn thay vì xóa.",
                )
        s.delete(obj)
        s.commit()
        return {"success": True}
```

- [ ] **Step 2: Register router in API v1**

In `backend/app/api/v1/router.py`, add:

```python
from app.contexts.platform.interface.routers.operation_types import router as operation_types_router
```

And add to the router body:

```python
router.include_router(operation_types_router)
```

- [ ] **Step 3: Verify backend starts**

```bash
cd backend && python -c "from app.api.v1.router import router; print('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/contexts/platform/interface/routers/operation_types.py backend/app/api/v1/router.py
git commit -m "feat: add CRUD API for operation types"
```

---

## Task 3: Frontend — API + Hooks

**Files:**
- Create: `frontend/src/services/api/operationTypes.api.ts`
- Create: `frontend/src/hooks/queries/operation-types.ts`
- Modify: `frontend/src/hooks/query-keys.ts`
- Modify: `frontend/src/services/api/index.ts`

- [ ] **Step 1: Create API service**

Create `frontend/src/services/api/operationTypes.api.ts`:

```typescript
import { api } from './client'
import { toCamel, toSnake, ok, fail } from './utils'
import type { ApiResponse } from '@/data/domain'

export interface OperationType {
  id: number
  name: string
  label: string
  isActive: boolean
}

export async function getOperationTypes(): Promise<ApiResponse<OperationType[]>> {
  try {
    const res = await api.get('/operation-types')
    return ok(toCamel<OperationType[]>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function createOperationType(data: { name: string; label: string }): Promise<ApiResponse<OperationType>> {
  try {
    const res = await api.post('/operation-types', toSnake(data))
    return ok(toCamel<OperationType>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateOperationType(id: number, data: { name?: string; label?: string; isActive?: boolean }): Promise<ApiResponse<OperationType>> {
  try {
    const res = await api.put(`/operation-types/${id}`, toSnake(data))
    return ok(toCamel<OperationType>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function deleteOperationType(id: number): Promise<ApiResponse<{ success: boolean }>> {
  try {
    await api.delete(`/operation-types/${id}`)
    return ok({ success: true })
  } catch (err) {
    return fail(err)
  }
}
```

- [ ] **Step 2: Add query key + invalidation**

In `frontend/src/hooks/query-keys.ts`, add to `queryKeys` object:

```typescript
operationTypes: ['operation-types'] as const,
```

Add new invalidation function at the bottom:

```typescript
export function invalidateOperationTypeDeps(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.operationTypes })
  // Downstream consumers that filter by work_type
  qc.invalidateQueries({ queryKey: queryKeys.routePricings })
  qc.invalidateQueries({ queryKey: queryKeys.vendorRoutePricings })
}
```

- [ ] **Step 3: Create query hooks**

Create `frontend/src/hooks/queries/operation-types.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys, invalidateOperationTypeDeps } from '../query-keys'
import type { ApiResponse } from '@/data/domain'
import type { OperationType } from '@/services/api/operationTypes.api'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useOperationTypes() {
  return useQuery({
    queryKey: queryKeys.operationTypes,
    queryFn: async () => {
      const res = await apiClient.getOperationTypes()
      return res.success ? res.data : []
    },
    staleTime: 5 * 60 * 1000, // 5 min — this data rarely changes
  })
}

export function useCreateOperationType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; label: string }) =>
      apiClient.createOperationType(data).then(unwrap),
    onSuccess: () => { invalidateOperationTypeDeps(qc) },
  })
}

export function useUpdateOperationType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; label?: string; isActive?: boolean } }) =>
      apiClient.updateOperationType(id, data).then(unwrap),
    onSuccess: () => { invalidateOperationTypeDeps(qc) },
  })
}

export function useDeleteOperationType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.deleteOperationType(id).then(unwrap),
    onSuccess: () => { invalidateOperationTypeDeps(qc) },
  })
}
```

- [ ] **Step 4: Register in API barrel**

In `frontend/src/services/api/index.ts`:

Add import:
```typescript
import * as operationTypesApi from './operationTypes.api'
```

Add to `apiClient` object:
```typescript
// Operation Types (Tác nghiệp)
getOperationTypes: operationTypesApi.getOperationTypes,
createOperationType: operationTypesApi.createOperationType,
updateOperationType: operationTypesApi.updateOperationType,
deleteOperationType: operationTypesApi.deleteOperationType,
```

- [ ] **Step 5: Verify no TypeScript errors**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors related to the new files.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/services/api/operationTypes.api.ts frontend/src/hooks/queries/operation-types.ts frontend/src/hooks/query-keys.ts frontend/src/services/api/index.ts
git commit -m "feat: add frontend API + hooks for operation types"
```

---

## Task 4: Frontend — Update domain.ts + ContainerTypeGrid

**Files:**
- Modify: `frontend/src/data/domain.ts`
- Modify: `frontend/src/components/shared/data-display/ContainerTypeGrid/ContainerTypeGrid.tsx`

- [ ] **Step 1: Update domain.ts**

The hardcoded `WORK_TYPES` and `WORK_TYPE_LABELS` remain as **fallback defaults**. The `ContainerTypeGrid` will accept operation types as a prop so it can use API data when available.

Add `OperationType` interface to `frontend/src/data/domain.ts`:

```typescript
// ─── Operation Type (from API) ────────────────────────────────────────────────
export interface OperationType {
  id: number
  name: string
  label: string
  isActive: boolean
}
```

- [ ] **Step 2: Update ContainerTypeGrid to accept optional operation types**

In `ContainerTypeGrid.tsx`, add an optional `operationTypes` prop. When provided, use it instead of the hardcoded `OPERATION_TYPES`:

```typescript
import { useState, useRef, useEffect, useMemo } from 'react'
import { CheckCircle, Plus } from 'lucide-react'
import {
  CONT_TYPES, WORK_TYPE_LABELS,
  type ContType, type WorkType, type OperationType,
} from '@/data/domain'
import { hapticTap } from '@/lib/haptic'
import { playTick } from '@/lib/sound'

interface ContainerTypeGridProps {
  contType: ContType | null
  workType: WorkType | null
  onContTypeChange: (next: ContType | null) => void
  onWorkTypeChange: (next: WorkType | null) => void
  contTypeError?: boolean
  workTypeError?: boolean
  /** Dynamic operation types from API. Falls back to hardcoded WORK_TYPES. */
  operationTypes?: OperationType[]
}

export function ContainerTypeGrid({
  contType, workType,
  onContTypeChange, onWorkTypeChange,
  contTypeError, workTypeError,
  operationTypes,
}: ContainerTypeGridProps) {
  // ... existing state/handlers unchanged ...

  // Use API data when available, fallback to hardcoded
  const CONT_TYPE_SET: ReadonlySet<string> = new Set(CONT_TYPES)
  const activeOps = useMemo(() => {
    if (operationTypes && operationTypes.length > 0) {
      return operationTypes.filter(o => o.isActive).map(o => o.name)
    }
    // fallback: hardcoded
    return WORK_TYPES.filter(w => !CONT_TYPE_SET.has(w))
  }, [operationTypes])

  const labelFor = (wt: string): string => {
    if (operationTypes) {
      const found = operationTypes.find(o => o.name === wt)
      if (found) return found.label
    }
    return WORK_TYPE_LABELS[wt as WorkType] ?? wt
  }

  // Replace all references to `OPERATION_TYPES` with `activeOps`
  // Replace `WORK_TYPE_LABELS[wt]` with `labelFor(wt)`
  // ... rest of component stays the same, just use activeOps/labelFor ...
```

- [ ] **Step 3: Pass operationTypes in CreateDeliveredTrip**

In `frontend/src/pages/driver/CreateDeliveredTrip.tsx`, import `useOperationTypes` and pass to `ContainerTypeGrid`:

```typescript
import { useOperationTypes } from '@/hooks/queries/operation-types'

// inside component:
const { data: operationTypes } = useOperationTypes()

// in JSX:
<ContainerTypeGrid
  contType={contType}
  workType={workType}
  onContTypeChange={setContType}
  onWorkTypeChange={setWorkType}
  operationTypes={operationTypes}
/>
```

- [ ] **Step 4: Do the same for EditDeliveredTrip.tsx**

Same pattern — import hook, pass prop.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/data/domain.ts frontend/src/components/shared/data-display/ContainerTypeGrid/ContainerTypeGrid.tsx frontend/src/pages/driver/CreateDeliveredTrip.tsx frontend/src/pages/driver/EditDeliveredTrip.tsx
git commit -m "feat: ContainerTypeGrid reads operation types from API"
```

---

## Task 5: Frontend — Settings Page + Route

**Files:**
- Create: `frontend/src/pages/accountant/settings/OperationTypesPage.tsx`
- Modify: `frontend/src/pages/accountant/SettingsPage.tsx`
- Modify: `frontend/src/routes.ts`
- Modify: `frontend/src/router.ts`

- [ ] **Step 1: Create OperationTypesPage**

Create `frontend/src/pages/accountant/settings/OperationTypesPage.tsx`:

Simple list page with inline add/edit. Follow SalaryPeriodSettings pattern (SettingsPageLayout wrapper). Use `useOperationTypes`, `useCreateOperationType`, `useUpdateOperationType`, `useDeleteOperationType` hooks.

UI layout:
- PageHeader "Loại tác nghiệp" with subtitle "Quản lý các loại tác nghiệp trong hệ thống"
- List of rows: name, label, active toggle, edit/delete buttons
- "Thêm tác nghiệp" button opens a Dialog with name + label fields
- Toggle active via `useUpdateOperationType({ id, data: { isActive: !prev } })`
- Delete via confirm dialog — show error toast if 409 (in use)

Keep it minimal — no pagination, no search. ~10 items max.

- [ ] **Step 2: Add card to SettingsPage**

In `frontend/src/pages/accountant/SettingsPage.tsx`, add to `SETTINGS_SECTIONS`:

```typescript
{
  key: 'operation-types',
  label: 'Loại tác nghiệp',
  desc: 'Quản lý các loại tác nghiệp (Xuất/Nhập tàu, Chuyển bãi, Đóng kho...)',
  icon: Wrench,   // from lucide-react
  path: '/accountant/settings/tac-nghiep',
  color: 'var(--theme-status-success)',
},
```

- [ ] **Step 3: Add route in routes.ts**

```typescript
export const OperationTypesPage = lazy(() => import('@/pages/accountant/settings/OperationTypesPage').then(m => ({ default: m.OperationTypesPage })))
```

- [ ] **Step 4: Add route in router.ts**

Under accountant children:

```typescript
{ path: 'settings/tac-nghiep', element: ebc('OperationTypesPage', h(Lazy, { component: R.OperationTypesPage })) },
```

- [ ] **Step 5: Verify no TypeScript errors**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/accountant/settings/OperationTypesPage.tsx frontend/src/pages/accountant/SettingsPage.tsx frontend/src/routes.ts frontend/src/router.ts
git commit -m "feat: add operation types settings page with CRUD"
```

---

## Task 6: Backend — Update hardcoded validators to read from DB

**Files:**
- Modify: `backend/app/contexts/operations/domain/value_objects.py`
- Modify: `backend/app/contexts/route_pricing/domain/value_objects.py`
- Modify: `backend/app/contexts/route_pricing/interface/schemas.py`
- Modify: `backend/app/contexts/vendor_route_pricing/interface/schemas.py`

- [ ] **Step 1: Replace `KNOWN_WORK_TYPES` with DB query function**

In `backend/app/contexts/operations/domain/value_objects.py`, replace the hardcoded set with a function:

```python
from sqlalchemy import select
from app.models.operation_type import OperationType
from app.database import get_session


def get_active_work_type_names() -> set[str]:
    """Fetch active operation type names from DB."""
    with get_session() as s:
        rows = s.execute(
            select(OperationType.name).where(OperationType.is_active == True)
        ).scalars().all()
        return set(rows) | {"E20", "E40", "F20", "F40"}  # always include container types
```

- [ ] **Step 2: Replace `VALID_WORK_TYPES` similarly**

In `backend/app/contexts/route_pricing/domain/value_objects.py`, replace frozenset with function:

```python
def get_valid_work_types() -> frozenset[str]:
    """Fetch active operation type names from DB."""
    from app.models.operation_type import OperationType
    from sqlalchemy import select
    from app.database import get_session
    with get_session() as s:
        rows = s.execute(
            select(OperationType.name).where(OperationType.is_active == True)
        ).scalars().all()
        return frozenset(rows)
```

Update `validate_work_type()` to call `get_valid_work_types()` instead of referencing `VALID_WORK_TYPES`.

- [ ] **Step 3: Replace `WorkTypeLiteral` with `str` + validation**

In `backend/app/contexts/route_pricing/interface/schemas.py`, replace:

```python
# Before:
WorkTypeLiteral = Literal["XUẤT/NHẬP TÀU", "CHUYỂN BÃI", ...]

# After:
WorkTypeLiteral = str  # validated at runtime via get_valid_work_types()
```

Same change in `backend/app/contexts/vendor_route_pricing/interface/schemas.py`.

- [ ] **Step 4: Verify backend starts**

```bash
cd backend && python -c "from app.api.v1.router import router; print('OK')"
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/contexts/operations/domain/value_objects.py backend/app/contexts/route_pricing/domain/value_objects.py backend/app/contexts/route_pricing/interface/schemas.py backend/app/contexts/vendor_route_pricing/interface/schemas.py
git commit -m "refactor: backend reads operation types from DB instead of hardcoded sets"
```

---

## Verification

1. **Backend**: `cd backend && alembic upgrade head` → migration runs, table seeded
2. **API test**: `curl -H "Authorization: Bearer <token>" localhost:8000/operation-types` → returns 5 items
3. **Frontend**: Navigate to `/accountant/settings/tac-nghiep` → shows list of 5 operation types
4. **CRUD test**: Add a new type → appears in list → toggle active → delete (should fail if in use)
5. **Driver flow**: Go to driver create trip → ContainerTypeGrid shows operation types from API
6. **Existing data**: Existing trips with hardcoded work_type values still display correctly
