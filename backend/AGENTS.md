# AGENTS.md — Backend Development Guide

> **Read this before making any backend change.** This file is the source of truth for project structure, patterns, and where to make changes. Update it whenever you add/remove models, endpoints, services, or change architecture.

---

## Self-Maintenance Rule

**Every agent MUST update this file when:**
- Adding or removing a database model (table)
- Adding or removing an API endpoint file
- Adding or removing a service
- Changing an architectural pattern (auth, multi-tenancy, schema conventions)
- Changing status enums or business logic constants
- Adding new dependencies or changing the tech stack

If you change code and this file becomes stale, the next agent will be misled. Keep it current.

---

## Project Overview

**Vận Tải Hàng Hóa** — a freight/logistics management backend for Vietnamese transport companies.

- **Multi-tenant**: all data scoped to `company_id`
- **4 roles**: `superadmin` (full access), `director` (read dashboards), `accountant` (manage trips/pricing/salary), `driver` (submit work orders)
- **Phone-based auth**: users log in with phone + password, get JWT
- **Currency**: Vietnamese Dong (VND), stored as integers — no decimals

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
| Background | Celery 5.4, arq |
| Caching | Redis |
| Testing | pytest + pytest-asyncio + hypothesis |
| Monitoring | Sentry, Prometheus |

---

## Folder Map

```
backend/
├── app/
│   ├── main.py                  # FastAPI app instance, CORS middleware, mounts api_v1_router
│   │                            #   - docs at /api/docs, redoc at /api/redoc
│   ├── config.py                # Settings class (pydantic-settings), reads .env
│   │                            #   - DATABASE_URL, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, CORS_ORIGINS
│   ├── database.py              # Async engine (asyncpg), async_sessionmaker, Base (DeclarativeBase), get_db()
│   │
│   ├── api/v1/                  # All API endpoints — one file per domain entity
│   │   ├── router.py            # Mounts all sub-routers. Health check at /api/v1/health
│   │   ├── auth.py              # POST /auth/login, POST /auth/change-password
│   │   ├── clients.py           # CRUD /clients (list, create, update, delete)
│   │   ├── drivers.py           # CRUD /drivers
│   │   ├── routes.py            # CRUD /routes
│   │   ├── pricings.py          # CRUD /pricings (with nested PricingLines)
│   │   ├── work_orders.py       # CRUD /work-orders (containers, pricing auto-fill)
│   │   ├── trip_orders.py       # CRUD /trip-orders (work order matching)
│   │   ├── reconcile.py         # POST /reconcile (match work order → trip order)
│   │   ├── salary.py            # POST /salary/calculate, GET /salary/periods
│   │   └── salary_config.py     # GET/PUT /salary-config
│   │
│   ├── core/
│   │   ├── deps.py              # Dependency injectors:
│   │   │                        #   get_current_user — decodes JWT, loads User from DB
│   │   │                        #   require_roles(*roles) — factory, returns dependency that checks role
│   │   └── security.py          # hash_password, verify_password, create_access_token, decode_access_token
│   │
│   ├── models/
│   │   ├── __init__.py          # Re-exports ALL models — required for Alembic autogenerate discovery
│   │   ├── base.py              # User model (phone, username, role, company_id, tractor_plate)
│   │   └── domain.py            # All domain models (see Database Models below)
│   │
│   ├── schemas/
│   │   ├── __init__.py          # Re-exports
│   │   ├── base.py              # Auth schemas: LoginRequest, TokenResponse, LoginResponse,
│   │   │                        #   UserOut, UserCreate, UserUpdate, ChangePassword
│   │   └── domain.py            # Create/Update/Out schemas for each domain entity
│   │
│   └── services/
│       └── pricing_service.py   # find_pricing(db, company_id, client_id, work_type, route) → Pricing | None
│
├── alembic/
│   ├── env.py                   # Migration env — imports all models for autogenerate
│   └── versions/                # Migration files
│       └── 001_initial_schema.py
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
| `companies` | `Company` | name | — | — |
| `users` | `User` | phone (unique), username, role, company_id, is_active, tractor_plate | role: superadmin/director/accountant/driver | — |
| `clients` | `Client` | company_id, name, type, phone, tax_code, outstanding_debt (int) | type: company/individual | — |
| `routes` | `Route` | company_id, route, type_20ft, type_40ft (int VND), is_two_way | — | — |
| `pricings` | `Pricing` | company_id, client_id, client_name, work_type, route, unit_price, driver_salary, allowance | work_type: E20/E40/F20/F40 | `PricingLine` (CASCADE) |
| `pricing_lines` | `PricingLine` | pricing_id (CASCADE), work_type, quantity | — | — |
| `work_orders` | `WorkOrder` | company_id, client_id, client_name, route, driver_id, driver_name, tractor_plate, unit_price, driver_salary, allowance, earning, pricing_id | status: PENDING/PRICED/MATCHED | `WorkOrderContainer` (CASCADE) |
| `work_order_containers` | `WorkOrderContainer` | work_order_id (CASCADE), container_number, work_type, photo_url | work_type: E20/E40/F20/F40 | — |
| `trip_orders` | `TripOrder` | company_id, trip_date, client_id, client_name, work_type, route, driver_id, driver_name, container_number, pricing_id, unit_price, driver_salary, allowance, revenue | status: DRAFT/CONFIRMED/INVOICED/CANCELLED | `TripOrderWorkOrder` |
| `trip_order_work_orders` | `TripOrderWorkOrder` | trip_order_id (CASCADE, PK), work_order_id (PK) | — | — |
| `salary_periods` | `SalaryPeriod` | company_id, driver_id, driver_name, start_date, end_date, work_order_count, price_per_order, total_salary, total_allowance, total_deduction, net_pay | status: OPEN/CALCULATED/PAID | — |
| `salary_period_configs` | `SalaryPeriodConfig` | company_id (unique), from_day (1–28), to_day (1–28) | — | — |

---

## Key Patterns

### Multi-tenancy
Every model has `company_id`. All endpoint queries filter by `current_user.company_id`:
```python
result = await db.execute(
    select(Client).where(Client.company_id == current_user.company_id)
)
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
# Protect an endpoint:
@router.get("/clients", response_model=list[ClientOut])
async def list_clients(
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
```

### CRUD Endpoint Pattern
See `clients.py` for the canonical example:
```python
router = APIRouter()

@router.get("/clients", response_model=list[ClientOut])       # List (company-scoped)
@router.post("/clients", response_model=ClientOut, status_code=201)  # Create
@router.put("/clients/{client_id}", response_model=ClientOut)  # Update (partial)
@router.delete("/clients/{client_id}", status_code=204)        # Delete
```

---

## How-To Recipes

### Add a New API Endpoint File

1. Create `app/api/v1/<entity>.py` — copy pattern from `clients.py`
2. Create schemas: `XxxCreate`, `XxxUpdate`, `XxxOut` in `app/schemas/domain.py`
3. Create model in `app/models/domain.py` (if new table needed)
4. Re-export model in `app/models/__init__.py`
5. Register router in `app/api/v1/router.py`:
   ```python
   from app.api.v1.<entity> import router as <entity>_router
   router.include_router(<entity>_router)
   ```
6. Create migration: `alembic revision --autogenerate -m "add <entity>"`
7. Apply migration: `alembic upgrade head`

### Add a New Database Model

1. Add model class to `app/models/domain.py` — include `company_id` for multi-tenancy
2. Re-export in `app/models/__init__.py`:
   ```python
   from .domain import NewModel  # noqa: F401
   ```
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
2. Import and use in endpoint files:
   ```python
   from app.services.pricing_service import find_pricing
   pricing = await find_pricing(db, company_id, client_id, work_type, route)
   ```

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
```

---

## Environment Variables

Set in `.env` (see `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/vantaihanghoa` | PostgreSQL connection string |
| `SECRET_KEY` | `change-me-to-a-random-secret-key` | JWT signing key |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Token lifetime |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Comma-separated allowed origins |
