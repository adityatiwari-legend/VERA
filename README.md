# VERA — Proof-Gated Money

> **Every escrow releases only against verified proof.** Whether the payer is a donor funding a classroom or a municipality fixing a road — money moves only when citizens, Gemini vision, and on-chain evidence agree.

**VERA** is a programmable trust layer with two modules on one stack:

| Module | Chain | What it does |
|---|---|---|
| **VERA Core** | Ethereum (Hardhat/Sepolia) | Donation campaigns → milestone escrow → proof verification → 2-of-3 multisig release → public audit trail |
| **Hisaab of the Road** | Solana (devnet) | Pothole reports → Gemini vision → 3-citizen confirmation → milestone escrow for road repairs, with a 30-day durability hold |

```text
                 ┌──────────────────────────────────────────┐
                 │           VERA CONSOLE (Next.js)         │
                 │     /hisaab  ·  /campaigns  ·  /ngos     │
                 └──────────────────┬───────────────────────┘
                                    │
        ┌───────────────────────────┴────────────────────┐
        │                                                │
┌───────▼────────┐                             ┌─────────▼─────────┐
│   VERA CORE    │                             │      HISAAB       │
│  (EVM/Hardhat) │                             │  (Solana devnet)  │
├────────────────┤                             ├───────────────────┤
│ VERA.sol       │                             │ hisaab Anchor     │
│ 2-of-3 multisig│                             │ program: Report + │
│ milestone escrow│                            │ Confirmation +    │
│ proof verify   │                             │ Escrow PDAs +     │
│ audit hash-chain│                            │ PDA vault, oracle-│
│ reputation idx │                             │ gated 3-stage     │
│ NGO scores     │                             │ release + 30d hold│
└────────────────┘                             └─────────┬─────────┘
                                                         │
                 ┌────────────────────────────────────────┴─────┐
                 │  PostgreSQL (state machine, ledger, audit)   │
                 │  Gemini Vision · Tiger Data time-series      │
                 └──────────────────────────────────────────────┘
```

---

## Current Status (2026-10-30)

### ✅ Built, deployed and verified end-to-end

- **VERA Core** — all five phases complete: campaigns, double-entry fund ledger, escrow state machine, SHA-256 proof storage, AI-assisted verification, auditor review, 2-of-3 multisig on-chain release, tampering-tested audit hash-chain, public audit dashboard, NGO reputation index, printable reports.
- **Hisaab** — Anchor program compiled (`hisaab.so`, program id `AUH7tYQJFXjya5wgu9APf1Q5qDs8G9jKEEzxjA1VpxMw`); report → Gemini analysis → 3 distinct citizen confirmations (on-chain dedupe via confirmation PDAs) → escrow creation → repair submission → before/after comparison → stage release, verified live through the API. Public street register with map at `/hisaab`.
- **SaaS console UI** — dark sidebar shell, light content, stat cards, dark escrow feature panel; visually verified across all pages.
- **Citizen accounts** — `CITIZEN` role with per-user devnet wallets; confirmations are signed by distinct keypairs and deduped on-chain.
- **Infra** — migrations, seed data, WSL Anchor toolchain scripts (with edition2024/MSRV dependency pins), `DEPLOY_VPS.md` for Ubuntu VPS (DigitalOcean/Vultr).

### ⏳ Pending — three setup steps (owner actions)

| Step | How | Effect if skipped |
|---|---|---|
| `GEMINI_API_KEY` in `.env.local` | Free key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | Vision falls back to `MANUAL_REVIEW` — reports still work, but automatic stage-1 release won't trigger |
| Devnet SOL + program deploy | Fund payer + funder/oracle/contractor at [faucet.solana.com](https://faucet.solana.com), then `npm run deploy:hisaab` | Hisaab runs in PG-ledger mode with honest "ledger-only" flags; | `TIGER_DATABASE_URL` | Free TimescaleDB service at [tigerdata.com](https://tigerdata.com), then `npm run tiger:setup` | Roughness telemetry stored in local Postgres fallback tables instead of hypertables |

Every integration degrades gracefully and reports its real state at `/api/health` and in the console sidebar — the demo never breaks.

---

## Module Deep Dives

### VERA Core — donation escrow with teeth

```text
DONOR → DONATION → EARMARKED CAMPAIGN → LOCKED ESCROW → MILESTONE
      → PROOF SUBMITTED → AI VERIFICATION → HUMAN AUDITOR
      → 2-OF-3 MULTISIG → ON-CHAIN RELEASE → PUBLIC AUDIT TRAIL
```

Five completed, production-structured phases: RBAC foundation, donation & fund lifecycle with atomic double-entry transactions (`DONATION` / `LOCK` / `RELEASE` / `REFUND`), proof & verification engine, blockchain & multisig controls, and public audit productization. Highlights:

- **Public Audit Dashboard** (`/campaigns/:id/audit`) — financial summary, milestone registry, on-chain verification with explorer links, complete chronological timeline. Open to anyone, no login.
- **Trace My Donation** (`/donor/donations/:id/trace`) — answers "where did my money go?" step by step.
- **Deterministic NGO Reputation** (`/ngos/:id`) — transparent 0–100 formula (base 100; −15 failed milestone, −10 rejected proof, −5 AI discrepancy, −10 refund; +10 per completed milestone capped +30, +5 clean-approval, +5 clean utilization), grades A+ → D.
- **Hash-chained audit log** — every action appends `sha256(prev_hash + payload)`; an append-only trigger blocks deletes; `/api/audit/verify-chain` re-walks the chain and detects tampering.

### Hisaab of the Road — "until the public passes the ticket, the contractor gets no money"

1. **Report** — any citizen photographs a pothole; Gemini extracts severity, size and a Hinglish summary; the photo is SHA-256 fingerprinted and anchored in the public register (Postgres + Solana report PDA).
2. **Confirm** — three *distinct* citizens confirm; each confirmation is signed by the citizen's own devnet keypair and deduped on-chain — the same wallet physically cannot confirm twice.
3. **Escrow** — a funder locks the budget (e.g. ₹50,000) in a program-owned PDA vault on Solana. Stages: repair verified → 30-day hold passed → final sign-off.
4. **Verify** — the contractor submits an after-photo; Gemini compares before/after; drive-by phone accelerometer readings (Tiger Data hypertables) rate road roughness. Only when AI + telemetry agree does the oracle release the next stage on-chain.
5. **30-day hold** — the final tranche waits a month, killing the incentive for shoddy patchwork.

**Honest trust model:** the escrow is neutral (vault funds can only move to the contractor stage-by-stage or back to the funder); stage releases are gated by a server-side *oracle* keypair acting on verified evidence. That oracle is the trust assumption — stated openly in the UI and pitch.

---

## Technology Stack

- **App**: Next.js 14 (App Router), Tailwind CSS, Lucide, react-leaflet (OSM tiles)
- **Database**: PostgreSQL 16 via parameterized `pg`; Tiger Data (TimescaleDB) hypertables for time-series with local fallback
- **Auth**: JWT HTTP-only cookies (`jose`, `bcryptjs`), 5-role RBAC (Donor, NGO, Auditor, Admin, Citizen)
- **EVM**: Solidity 0.8.20, Hardhat, ethers v6 — `VERA.sol` (multisig escrow)
- **Solana**: Anchor 0.30.1 (Rust), `@solana/web3.js` + `@coral-xyz/anchor` — Hisaab program with Report/Confirmation/Escrow PDAs and a PDA vault
- **AI**: Google Gemini vision — pothole severity/size, Hinglish summaries, before/after repair comparison
- **Deploy**: Docker Compose (web + postgres + hardhat-node), Nginx TLS; see [DEPLOY_VPS.md](DEPLOY_VPS.md)

---

## Local Quickstart

```bash
# 1. Install & start database
npm install
docker compose up -d vera-db

# 2. Migrations + demo data (VERA core + Hisaab)
npm run db:migrate
npm run db:seed
npm run seed:hisaab

# 3. EVM contract (start hardhat node first)
npx hardhat node            # terminal 1
npm run deploy:contract     # terminal 2 — VERA.sol

# 4. Solana (one-time WSL toolchain setup; see scripts/wsl-toolchain-setup.sh)
npm run solana:setup        # keypairs + airdrops + prints env lines
npm run build:hisaab        # builds hisaab.so inside WSL Ubuntu
npm run deploy:hisaab       # deploys to devnet (needs faucet SOL)

# 5. Configure .env.local (see .env.example):
#    GEMINI_API_KEY, TIGER_DATABASE_URL, HISAAB_* keypairs,
#    NEXT_PUBLIC_HISAAB_PROGRAM_ID

# 6. Run
npm run dev                 # http://localhost:3000
```

All scripts:

| Script | Purpose |
|---|---|
| `db:migrate` / `db:seed` / `seed:hisaab` | Schema + demo data |
| `deploy:contract` | EVM deploy |
| `solana:setup` | Oracle/funder/contractor keypairs, airdrops, prints env lines |
| `build:hisaab` / `deploy:hisaab` | Anchor build/deploy via WSL (dependency pins handled) |
| `tiger:setup` | Tiger Data hypertables |
| `test:phase1..5`, `test:contracts`, `test:tampering` | 321 programmatic tests |
| `type-check` / `build` | TypeScript + production build |

---

## Demo Accounts (password `Password123!`)

| Role | Email | Purpose |
|---|---|---|
| **NGO** | `ngo@fundtrail.org` / `ngo@vera.org` | Campaigns, proof upload; `thaker@vera.org` plays the road contractor |
| **Donor** | `donor@fundtrail.org` / `donor@vera.org` | Donate, trace funds |
| **Auditor** | `auditor@fundtrail.org` / `auditor@vera.org` | Review proofs, sign multisig |
| **Admin** | `admin@fundtrail.org` / `admin@vera.org` | Create Hisaab escrows, DEMO fast-forward |
| **Citizens** | `aarav@` / `priya@` / `rohan@vera.org` | Report + confirm potholes (3 distinct confirmers) |

Seeded demo data: a HIGH-severity pothole on MI Road, Jaipur at `/hisaab/report/e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e0e0` with drive-by roughness readings.

---

## 4-Minute Demo Script

1. **Report** — photo of a pothole → Gemini severity + Hinglish summary lands on the public map (`/hisaab`).
2. **Confirm** — two teammates confirm on their phones → 3/3 → report enters the register.
3. **Escrow** — admin locks ₹50,000 → 3-stage timeline in the dark panel.
4. **Repair** — contractor submits after-photo → Gemini "repaired ✓" + drive-by roughness → stage 1 releases (Solana Explorer link).
5. **Hold** — DEMO fast-forward releases the 30-day-gated stages → full trail on Solana Explorer.

---

## Honest Limitations & Disclosures

1. **Oracle-gated Solana releases** — the escrow is neutral and trust-minimized, but stage-release decisions are pushed by our server keypair after verified evidence. Production path: a decentralized oracle set or validator committee.
2. **No full Sybil resistance** — citizen confirmations require distinct accounts/wallets with on-chain dedupe, but identity is not proof-of-personhood. On the roadmap.
3. **Roughness telemetry** is phone-accelerometer based and not yet normalized for vehicle/speed.
4. **Testnet/devnet funds only** — Ethereum testnet and Solana devnet assets have zero real-world value. Government payments are not on-chain; the production path is a municipal pilot or crowdfunded civic bounties.
5. **Offline reality boundary** — VERA guarantees money cannot move without recorded evidence and authorization; it does not claim physical omniscience over workmanship without human inspection.

---

## Documentation

- [VPS Deployment (Ubuntu)](DEPLOY_VPS.md)
- [System Architecture](docs/architecture.md) · [Deployment](docs/deployment.md) · [Blockchain](docs/blockchain.md) · [Verification](docs/verification.md)
- Solana program: [contracts/hisaab/](contracts/hisaab/) · EVM contract: [contracts/VERA.sol](contracts/VERA.sol)


## Quick start (full local stack)

```bash
npm install
cp .env.example .env.local        # fill DATABASE_URL / JWT_SECRET / GEMINI_API_KEY
npm run db:migrate && npm run db:seed && npm run seed:hisaab

# boots Solana localnet (program deployed) + Hardhat node + Next dev
npm run demo:stack

# in another shell — deploy the VERA contract to the local Hardhat node
npx hardhat run scripts/deploy.js

# end-to-end verification of both product loops (58 checks)
node scripts/e2e-check.mjs
```

Demo accounts (password `Password123!`): `admin@fundtrail.org` (ADMIN),
`ngo@fundtrail.org` (ORGANIZATION), `donor@fundtrail.org` (USER),
`auditor@fundtrail.org` (AUDITOR), `thaker@vera.org` (CONTRACTOR).

Roles: `USER` (citizen) · `ORGANIZATION` (any org type) · `CONTRACTOR` ·
`AUDITOR` · `ADMIN` (Hisaab admin console at `/admin`).

Money model: ledger amounts are demo-labeled (`DEMO FUNDS`); real value moves
only via user-signed wallet donations (EVM) and the on-chain escrow (Solana
localnet). `DEMO_MODE=true` enables the demo fast-forward of the durability hold.

Mobile API: see [docs/api-v1.md](docs/api-v1.md).
