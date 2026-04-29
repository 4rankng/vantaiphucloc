# Re-architecture Plan: Vận Tải Phúc Lộc

> Date: 2026-04-28
> Status: DRAFT — awaiting Saber's approval before execution

---

## Part 1: Remove Multi-Tenancy

### Why
This is a single-company app. Phúc Lộc is the only company. The `company_id` FK on every table, the Company model, and all `.where(X.company_id == current_user.company_id)` filters add complexity for zero benefit.

### What Changes

#### Backend — Models
| Change | Files |
|---|---|
| Delete `Company` model entirely | `models/domain.py` |
| Remove `company_id` column from **all** domain models: Client, Route, Pricing, PricingLine, WorkOrder, WorkOrderContainer, TripOrder, TripOrderWorkOrder, SalaryPeriod, SalaryPeriodConfig | `models/domain.py` |
| Remove `company_id` from User model | `models/base.py` |
| Remove `company_id` from User indexes | `models/base.py` |

#### Backend — Schemas
| Change | Files |
|---|---|
| Remove `company_id` from `UserOut`, `UserCreate`, `UserUpdate` | `schemas/base.py` |
| Remove `company_id` from `LoginResponse` token data | `api/v1/auth.py` |

#### Backend — API Endpoints (12 files)
Every endpoint that does `.where(X.company_id == current_user.company_id)` just drops the filter. Creation drops the `company_id=...` kwarg. Affected:
- `clients.py`, `drivers.py`, `routes.py`, `pricings.py`, `work_orders.py`, `trip_orders.py`, `reconcile.py`, `salary.py`, `salary_config.py`

#### Backend — Cache
| Change | Files |
|---|---|
| Cache key pattern changes from `cache:{ns}:c{company_id}:{id}` → `cache:{ns}:{id}` | `core/cache.py` |
| All callers drop `company_id` arg | all 6 endpoint files + `pricing_service.py` |

#### Backend — Workers & Services
| Change | Files |
|---|---|
| `salary_service.py`: drop `company_id` param | `services/salary_service.py` |
| `pricing_service.py`: drop `company_id` param | `services/pricing_service.py` |
| `workers/tasks/salary.py`: drop `company_id` param | `workers/tasks/salary.py` |
| `workers/tasks/reports.py`: drop `company_id` param | `workers/tasks/reports.py` |
| `workers/__init__.py`: simplify `salary_recalc_job_id` | `workers/__init__.py` |

#### Backend — Seed
| Change | Files |
|---|---|
| Remove Company creation; just create admin user directly | `seed.py` |

#### Migration
- New Alembic migration `006_drop_multi_tenant.py`:
  - Drop all `company_id` FKs and columns from all tables
  - Drop `companies` table
  - Remove compound indexes involving `company_id`

#### Frontend
| Change | Files |
|---|---|
| Remove `companyId` from `UserInfo` interface | `contexts/AuthContext.tsx` |
| Remove `company_id` from login response parsing | `contexts/AuthContext.tsx` |
| Remove any `companyId` references from domain types | `data/domain.ts` |

**Impact**: ~113 lines removed from backend, simpler queries, faster development.

---

## Part 2: Backend-Driven Frontend (Force Update)

### Problem
PWA assets are cached by the service worker. When you deploy a new version, users still see the old cached version until they manually refresh or clear cache. Mobile apps solve this with "force update" — the app checks a version endpoint and forces the user to update.

### Solution: Version Check + SW Skip Waiting

#### Architecture

```
┌──────────────┐         ┌──────────────┐
│   Frontend   │───────▶ │   Backend    │
│  (PWA/SPA)   │  GET    │   FastAPI    │
│              │ /api/v1  │              │
│              │ /version │              │
└──────────────┘         └──────────────┘
       │
       │ Service Worker
       │ (precache + stale-while-revalidate)
       ▼
  Browser Cache
```

**Flow:**
1. Backend exposes `GET /api/v1/version` → `{ version: "2026.04.28.1", minimum_version: "2026.04.22.0" }`
2. Frontend calls `/version` on load + every 5 minutes
3. If `current_version < minimum_version` → **hard update required**: show full-screen overlay "Đang cập nhật..." → `caches.delete-all()` → `location.reload(true)`
4. If `current_version < latest_version` → **soft update**: service worker calls `skipWaiting()` + `clients.claim()` on next navigation, user gets new version seamlessly
5. Version string is set in backend's `config.py` (from env var `APP_VERSION`) and also baked into frontend `package.json` at build time

#### Backend Changes

**`config.py`** — add version config:
```python
APP_VERSION: str = "2026.04.28.1"
MINIMUM_VERSION: str = "2026.04.22.0"   # oldest version allowed to run
```

**`router.py`** — add version endpoint:
```python
@router.get("/version")
async def get_version():
    return {
        "version": settings.APP_VERSION,
        "minimum_version": settings.MINIMUM_VERSION,
    }
```

No auth required — version check must work even with expired tokens.

#### Frontend Changes

**1. Version utilities** — `src/lib/version.ts` (new):
```ts
const CURRENT_VERSION = __APP_VERSION__  // injected by Vite

export async function checkVersion() {
  const res = await fetch('/api/v1/version')
  const { version, minimum_version } = await res.json()
  
  if (semverLt(CURRENT_VERSION, minimum_version)) return 'hard-update'
  if (semverLt(CURRENT_VERSION, version)) return 'soft-update'
  return 'up-to-date'
}
```

**2. Vite config** — inject version at build time:
```ts
define: {
  __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
}
```

**3. Service Worker** — `sw.ts` changes:
- Listen for `SKIP_WAITING` message → `self.skipWaiting()`
- On `ACTIVATE` → `clients.claim()` (already happening via workbox)
- Add handler for `FORCE_UPDATE` message → delete all caches, tell all clients to reload

**4. App.tsx** — add version check loop:
```tsx
// On mount + every 5 min
useEffect(() => {
  const check = async () => {
    const status = await checkVersion()
    if (status === 'hard-update') {
      // Show full-screen overlay
      setForceUpdate(true)
      // Delete all caches then reload
      if ('caches' in window) {
        const names = await caches.keys()
        await Promise.all(names.map(n => caches.delete(n)))
      }
      navigator.serviceWorker?.controller?.postMessage({ type: 'FORCE_UPDATE' })
      setTimeout(() => location.reload(), 1500)
    } else if (status === 'soft-update') {
      navigator.serviceWorker?.controller?.postMessage({ type: 'SKIP_WAITING' })
    }
  }
  check()
  const interval = setInterval(check, 5 * 60 * 1000)
  return () => clearInterval(interval)
}, [])
```

**5. ForceUpdateOverlay** — `src/components/shared/ForceUpdateOverlay.tsx` (new):
Full-screen Vietnamese overlay "Đang cập nhật ứng dụng..." with spinner. Shown during hard update.

### Version Scheme
Format: `YYYY.MM.DD.N` (date-based, like package.json already has `2026.04.22.18`)
- Set `APP_VERSION` in backend `.env` at deploy time
- Frontend version comes from `package.json` (set by CI)
- To force all users to update: raise `MINIMUM_VERSION` in backend `.env`

---

## Execution Order

### Phase A: Remove Multi-Tenancy
1. Backend model changes (remove `company_id` everywhere, delete Company)
2. Backend schema changes
3. Backend endpoint changes (drop all `.where(company_id=...)`)
4. Backend cache changes (simplify keys)
5. Backend workers/services changes
6. Backend seed.py simplification
7. Create Alembic migration 006
8. Frontend: remove `companyId` from auth + domain types
9. Test: `python3 -c "import ast; ..."` syntax check + `npx tsc --noEmit`
10. Commit

### Phase B: Backend-Driven Version Check
1. Backend: add `APP_VERSION` / `MINIMUM_VERSION` to config
2. Backend: add `GET /version` endpoint (no auth)
3. Frontend: `src/lib/version.ts` + Vite `define` injection
4. Frontend: update `sw.ts` with `SKIP_WAITING` / `FORCE_UPDATE` message handlers
5. Frontend: add version check loop in `App.tsx`
6. Frontend: add `ForceUpdateOverlay` component
7. Test
8. Commit

### Phase C: Update AGENTS.md (both backend + frontend)
- Remove multi-tenancy references
- Document version check architecture
- Update folder map / model table

---

## Summary

| Aspect | Before | After |
|---|---|---|
| Company model | Exists, FK on 12 tables | Deleted |
| `company_id` filters | 113 occurrences | 0 |
| Cache keys | `cache:ns:c{id}:key` | `cache:ns:key` |
| User model | `company_id` FK | Just `vendor` string for drivers |
| Force update | None — user must refresh manually | Backend-driven: hard + soft update |
| Version endpoint | None | `GET /api/v1/version` (public) |
| SW update behavior | `registerType: 'prompt'` only | Auto skip-waiting + force reload |

**Estimated scope**: ~200 lines removed (multi-tenancy), ~80 lines added (version check), 1 migration file.
