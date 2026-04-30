# Droplet Deployment Guide

Deploy Vantaiphucloc to a DigitalOcean droplet using pre-built Docker images.

**Domain:** `phucloc.tingting.vip`
**Images:** `franknguyenvd/phucloc-backend:latest`, `franknguyenvd/phucloc-frontend:latest`

## Architecture

```
Internet → Nginx (host) → :443 SSL
                          ├── /api/*  → backend container (:8000)
                          └── /*      → frontend container (:80)

Docker containers:
  postgres:16-alpine   (persistent volume)
  redis:7-alpine       (persistent volume)
  backend              (FastAPI)
  worker               (arq background jobs, same image as backend)
  frontend             (nginx serving built SPA)
```

All container ports bound to `127.0.0.1` — host Nginx is the sole public entrypoint.

## One-time Droplet Setup

### 1. Create the droplet

```bash
doctl compute droplet create vantaiphucloc \
  --image ubuntu-24-04-x64 \
  --size s-2vcpu-4gb \
  --user-data-file cloud-init.yaml \
  --enable-monitoring \
  --ssh-keys <your-key-id>
```

### 2. DNS

Point `phucloc.tingting.vip` → droplet IP (A record).

### 3. Wait for cloud-init

```bash
ssh root@phucloc.tingting.vip
cloud-init status --wait    # should say "done"
```

Cloud-init installs Docker, Nginx, Certbot, pulls images, and starts all containers.

### 4. SSL certificate

```bash
sudo certbot --nginx -d phucloc.tingting.vip
```

### 5. Create the production env file

The compose file reads secrets from `deploy/.env` (relative to `/opt/vantaiphucloc`).

```bash
# Generate a secret key
SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

# Create the env file
cat > /opt/vantaiphucloc/deploy/.env <<EOF
SECRET_KEY=${SECRET}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=https://phucloc.tingting.vip
ENVIRONMENT=production
EOF
```

### 6. Initial database setup

```bash
cd /opt/vantaiphucloc

# Run migrations
docker compose -f deploy/docker-compose.prod.yml exec backend alembic upgrade head

# Seed admin user (admin / admin123)
docker compose -f deploy/docker-compose.prod.yml exec backend python -m app.seed
```

### 7. Restart to pick up the env file

```bash
docker compose -f deploy/docker-compose.prod.yml up -d --force-recreate backend worker
```

## Ongoing Deployments

From your local machine:

```bash
# Build & push images to Docker Hub
make -C backend push      # → franknguyenvd/phucloc-backend:latest
make -C frontend push     # → franknguyenvd/phucloc-frontend:latest

# Pull & restart on droplet
make -C backend deploy    # SSH → pull → restart backend + worker
make -C frontend deploy   # SSH → pull → restart frontend

# Or do everything at once from project root:
make push-all && make deploy-all
```

## Port & Network Security

| Service    | Port | Exposed to        | Purpose                    |
|------------|------|-------------------|----------------------------|
| Nginx      | 80, 443 | **Public**     | Reverse proxy, SSL         |
| Backend    | 8000 | 127.0.0.1 only    | FastAPI (proxied by Nginx) |
| Frontend   | 3000 | 127.0.0.1 only    | Static SPA (proxied)       |
| Redis      | 6379 | Internal only      | Docker network             |
| PostgreSQL | 5432 | Internal only      | Docker network             |

## Useful Commands

```bash
COMPOSE="docker compose -f deploy/docker-compose.prod.yml"

# View logs
$COMPOSE logs -f backend
$COMPOSE logs -f worker
$COMPOSE logs --tail=50

# Restart a service
$COMPOSE restart backend

# Pull latest images and recreate
$COMPOSE pull && $COMPOSE up -d --force-recreate

# Stop everything
$COMPOSE down

# Run a one-off migration
$COMPOSE exec backend alembic upgrade head

# Check container status
$COMPOSE ps

# Nginx
sudo nginx -t
sudo systemctl reload nginx
```
