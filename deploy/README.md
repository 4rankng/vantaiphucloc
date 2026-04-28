# Droplet Setup Guide

One-time setup steps for deploying Vantaiphucloc on a DigitalOcean Ubuntu 24.04 droplet.

**Domain:** `phucloc.tingting.vip`

## Port & Network Security

All Docker service ports are bound to `127.0.0.1` so they are **only accessible from the droplet itself**. Nginx acts as the sole public entrypoint, proxying to backend and frontend over localhost.

| Service | Port | Exposed to | Purpose |
|---------|------|------------|---------|
| Nginx | 80, 443 | **Public** | Reverse proxy, SSL termination |
| Backend | 8000 | 127.0.0.1 only | FastAPI (proxied by Nginx) |
| Frontend | 3000 | 127.0.0.1 only | Static files (proxied by Nginx) |
| Adminer | 8081 | 127.0.0.1 only | DB admin (access via SSH tunnel) |
| Redis | 6379 | Internal only | Docker network, no host port |
| PostgreSQL | 5432 | Local socket only | System service, no remote access |

**Never** open Redis (6379), PostgreSQL (5432), or Adminer (8081) in the firewall. To access Adminer remotely, use an SSH tunnel:

```bash
ssh -L 8081:127.0.0.1:8081 user@your-droplet-ip
# Then open http://localhost:8081 in your browser
```

## 1. System packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx postgresql postgresql-contrib \
    curl git build-essential libssl-dev zlib1g-dev \
    libbz2-dev libreadline-dev libsqlite3-dev libffi-dev liblzma-dev
```

## 2. Configure Firewall (UFW)

Only allow SSH, HTTP, and HTTPS. Database and internal services must not be exposed.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

## 3. Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for group change to take effect

# Verify
docker --version
docker compose version
```

## 4. Set up PostgreSQL

```bash
sudo -u postgres psql -c "CREATE USER vantaiphucloc WITH PASSWORD 'your-db-password';"
sudo -u postgres psql -c "CREATE DATABASE vantaiphucloc OWNER vantaiphucloc;"
```

## 5. Create environment file

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your production values
```

## 6. Deploy with Docker Compose

```bash
# Copy source to droplet
rsync -avz --exclude 'node_modules' --exclude '.git' \
    ./ vantaiphucloc@your-droplet-ip:/opt/vantaiphucloc/

# On the droplet
cd /opt/vantaiphucloc
docker compose up -d --build

# Run migrations
docker compose exec backend alembic upgrade head
```

## 7. Configure Nginx

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/vantaiphucloc
sudo ln -s /etc/nginx/sites-available/vantaiphucloc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 8. SSL with Let's Encrypt (Certbot)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d phucloc.tingting.vip
# Certbot will automatically update the nginx.conf with SSL settings
sudo systemctl reload nginx
```

## 9. Deploy frontend (first time)

```bash
# Build locally
cd frontend && pnpm build

# Copy to droplet
rsync -avz --delete frontend/dist/ vantaiphucloc@your-droplet-ip:/var/www/vantaiphucloc/frontend/dist/
```

## Subsequent deployments

```bash
# Copy source to droplet
rsync -avz --exclude 'node_modules' --exclude '.git' \
    ./ vantaiphucloc@your-droplet-ip:/opt/vantaiphucloc/

# On the droplet: rebuild and restart
cd /opt/vantaiphucloc
docker compose up -d --build
docker compose exec backend alembic upgrade head
```

## Useful commands

```bash
# View backend logs
docker compose logs -f backend

# Restart services
docker compose restart

# Stop all services
docker compose down

# Check Nginx status
sudo systemctl status nginx

# Test Nginx config
sudo nginx -t
```
