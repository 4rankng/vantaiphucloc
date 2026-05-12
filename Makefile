.PHONY: help install migrate dev dev-infra dev-backend dev-frontend dev-worker lint seed stop clean \
        push-all deploy-all push-backend push-frontend deploy-backend deploy-frontend \
        api-test

# ── Config ─────────────────────────────────────────────────────────────────────
# Override with: make dev BACKEND_PORT=9000 FRONTEND_PORT=5180
BACKEND_PORT  ?= 8100
FRONTEND_PORT ?= 5174
ADMINER_PORT  ?= 8083
POSTGRES_PORT ?= 5433
REDIS_PORT    ?= 6381

# ── Help ───────────────────────────────────────────────────────────────────────

## help: Print a description of all available targets
help:
	@echo "Development:"
	@echo "  install          Install Python and Node dependencies"
	@echo "  migrate          Run Alembic database migrations"
	@echo "  seed             Create initial admin user (admin/admin123)"
	@echo "  dev              Start infra + backend + frontend + worker"
	@echo "  dev-infra        Start PostgreSQL, Redis, Adminer in Docker"
	@echo "  dev-backend      Start FastAPI backend with hot-reload"
	@echo "  dev-frontend     Start Vite frontend dev server"
	@echo "  dev-worker       Start arq background worker"
	@echo "  stop             Stop all Docker infra services"
	@echo "  clean            Kill stale dev processes"
	@echo "  api-test         Run integration tests against live dev backend"
	@echo "  lint             Run ruff (backend) and eslint (frontend)"
	@echo ""
	@echo "Ports (override with env vars):"
	@echo "  BACKEND_PORT=$(BACKEND_PORT)  FRONTEND_PORT=$(FRONTEND_PORT)"
	@echo "  POSTGRES_PORT=$(POSTGRES_PORT)  REDIS_PORT=$(REDIS_PORT)  ADMINER_PORT=$(ADMINER_PORT)"
	@echo ""
	@echo "Production deploy (Docker Hub → droplet):"
	@echo "  push-all         Build & push all images to Docker Hub"
	@echo "  push-backend     Build & push backend image"
	@echo "  push-frontend    Build & push frontend image"
	@echo "  deploy-all       Pull & restart all services on droplet"
	@echo "  deploy-backend   Pull & restart backend + worker on droplet"
	@echo "  deploy-frontend  Pull & restart frontend on droplet"

# ── Install & DB ───────────────────────────────────────────────────────────────

## install: Install Python dependencies (backend) and Node dependencies (frontend)
install:
	cd backend && pip install -r requirements.txt
	cd frontend && pnpm install

## migrate: Run Alembic migrations against the configured DATABASE_URL
migrate:
	cd backend && PYTHONPATH=. alembic upgrade head

## seed: Create initial superadmin user (admin/admin123). Safe to re-run.
seed:
	cd backend && PYTHONPATH=. python -m app.seed

# ── Docker Infra ───────────────────────────────────────────────────────────────

## dev-infra: Start PostgreSQL, Redis, Adminer in Docker (named: vantai_*)
dev-infra:
	@docker compose -f docker-compose.dev.yml up -d
	@echo ""
	@echo "  PostgreSQL  →  localhost:$(POSTGRES_PORT)"
	@echo "  Redis       →  localhost:$(REDIS_PORT)"
	@echo "  Adminer     →  http://localhost:$(ADMINER_PORT)"

## stop: Stop all Docker infra services
stop:
	@docker compose -f docker-compose.dev.yml down
	@echo "Infra stopped."

# ── Dev (full stack) ──────────────────────────────────────────────────────────

## dev: Start infra + backend + frontend + worker concurrently
dev: clean dev-infra
	@# Wait for Postgres to be ready
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		docker exec vantai_postgres pg_isready -U postgres -d vantaihanghoa >/dev/null 2>&1 && break; \
		sleep 1; \
	done
	cd backend && PYTHONPATH=. alembic upgrade head
	@echo ""
	@echo "  Backend     →  http://localhost:$(BACKEND_PORT)"
	@echo "  Frontend    →  http://localhost:$(FRONTEND_PORT)"
	@echo "  Adminer     →  http://localhost:$(ADMINER_PORT)"
	@echo ""
	@trap 'kill -TERM %1 %2 %3 2>/dev/null' INT TERM; \
	(cd backend && PYTHONPATH=. DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:$(POSTGRES_PORT)/vantaihanghoa" \
		REDIS_URL="redis://localhost:$(REDIS_PORT)/0" \
		CORS_ORIGINS="http://localhost:$(FRONTEND_PORT),http://localhost:3000" \
		uvicorn app.main:app --reload --host 0.0.0.0 --port $(BACKEND_PORT)) & \
	(cd backend && PYTHONPATH=. DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:$(POSTGRES_PORT)/vantaihanghoa" \
		REDIS_URL="redis://localhost:$(REDIS_PORT)/0" \
		arq app.workers.worker.WorkerSettings) & \
	(cd frontend && VITE_API_BASE=http://localhost:$(BACKEND_PORT)/api/v1 pnpm dev --port $(FRONTEND_PORT)) & \
	wait

## dev-backend: Start the FastAPI backend with uvicorn --reload
dev-backend:
	cd backend && PYTHONPATH=. \
		DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:$(POSTGRES_PORT)/vantaihanghoa" \
		REDIS_URL="redis://localhost:$(REDIS_PORT)/0" \
		CORS_ORIGINS="http://localhost:$(FRONTEND_PORT),http://localhost:3000" \
		uvicorn app.main:app --reload --host 0.0.0.0 --port $(BACKEND_PORT)

## dev-frontend: Start the Vite frontend dev server
dev-frontend:
	cd frontend && VITE_API_BASE=http://localhost:$(BACKEND_PORT)/api/v1 pnpm dev --port $(FRONTEND_PORT)

## dev-worker: Start the arq background worker
dev-worker:
	cd backend && PYTHONPATH=. \
		DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:$(POSTGRES_PORT)/vantaihanghoa" \
		REDIS_URL="redis://localhost:$(REDIS_PORT)/0" \
		arq app.workers.worker.WorkerSettings

# ── Cleanup ────────────────────────────────────────────────────────────────────

## clean: Kill stale dev processes and free ports
clean:
	@pkill -TERM -f "uvicorn app.main:app" 2>/dev/null || true
	@pkill -TERM -f "arq app.workers.worker" 2>/dev/null || true
	@pkill -TERM -f "vite" 2>/dev/null || true
	@sleep 1
	@lsof -ti :$(BACKEND_PORT),$(FRONTEND_PORT) 2>/dev/null | xargs -r kill -9 2>/dev/null || true
	@pkill -KILL -f "uvicorn app.main:app" 2>/dev/null || true
	@pkill -KILL -f "arq app.workers.worker" 2>/dev/null || true
	@for port in $(BACKEND_PORT) $(FRONTEND_PORT); do \
		if lsof -nP -iTCP:$$port -sTCP:LISTEN >/dev/null 2>&1; then \
			echo "✗ port $$port still in use after cleanup — aborting"; exit 1; \
		fi; \
	done

## api-test: Run integration tests against the live dev backend (localhost:8100)
api-test:
	@echo "Running integration tests against http://localhost:$(BACKEND_PORT)..."
	cd tests && pytest integration/ -v --tb=short -s

## lint: Run ruff on backend and eslint on frontend
lint:
	cd backend && ruff check .
	cd frontend && pnpm eslint src

# ── Production deploy ──────────────────────────────────────────────────────────

## push-backend: Build & push backend image to Docker Hub
push-backend:
	$(MAKE) -C backend push

## push-frontend: Build & push frontend image to Docker Hub
push-frontend:
	$(MAKE) -C frontend push

## push-all: Build & push all images to Docker Hub
push-all: push-backend push-frontend

## deploy-backend: Pull & restart backend + worker on droplet
deploy-backend:
	$(MAKE) -C backend deploy

## deploy-frontend: Pull & restart frontend on droplet
deploy-frontend:
	$(MAKE) -C frontend deploy

## deploy-all: Pull & restart all services on droplet
deploy-all: deploy-backend deploy-frontend
