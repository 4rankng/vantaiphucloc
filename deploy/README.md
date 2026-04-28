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

## 3. Node.js and pnpm

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g pnpm
```

## 4. Create system user

```bash
sudo useradd --system --shell /bin/bash --create-home vantaiphucloc
```

## 4. Set up PostgreSQL

```bash
sudo -u postgres psql -c "CREATE USER vantaiphucloc WITH PASSWORD 'your-db-password';"
sudo -u postgres psql -c "CREATE DATABASE vantaiphucloc OWNER vantaiphucloc;"
```

## 5. Create application directories

```bash
sudo mkdir -p /opt/vantaiphucloc/backend
sudo mkdir -p /var/www/vantaiphucloc/frontend/dist
sudo chown -R vantaiphucloc:vantaiphucloc /opt/vantaiphucloc /var/www/vantaiphucloc
```

## 6. Create Python virtual environment

```bash
sudo -u vantaiphucloc python3.14 -m venv /opt/vantaiphucloc/venv
```

## 7. Create environment file

```bash
sudo mkdir -p /etc/vantaiphucloc
sudo tee /etc/vantaiphucloc/.env > /dev/null <<EOF
DATABASE_URL=postgresql://vantaiphucloc:your-db-password@localhost:5432/vantaiphucloc
SECRET_KEY=your-random-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
CORS_ORIGINS=https://phucloc.tingting.vip
EOF
sudo chmod 600 /etc/vantaiphucloc/.env
sudo chown vantaiphucloc:vantaiphucloc /etc/vantaiphucloc/.env
```

## 8. Deploy backend (first time)

```bash
# Copy backend source
rsync -avz backend/ vantaiphucloc@your-droplet-ip:/opt/vantaiphucloc/backend/

# Install Python dependencies
sudo -u vantaiphucloc /opt/vantaiphucloc/venv/bin/pip install -r /opt/vantaiphucloc/backend/requirements.txt

# Run migrations
sudo -u vantaiphucloc bash -c "cd /opt/vantaiphucloc/backend && PYTHONPATH=. /opt/vantaiphucloc/venv/bin/alembic upgrade head"
```

## 9. Install and start the systemd service

```bash
sudo cp deploy/vantaiphucloc-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable vantaiphucloc-backend
sudo systemctl start vantaiphucloc-backend
sudo systemctl status vantaiphucloc-backend
```

## 10. Configure Nginx

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/vantaiphucloc
sudo ln -s /etc/nginx/sites-available/vantaiphucloc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 11. SSL with Let's Encrypt (Certbot)

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

Use `make deploy` from the project root (requires `DROPLET_HOST` and `DROPLET_USER` env vars):

```bash
DROPLET_HOST=your-droplet-ip DROPLET_USER=vantaiphucloc make deploy
```

## Useful commands

```bash
# View backend logs
sudo journalctl -u vantaiphucloc-backend -f

# Restart backend
sudo systemctl restart vantaiphucloc-backend

# Check Nginx status
sudo systemctl status nginx

# Test Nginx config
sudo nginx -t
```
