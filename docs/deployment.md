# VERA + Hisaab End-to-End Production & VPS Deployment Guide

Complete, end-to-end production deployment guide for the **VERA (Verification, Escrow, and Reconciliation Architecture) + Hisaab of the Road (RoadProof)** dual-chain application on an Ubuntu 22.04 / 24.04 LTS VPS using Docker Compose, Nginx, Let's Encrypt TLS, and GitHub Actions CI/CD.

---

## 1. Production Architecture Overview

```
                      Internet (Public Traffic)
                                 │
                 ┌───────────────┴───────────────┐
                 │  Port 80 (HTTP) / 443 (HTTPS) │
                 └───────────────┬───────────────┘
                                 ▼
                     [ NGINX Reverse Proxy ] (vera-nginx)
                       ├── Let's Encrypt SSL/TLS Termination
                       ├── Gzip Compression & Security Headers
                       └── Client Max Body Size: 50MB (Evidence Uploads)
                                 │
                                 ▼ (Docker Network: default)
                     [ Next.js 14 App ] (vera-app:3000)
                       ├── Standalone Node 20 Runner (port 3000)
                       ├── Inlined NEXT_PUBLIC_* Bundle Configurations
                       └── Persistent Evidence Storage: /app/storage
                        │          │                 │             │
        ┌───────────────┘          │                 │             └───────────────┐
        ▼                          ▼                 ▼                             ▼
 [ PostgreSQL 16 ]        [ Hardhat Node ]     [ Solana Devnet ]          [ Cloud Services ]
   (vera-db:5432)          (vera-hardhat:8545)  (api.devnet.solana.com)     ├── Google Gemini Vision API
   Volume:                  ├── Local EVM Chain   ├── Anchor Program          │   (pothole & damage AI)
   hackxxmuj_postgres_data  └── Auto-deploys          (NEXT_PUBLIC_HISAAB_  └── TimescaleDB / Tiger Data
                                VERA.sol on boot       PROGRAM_ID)              (roughness & agent analytics)
```

### Stack Components

| Service / Component | Container / Target | Port (Internal) | Host Port | Purpose |
|---|---|---|---|---|
| **vera-nginx** | `nginx:alpine` | 80, 443 | 80, 443 | Reverse proxy, SSL termination, ACME webroot |
| **vera-app** | Dockerfile `runner` | 3000 | 3000 (opt.) | Next.js 14 Standalone web & API application |
| **vera-db** | `postgres:16-alpine` | 5432 | 5433 (opt.) | Primary relational database & ledger |
| **hardhat-node** | Dockerfile `hardhat` | 8545 | 8545 | Local EVM blockchain & auto-contract deployment |
| **migrate** | Dockerfile `tools` | N/A (one-off) | N/A | Dedicated runner for database migrations & seeds |
| **Solana Devnet** | Remote RPC | 443 (Outbound) | N/A | Public Solana devnet for Hisaab of the Road |
| **Tiger Data** | Cloud TimescaleDB | 5432 (Outbound) | N/A | High-throughput time-series road roughness telemetry |

---

## 2. Server Prerequisites & Sizing

### Minimum Recommended VPS Specs
- **OS:** Ubuntu 22.04 LTS or Ubuntu 24.04 LTS (x86_64 or ARM64)
- **CPU:** 2 vCPUs minimum (4 vCPUs recommended for parallel container builds)
- **RAM:** 4 GB RAM minimum (Next.js standalone build requires ~2.5GB during build) + 2 GB Swap
- **Disk:** 30 GB SSD / NVMe minimum
- **Cloud Providers:** DigitalOcean, Vultr, Hetzner, AWS EC2, GCP Compute Engine

### Firewall Configuration (UFW)
Open only required public ports:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```
> [!NOTE]
> Ports `3000` (Next.js), `5432/5433` (Postgres), and `8545` (Hardhat) are accessed internally by Docker or looped through Nginx. Do **not** expose them publicly unless explicitly required for debugging.

---

## 3. Environment Configuration Reference (`.env`)

Before running or building, create `/opt/vera/.env` on the server from `.env.example`:

```bash
cp .env.example .env
```

### Complete Environment Variable Breakdown

| Variable | Required | Default / Example | Purpose & Notes |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | **Yes** | `https://yourdomain.com` | Base public URL. **Inlined at build time**. |
| `DATABASE_URL` | **Yes** | `postgresql://postgres:postgrespassword@vera-db:5432/vera` | PostgreSQL connection string for the `vera-app` and `migrate` services. |
| `JWT_SECRET` | **Yes** | 64+ char random string | Secret for HTTP-only session cookies and mobile auth tokens. |
| `STORAGE_PATH` | **Yes** | `/app/storage` | Local directory for storing invoice PDFs and road inspection media. |
| `MAX_UPLOAD_SIZE_MB` | No | `50` | Maximum multipart upload file size in megabytes. |
| `DEBUG_SQL` | No | `false` | Enable to log every SQL query executed by the database pool. |
| `NEXT_PUBLIC_CHAIN_ID` | **Yes** | `31337` (Hardhat) or `11155111` (Sepolia) | Chain ID for EVM. **Inlined at build time**. |
| `BLOCKCHAIN_RPC_URL` | **Yes** | `http://hardhat-node:8545` | EVM RPC endpoint accessed by the Next.js server. |
| `BLOCKCHAIN_PRIVATE_KEY` | **Yes** | Hardhat Account #0 default or funded deployer key | Private key used to sign escrow / oracle transactions. |
| `CONTRACT_ADDRESS` | **Yes** | `0x5FbDB2315678afecb367f032d93F642f64180aa3` | Deployed address of `VERA.sol`. |
| `GEMINI_API_KEY` | Recommended | `AIzaSy...` | Google AI Studio key for vision pothole analysis and road summary AI. |
| `GEMINI_MODEL` | No | `gemini-3.8-flash` | Gemini model variant for inspections and agent analysis. |
| `HISAAB_RPC_URL` | **Yes** | `https://api.devnet.solana.com` | Solana JSON-RPC endpoint. |
| `NEXT_PUBLIC_HISAAB_PROGRAM_ID` | **Yes** | Printed by `npm run solana:setup` | Solana Anchor program public key. **Inlined at build time**. |
| `HISAAB_ORACLE_KEYPAIR` | **Yes** | JSON array of 64 bytes | Keypair of the automated damage assessment oracle. |
| `HISAAB_FUNDER_KEYPAIR` | **Yes** | JSON array of 64 bytes | Keypair funding the road repair escrows on devnet. |
| `HISAAB_CONTRACTOR_PUBKEY` | **Yes** | Base58 Solana public key | Contractor recipient wallet for escrow disbursements. |
| `SOL_INR_RATE` | No | `20000` | Fiat-to-SOL conversion rate used for micro-escrow conversions. |
| `ETH_INR_RATE` | No | `300000` | Fiat-to-ETH conversion rate. |
| `ROUGHNESS_THRESHOLD` | No | `3.0` | Target roughness score (IRI) under which repairs unlock payments. |
| `TIGER_DATABASE_URL` | Optional | `postgresql://...` | Tiger Data Cloud / TimescaleDB hypertable connection. |
| `DEMO_MODE` | No | `true` | Enables rich demo seed scenarios and simulation fast-forwards. |

> [!IMPORTANT]
> **Build-Time vs Runtime Variables**:
> Variables prefixed with `NEXT_PUBLIC_*` (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_HISAAB_PROGRAM_ID`) are embedded into the client-side JavaScript bundle during `next build` inside the Docker image. If you change them, you **must re-run** `docker compose up -d --build`.

---

## 4. Method A: Fast-Track Deployment (Automated Scripts)

The repository provides automated bash scripts in `deploy/`:

### Step 1: Run One-Time Server Bootstrap
On the clean Ubuntu VPS as `root`:
```bash
# Clone the repository
git clone https://github.com/adityatiwari-legend/VERA.git /opt/vera
cd /opt/vera

# Run bootstrap (installs Docker, Git, creates external volume, sets up .env)
bash deploy/bootstrap-vps.sh
```

### Step 2: Configure Production Secrets
Edit `/opt/vera/.env` with your real keys:
```bash
nano /opt/vera/.env
```
Ensure at minimum:
1. `NEXT_PUBLIC_APP_URL` is set to your server IP or domain (e.g. `http://139.84.163.150` or `https://vera.example.com`).
2. `GEMINI_API_KEY` is provided from [Google AI Studio](https://aistudio.google.com/apikey).
3. If running Solana features, generate your keys (see Section 6).

### Step 3: Run the Deploy Script
```bash
bash deploy/deploy.sh
```
What `deploy/deploy.sh` does automatically:
1. Pulls the latest code from `main`.
2. Inspects and ensures the `hackxxmuj_postgres_data` volume exists.
3. Builds and boots `vera-db`, `hardhat-node`, `vera-app`, and `vera-nginx`.
4. Waits for PostgreSQL to pass readiness health checks (`pg_isready`).
5. Executes database migrations using `docker compose run --rm migrate`.
6. Restarts `vera-app` to guarantee full synchronization.
7. Executes a verification health check against `http://127.0.0.1:3000/api/health`.

---

## 5. Method B: Step-by-Step Manual Deployment

If you prefer full control over each stage:

### Step 1: Install Host Packages & Docker
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

### Step 2: Prepare Application Directory & External Volume
```bash
sudo mkdir -p /opt/vera
sudo chown -R $USER:$USER /opt/vera
git clone https://github.com/adityatiwari-legend/VERA.git /opt/vera
cd /opt/vera

# MANDATORY: The docker-compose references this external volume
docker volume create hackxxmuj_postgres_data
```

### Step 3: Set Up `.env`
```bash
cp .env.example .env
# Edit .env with your favorite editor
nano .env
```

### Step 4: Build & Launch Docker Services
```bash
docker compose up -d --build
```
Check running services:
```bash
docker compose ps
```
You should see:
- `vera-db` (healthy)
- `vera-hardhat` (running, JSON-RPC ready on port 8545)
- `vera-app` (running on port 3000)
- `vera-nginx` (running on port 80/443)

### Step 5: Run Database Migrations & Bootstrap the Admin
Because the production container `vera-app` is a minimal Next.js standalone runner, migrations run using the `migrate` service profile (Dockerfile `tools` stage):

```bash
# 1. Run migrations (the database starts empty — no demo data ships)
docker compose run --rm migrate

# 2. Create the first ADMIN account (only non-self-serve role)
docker compose run --rm -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... migrate npm run admin:bootstrap
```

---

## 6. Dual-Blockchain Configuration

VERA uses a hybrid dual-chain architecture:
1. **EVM (Ethereum/Hardhat):** For campaign escrow, milestone dispute reconciliation, and immutable donor ledger logging.
2. **Solana Devnet:** For Hisaab of the Road high-throughput road roughness telemetry and micro-escrows.

### 6.1 EVM Smart Contract (`VERA.sol`)
When running via Docker Compose, the `hardhat-node` container automatically:
1. Starts an EVM node at `http://0.0.0.0:8545` with chain ID `31337`.
2. Deploys `contracts/VERA.sol` using account #0.
3. Writes the deployed address to `contracts/deployed.json`.

If deploying to a public testnet (e.g. Sepolia or Holesky):
```bash
# Update .env with your testnet RPC and private key:
# BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/...
# BLOCKCHAIN_NETWORK=sepolia
# NEXT_PUBLIC_CHAIN_ID=11155111

docker compose run --rm migrate npx hardhat run scripts/deploy.js --network sepolia
```

### 6.2 Solana Devnet Program Setup
Run the setup generator on your host or in the tools container:
```bash
docker compose run --rm migrate npm run solana:setup
```
This utility:
- Generates `oracle`, `funder`, and `contractor` keypairs in `contracts/hisaab/keys/`.
- Requests devnet SOL airdrops for each account.
- Derives the stable program ID from `contracts/hisaab/hisaab-keypair.json`.
- Outputs the exact environment lines to paste into `/opt/vera/.env`.

#### Deploying the Solana Program to Devnet
**Option 1: Deploy pre-built artifact (Fastest)**
The repository comes with the pre-compiled `.so` binary in `contracts/hisaab/target/deploy/hisaab.so`:
```bash
# On VPS with Solana CLI installed:
solana config set --url https://api.devnet.solana.com
solana airdrop 2
cd contracts/hisaab
solana program deploy --program-id hisaab-keypair.json target/deploy/hisaab.so
```

**Option 2: Rebuild via WSL/Linux Anchor**
```bash
npm run build:hisaab
npm run deploy:hisaab
```

Once deployed, ensure `NEXT_PUBLIC_HISAAB_PROGRAM_ID` in `.env` matches the deployed program ID, and rebuild the web container:
```bash
docker compose up -d --build vera-app
```

---

## 7. Domain, Nginx Reverse Proxy & SSL (Let's Encrypt)

### Step 1: DNS Setup
Point your domain's DNS A records to the VPS public IP address:
```
A    vera.yourdomain.com    139.84.163.150
```

### Step 2: Request TLS Certificate via Certbot
Nginx is preconfigured with the ACME challenge path mapped to `certbot_var` volume (`/var/www/certbot`).

Run Certbot on the host:
```bash
sudo apt install -y certbot

# Issue certificate using webroot
sudo certbot certonly --webroot \
  -w /var/lib/docker/volumes/vera_certbot_var/_data \
  -d vera.yourdomain.com
```

### Step 3: Enable HTTPS in `nginx/nginx.conf`
Edit `nginx/nginx.conf`:
1. Uncomment the HTTPS server block (lines 79–114).
2. Replace `vera.org www.vera.org` with your domain (e.g., `vera.yourdomain.com`).
3. In the HTTP server block (line 56), uncomment the redirect:
   ```nginx
   return 301 https://$host$request_uri;
   ```
4. Reload Nginx without downtime:
   ```bash
   docker compose exec nginx nginx -s reload
   ```

### Step 4: Automatic SSL Certificate Renewal
Add a cron job to renew the certificates every month:
```bash
sudo crontab -e
```
Add:
```cron
0 3 1 * * certbot renew --quiet && docker compose -f /opt/vera/docker-compose.yml exec nginx nginx -s reload
```

---

## 8. Automated CI/CD via GitHub Actions

Every push to `main` can automatically build and deploy the latest changes to your VPS.

### Step 1: Generate a Dedicated SSH Deploy Key
On your local machine or server:
```bash
ssh-keygen -t ed25519 -C "vera-cicd" -f ~/.ssh/vera_deploy_ed25519 -N ""
```

### Step 2: Authorize Public Key on the VPS
Append the content of `vera_deploy_ed25519.pub` to `/root/.ssh/authorized_keys` on your VPS:
```bash
cat vera_deploy_ed25519.pub >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```

### Step 3: Configure GitHub Secrets
In your GitHub repository, navigate to **Settings → Secrets and variables → Actions** and add:

| Secret Name | Value |
|---|---|
| `VPS_HOST` | VPS Public IP (e.g. `139.84.163.150`) |
| `VPS_USER` | `root` (or sudo user with passwordless Docker access) |
| `VPS_SSH_KEY` | Full content of private key `vera_deploy_ed25519` (including `-----BEGIN ... END-----`) |

Now, pushing code to `main` triggers `.github/workflows/deploy.yml` which executes `deploy/deploy.sh` remotely.

---

## 9. Mobile Client (Android / RoadProof) Configuration

The RoadProof Flutter app (`MLH-RoadProofxVera`) acts as the citizen and road sensor client.

### Backend Endpoints Available
- **Authentication:** `POST /api/v1/auth/login`, `GET /api/v1/me`
- **Road Reports:** `GET /api/v1/hisaab/reports`, `POST /api/v1/hisaab/reports`, `GET /api/v1/hisaab/reports/[id]`
- **Repair Verification:** `POST /api/v1/hisaab/reports/[id]/confirm`
- **Roughness Telemetry:** `POST /api/hisaab/roughness`

### Connecting the Mobile App to the VPS
In `lib/core/config/app_config.dart`:
```dart
// For Production VPS:
static const String baseUrl = 'https://vera.yourdomain.com/api';

// For Android Emulator (local development):
static const String devUrl = 'http://10.0.2.2:3000/api';
```
Or launch Flutter with compile-time flags:
```bash
flutter run --dart-define=VERA_USE_MOCK=false --dart-define=VERA_API_URL=https://vera.yourdomain.com/api
```

---

## 10. Verification & System Health Checks

Verify your deployment with the health check endpoint:

```bash
curl -s http://localhost:3000/api/health | jq .
```

### Expected Healthy Response:
```json
{
  "status": "ok",
  "timestamp": "2026-10-31T18:30:00.000Z",
  "uptime": 124.5,
  "version": "0.3.0",
  "integrations": {
    "database": true,
    "gemini_vision": true,
    "solana_program": true,
    "solana_network": "devnet",
    "tiger_data": true
  }
}
```

### Key Health Flags:
- `database: true` — PostgreSQL 16 connection pool is active and answering queries.
- `gemini_vision: true` — `GEMINI_API_KEY` is present and initialized.
- `solana_program: true` — `NEXT_PUBLIC_HISAAB_PROGRAM_ID` is set and devnet RPC is responsive.
- `tiger_data: true` — TimescaleDB hypertables are connected. (If `false`, time-series gracefully falls back to local PostgreSQL).

### Operational Requirements Checklist

Run the automated version of this checklist on the VPS at any time (idempotent, safe to re-run):

```bash
bash /opt/vera/deploy/verify-ops.sh
```

Manual mapping of each operational requirement to the real mechanism in this stack (**note:** this project does **not** use Prisma — it uses raw SQL migrations in `db/migrations/` applied by `scripts/migrate.ts`):

| Requirement | How it is fulfilled / verified |
|---|---|
| Database tables & migrations | `docker compose run --rm migrate` (runs `npm run db:migrate`, tracked in `schema_migrations`). `deploy/deploy.sh` runs it automatically on every deploy. Verify: `docker compose exec vera-db psql -U postgres -d vera -tAc "SELECT COUNT(*) FROM schema_migrations"` equals the number of files in `db/migrations/`. |
| Admin account (never self-registered) | `docker compose run --rm -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... migrate npm run admin:bootstrap` (idempotent — re-running resets that account's password). No demo data exists; create organizations/contractors via `/register` and approve at `/admin/access`. |
| File upload storage permissions | Uploads write to `STORAGE_PATH` (`/app/storage` in the `vera-app` container) backed by the named volume `vera_storage`. Directories are created on demand by `lib/storage.ts`; the Dockerfile pre-creates/chowns `/app/storage` for the `nextjs` user. Verify writability: `docker compose exec vera-app touch /app/storage/.write-test` (then remove it). |
| Session cookie forwarding in Nginx | `nginx/nginx.conf` sets no `proxy_cookie_*` / `proxy_hide_header` directives, so `Set-Cookie` for the HTTP-only `fundtrail_session` cookie passes through untouched (cookies are issued `Secure` because the app runs with `NODE_ENV=production`). Verify: log in over HTTPS and confirm `Set-Cookie: fundtrail_session=...` appears in the response headers. |
| `JWT_SECRET` | Must be set in `/opt/vera/.env` (compose substitutes it into the `vera-app` container). If unset, compose falls back to a hardcoded dev string — never ship that. Changing it invalidates existing sessions (users just log in again). Generate: `openssl rand -hex 32`. |
| `GEMINI_API_KEY` | Set in `/opt/vera/.env` for real-time AI triage of pothole photos (`lib/gemini.ts`). Without it, reports fall back to `MANUAL_REVIEW`. |
| `DEMO_MODE=true` | Set in `/opt/vera/.env` (compose default is `true`). Enables the fast-forward 30-day durability hold (`/api/hisaab/escrows/[id]/fast-forward`, shown in `/admin/escrows`). |

---

## 11. Maintenance, Backups & Disaster Recovery

### Automated PostgreSQL Backup
Create `/opt/vera/scripts/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/opt/vera/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

docker compose -f /opt/vera/docker-compose.yml exec -T vera-db \
  pg_dump -U postgres -d vera | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Retain last 7 days of backups
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -delete
```
Make executable: `chmod +x /opt/vera/scripts/backup.sh`

Add daily cron (runs at 02:00 AM):
```cron
0 2 * * * /opt/vera/scripts/backup.sh
```

### Evidence Storage Backup
```bash
tar -czvf /opt/vera/backups/evidence_$(date +%F).tar.gz -C /var/lib/docker/volumes/vera_vera_storage/_data .
```

### Database Restore Procedure
```bash
# Decompress and feed into PostgreSQL
gunzip -c /opt/vera/backups/db_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose exec -T vera-db psql -U postgres -d vera
```

---

## 12. Troubleshooting Common Issues

### 1. `volume "hackxxmuj_postgres_data" is external, but it does not exist`
- **Cause:** Docker Compose was started without creating the volume first.
- **Fix:**
  ```bash
  docker volume create hackxxmuj_postgres_data
  docker compose up -d
  ```

### 2. Next.js App Displays Incorrect URL or Solana Program ID in Browser
- **Cause:** `NEXT_PUBLIC_*` environment variables were changed in `.env` without rebuilding the container. Next.js bakes these into the client JavaScript bundle at build time.
- **Fix:**
  ```bash
  docker compose up -d --build vera-app
  ```

### 3. Solana Devnet Airdrop Fails (`429 Too Many Requests`)
- **Cause:** Official Solana devnet public RPC faucets have strict rate limits.
- **Fix:**
  - Request 1 SOL at a time via web faucet: [faucet.solana.com](https://faucet.solana.com).
  - VERA supports ledger-only fallback mode: all core transactions and escrow flows function via the PostgreSQL ledger even if devnet transactions are delayed.

### 4. Database Migrations Fail in Standalone Container
- **Cause:** Running `docker compose exec vera-app npm run db:migrate`. The `runner` stage is a stripped-down Node.js image without `npm` or `tsx`.
- **Fix:**
  Use the dedicated tools runner service:
  ```bash
  docker compose run --rm migrate
  ```

### 5. Inspect Container Logs
```bash
# App logs
docker compose logs -f vera-app

# Database logs
docker compose logs -f vera-db

# Hardhat EVM chain logs
docker compose logs -f hardhat-node

# Nginx access & error logs
docker compose logs -f nginx
```
