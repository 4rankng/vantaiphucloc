.PHONY: help install migrate dev dev-backend dev-frontend dev-worker lint deploy seed adminer

## help: Print a description of all available targets
help:
	@echo "Available targets:"
	@echo "  install       Install Python and Node dependencies"
	@echo "  migrate       Run Alembic database migrations (alembic upgrade head)"
	@echo "  seed          Create initial admin user (admin/admin123)"
	@echo "  dev           Start backend, frontend, worker, and adminer concurrently"
	@echo "  dev-backend   Start the FastAPI backend with hot-reload"
	@echo "  dev-frontend  Start the Vite frontend dev server"
	@echo "  lint          Run ruff (backend) and eslint (frontend)"
	@echo "  deploy        Build frontend, rsync to droplet, run migrations, seed, restart"
	@echo "  adminer       Start Adminer (DB management UI) on port 8081"

## install: Install Python dependencies (backend) and Node dependencies (frontend)
install:
	cd backend && pip install -r requirements.txt
	cd frontend && pnpm install

## migrate: Run Alembic migrations against the configured DATABASE_URL
migrate:
	cd backend && PYTHONPATH=. alembic upgrade head

## dev: Start PostgreSQL, Redis, backend, frontend, worker, and adminer concurrently
dev:
	@docker start vantai-postgres 2>/dev/null || docker run -d --name vantai-postgres \
		-e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=vantaihanghoa \
		-p 5432:5432 postgres:16-alpine
	@docker start vantai-redis 2>/dev/null || docker run -d --name vantai-redis \
		-p 6379:6379 redis:7-alpine redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru
	@sleep 1
	cd backend && PYTHONPATH=. alembic upgrade head
	@trap 'kill 0' INT; \
	cd backend && PYTHONPATH=. uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 & \
	cd backend && PYTHONPATH=. arq app.workers.worker.WorkerSettings & \
	cd frontend && pnpm dev & \
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

## deploy: Build frontend, rsync to droplet, run migrations, seed admin, restart backend service
## Requires DROPLET_HOST and DROPLET_USER env vars (e.g. DROPLET_HOST=1.2.3.4 DROPLET_USER=deploy)
deploy:
	@if [ -z "$(DROPLET_HOST)" ]; then echo "Error: DROPLET_HOST is not set"; exit 1; fi
	@if [ -z "$(DROPLET_USER)" ]; then echo "Error: DROPLET_USER is not set"; exit 1; fi
	cd frontend && pnpm build
	rsync -avz --delete frontend/dist/ $(DROPLET_USER)@$(DROPLET_HOST):/var/www/vantaiphucloc/frontend/dist/
	rsync -avz --delete --exclude '__pycache__' --exclude '*.pyc' --exclude '.env' \
		backend/ $(DROPLET_USER)@$(DROPLET_HOST):/opt/vantaiphucloc/backend/
	ssh $(DROPLET_USER)@$(DROPLET_HOST) \
		"cd /opt/vantaiphucloc/backend && PYTHONPATH=. alembic upgrade head && PYTHONPATH=. python -m app.seed && systemctl restart vantaiphucloc-backend"
