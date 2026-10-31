# DEPLOYMENT — VERA on an Ubuntu VPS

This guide deploys the full stack to a single Ubuntu 22.04/24.04 server:

| Component | What it is | How it runs |
|---|---|---|
| **Next.js app** | VERA Core + Hisaab web app | production build under systemd, proxied by nginx + TLS |
| **PostgreSQL 16** | system of record | Docker (the repo's `vera-db` service) |
| **Hardhat EVM node** | VERA Core chain (chain id 31337) | systemd, localhost only |
| **Solana validator** | Hisaab chain (`solana-test-validator`) | systemd, localhost only, persistent ledger |

The two chains are **private sidecars** — only the app talks to them. Ports 8545/8899 are never opened to the internet.

> **Sizing:** 2 vCPU / 4 GB RAM / 20 GB disk is the minimum; 4 vCPU / 8 GB is comfortable. Swap is recommended on 4 GB boxes (`sudo fallocate -l 4G /swapfile`).

> **This is a demo deployment.** The chains are ephemeral localnets, the EVM relayer key is the public Hardhat account #0, and the seeded accounts all use `Password123!`. Do not put real funds behind it.

---

## Step 0 — Server prep

Run as root on a fresh Ubuntu box (or `sudo -i` from your sudo user):

```bash
# updates + base tools
apt update && apt upgrade -y
apt install -y git curl build-essential ufw

# dedicated user that owns the app
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy

# firewall: SSH + web only (chains and Postgres stay private)
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

Log in as the new user and generate SSH keys for GitHub if the repo is private:

```bash
su - deploy
ssh-keygen -t ed25519 -C "vera-vps"    # add the public key to GitHub
```

---

## Step 1 — Node.js 20 + Docker

```bash
# Node 20 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker deploy    # log out/in once for this to take effect
```

Verify: `node -v` → v20.x, `docker compose version` → v2.x.

---

## Step 2 — PostgreSQL (Docker)

The repo's `docker-compose.yml` defines `vera-db` (port 5433 on the host).

**Two one-time fixes first** — the compose file declares an *external* volume that doesn't exist on a fresh server, and its port binding would expose Postgres publicly (Docker bypasses ufw):

```bash
sudo docker volume create hackxxmuj_postgres_data      # the external volume compose expects
sed -i 's|- "5433:5432"|- "127.0.0.1:5433:5432"|' docker-compose.yml
sudo docker compose up -d vera-db
```

Check it: `docker ps` → `vera-db` healthy, and `ss -tlnp | grep 5433` shows it bound to `127.0.0.1` only.

---

## Step 3 — Get the code

```bash
sudo mkdir -p /opt/vera && sudo chown deploy:deploy /opt/vera
git clone git@github.com:<you>/<repo>.git /opt/vera   # or copy the working tree up
cd /opt/vera
npm ci
mkdir -p /opt/vera/storage      # upload storage (STORAGE_PATH)
```

---

## Step 4 — Solana CLI (agave)

The compiled Hisaab program (`contracts/hisaab/target/deploy/hisaab.so`) ships **prebuilt in the repo** — no Rust/Anchor toolchain needed, just the CLI to run the validator and deploy.

Install the **same major version you run on the dev machine** (check in WSL: `wsl -d Ubuntu -u root -- solana --version`), e.g.:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://release.anza.xyz/stable/install | sh
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
agave --version    # if deploy later fails with an sbpf feature mismatch, pin the exact dev-machine version instead
```

---

## Step 5 — systemd: the two chains

### 5a. Hardhat EVM node

Create `/etc/systemd/system/vera-hardhat.service`:

```ini
[Unit]
Description=VERA Hardhat EVM node (chain 31337)
After=network.target

[Service]
User=deploy
WorkingDirectory=/opt/vera
ExecStart=/opt/vera/node_modules/.bin/hardhat node
# The node keeps state in memory only — redeploy the VERA contract on every boot.
# (First deployment from account #0 always lands at the same address, so
# CONTRACT_ADDRESS in .env.production stays valid across restarts.)
ExecStartPost=/bin/bash -c 'for i in $(seq 1 90); do curl -s -o /dev/null http://127.0.0.1:8545 && exit 0; sleep 1; done; exit 1'
ExecStartPost=/opt/vera/node_modules/.bin/hardhat run scripts/deploy.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 5b. Solana validator

Create `/etc/systemd/system/vera-solana.service`:

```ini
[Unit]
Description=VERA Solana localnet (Hisaab)
After=network.target

[Service]
User=deploy
ExecStart=/home/deploy/.local/share/solana/install/active_release/bin/solana-test-validator --ledger /opt/vera/solana/ledger --bind-address 127.0.0.1 --rpc-port 8899
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

> The ledger lives in `/opt/vera/solana/ledger`, so the deployed program **survives validator restarts**. Delete that directory only if you want a pristine chain (then redo Step 5c).

Enable and start both:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vera-hardhat vera-solana
systemctl status vera-hardhat vera-solana --no-pager
```

### 5c. Deploy the Hisaab program (once per pristine ledger)

```bash
cd /opt/vera/contracts/hisaab
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana config set --url http://127.0.0.1:8899

solana airdrop 10                                   # payer = the CLI default keypair
for f in keys/oracle.json keys/funder.json keys/contractor.json; do
  solana airdrop 10 "$(solana-keygen pubkey "$f")"
done

solana program deploy --program-id hisaab-keypair.json target/deploy/hisaab.so
```

`solana program show AUH7tYQJFXjya5wgu9APf1Q5qDs8G9jKEEzxjA1VpxMw` should report it as deployed.

---

## Step 6 — Production environment

Create `/opt/vera/.env.production`:

```bash
# --- database & auth ---
DATABASE_URL=postgresql://postgres:postgrespassword@127.0.0.1:5433/vera
JWT_SECRET=$(openssl rand -hex 32)          # paste the generated value in
NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN     # inlined at BUILD time — set before building!
STORAGE_PATH=/opt/vera/storage
MAX_UPLOAD_SIZE_MB=50

# --- VERA Core (EVM) ---
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CONTRACT_ADDRESS=0x0B306BF915C4d645ff596e518fAf3F9669b97016
NEXT_PUBLIC_CHAIN_ID=31337
BLOCKCHAIN_NETWORK=hardhat

# --- Hisaab (Solana) ---
HISAAB_RPC_URL=http://127.0.0.1:8899
HISAAB_ORACLE_KEYPAIR=[paste JSON array — see below]
HISAAB_FUNDER_KEYPAIR=[paste JSON array]
HISAAB_CONTRACTOR_PUBKEY=<base58 pubkey of keys/contractor.json>
NEXT_PUBLIC_HISAAB_PROGRAM_ID=AUH7tYQJFXjya5wgu9APf1Q5qDs8G9jKEEzxjA1VpxMw
SOL_INR_RATE=20000
ROUGHNESS_THRESHOLD=3.0

# --- optional ---
GEMINI_API_KEY=               # AI vision; without it features degrade to MANUAL_REVIEW
TIGER_DATABASE_URL=           # telemetry falls back to local Postgres
DEMO_MODE=true                # enables the 30-day-hold fast-forward
ETH_INR_RATE=300000
```

Generate the keypair values from the repo's key files:

```bash
cd /opt/vera/contracts/hisaab
solana-keygen pubkey --json keys/oracle.json      # → paste as HISAAB_ORACLE_KEYPAIR
solana-keygen pubkey --json keys/funder.json      # → paste as HISAAB_FUNDER_KEYPAIR
solana-keygen pubkey keys/contractor.json         # → paste as HISAAB_CONTRACTOR_PUBKEY
```

Lock it down: `chmod 600 /opt/vera/.env.production`

> **Key point:** every `NEXT_PUBLIC_*` value is baked into the JS bundle when you run `npm run build`. Changing the domain later means editing this file **and rebuilding** (Step 8).

---

## Step 7 — Migrate and seed

```bash
cd /opt/vera
export $(grep -v '^#' .env.production | xargs)   # load env into this shell
npm run db:migrate                               # 18 SQL migrations
npm run db:seed                                  # demo users, campaigns, ledger
npm run seed:hisaab                              # Hisaab pothole report + readings
```

Demo logins (all passwords `Password123!`): `admin@fundtrail.org`, `ngo@fundtrail.org`, `donor@fundtrail.org`, `auditor@fundtrail.org`, `thaker@vera.org` (contractor), plus `aarav@ / priya@ / rohan@vera.org` as the three citizen confirmers.

---

## Step 8 — Build and run the app

The build uses Next.js `output: 'standalone'`, so the run command is `node server.js` (not `next start`):

```bash
cd /opt/vera
npm run build
cp -r .next/static .next/standalone/.next/      # standalone doesn't include these — copy after EVERY build
cp -r public .next/standalone/
```

Create `/etc/systemd/system/vera-app.service`:

```ini
[Unit]
Description=VERA Next.js app
After=network.target vera-hardhat.service vera-solana.service
Wants=vera-hardhat.service vera-solana.service

[Service]
User=deploy
WorkingDirectory=/opt/vera
EnvironmentFile=/opt/vera/.env.production
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/node /opt/vera/.next/standalone/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vera-app
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000    # expect 200/307
```

---

## Step 9 — nginx + TLS

Point your domain's A record at the VPS IP, then:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo tee /etc/nginx/sites-available/vera <<'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN;
    client_max_body_size 50M;   # evidence/photo uploads

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
sudo ln -s /etc/nginx/sites-available/vera /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d YOUR_DOMAIN     # issues cert + auto-configures HTTPS renewal
```

> **Why host nginx and not the compose `nginx` service?** The compose nginx expects the app in Docker too. Here the app runs under systemd, so a host nginx is simpler — just never `docker compose up` the `nginx`/`vera-app` services, or they'll fight over ports 80/443/3000.

**MetaMask / wallet features:** the EVM node is private, so a browser wallet can't reach it remotely. For a live demo on your own laptop, open an SSH tunnel and add `http://localhost:8545` as a custom network in MetaMask:

```bash
ssh -L 8545:127.0.0.1:8545 -L 8899:127.0.0.1:8899 deploy@YOUR_VPS
```

Donations via the demo ledger work for everyone without any tunnel.

---

## Step 10 — Verify

```bash
cd /opt/vera
export $(grep -v '^#' .env.production | xargs)
node scripts/e2e-check.mjs          # 58 end-to-end checks across both product loops
```

Then open `https://YOUR_DOMAIN`, log in as `admin@fundtrail.org`, and run one Hisaab report end-to-end.

---

## Day-2 operations

**Deploy new code:**

```bash
cd /opt/vera
git pull
npm ci
npm run build
cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
sudo systemctl restart vera-app
```

**Reboot behaviour** — everything is `Restart=always` + `restart: unless-stopped` (Docker), so a reboot brings the whole stack back:

- Postgres data and Solana ledger persist on disk → no re-seed, no re-deploy.
- Hardhat state is in-memory → the unit auto-redeploys the VERA contract (same deterministic address, so `CONTRACT_ADDRESS` doesn't change).
- If you wipe the Solana ledger, redo Step 5c.

**Logs:**

```bash
journalctl -u vera-app -f        # app
journalctl -u vera-hardhat -f    # EVM node
journalctl -u vera-solana -f     # validator (block production)
```

**Upgrade the Hisaab program** (after rebuilding the .so in WSL and copying it up):

```bash
cd /opt/vera/contracts/hisaab
solana program deploy --program-id hisaab-keypair.json \
  --upgrade-authority ~/.config/solana/id.json target/deploy/hisaab.so
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `docker compose up` fails: external volume not found | `sudo docker volume create hackxxmuj_postgres_data` (Step 2) |
| App can't reach Postgres (`ECONNREFUSED :5433`) | `docker ps` — is `vera-db` healthy? Is it bound to `127.0.0.1`? |
| `CONTRACT_ADDRESS is not configured` / on-chain calls fail | Hardhat node down or contract not deployed — check `journalctl -u vera-hardhat`, then `curl -s -X POST http://127.0.0.1:8545` |
| Contract address mismatch after manual node restart | Rerun `npx hardhat run scripts/deploy.js` and paste the printed address into `.env.production`, then `sudo systemctl restart vera-app` |
| Solana writes fail: "keypair not configured" | `HISAAB_ORACLE_KEYPAIR` / `HISAAB_FUNDER_KEYPAIR` must be JSON **arrays** in `.env.production` (Step 6), not file paths |
| `solana program deploy` fails: sbpf feature mismatch | Your CLI doesn't match the program's target — install the same agave version as the dev machine (Step 4) |
| Airdrop fails | Validator still booting — wait ~10 s and retry; check `journalctl -u vera-solana` |
| Uploads 413 / fail | `client_max_body_size 50M;` missing in the nginx site, or `STORAGE_PATH` not writable by `deploy` |
| Domain serves "Welcome to nginx" | The `default` site is still enabled — `sudo rm /etc/nginx/sites-enabled/default && sudo systemctl reload nginx` |
| Pages load but look broken / 404 assets | You forgot `cp -r .next/static .next/standalone/.next/` after a build |

## Port map (VPS)

| Port | Service | Exposed? |
|---|---|---|
| 80 / 443 | nginx → app | Yes (public) |
| 3000 | Next.js | No — localhost only |
| 8545 | Hardhat EVM (31337) | No — localhost only |
| 8899 | Solana RPC | No — localhost only |
| 5433 | Postgres | No — `127.0.0.1` binding |
| 22 | SSH | Yes |
