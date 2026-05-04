# Backend architecture — proposal

> Short-form direction-setter. The deep audit + detailed PR roadmap follow only after you approve the direction here.

## 1. Current state — 5 sentences

The backend is a single FastAPI app talking to one Postgres DB via SQLAlchemy 2.x async + Alembic, deployed as a single Docker container with arq for background jobs. There are nominally three layers — routers (`app/api/v1/`), services (`app/services/`), and repositories (`app/repositories/`) — but the boundaries are leaky: routers issue raw `db.execute(...)` queries (~105 occurrences across 19 router files) and import SQLAlchemy models directly (~38 imports). Services have grown into multi-responsibility mega-modules (`excel_service.py` is 814 LoC mixing import, export, customer reconciliation, and template generation; `imports.py` is 598 LoC carrying preview, commit, schema introspection, and apply-pricing in one router). Domain entities are flat SQLAlchemy ORM rows with denormalized convenience columns leaking into multiple tables (`client_name` on 4 different children of `clients`), and the codebase has 26 alembic migrations accumulating dead columns. The biggest pain points are **(a) router→DB shortcuts that make tests + reuse hard**, and **(b) services that mix transport / business / persistence concerns in one file** — both fixable without rewriting.

## 2. Proposed target architecture

**Modular monolith, layered within each domain.** Pick this because:

- The codebase is closest to "router + service + repo + model" already — formalizing that split costs less than introducing a new paradigm.
- The 2-person team needs a structure they can navigate by feature, not by layer. Folders by domain (`orders/`, `pricing/`, `dispatching/`) read like the business; folders by layer (`services/`, `repos/`) force devs to chase a feature across 4 directories.
- Hexagonal / clean / CQRS / event-sourcing all add ports + adapters + use-case + DTO mapping ceremony that an early-stage 2-dev team will fight against. Save them for when there's a measurable scaling pain they would address.
- Single Postgres DB, single deployable, ~12k LoC backend. Microservices are objectively wrong at this scale.

The rule: **one domain owns one set of tables + one set of business invariants.** Cross-domain calls go through public service interfaces, not raw SQL. Within a domain, the layers stay thin: API → service → repo → model. Pydantic at the API boundary, SQLAlchemy at the DB boundary, no extra DTO mapping layer in between.

## 3. Concrete folder/module layout

```
backend/app/
  api/v1/                  # thin HTTP layer — one router file per domain, just routing + Pydantic schemas
    auth.py, identity.py, catalog.py, pricing.py,
    orders.py, dispatching.py, reconciliation.py,
    payroll.py, billing.py, reports.py, imports.py
  domains/
    identity/              # users, RBAC, sessions, push tokens
      service.py, repo.py, model.py
    catalog/               # clients, vendors, locations, location_aliases, routes
      service.py, repo.py, model.py, location_resolver.py
    pricing/               # pricings, pricing_lines, find-tiered lookup, tariff seeders
      service.py, repo.py, model.py
    orders/                # trip_orders, trip_order_containers, trip_container_photos
      service.py, repo.py, model.py
      imports/             # the existing customer-Excel import pipeline (already well-modularized)
    dispatching/           # work_orders, work_order_containers, driver mobile entry points
      service.py, repo.py, model.py
    reconciliation/        # trip_order_work_orders, match logic, lock/unlock
      service.py, repo.py, state_machine.py
    payroll/               # salary_periods, salary_config, salary calculator
      service.py, repo.py, model.py
    billing/               # payments, customer_settlement (BK SL export)
      service.py, repo.py, model.py
    reports/               # cross-domain read-only aggregations (BK SL etc. live here OR billing)
  core/
    db/                    # engine, session, base, transactional decorator
    config/                # settings, env loading
    errors/                # exception types + HTTP exception handler
    security/              # JWT, password hashing, oso policy
    audit/                 # auto-audit log session listener
    ai/                    # gemini client, OCR adapter
    observability/         # structlog setup, request-id middleware
  workers/                 # arq job definitions (call into domains/*)
  alembic/versions/
  tests/
    {one folder per domain}
```

**Per domain, briefly:**

- **identity** — users, login, role-based access, push subscriptions. Owns `users`, `push_subscriptions`. Provides `current_user` dependency to other domains.
- **catalog** — master data: customers (`clients`), vendors, locations, aliases, routes. Owns the `LocationResolverService`. The seeders bootstrap from this domain.
- **pricing** — bảng giá: `pricings` + `pricing_lines`, tiered-lookup service, tariff seeders. Read by orders + dispatching when applying prices.
- **orders** — đơn hàng: `trip_orders` + `trip_order_containers` + photos + customer-Excel import pipeline. The largest domain. Imports sub-package contains the 5-layer pipeline already built.
- **dispatching** — driver-side: `work_orders` + `work_order_containers`. Mobile-app facing.
- **reconciliation** — the 1:1 match between TripOrder and WorkOrder. Owns the `TripOrderWorkOrder` join + lock/unlock state machine.
- **payroll** — salary calculation per driver per period. Reads work_orders, owns salary_periods.
- **billing** — payments + customer settlement (BK SL) export. Generates monthly statements.
- **reports** — cross-domain aggregations and exports that aren't naturally one domain's responsibility. Could live inside billing if it stays thin.

## 4. Cross-cutting concerns

- **Errors** — one set of typed exceptions (`NotFoundError`, `ConflictError`, `AuthorizationError`, `ValidationError`) raised by services; one FastAPI exception handler maps them to HTTP. Routers stop hand-raising `HTTPException`.
- **Transactions** — `@transactional` decorator at the use-case / service boundary. Repos never commit. Routers never commit. The decorator makes the unit of work explicit.
- **Logging** — `structlog` with a request-id middleware that injects an ID at the FastAPI layer, propagates into arq jobs. Replace ad-hoc `logging.getLogger(__name__)` over time; not a hard cutover.
- **Auth** — existing JWT bearer + Oso policy stays. Wraps as a FastAPI `Depends(...)`. No change to the auth model.
- **Validation** — Pydantic v2 at the HTTP boundary only (request bodies, response models). Inside the domain, services accept typed Python args (dataclasses or just primitives + ORM objects). No Pydantic in service signatures.
- **Background jobs** — arq stays. Jobs live in `workers/` and call into `domains/*/service.py`. No DB calls or business logic in `workers/` itself.

## 5. What changes from today (concrete from→to)

- **Routers stop running queries.** The 105 `db.execute(...)` / `select(...)` calls in `app/api/v1/*.py` move into `domains/*/repo.py`. A router becomes ~30 lines: parse Pydantic input → call service → serialize Pydantic output.
- **`excel_service.py` (814 LoC) splits.** `import_trip_orders` + `parse_trip_order_excel` → `domains/orders/imports/`. `generate_trip_orders_excel` + `generate_work_orders_excel` + `generate_salary_excel` → per-domain export modules. `parse_customer_excel` + `compare_with_system_records` + `generate_reconciliation_excel` → `domains/reconciliation/excel.py`.
- **`api/v1/imports.py` (598 LoC) splits.** Preview/commit/schema/templates/apply-pricing become 5 small handlers in `api/v1/imports.py`, each calling one method on `domains/orders/imports/service.py`. Apply-pricing might live under pricing.
- **`api/v1/trip_orders.py` `_to_schema` + `_load_one` + `_load_many` move to `domains/orders/serializer.py`.** They're cross-cutting between repo + API right now.
- **Denormalized convenience columns get dropped.** The 22 columns from `docs/SCHEMA_OVERHAUL_AUDIT.md` (client_name on 4 tables, driver_name on 2, type_20ft/40ft/is_two_way on routes, work_type/container_number on trip_orders, ip_address/user_agent on audit_logs, etc.). Display-name reads switch to JOIN via existing FK.
- **Models gain a small amount of behavior.** Anemic DB rows like TripOrder gain methods like `is_priced()`, `can_match()`, `apply_pricing(line)` — keeps invariants close to the data instead of scattered across services.
- **Migrations consolidate.** 26 files → 1 `001_initial_schema.py` (forward-only; matches break-fast policy already established).
- **Tests reorganize per domain.** `tests/domains/orders/test_*.py` mirrors source. Coverage is currently mostly happy-path; deep audit will quantify and target gaps.
- **Workers move out of `app/workers/` into a thin task layer.** Each task is a 3-line function calling `domains/*/service.py`. No logic in the worker.

## 6. What stays the same

- **FastAPI, SQLAlchemy 2 async, Alembic, Postgres, Redis, arq, openpyxl, Oso for RBAC, Gemini for OCR / LLM fallback, JWT auth.**
- **Frontend** — untouched by this proposal. API surface stays compatible (we're rearranging internals, not contracts). If a denormalized field disappears from a response (e.g., `trip.client_name`), the frontend uses the existing `trip.client.name` join already in the response payload.
- **The customer-Excel import pipeline (`app/services/import_pipeline/`)** — already cleanly modularized, just relocates intact under `domains/orders/imports/`. Zero logic change there.
- **The seed scripts at `scripts/seeds/*`** — relocation only if their imports change; CLI shape stays.
- **The Docker image, the deploy story, the docker-compose, the env-var contract.**
- **The existing test suite content** — moves but doesn't rewrite. Coverage stays at or above current baseline at every PR boundary.

## 7. Migration approach — first 3 PRs

Incremental, each ships independently, tests green at every boundary. Order chosen for low-risk + high-value-first:

| PR | Scope (1 line) | Why first |
|---|---|---|
| **PR-1: Schema overhaul + collapsed migrations** | Drop the 22 dead columns from `docs/SCHEMA_OVERHAUL_AUDIT.md`, fold 26 migrations into one `001_initial_schema.py`, drop+recreate dev DB, re-seed. The plan is already documented and approved-in-spirit; folding it into the roadmap as PR-1 locks in the schema before structural changes. | Source-of-truth schema before we move code. Zero code refactor risk because there's no code yet at the new layout. |
| **PR-2: Move DB access out of routers** | Every `db.execute(...)` / `select(...)` / `db.add(...)` in `api/v1/*.py` moves to a repo method. Routers shrink to thin handlers calling services that call repos. No domain reorg yet — files stay where they are. | Highest-impact cleanup. Once routers are pure transport, the next PR (modularize) becomes a mechanical rename instead of a logic fight. |
| **PR-3: Modularize `app/services/` + `app/repositories/` into `app/domains/{name}/`** | Physical reorg into the layout in section 3. No logic change — file moves + import updates. Includes splitting the two mega-files (`excel_service.py`, `api/v1/imports.py`) along the cuts already noted in section 5. | Now that nothing crosses layers in the wrong direction, the rename is a pure code-organization PR. Easy to review. |

Future PRs (in the roadmap that comes after the deep audit): typed exception layer, `@transactional` decorator, structlog observability, model-behavior pull-down, test reorganization, worker thinning. Each ~M / L sized.

## 8. NOT proposed (saving you the argument)

- **DI container** — FastAPI's `Depends(...)` is enough. Adding `dependency-injector` or similar buys nothing at this scale.
- **CQRS / read models / write models split** — premature; we'd be solving a scaling problem we don't have.
- **Event sourcing / domain events bus** — services calling services directly is fine until we hit a real cross-domain notification need. The audit log already gives us forensic visibility.
- **Microservices** — one binary, one DB. Splitting now adds deployment + observability + auth + data-consistency tax with no benefit.
- **A separate DTO ↔ domain ↔ entity mapping layer** — Pydantic at the API + SQLAlchemy at the DB is the boundary; one layer between them adds ceremony without solving anything.
- **New ORM / sync→async swap / tortoise / sqlmodel migration** — SQLAlchemy 2 async is fine; the ORM isn't the problem.
- **Replacing arq with celery / dramatiq / temporal** — arq is doing the job; swap only when there's a concrete reason.
- **Strict "no cross-domain imports ever" rule** — early stage allows some pragmatic shortcuts (e.g., `pricing.apply_to_trip(trip_order)` is fine even though it touches the orders domain). Tighten later when team grows.

---

## Stop here

Reply with one of:

- **"go"** — proceed to the deep audit + detailed roadmap inside this proposed direction.
- **"go but X"** — same, with stated amendments (e.g., "go but skip the apply-pricing split", "go but use hexagonal not layered", "go but don't drop the denormalized client_name yet").
- **"stop"** — different direction entirely.
