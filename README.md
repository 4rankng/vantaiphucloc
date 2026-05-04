# Vantaiphucloc

Container-trucking management for Phúc Lộc Transport (Hải Phòng). FastAPI backend + React/Vite frontend + Postgres + Redis + arq.

For business logic, domain model, and architecture see **[BizLogic.md](./BizLogic.md)** — single source of truth.

## Prerequisites

- Docker + Docker Compose (Postgres + Redis)
- Python 3.11+
- Node 20+ with pnpm

## Local dev — backend

```bash
docker compose up -d postgres redis
cd backend
pip install -r requirements.txt
PYTHONPATH=. alembic upgrade head
uvicorn app.main:app --reload
```

## Local dev — frontend

```bash
cd frontend
pnpm install
pnpm dev
```

## Master data seeders (idempotent)

```bash
./scripts/seeds/seed_customers.py --from-files docs/*.xlsx docs/*.xls
./scripts/seeds/seed_locations_from_files.py --files docs/*.xlsx docs/*.xls
./scripts/seeds/seed_pricing_from_files.py --format pan --client-code PAN \
    --files "docs/PAN- BK SL T04.26 (HD).xlsx"
./scripts/seeds/seed_routes_from_files.py --files docs/*.xlsx docs/*.xls
```

See [`scripts/seeds/README.md`](./scripts/seeds/README.md) for the full sequence.

## Tests

```bash
cd backend && pytest
cd frontend && pnpm exec tsc --noEmit && pnpm exec vite build
```

## Deployment

`make deploy-all` pushes Docker images and triggers a droplet deploy. CI artefacts and deploy notes are not in this repo.
