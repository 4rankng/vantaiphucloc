.PHONY: help install migrate dev dev-backend dev-frontend dev-worker lint seed adminer push-all deploy-all push-backend push-frontend deploy-backend deploy-frontend

## help: Print a description of all available targets
help:
	@echo "Development:"
	@echo "  install          Install Python and Node dependencies"
	@echo "  migrate          Run Alembic database migrations"
	@echo "  seed             Create initial admin user (admin/admin123)"
	@echo "  dev              Start backend, frontend, worker, and adminer"
	@echo "  dev-backend      Start the FastAPI backend with hot-reload"
	@echo "  dev-frontend     Start the Vite frontend dev server"
	@echo "  dev-worker       Start the arq background worker"
	@echo "  lint             Run ruff (backend) and eslint (frontend)"
	@echo "  adminer          Start Adminer on port 8081"
	@echo ""
	@echo "Production deploy (Docker Hub → droplet):"
	@echo "  push-all         Build & push all images to Docker Hub"
	@echo "  push-backend     Build & push backend image"
	@echo "  push-frontend    Build & push frontend image"
	@echo "  deploy-all       Pull & restart all services on droplet"
	@echo "  deploy-backend   Pull & restart backend + worker on droplet"
	@echo "  deploy-frontend  Pull & restart frontend on droplet"

# ── Development ──────────────────────────────────────────────────────────────

## install: Install Python dependencies (backend) and Node dependencies (frontend)
install:
	cd backend && pip install -r requirements.txt
	cd frontend && pnpm install

## migrate: Run Alembic migrations against the configured DATABASE_URL
migrate:
	cd backend && PYTHONPATH=. alembic upgrade head

## dev: Start PostgreSQL, Redis, backend, frontend, worker, and adminer concurrently
dev:
	@echo "→ Cleaning stale dev processes..."
	@# Match by command pattern, not just port — a hung uvicorn that lost its port
	@# binding still holds DB connections. pkill -f catches orphans whose parent died.
	@pkill -TERM -f "uvicorn app.main:app" 2>/dev/null || true
	@pkill -TERM -f "arq app.workers.worker"  2>/dev/null || true
	@pkill -TERM -f "vite"                    2>/dev/null || true
	@sleep 1
	@# Anything still listening on our ports gets SIGKILL.
	@lsof -ti :8000,:5173 2>/dev/null | xargs -r kill -9 2>/dev/null || true
	@pkill -KILL -f "uvicorn app.main:app" 2>/dev/null || true
	@pkill -KILL -f "arq app.workers.worker"  2>/dev/null || true
	@# Verify the ports are actually free before going further.
	@for port in 8000 5173; do \
		if lsof -nP -iTCP:$$port -sTCP:LISTEN >/dev/null 2>&1; then \
			echo "✗ port $$port still in use after cleanup — aborting"; exit 1; \
		fi; \
	done
	@docker stop vantai-adminer 2>/dev/null || true
	@docker start vantai-postgres 2>/dev/null || docker run -d --name vantai-postgres \
		-e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=vantaihanghoa \
		-p 5432:5432 postgres:16-alpine
	@docker start vantai-redis 2>/dev/null || docker run -d --name vantai-redis \
		-p 6379:6379 redis:7-alpine redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru
	@# Wait until Postgres is ready to accept queries (start can take a few seconds
	@# on cold container).
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		docker exec vantai-postgres pg_isready -U postgres -d vantaihanghoa >/dev/null 2>&1 && break; \
		sleep 1; \
	done
	@# Server-side safety net: any transaction left idle for 60s gets terminated by
	@# Postgres itself, so a crashed dev process can never permanently pin pool slots.
	@docker exec vantai-postgres psql -U postgres -d vantaihanghoa -c \
		"ALTER SYSTEM SET idle_in_transaction_session_timeout = '60s';" >/dev/null 2>&1 || true
	@docker exec vantai-postgres psql -U postgres -d vantaihanghoa -c "SELECT pg_reload_conf();" >/dev/null 2>&1 || true
	@# Reap any leaked "idle in transaction" backends from a previous crash so we
	@# start with a clean DB pool. Connections orphaned by SIGKILL aren't reclaimed
	@# by Postgres until TCP keepalive fires (~hours).
	@docker exec vantai-postgres psql -U postgres -d vantaihanghoa -tc \
		"SELECT pg_terminate_backend(pid) FROM pg_stat_activity \
		 WHERE datname='vantaihanghoa' AND state='idle in transaction';" >/dev/null 2>&1 || true
	cd backend && PYTHONPATH=. alembic upgrade head
	@# SIGTERM (not -9) on Ctrl+C so uvicorn/arq can run lifespan handlers and
	@# close DB connections cleanly.
	@trap 'kill -TERM %1 %2 %3 %4 2>/dev/null' INT TERM; \
	(cd backend && PYTHONPATH=. uvicorn app.main:app --reload --host 0.0.0.0 --port 8000) & \
	(cd backend && PYTHONPATH=. arq app.workers.worker.WorkerSettings) & \
	(cd frontend && pnpm dev) & \
	docker run --rm --name vantai-adminer -p 8081:8080 -e ADMINER_DESIGN=pepa-linha adminer & \
	wait

## dev-backend: Start the FastAPI backend with uvicorn --reload
dev-backend:
	cd backend && PYTHONPATH=. uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

## dev-frontend: Start the Vite frontend dev server
dev-frontend:
	cd frontend && pnpm dev

## dev-worker: Start the arq background worker
dev-worker:
	cd backend && PYTHONPATH=. arq app.workers.worker.WorkerSettings

## seed: Create initial superadmin user (admin/admin123). Safe to re-run.
seed:
	cd backend && PYTHONPATH=. python -m app.seed

## adminer: Start Adminer DB management UI on http://localhost:8081
adminer:
	docker run --rm --name vantai-adminer -p 8081:8080 -e ADMINER_DESIGN=pepa-linha adminer

## lint: Run ruff on backend and eslint on frontend
lint:
	cd backend && ruff check .
	cd frontend && pnpm eslint src

# ── Production deploy ────────────────────────────────────────────────────────

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
