.PHONY: help install migrate dev-backend dev-frontend lint deploy

## help: Print a description of all available targets
help:
	@echo "Available targets:"
	@echo "  install       Install Python and Node dependencies"
	@echo "  migrate       Run Alembic database migrations (alembic upgrade head)"
	@echo "  dev-backend   Start the FastAPI backend with hot-reload"
	@echo "  dev-frontend  Start the Vite frontend dev server"
	@echo "  lint          Run ruff (backend) and eslint (frontend)"
	@echo "  deploy        Build frontend, rsync to droplet, restart backend service"

## install: Install Python dependencies (backend) and Node dependencies (frontend)
install:
	cd backend && pip install -r requirements.txt
	cd frontend && pnpm install

## migrate: Run Alembic migrations against the configured DATABASE_URL
migrate:
	cd backend && PYTHONPATH=. alembic upgrade head

## dev-backend: Start the FastAPI backend with uvicorn --reload
dev-backend:
	cd backend && PYTHONPATH=. uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

## dev-frontend: Start the Vite frontend dev server
dev-frontend:
	cd frontend && pnpm dev

## lint: Run ruff on backend and eslint on frontend
lint:
	cd backend && ruff check .
	cd frontend && pnpm eslint src

## deploy: Build frontend, rsync to droplet, run migrations, restart backend service
## Requires DROPLET_HOST and DROPLET_USER env vars (e.g. DROPLET_HOST=1.2.3.4 DROPLET_USER=deploy)
deploy:
	@if [ -z "$(DROPLET_HOST)" ]; then echo "Error: DROPLET_HOST is not set"; exit 1; fi
	@if [ -z "$(DROPLET_USER)" ]; then echo "Error: DROPLET_USER is not set"; exit 1; fi
	cd frontend && pnpm build
	rsync -avz --delete frontend/dist/ $(DROPLET_USER)@$(DROPLET_HOST):/var/www/vantaiphucloc/frontend/dist/
	rsync -avz --delete --exclude '__pycache__' --exclude '*.pyc' --exclude '.env' \
		backend/ $(DROPLET_USER)@$(DROPLET_HOST):/opt/vantaiphucloc/backend/
	ssh $(DROPLET_USER)@$(DROPLET_HOST) \
		"cd /opt/vantaiphucloc/backend && PYTHONPATH=. alembic upgrade head && systemctl restart vantaiphucloc-backend"
