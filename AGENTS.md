# Vận tải Phúc Lộc — Agent Guide

B2B container freight trucking platform for Phuc Loc Trading & Transport Co., Hai Phong port zone. Moves shipping containers (20ft/40ft, empty/laden) between ports, warehouses, and depots on behalf of shipping clients. Single-tenant — Phuc Loc is the only operator.

Business domain glossary lives in `CONTEXT.md`. Read it before working on any feature.

## Commands

### Development (from repo root)

```bash
make dev              # Start everything: infra (Docker) + backend (uvicorn) + frontend (Vite) + worker (arq)
make dev-infra        # PostgreSQL + Redis + Adminer in Docker only
make dev-backend      # FastAPI only (requires infra already running)
make dev-frontend     # Vite dev server only
make dev-worker       # arq background worker only
make stop             # Stop Docker infra
make clean            # Kill stale dev processes, free ports
```

Default ports (overridable via env vars): Backend `8100`, Frontend `5174`, PostgreSQL `5433`, Redis `6381`, Adminer `8083`.

### Testing & Linting

```bash
make test             # Run all: backend lint + format check + pytest, frontend lint + build + tests
make test-backend     # ruff check → ruff format --check → pytest
make test-frontend    # eslint → vite build → vitest (if configured)
make lint             # ruff check (backend) + eslint (frontend)
make api-test         # Integration tests against LIVE backend at localhost:8100 (must be running)
```

Backend unit tests: `cd backend && PYTHONPATH=. python -m pytest -q`
Frontend lint only: `cd frontend && pnpm lint`

### Database

```bash
make migrate          # cd backend && PYTHONPATH=. alembic upgrade head
make seed             # cd backend && PYTHONPATH=. python -m app.seed_dev
```

New migration: `cd backend && PYTHONPATH=. alembic revision --autogenerate -m "description"`

### Deploy

```bash
make push-all         # Build & push Docker images to Docker Hub
make deploy-all       # Pull & restart on production droplet (phucloc.tingting.vip)
```

## Backend Architecture

### Stack

FastAPI · SQLAlchemy async (asyncpg) · PostgreSQL 16 · Redis 7 · arq (async task queue) · Alembic · Python 3.12

### DDD Context Structure

`backend/app/contexts/` contains bounded contexts, each with four layers:

```
contexts/<context_name>/
  domain/           # Pure Python dataclasses, no framework deps
    entities.py     # Aggregate roots and entities
    value_objects.py # Typed IDs, enums, validation functions
    exceptions.py   # Domain-specific exception hierarchy
    repositories.py # Abstract repository interfaces (protocols)
    services.py     # Domain service interfaces (e.g., PasswordHasher)
  application/      # Use cases (orchestrate domain objects)
    *.py            # One class per use case, depends only on domain layer
    dto.py          # Data transfer objects for input/output
  infrastructure/   # External concerns
    orm.py          # SQLAlchemy ORM models for this context
    mappers.py      # Bidirectional mapping: ORM ↔ domain entity
    repositories.py # Concrete SQLAlchemy implementations of abstract repos
    *.py            # External adapters (AI, OCR, geocoding, etc.)
  interface/        # HTTP layer
    routers/        # FastAPI router files
    dependencies.py # FastAPI Depends() wiring (composition root)
    error_translation.py  # Maps domain exceptions → HTTP status codes
    schemas.py      # Pydantic request/response models
```

### Two Model Systems (IMPORTANT)

The codebase has **two coexisting ORM patterns**:

1. **Legacy shared models** (`app/models/domain.py`): SQLAlchemy ORM classes used directly by older contexts (operations, fleet). These inherit from `AuditableMixin` for auto-audit logging. No domain entity separation.

2. **DDD context models**: Newer contexts (identity, customer_pricing, payroll) define domain entities as pure dataclasses in `domain/entities.py`, with separate ORM models in `infrastructure/orm.py` and bidirectional mappers in `infrastructure/mappers.py`.

When adding features to an existing context, **follow the pattern that context already uses**. When creating a new context, follow the DDD pattern.

### Key Backend Patterns

- **Imports**: Absolute from `app.*` (not relative). All backend commands require `PYTHONPATH=.` set.
- **DB sessions**: `get_db()` dependency yields + auto-commits. Worker tasks use `get_session()` context manager.
- **Error translation**: Each context has `interface/error_translation.py` with a `_STATUS_BY_TYPE` dict mapping domain exceptions to HTTP status codes. Domain layer never imports FastAPI.
- **Dependencies**: Each context's `interface/dependencies.py` is its composition root — wires concrete repos + adapters into use cases via FastAPI `Depends()`.
- **Authorization**: Two mechanisms:
  - `require_roles(*roles)` — simple role check via `app/core/deps.py`
  - `require_permission(action, resource)` — Oso Polar policy check via `app/policy.polar`
- **Audit**: Models with `AuditableMixin` auto-log CREATE/UPDATE/DELETE to `audit_logs` table. Set `__audit_context_fields__` on the model class for context fields (e.g., `driver_id`).
- **Async tasks**: arq worker defined in `app/workers/worker.py`. Long-running operations (AI parsing, salary calc, reports) are enqueued via Redis. Frontend polls `/api/v1/jobs/{job_id}` for status.
- **Cache**: Redis-backed caching in `app/core/cache.py` with configurable TTLs per entity type.

### Backend Contexts

| Context | Purpose |
|---------|---------|
| `identity` | Auth, users, JWT, push subscriptions |
| `operations` | BookedTrips, DeliveredTrips, reconciliation, auto-match, bulk imports |
| `customer_pricing` | Client pricing, locations, location aliases, contacts |
| `route_pricing` | Route-based pricing (cuốc tuyến) |
| `vendor_route_pricing` | Vendor route pricing (cước trả xe ngoài) |
| `fleet` | Vehicles, drivers, vehicle-driver assignments, vehicle expenses |
| `payroll` | Salary calculation, driver base salary, salary config |
| `billing` | P&L reports, monthly revenue |
| `platform` | Dashboard, audit logs, operation types |

## Frontend Architecture

### Stack

React 19 · TanStack Query v5 · Vite 8 · Tailwind CSS v4 · shadcn/ui-style components · Radix UI primitives · Axios · pnpm

### Path Aliases

Configured in `vite.config.ts`:

| Alias | Path |
|-------|------|
| `@` | `src/` |
| `@ui` | `src/components/ui/` |
| `@shared` | `src/components/shared/` |
| `@hooks` | `src/hooks/` |
| `@lib` | `src/lib/` |
| `@data` | `src/data/` |
| `@themes` | `src/themes/` |

### Key Frontend Patterns

- **Router**: `src/router.ts` uses `createElement` (no JSX). Routes defined via lazy imports in `src/routes.ts`. Each route wrapped in `ErrorBoundary`.
- **API client**: `src/services/api/client.ts` — Axios instance with JWT interceptor and silent token refresh. All API functions in `src/services/api/*.api.ts`, barrel-exported as `apiClient` from `src/services/api/index.ts`.
- **Case conversion**: Backend sends `snake_case`, frontend uses `camelCase`. Conversion happens in `src/services/api/utils.ts` (`toCamel` / `toSnake`). API functions wrap responses in `ApiResponse<T>` shape: `{ data, success, message? }`.
- **Data fetching**: TanStack Query hooks in `src/hooks/queries/*.ts`. Query keys centralized in `src/hooks/query-keys.ts`. Each hook file follows the pattern: `useXxxList`, `useXxx`, `useCreateXxx`, `useUpdateXxx`, `useDeleteXxx`.
- **Theming**: CSS variables `var(--theme-*)` defined in `src/styles/01-theme.css`. Never hardcode colors. Theme registry in `src/themes/`.
- **Role-based layouts**: Four layout components — `DriverLayout`, `AccountantLayout`, `DirectorLayout`, `SuperAdminLayout`. Routes grouped by role under `/driver`, `/accountant`, `/director`, `/superadmin`.

### Component Library Organization

All components live in `src/components/` — **never write page-specific components inside pages**.

| Directory | Purpose |
|-----------|---------|
| `components/ui/` | Primitives: Button, Input, Dialog, Sheet, Select, Popover, etc. |
| `components/shared/` | Composed components used across pages: InlineSelect, EntityTable, cards, tables, overlays, navigation, forms, layouts |
| `components/molecules/` | Larger composed: SheetSelect, SearchPill, FormField |
| `components/atoms/` | Atomic utilities |
| `components/vendor-route-pricing/` | Feature modules for vendor route pricing |
| `components/route-pricing/` | Feature modules for route pricing |

### Key Reusable Components

- `InlineSelect` — searchable dropdown with filter, optional "create new" action
- `EntityTable` — table view pattern for entity lists
- `AccountantPageShell` / `PageHeader` — page layout shell with search, add button, count
- `Sheet` — slide-in panel for detail views
- `Dialog` / `DialogContent` — modal dialogs; supports `hideCloseButton` prop
- `DataTable` / `DataTablePro` — advanced table with sorting, pagination
- `ExcelImportDrawer` — file upload → AI parsing → preview → commit flow

## Testing

### Backend Unit Tests

- Location: `backend/tests/`
- Runner: pytest with `pytest-asyncio` (mode: `auto`)
- Fixtures in `backend/tests/conftest.py`: SQLite in-memory DB, fake Redis, `async_client` (httpx ASGI transport), `make_auth_headers(role)` factory
- Tests run with `PYTHONPATH=.` from `backend/` directory
- Context-specific tests in `backend/tests/contexts/`

### Integration Tests

- Location: `tests/integration/`
- Hit the **live** backend at `http://localhost:8100/api/v1`
- Seed users in `tests/integration/conftest.py`: `admin/admin123` (superadmin), `giamdoc/admin123` (director), `ketoan/admin123` (accountant), `taixe1/admin123` (driver)
- Run with: `make api-test` (requires backend running)

## Conventions

### Entity Naming

- **No "Partner" concept** — replaced with `Client` (chủ hàng) and `Vendor` (xe ngoài) as separate entities throughout
- Backend: `Client` ORM → `clients` table; `Vendor` ORM → `vendors` table

### Code Style

- No comments unless explicitly asked
- Backend: ruff lint (`E4`, `E7`, `E9`, `F` rules), ignores `E402`, `F403`, `F405`, `F821`
- Frontend: ESLint with react-hooks and react-refresh plugins
- Vietnamese labels for all UI text visible to users
- All colors use theme CSS variables (`var(--theme-*)`), never hardcoded values
- All monetary values stored as integers (VND, no decimals)

### Frontend Pages

Pages in `src/pages/` are **pure orchestration** of components from the library. If a component is needed for a page, create it in `src/components/` even if initially used by only one page.

## Gotchas

- **PYTHONPATH**: All backend commands must run with `PYTHONPATH=.` from the `backend/` directory. Without it, absolute imports from `app.*` will fail.
- **Two ORM patterns**: Some contexts use direct SQLAlchemy models (`app/models/domain.py`), others use the DDD pattern with separate domain entities + mappers. Check the context before adding code.
- **Async test fixtures**: `asyncio_mode = "auto"` in pytest config — all async test functions are auto-handled, no `@pytest.mark.asyncio` needed.
- **router.ts has no JSX**: It uses `createElement` to avoid needing the React JSX transform. Route definitions (lazy imports) live in `routes.ts`.
- **Snake/camel conversion**: Backend always sends `snake_case`. Frontend `apiClient` functions auto-convert. If you bypass `apiClient` and call `api` directly, handle case conversion yourself.
- **API prefix**: All backend routes mounted at `/api/v1`. Frontend dev proxy configured in `vite.config.ts` to forward `/api` and `/photos` to backend.
- **Token refresh**: Client-side silent refresh with request queue — if multiple requests fail with 401 simultaneously, they queue up and replay after refresh.
- **Audit mixin**: Adding `AuditableMixin` to a model automatically logs all field changes. Use `__audit_context_fields__` to include related entity IDs (e.g., `driver_id`) in audit entries for filtering.
- **Vendor trips**: Vendor trips have `vehicle_plate` as text (no `vehicle_id` FK), `driver_id` is NULL. Vendor vehicles are not in the `vehicles` table.
- **Container matching**: 1:1 by container number. Each BookedTrip and DeliveredTrip has exactly one container. A truck carrying 2 containers = 2 separate rows.

## graphify

This project has a knowledge graph at `graphify-out/` with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts.
- If `graphify-out/wiki/index.md` exists, use it for broad navigation instead of raw source browsing.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
