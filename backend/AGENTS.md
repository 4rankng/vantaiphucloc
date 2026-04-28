# AGENTS.md — Backend Development Guide

> **Read this before making any backend change.** This file is the source of truth for project structure, patterns, and where to make changes. Update it whenever you add/remove models, endpoints, services, or change architecture.

---

## Self-Maintenance Rule

**Every agent MUST update this file when:**
- Adding or removing a database model (table)
- Adding or removing an API endpoint file
- Adding or removing a service
- Changing an architectural pattern (auth, schema conventions)
- Changing status enums or business logic constants
- Adding new dependencies or changing the tech stack

If you change code and this file becomes stale, the next agent will be misled. Keep it current.

---

## Project Overview

**Vận Tải Phúc Lộc** — a freight/logistics management backend for Phúc Lộc transport company.

- **Single-tenant**: one company (Phúc Lộc), no `company_id` multi-tenancy
- **4 roles**: `superadmin` (full access), `director` (read dashboards), `accountant` (manage trips/pricing/salary), `driver` (submit work orders)
- **Phone-based auth**: users log in with phone/email/username + password, get JWT
- **Currency**: Vietnamese Dong (VND), stored as integers — no decimals
- **Drivers & vendors**: drivers have a `vendor` string field (default "Phúc Lộc"). External vendor drivers have their company name there.
- **PWA**: service worker with precaching, background sync for offline support

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI 0.115 |
| Language | Python 3.11+ |
| ORM | SQLAlchemy 2.x (async) |
| Database | PostgreSQL via asyncpg |
| Migrations | Alembic |
| Validation | Pydantic v2 |
| Auth | python-jose (JWT) + passlib (bcrypt) |
| Background | arq (Redis-based) |
| Caching | Redis |
| Testing | pytest + pytest-asyncio + hypothesis |

---

## Folder Map

```
backend/
├── app/
│   ├── main.py                  # FastAPI app instance, CORS middleware, mounts api_v1_router
│   │                            #   - docs at /api/docs, redoc at /api/redoc
│   ├── config.py                # Settings class (pydantic-settings), reads .env
│   │                            #   - DATABASE_URL, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
│   │                            #   - CORS_ORIGINS
│   ├── database.py              # Async engine (asyncpg), async_sessionmaker, Base (DeclarativeBase), get_db()
│   │
│   ├── api/v1/                  # All API endpoints — one file per domain entity
│   │   ├── router.py            # Mounts all sub-routers. Health check, job status
│   │   ├── auth.py              # POST /auth/login, POST /auth/refresh, POST /auth/logout
│   │   ├── clients.py           # CRUD /clients (list, create, update, delete)
│   │   ├── drivers.py           # CRUD /drivers
│   │   ├── routes.py            # CRUD /routes
│   │   ├── pricings.py          # CRUD /pricings (with nested PricingLines)
│   │   ├── work_orders.py       # CRUD /work-orders (containers, pricing auto-fill)
│   │   ├── trip_orders.py       # CRUD /trip-orders (work order matching)
│   │   ├── reconcile.py         # POST /reconcile (match work order → trip order)
│   │   ├── salary.py            # POST /salary/calculate, GET /salary/periods
│   │   ├── salary_config.py     # GET/PUT /salary-config
│   │   └── push.py              # Push notification subscription
│   │
│   ├── core/
│   │   ├── deps.py              # Dependency injectors:
│   │   │                        #   get_current_user — decodes JWT, loads User from DB
│   │   │                        #   require_roles(*roles) — factory, returns dependency that checks role
│   │   ├── security.py          # hash_password, verify_password, create_access_token, decode_access_token
│   │   ├── cache.py             # CacheManager (Redis) — get/set/invalidate by namespace + id (NO company_id)
│   │   ├── redis.py             # Redis connection pool
│   │   ├── rate_limit.py        # RateLimiter for login protection
│   │   ├── identifier.py        # detect_identifier_type (phone/email/username)
│   │   └── worker.py            # arq pool lifecycle
│   │
│   ├── models/
│   │   ├── __init__.py          # Re-exports ALL models — required for Alembic autogenerate discovery
│   │   ├── base.py              # User model (phone, email, username, role, vendor, tractor_plate)
│   │   └── domain.py            # All domain models (see Database Models below)
│   │
│   ├── schemas/
│   │   ├── __init__.py          # Re-exports
│   │   ├── base.py              # Auth schemas: LoginRequest, TokenResponse, LoginResponse,
│   │   │                        #   UserOut, UserCreate, UserUpdate, ChangePassword
│   │   └── domain.py            # Create/Update/Out schemas for each domain entity
│   │
│   └── services/
│       ├── pricing_service.py   # find_pricing(db, client_id, work_type, route) → Pricing | None
│       ├── salary_service.py    # get_salary_period_dates(db, reference_date) → (start, end)
│       ├── push_service.py      # Web push notifications
│       └── geocoding.py         # Reverse geocoding
│
├── alembic/
│   ├── env.py                   # Migration env — imports all models for autogenerate
│   └── versions/
│       ├── 001_initial_schema.py
│       ├── 002_add_user_email.py
│       ├── 003_container_photo_metadata.py
│       ├── 004_push_subscriptions.py
│       ├── 005_add_user_vendor.py
│       └── 006_drop_multi_tenant.py
│
├── workers/
│   ├── __init__.py              # enqueue(), salary_recalc_job_id()
│   ├── worker.py                # WorkerSettings (arq)
│   └── tasks/
│       ├── cleanup.py           # Rate-limit key cleanup
│       ├── geocoding.py         # Geocode work orders / containers
│       ├── notifications.py     # Push notification delivery
│       ├── reports.py           # Monthly reports, salary reminders
│       └── salary.py            # Salary calculation task
│
├── tests/
│   ├── conftest.py              # Fixtures: async DB session, test client
│   ├── test_models.py           # Model unit tests
│   └── test_properties.py       # Property-based tests (hypothesis)
│
├── alembic.ini                  # Alembic configuration
├── requirements.txt             # Python dependencies
├── pyproject.toml               # Project metadata
└── .env.example                 # Environment variable template
```

---

## Database Models

All models are in `app/models/domain.py`. User is in `app/models/base.py`.

| Table | Model | Key Columns | Status Enum | Children |
|---|---|---|---|---|
| `users` | `User` | phone (unique), email (unique), username, role, vendor, is_active, tractor_plate | role: superadmin/director/accountant/driver | — |
| `clients` | `Client` | name, type, phone, tax_code, outstanding_debt (int) | type: company/individual | — |
| `routes` | `Route` | route, type_20ft, type_40ft (int VND), is_two_way | — | — |
| `pricings` | `Pricing` | client_id, client_name, work_type, route, unit_price, driver_salary, allowance | work_type: E20/E40/F20/F40 | `PricingLine` (CASCADE) |
| `pricing_lines` | `PricingLine` | pricing_id (CASCADE), work_type, quantity | — | — |
| `work_orders` | `WorkOrder` | client_id, client_name, route, driver_id, driver_name, tractor_plate, unit_price, driver_salary, allowance, earning, pricing_id | status: PENDING/PRICED/MATCHED | `WorkOrderContainer` (CASCADE) |
| `work_order_containers` | `WorkOrderContainer` | work_order_id (CASCADE), container_number, work_type, photo_url | work_type: E20/E40/F20/F40 | — |
| `trip_orders` | `TripOrder` | trip_date, client_id, client_name, work_type, route, driver_id, driver_name, container_number, pricing_id, unit_price, driver_salary, allowance, revenue | status: DRAFT/CONFIRMED/INVOICED/CANCELLED | `TripOrderWorkOrder` |
| `trip_order_work_orders` | `TripOrderWorkOrder` | trip_order_id (CASCADE, PK), work_order_id (PK) | — | — |
| `salary_periods` | `SalaryPeriod` | driver_id, driver_name, start_date, end_date, work_order_count, price_per_order, total_salary, total_allowance, total_deduction, net_pay | status: OPEN/CALCULATED/PAID | — |
| `salary_period_configs` | `SalaryPeriodConfig` | from_day (1–28), to_day (1–28) — singleton row | — | — |

**No `company_id` column on any table. No `companies` table. Single-tenant.**

---

## Key Patterns

### Single-Tenant (No Multi-Tenancy)
All data belongs to Phúc Lộc. Queries are simple:
```python
result = await db.execute(select(Client).order_by(Client.name.asc()))
```

### Money Handling
All monetary fields are `Column(Integer)` — Vietnamese Dong has no decimals:
```python
unit_price = Column(Integer, nullable=False)  # VND
```

### Timestamps
All models use UTC timestamps with timezone:
```python
created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)
```

### Three-Schema Pattern
Every entity has exactly three Pydantic schemas:
```python
class ClientCreate(BaseModel): ...    # POST body — required fields
class ClientUpdate(BaseModel): ...    # PUT body — all fields Optional
class ClientOut(BaseModel): ...       # Response — includes id, timestamps
    model_config = ConfigDict(from_attributes=True)
```

### Denormalized Display Fields
`client_name` and `driver_name` are stored redundantly on WorkOrder/TripOrder for fast reads without JOINs.

### Cascade Deletes
Parent-child relationships use `ondelete="CASCADE"`:
```python
pricing_id = Column(Integer, ForeignKey("pricings.id", ondelete="CASCADE"))
```

### Auth & Role-Based Access
```python
@router.get("/clients", response_model=list[ClientOut])
async def list_clients(
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
```

### Cache (Redis)
Cache keys use `namespace:identifier` (no company_id):
```python
cache = CacheManager(redis)
await cache.set_json("clients", "list", serialized, ttl=300)
await cache.invalidate_namespace("clients")
```

### CRUD Endpoint Pattern
See `clients.py` for the canonical example:
```python
router = APIRouter()

@router.get("/clients", response_model=list[ClientOut])       # List
@router.post("/clients", response_model=ClientOut, status_code=201)  # Create
@router.put("/clients/{client_id}", response_model=ClientOut)  # Update (partial)
@router.delete("/clients/{client_id}", status_code=204)        # Delete
```

### Background Jobs
Use `enqueue()` from `app.workers`:
```python
from app.workers import enqueue, salary_recalc_job_id
job_id = salary_recalc_job_id(driver_id, start_date, end_date)
await enqueue("calculate_salary_task", _job_id=job_id, driver_id=driver_id, ...)
```

---

## How-To Recipes

### Add a New API Endpoint File

1. Create `app/api/v1/<entity>.py` — copy pattern from `clients.py`
2. Create schemas: `XxxCreate`, `XxxUpdate`, `XxxOut` in `app/schemas/domain.py`
3. Create model in `app/models/domain.py` (if new table needed)
4. Re-export model in `app/models/__init__.py`
5. Register router in `app/api/v1/router.py`
6. Create migration: `alembic revision --autogenerate -m "add <entity>"`
7. Apply migration: `alembic upgrade head`

### Add a New Database Model

1. Add model class to `app/models/domain.py` — no company_id needed
2. Re-export in `app/models/__init__.py`
3. Add schemas in `app/schemas/domain.py`
4. Create Alembic migration

### Add a New Schema Group

Follow the three-schema pattern in `app/schemas/domain.py`:
```python
class NewEntityCreate(BaseModel):
    field1: str
    field2: int

class NewEntityUpdate(BaseModel):
    field1: str | None = None
    field2: int | None = None

class NewEntityOut(BaseModel):
    id: int
    field1: str
    field2: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
```

### Protect an Endpoint with Roles

```python
from app.core.deps import require_roles

@router.get("/admin-only")
async def admin_only(
    current_user: User = Depends(require_roles("superadmin")),
    db: AsyncSession = Depends(get_db),
):
```

### Add Business Logic (Service)

1. Create `app/services/<name>_service.py`
2. Import and use in endpoint files

---

## Common Commands

```bash
# Run dev server
cd backend && uvicorn app.main:app --reload

# Run tests
cd backend && pytest

# Create migration (after model changes)
cd backend && alembic revision --autogenerate -m "description"

# Apply all pending migrations
cd backend && alembic upgrade head

# Rollback one migration
cd backend && alembic downgrade -1

# View current migration state
cd backend && alembic current

# Seed admin user
cd backend && python -m app.seed
```

---

## Environment Variables

Set in `.env` (see `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/vantaihanghoa` | PostgreSQL connection string |
| `SECRET_KEY` | `change-me-to-a-random-secret-key` | JWT signing key |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Token lifetime (24h) |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Comma-separated allowed origins |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection |
