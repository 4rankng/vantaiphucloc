.PHONY: help install migrate dev dev-infra dev-backend dev-frontend dev-worker lint seed stop clean \
        push-all deploy-all push-backend push-frontend deploy-backend deploy-frontend \
        api-test test test-backend test-frontend backup adminer-on adminer-off

# ── Config ─────────────────────────────────────────────────────────────────────
# Override with: make dev BACKEND_PORT=9000 FRONTEND_PORT=5180
BACKEND_PORT  ?= 8100
PROD_SERVER   := phucloc.tingting.vip
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
	@echo "  api-test         Run integration + smoke tests against live dev backend"
	@echo "  lint             Run ruff (backend) and eslint (frontend)"
	@echo "  test             Run all checks (backend lint+format+tests, frontend lint+build+tests)"
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
	@echo "  backup           Dump production PostgreSQL DB → OneDrive"
	@echo "  restore          Restore latest backup to local dev DB"
	@echo "  adminer-on       Enable adminer access on production (start container)"
	@echo "  adminer-off      Disable adminer access on production (stop container)"

# ── Install & DB ───────────────────────────────────────────────────────────────

## install: Install Python dependencies (backend) and Node dependencies (frontend)
install:
	cd backend && pip install -r requirements.txt
	cd frontend && pnpm install

## migrate: Run Alembic migrations against the configured DATABASE_URL
migrate:
	cd backend && PYTHONPATH=. alembic upgrade head

## seed: Full dev seed — users, locations, partners, pricings, demo data. Safe to re-run.
seed:
	cd backend && PYTHONPATH=. python -m app.seed_dev

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
		arq --watch app app.workers.worker.WorkerSettings) & \
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
		arq --watch app app.workers.worker.WorkerSettings

# ── Cleanup ────────────────────────────────────────────────────────────────────

## clean: Kill stale dev processes, clear Vite cache, free ports
clean:
	@pkill -TERM -f "uvicorn app.main:app" 2>/dev/null || true
	@pkill -TERM -f "arq app.workers.worker" 2>/dev/null || true
	@pkill -TERM -f "vite" 2>/dev/null || true
	@rm -rf frontend/node_modules/.vite
	@sleep 1
	@lsof -ti :$(BACKEND_PORT),$(FRONTEND_PORT) 2>/dev/null | xargs -r kill -9 2>/dev/null || true
	@pkill -KILL -f "uvicorn app.main:app" 2>/dev/null || true
	@pkill -KILL -f "arq app.workers.worker" 2>/dev/null || true
	@for port in $(BACKEND_PORT) $(FRONTEND_PORT); do \
		if lsof -nP -iTCP:$$port -sTCP:LISTEN >/dev/null 2>&1; then \
			echo "✗ port $$port still in use after cleanup — aborting"; exit 1; \
		fi; \
	done

## api-test: Run integration + smoke tests against the live dev backend (localhost:8100)
api-test:
	@echo "Running API smoke tests against http://localhost:$(BACKEND_PORT)..."
	cd tests && python api_tests.py
	@echo ""
	@echo "Running integration tests against http://localhost:$(BACKEND_PORT)..."
	cd tests && pytest integration/ -v --tb=short -s

## lint: Run ruff on backend and eslint on frontend
lint:
	cd backend && ruff check .
	cd frontend && pnpm eslint src

# ── Test ────────────────────────────────────────────────────────────────────────

## test: Run all checks — backend lint + format check + unit tests, frontend lint + build + unit tests
test: test-backend test-frontend

## test-backend: Run ruff lint, ruff format check, and pytest
test-backend:
	@echo "── Backend: ruff lint ───────────────────"
	cd backend && ruff check .
	@echo "── Backend: ruff format check ───────────"
	cd backend && ruff format --check .
	@echo "── Backend: pytest ──────────────────────"
	cd backend && PYTHONPATH=. python -m pytest -q

## test-frontend: Run eslint, tsc build, and unit tests
test-frontend:
	@echo "── Frontend: eslint ─────────────────────"
	cd frontend && pnpm lint
	@echo "── Frontend: build ──────────────────────"
	cd frontend && pnpm build
	@echo "── Frontend: unit tests ─────────────────"
	cd frontend && pnpm test -- --run 2>/dev/null || echo "(no frontend tests configured)"

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

## restore: Restore latest backup from OneDrive to local dev PostgreSQL
restore:
	@BACKUP_DIR="/Users/dev/Library/CloudStorage/OneDrive-Personal/backup/phucloc_mysql_backup" && \
	LATEST=$$(ls -t "$$BACKUP_DIR"/phucloc_pg_backup_*.sql.gz 2>/dev/null | head -1) && \
	if [ -z "$$LATEST" ]; then echo "❌ No backup files found in $$BACKUP_DIR"; exit 1; fi && \
	echo "📂 Using backup: $$LATEST" && \
	echo "📊 Size: $$(du -h "$$LATEST" | cut -f1)" && \
	echo "⏳ Decompressing..." && \
	gunzip -k -f "$$LATEST" && \
	SQL_FILE="$${LATEST%.gz}" && \
	echo "🗑️  Terminating active connections and recreating local database..." && \
	docker exec vantai_postgres psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'vantaihanghoa' AND pid <> pg_backend_pid();" && \
	docker exec vantai_postgres psql -U postgres -c "DROP DATABASE IF EXISTS vantaihanghoa;" && \
	docker exec vantai_postgres psql -U postgres -c "CREATE DATABASE vantaihanghoa;" && \
	echo "📥 Restoring backup into local database..." && \
	docker exec -i vantai_postgres psql -U postgres -d vantaihanghoa < "$$SQL_FILE" && \
	echo "🧹 Cleaning up decompressed file..." && \
	rm -f "$$SQL_FILE" && \
	echo "🔑 Resetting all user passwords to admin123..." && \
	docker exec vantai_postgres psql -U postgres -d vantaihanghoa -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" && \
	docker exec vantai_postgres psql -U postgres -d vantaihanghoa -c "UPDATE users SET hashed_password = crypt('admin123', gen_salt('bf', 12));" && \
	echo "✅ Restore complete! All passwords set to admin123"

## backup: Dump production PostgreSQL DB to OneDrive
backup:
	@echo "💾 Starting database backup from production server..."
	@TIMESTAMP=$$(date +%Y-%m-%d_%H%M%S) && \
	BACKUP_DIR="/Users/dev/Library/CloudStorage/OneDrive-Personal/backup/phucloc_mysql_backup" && \
	BACKUP_FILE="phucloc_pg_backup_$$TIMESTAMP.sql" && \
	BACKUP_FILE_GZ="phucloc_pg_backup_$$TIMESTAMP.sql.gz" && \
	echo "📁 Creating backup directory if it doesn't exist..." && \
	mkdir -p "$$BACKUP_DIR" && \
	echo "🔗 Connecting to production server ($(PROD_SERVER))..." && \
	echo "📊 Creating PostgreSQL dump of vantaihanghoa database..." && \
	ssh root@$(PROD_SERVER) \
		"docker exec vantaiphucloc-postgres-1 \
		pg_dump -U vantaiphucloc vantaihanghoa > /tmp/$$BACKUP_FILE" && \
	echo "🗜️  Compressing backup file..." && \
	ssh root@$(PROD_SERVER) "gzip /tmp/$$BACKUP_FILE" && \
	echo "✅ Verifying backup file exists and is not empty..." && \
	ssh root@$(PROD_SERVER) \
		"if [ ! -s /tmp/$$BACKUP_FILE_GZ ]; then echo '❌ Backup file is empty!'; exit 1; fi" && \
	echo "📥 Downloading backup to local machine..." && \
	scp root@$(PROD_SERVER):/tmp/$$BACKUP_FILE_GZ "$$BACKUP_DIR/$$BACKUP_FILE_GZ" && \
	echo "🧹 Cleaning up temp file on server..." && \
	ssh root@$(PROD_SERVER) "rm -f /tmp/$$BACKUP_FILE_GZ" && \
	echo "✅ Backup complete!" && \
	echo "📂 Saved to: $$BACKUP_DIR/$$BACKUP_FILE_GZ" && \
	echo "📊 Size: $$(du -h "$$BACKUP_DIR/$$BACKUP_FILE_GZ" | cut -f1)"

# ── Adminer toggle ─────────────────────────────────────────────────────────────

## adminer-on: Start adminer container on production (accessible via nginx /adminer with basic auth)
adminer-on:
	@echo "🔓 Enabling adminer on production..."
	@ssh root@$(PROD_SERVER) "cd /opt/vantaiphucloc && docker compose start adminer"
	@echo "✅ Adminer is now accessible at: https://$(PROD_SERVER)/adminer"
	@echo "🔐 Login: check /etc/nginx/.htpasswd on server"

## adminer-off: Stop adminer container on production (disables /adminer endpoint)
adminer-off:
	@echo "🔒 Disabling adminer on production..."
	@ssh root@$(PROD_SERVER) "cd /opt/vantaiphucloc && docker compose stop adminer"
	@echo "✅ Adminer container stopped — /adminer endpoint disabled"
