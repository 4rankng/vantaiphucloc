# Droplet Setup Guide

One-time setup steps for deploying Vantaiphucloc on a DigitalOcean Ubuntu 24.04 droplet.

**Domain:** `phucloc.tingting.vip`

## 1. System packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx postgresql postgresql-contrib \
    curl git build-essential libssl-dev zlib1g-dev \
    libbz2-dev libreadline-dev libsqlite3-dev libffi-dev liblzma-dev
```

## 2. Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for group change to take effect

# Verify
docker --version
docker compose version
```

## 3. Set up PostgreSQL

```bash
sudo -u postgres psql -c "CREATE USER vantaiphucloc WITH PASSWORD 'your-db-password';"
sudo -u postgres psql -c "CREATE DATABASE vantaiphucloc OWNER vantaiphucloc;"
```

## 4. Create environment file

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your production values
```

## 5. Deploy with Docker Compose

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

## 6. Configure Nginx

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/vantaiphucloc
sudo ln -s /etc/nginx/sites-available/vantaiphucloc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 7. SSL with Let's Encrypt (Certbot)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d phucloc.tingting.vip
# Certbot will automatically update the nginx.conf with SSL settings
sudo systemctl reload nginx
```

## 12. Deploy frontend (first time)

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
