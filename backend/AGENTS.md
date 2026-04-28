# AGENTS.md — Backend

> Update this file when adding/removing models, endpoints, services, or changing architecture.

## Quick Facts

- **Single-tenant** — Phúc Lộc only, no `company_id`, no `companies` table
- **Roles**: `superadmin`, `director`, `accountant`, `driver`
- **Auth**: phone/email/username + password → JWT
- **Money**: VND as `Integer`, no decimals
- **Drivers**: `vendor` string field (default "Phúc Lộc") for external vendor labeling

## Tech: FastAPI + SQLAlchemy 2.x async (asyncpg) + PostgreSQL + Alembic + Pydantic v2 + arq (Redis) + Redis cache

## Structure

```
app/
├── main.py                  # FastAPI app, CORS, mounts api_v1_router
├── config.py                # Settings (pydantic-settings, .env)
├── database.py              # Async engine, sessionmaker, Base, get_db()
├── api/v1/
│   ├── router.py            # Mounts sub-routers, health check, job status
│   ├── auth.py              # /auth/login, /auth/refresh, /auth/logout
│   ├── users.py             # CRUD /users (director/superadmin)
│   ├── clients.py           # CRUD /clients
│   ├── drivers.py           # CRUD /drivers
│   ├── routes.py            # CRUD /routes
│   ├── pricings.py          # CRUD /pricings (+ PricingLines)
│   ├── work_orders.py       # CRUD /work-orders (containers, pricing auto-fill)
│   ├── trip_orders.py       # CRUD /trip-orders (work order matching)
│   ├── reconcile.py         # POST /reconcile
│   ├── salary.py            # /salary/calculate, /salary/periods
│   ├── salary_config.py     # GET/PUT /salary-config
│   └── push.py              # Push subscription
├── core/
│   ├── deps.py              # get_current_user, require_roles(*roles)
│   ├── security.py          # hash/verify_password, create/decode JWT
│   ├── cache.py             # CacheManager: get/set/invalidate by namespace:id
│   ├── redis.py             # Redis pool
│   ├── rate_limit.py        # Login rate limiter
│   ├── identifier.py        # detect phone/email/username
│   └── worker.py            # arq pool lifecycle
├── models/
│   ├── __init__.py          # Re-exports ALL models (needed for Alembic)
│   ├── base.py              # User model
│   └── domain.py            # All domain models
├── schemas/
│   ├── base.py              # Auth schemas (LoginRequest, TokenResponse, UserOut, etc.)
│   └── domain.py            # Create/Update/Out per entity
├── services/
│   ├── pricing_service.py   # find_pricing(db, client_id, work_type, route)
│   ├── salary_service.py    # Salary period date calculation
│   ├── push_service.py      # Web push notifications
│   └── geocoding.py         # Reverse geocoding
└── workers/
    ├── __init__.py          # enqueue(), salary_recalc_job_id()
    ├── worker.py            # WorkerSettings (arq)
    └── tasks/               # salary, reports, notifications, geocoding, cleanup
```

## Database (12 tables)

| Table | Key Columns | Notes |
|---|---|---|
| `users` | phone, email, username, role, vendor, tractor_plate | role: superadmin/director/accountant/driver |
| `clients` | name, type, phone, tax_code, outstanding_debt | type: company/individual |
| `routes` | route, type_20ft, type_40ft, is_two_way | Prices in VND int |
| `pricings` | client_id, client_name, work_type, route, unit_price, driver_salary, allowance | Has `pricing_lines` (CASCADE) |
| `work_orders` | client_id/name, driver_id/name, tractor_plate, unit_price, driver_salary, earning | status: PENDING/PRICED/MATCHED. Has `work_order_containers` (CASCADE) |
| `trip_orders` | trip_date, client_id/name, driver_id/name, container_number, revenue | status: DRAFT/CONFIRMED/INVOICED/CANCELLED. Has `trip_order_work_orders` |
| `salary_periods` | driver_id/name, dates, work_order_count, total_salary, net_pay | status: OPEN/CALCULATED/PAID |
| `salary_period_configs` | from_day, to_day | Singleton row |

**No `company_id` on any table. No `companies` table.**

## Key Patterns

```python
# Auth: role-gated endpoints
@router.get("/clients")
async def list_clients(
    current_user: User = Depends(require_roles("accountant", "director", "superadmin")),
    db: AsyncSession = Depends(get_db),
):

# Cache: namespace:id keys (no company_id)
await cache.set_json("clients", "list", data, ttl=300)
await cache.invalidate_namespace("clients")

# Three-schema pattern per entity
class ClientCreate(BaseModel): ...    # POST body
class ClientUpdate(BaseModel): ...    # PUT body (all Optional)
class ClientOut(BaseModel): ...       # Response (+ ConfigDict(from_attributes=True))

# Background jobs
from app.workers import enqueue, salary_recalc_job_id
await enqueue("calculate_salary_task", _job_id=job_id, driver_id=driver_id, ...)

# Money: always Integer (VND)
unit_price = Column(Integer, nullable=False)
```

- **Denormalized display**: `client_name`, `driver_name` stored on WorkOrder/TripOrder (no JOINs)
- **Cascade deletes**: `ondelete="CASCADE"` on all parent-child FKs

## Commands

```bash
uvicorn app.main:app --reload    # Dev server
pytest                            # Tests
alembic revision --autogenerate -m "desc"  # Create migration
alembic upgrade head              # Apply migrations
python -m app.seed                # Seed admin user
```

## Env (.env)

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/vantaihanghoa` | Postgres |
| `SECRET_KEY` | `change-me` | JWT signing |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Token lifetime |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Allowed origins |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis |
