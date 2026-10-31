# VERA Production & VPS Deployment Guide

This guide details the procedure for deploying VERA to a Virtual Private Server (VPS) or cloud VM running Ubuntu 22.04 / 24.04 LTS with Docker Compose and Nginx.

---

## 1. Production Architecture Overview

```
Internet (Port 80 / 443)
       │
       ▼
[ NGINX Reverse Proxy ]
  ├── SSL/TLS Termination (Let's Encrypt)
  ├── Security Headers & Rate Limits
  └── Body Size Limit (50MB)
       │
       ▼ (Internal Docker Network)
[ Next.js VERA App ] (vera-app:3000)
       │
       ├── PostgreSQL 16 (vera-db:5432) [Volume: vera_postgres_data]
       ├── Persistent Evidence Storage  [Volume: vera_storage]
       ├── Blockchain JSON-RPC Node
       └── Gemini AI / Vision OCR API
```

---

## 2. Server Prerequisites

On your VPS (Ubuntu 22.04 LTS or newer):

```bash
# Update package repositories
sudo apt update && sudo apt upgrade -y

# Install Git, Docker, and Docker Compose
sudo apt install -y git curl docker.io docker-compose-v2
sudo systemctl enable --now docker

# Optional: Add user to docker group
sudo usermod -aG docker $USER
```

---

## 3. Clone Repository & Setup Environment

```bash
# Clone the repository
git clone https://github.com/your-org/vera.git /opt/vera
cd /opt/vera

# Create production environment configuration
cp .env.example .env.production
nano .env.production
```

### Production Environment Variables:

```ini
# App URL
NEXT_PUBLIC_APP_URL=https://vera.org

# Database
DATABASE_URL=postgresql://postgres:YOUR_STRONG_DB_PASSWORD@vera-db:5432/vera

# JWT Authentication
JWT_SECRET=GENERATE_64_CHAR_CRYPTOGRAPHIC_SECRET

# Evidence Storage
STORAGE_PATH=/app/storage
MAX_UPLOAD_SIZE_MB=50

# Blockchain (Ethereum Sepolia / Holesky / Polygon Amoy)
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
BLOCKCHAIN_PRIVATE_KEY=YOUR_SERVER_SIGNER_PRIVATE_KEY
CONTRACT_ADDRESS=0x0B306BF915C4d645ff596e518fAf3F9669b97016
NEXT_PUBLIC_CHAIN_ID=11155111

# Optional AI Verification
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

---

## 4. Launching with Docker Compose

```bash
# Build and launch all services in detached mode
docker compose up -d --build

# Check running container health
docker compose ps

# View live application logs
docker compose logs -f vera-app
```

---

## 5. Running Database Migrations & Seeding

```bash
# Run PostgreSQL database migrations inside the app container
docker compose exec vera-app npm run db:migrate

# Seed demo presentation dataset (Jaipur School Classroom)
docker compose exec vera-app npm run db:seed
```

---

## 6. SSL / HTTPS Setup via Let's Encrypt Certbot

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Request TLS Certificate
sudo certbot certonly --webroot -w /var/www/certbot -d vera.org -d www.vera.org

# In nginx/nginx.conf:
# 1. Uncomment the HTTPS server block
# 2. Update domain name to your domain
# 3. Reload nginx:
docker compose exec nginx nginx -s reload
```

---

## 7. Automated Backup & Restore Procedures

### Database Backup (pg_dump)
```bash
# Create automated backup directory
mkdir -p /opt/vera/backups

# Dump PostgreSQL database to gzipped SQL
docker compose exec -T vera-db pg_dump -U postgres -d vera | gzip > /opt/vera/backups/vera_backup_$(date +%F_%H%M%S).sql.gz

# Retain backups using cron (daily at 02:00 AM)
crontab -e
# Add:
# 0 2 * * * docker compose -f /opt/vera/docker-compose.yml exec -T vera-db pg_dump -U postgres -d vera | gzip > /opt/vera/backups/vera_$(date +\%F).sql.gz
```

### Evidence Storage Backup
```bash
# Tar and compress physical evidence files volume
tar -czvf /opt/vera/backups/evidence_storage_$(date +%F).tar.gz -C /var/lib/docker/volumes/vera_storage/_data .
```

### Disaster Recovery / Restore Steps
```bash
# Restore PostgreSQL database:
gunzip -c /opt/vera/backups/vera_backup_YYYY-MM-DD.sql.gz | docker compose exec -T vera-db psql -U postgres -d vera

# Restore Evidence files:
tar -xzvf /opt/vera/backups/evidence_storage_YYYY-MM-DD.tar.gz -C /var/lib/docker/volumes/vera_storage/_data
```

---

## 8. Service Health & Monitoring

```bash
# Check PostgreSQL status
docker compose exec vera-db pg_isready -U postgres -d vera

# Check Next.js health endpoint
curl -I http://localhost:3000/api/campaigns/active

# Inspect resource utilization
docker stats
```
