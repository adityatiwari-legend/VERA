# StartProject — Running VERA Locally

VERA is a Next.js 14 app with two chain sidecars: an Ethereum (Hardhat) node for **VERA Core** and a Solana localnet validator for **Hisaab of the Road**. This guide takes you from a fresh clone to the full demo running on `http://localhost:3000`.

> Windows host is the primary target — the Solana toolchain runs inside **WSL Ubuntu** (already scripted via npm commands). Linux/macOS users can run the same scripts directly with bash.

---

## Prerequisites

| Tool | Version | Needed for |
|---|---|---|
| **Node.js** | 18+ (20 recommended) | Next.js app, Hardhat, all scripts |
| **PostgreSQL** | 16 | System of record (or use Docker — Step 3) |
| **Docker Desktop** | any | Optional — easiest way to run Postgres |
| **WSL Ubuntu** | Ubuntu 22.04+ | Solana/Anchor toolchain (Windows only) |
| **MetaMask** | browser extension | Optional — wallet-connect donations & multisig signing |
| **Gemini API key** | free | Optional — AI vision; app degrades to `MANUAL_REVIEW` without it |

WSL one-time setup (if Anchor isn't installed yet):

```bash
npm run build:hisaab   # will fail with instructions if the toolchain is missing
bash scripts/wsl-toolchain-setup.sh   # sets up Rust + Solana CLI + Anchor inside WSL
```

> The compiled Solana program (`contracts/hisaab/target/deploy/hisaab.so`) ships prebuilt in the repo — you only need the WSL toolchain if you rebuild it or run the localnet script.

---

## Step 1 — Install dependencies

```bash
npm install
```

---

## Step 2 — Configure environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the essentials:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgrespassword@localhost:5433/vera` (matches the Docker Postgres below) |
| `JWT_SECRET` | Any string, 32+ chars |
| `GEMINI_API_KEY` | Your key from https://aistudio.google.com/apikey (optional) |
| `HISAAB_RPC_URL` | `http://127.0.0.1:8899` (localnet — the localnet script airdrops the oracle/funder/contractor keypairs automatically) |
| `NEXT_PUBLIC_HISAAB_PROGRAM_ID` | `AUH7tYQJFXjya5wgu9APf1Q5qDs8G9jKEEzxjA1VpxMw` |
| `BLOCKCHAIN_RPC_URL` | `http://127.0.0.1:8545` (Hardhat node) |
| `DEMO_MODE` | `true` (enables the 30-day-hold fast-forward for demos) |

EVM defaults from `.env.example` work out of the box on a local Hardhat node (relayer key = Hardhat account #0). `TIGER_DATABASE_URL` is optional — roughness telemetry falls back to local Postgres when unset.

---

## Step 3 — Start PostgreSQL

**Option A — Docker (easiest):**

```bash
docker compose up -d vera-db
```

Postgres comes up on host port **5433** (user `postgres`, password `postgrespassword`, db `vera`).

**Option B — local Postgres:** create a database named `vera` and point `DATABASE_URL` at it.

---

## Step 4 — Migrate and bootstrap the admin

```bash
npm run db:migrate        # applies all SQL migrations in db/migrations/
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=strong-password npm run admin:bootstrap
```

The app starts completely empty — no demo campaigns, users, or reports. You
create everything through the UI (Step 6 below).

---

## Step 5 — Boot the stack (one command)

```bash
npm run demo:stack
```

On Windows you can simply **double-click `VERA.bat`** in the repo root.

This orchestrator boots everything in order, skipping anything already running:

1. **Postgres** (docker compose `vera-db` on :5433) + **migrations** (idempotent)
2. **Solana localnet** (WSL `solana-test-validator` on :8899) + deploys the Hisaab program + airdrops the app keypairs
3. **Hardhat EVM node** on :8545 (chain id 31337) — and **redeploys VERA.sol automatically** if the node was restarted and lost the contract
4. **Next dev server** on :3000

When it prints ✅ you're live:

- App: **http://localhost:3000**
- EVM RPC: http://localhost:8545 (add this network to MetaMask to use wallet features)
- Solana RPC: http://localhost:8899

Keep this terminal open (Ctrl+C stops the dev server; the chain processes keep running until you kill them).

### Deploy the VERA contract (first run, or after a Hardhat reset)

If the Hardhat node was restarted fresh, redeploy and update `CONTRACT_ADDRESS` in `.env.local`:

```bash
npx hardhat run scripts/deploy.js
```

Copy the printed contract address into `CONTRACT_ADDRESS`, then restart the dev server.

---

## Step 6 — Create your accounts

Open http://localhost:3000. There are no demo accounts — start from what you
bootstrapped in Step 4, then register the rest at `/register`:

| Account | Role | Lands on |
|---|---|---|
| your `ADMIN_EMAIL` | ADMIN | `/admin` — approve organizations/contractors, invite auditors, complaint queue, fund requests, escrows |
| `/register` → ORGANIZATION | ORGANIZATION (admin-approved at `/admin/access`) | `/org/campaigns` — create campaigns, milestones, proofs |
| `/register` → USER | USER | `/dashboard` — donate, report potholes, trace money |
| admin-invited | AUDITOR | `/auditor/dashboard` — review proofs, sign releases |
| `/register` → CONTRACTOR (admin-approved) | CONTRACTOR | `/contractor` — accept jobs, submit repairs |

Hisaab confirmations need three distinct USER accounts — register as many
citizens as you need.

---

## Step 7 — Verify everything (optional)

```bash
node scripts/e2e-check.mjs      # 80 end-to-end checks across both product loops
```

Other suites:

```bash
npm run test:phase1             # … through test:phase5 — 321 programmatic checks
npm run test:tampering          # audit hash-chain tampering detection
npm run test:contracts          # VERA.sol unit tests (Hardhat)
npm run type-check              # whole-repo TypeScript
```

---

## Full demo walkthrough (the two loops)

**Hisaab of the Road (Solana):** as a citizen (`aarav@`) create a pothole report with a photo → confirm it with three distinct citizen accounts → as ADMIN triage and create a fund request → `SUBMITTED → APPROVED → SANCTIONED` → create the escrow and assign contractor `thaker@` → contractor accepts and submits a repair photo → stage 1 releases on-chain → use the demo fast-forward to skip the 30-day hold → stages 2–3 → report PAID.

**VERA Core (Ethereum):** as `ngo@` create a campaign and milestone → donate (demo ledger, or bind MetaMask for a real on-chain donation) → submit a proof document (Gemini OCR screens it) → as `auditor@` approve → release request → two of the three bound signers approve → execute the on-chain release → inspect the public audit trail and hash-chain verification.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `ECONNREFUSED` on port 5433 | Postgres isn't up — `docker compose up -d vera-db` |
| Migrations say database does not exist | Create it: `docker exec -it vera-db createdb -U postgres vera` (or via psql) |
| Hardhat node already has old contracts after restart | The node state resets — rerun `npx hardhat run scripts/deploy.js` and update `CONTRACT_ADDRESS` |
| Solana deploy fails in WSL with `sbpf feature mismatch` | The localnet script already pins `/usr/local/bin` (agave 4.x) ahead of `~/.cargo/bin` — run it exactly via `npm run solana:localnet`, not by calling `solana` yourself |
| Gemini features show `MANUAL_REVIEW` | `GEMINI_API_KEY` missing/invalid in `.env.local` — restart the dev server after adding it |
| Port 3000/8545/8899 already in use | Something from a previous run is alive — kill it, or let `demo:stack` reuse it (it detects live ports) |
| WSL not found | `wsl --install -d Ubuntu`, then re-run the toolchain setup (see Prerequisites) |

## Port map

| Port | Service |
|---|---|
| 3000 | Next.js app |
| 8545 | Hardhat EVM node (chain 31337) |
| 8899 | Solana localnet RPC |
| 5433 | Postgres (host side; 5432 inside Docker) |
