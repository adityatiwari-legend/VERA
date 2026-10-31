# VERA — Project Overview

> **Last updated: 2026-10-30** · Status: **all implementation phases complete, E2E suite green (58/58 checks)** · Stack: Next.js 14 · PostgreSQL · EVM (Hardhat) · Solana (Anchor) · Google Gemini

---

## 1. What VERA Is

**VERA is a "proof-gated money" platform — a programmable trust layer where money only moves when verified evidence says the work was done.**

Whether the payer is a donor funding a classroom or a government department fixing a road, the rule is the same: **every escrow releases only against verified proof.** Citizens, Gemini vision, and on-chain evidence must agree before a single rupee leaves the vault.

The platform has two modules on one shared stack:

| Module | Chain | One-liner |
|---|---|---|
| **VERA Core** | Ethereum (local Hardhat node; Sepolia later) | Donation campaigns → milestone escrow → proof verification → 2-of-3 multisig release → public audit trail |
| **Hisaab of the Road** | Solana (localnet test-validator; devnet later) | Pothole reports → Gemini vision → 3-citizen confirmation → milestone escrow for road repairs with a 30-day durability hold |

The name **VERA** means "truth" — the product's promise is that recorded evidence, not promises, gates the money.

---

## 2. The End Goal

**Verifiable public money.** The long-term product vision:

1. **Kill the trust deficit in donations.** A donor can click "Trace My Donation" and see exactly which milestone their money funded, which auditor approved it, and the on-chain transaction that released it — without trusting anyone's word.
2. **Fix civic infrastructure with accountability.** A citizen reports a pothole, three neighbors confirm it, government funds are sanctioned into a smart-contract escrow, a contractor repairs it, and the contractor gets paid **only** stage-by-stage as AI + telemetry + citizens verify the repair — with the final tranche locked behind a 30-day durability hold so shoddy patchwork doesn't pay.
3. **Become reusable trust infrastructure.** The pattern (evidence → AI screening → human approval → on-chain release → public audit trail) generalizes to any organization type (NGO, trust, CSR, school, RWA) and any fund type (government grants, corporate CSR, crowdfunding).

**Honest production path (post-hackathon):** public testnets (Sepolia / Solana devnet→mainnet), a decentralized oracle set instead of the server-side oracle key, proof-of-personhood for Sybil resistance, Razorpay/UPI for INR collection, and a municipal pilot.

---

## 3. How It Works

### 3.1 The shared trust engine

Both modules run the same five-step pattern on different chains:

```
EVIDENCE (photo/telemetry/invoice)
  → AI SCREENING (Gemini vision: severity, before/after compare, invoice OCR)
  → HUMAN AUTHORIZATION (auditor / multisig signers / admin)
  → ON-CHAIN RELEASE (smart contract escrow, stage-gated)
  → PUBLIC AUDIT TRAIL (hash-chained log + explorer links, open to anyone)
```

**Architectural principle: Postgres is the system of record; the chains are the proof layer.** Every state change lives in PostgreSQL with a `blockchain_status ∈ {PENDING, CONFIRMED, FAILED, OFF}` flag. Chain writes are best-effort at write time and reconciled by an integrity worker. The UI never shows "On-chain ✓" unless a real transaction hash exists — otherwise it shows an honest "Ledger-only" / "Chain offline" badge.

### 3.2 Module 1 — VERA Core (donation escrow, EVM)

```
DONOR → DONATION → EARMARKED CAMPAIGN → LOCKED ESCROW → MILESTONE
      → PROOF SUBMITTED (file, SHA-256 fingerprinted)
      → GEMINI OCR SCREENING (line items, vendor, amount match, discrepancy flags)
      → HUMAN AUDITOR approve/reject
      → RELEASE REQUEST → 2-OF-3 MULTISIG signatures
      → ON-CHAIN RELEASE (VERA.sol) → PUBLIC AUDIT TRAIL
```

- Campaigns are created by verified organizations (`org_status: PENDING → VERIFIED` via admin KYB queue) with `org_type: NGO / TRUST / CSR / SCHOOL / RWA / OTHER`.
- All ledger movements are atomic double-entry transactions (`DONATION / LOCK / RELEASE / REFUND`) and carry a **"DEMO FUNDS" badge** — ledger money is demo-labeled during the hackathon.
- **Wallet Connect path (real value):** users can bind MetaMask via a server-verified `personal_sign` challenge, then donate actual on-chain value through the VERA contract with correct wei conversion (`ETH_INR_RATE`) and a real tx hash. Wallet binding doubles as the signer identity for the 2-of-3 multisig.
- **Refunds** are pro-rata per donor (`donorContributions`), wired through the contract and UI.
- **NGO Reputation Index:** a deterministic, transparent 0–100 formula (base 100; −15 failed milestone, −10 rejected proof, −5 AI discrepancy, −10 refund; +10 per completed milestone capped +30, +5 clean approval, +5 clean utilization), graded A+ → D.
- **Hash-chained audit log:** every action appends `sha256(prev_hash + payload)`; an append-only DB trigger blocks deletes; `/api/audit/verify-chain` re-walks the chain and detects tampering (proven by a dedicated tampering test).

### 3.3 Module 2 — Hisaab of the Road (civic repairs, Solana)

```
CITIZEN REPORTS (photo + GPS)
  → GEMINI VISION (severity, size, Hinglish summary)
  → 3 DISTINCT CITIZENS CONFIRM (on-chain PDA dedupe — same wallet cannot confirm twice)
  → ADMIN TRIAGE (verify / prioritize / SLA aging)
  → FUND REQUEST (DRAFT → SUBMITTED → APPROVED → SANCTIONED, gov reference + document hash)
  → ESCROW CREATED (funder locks staged amounts in a program-owned PDA vault)
  → CONTRACTOR ASSIGNED + ACCEPTS
  → REPAIR: after-photo → Gemini before/after compare + drive-by roughness telemetry
  → STAGE 1 RELEASE (oracle-signed, on-chain)
  → 30-DAY DURABILITY HOLD (enforced on-chain via Clock::get()) → STAGES 2–3
  → REPORT PAID → citizen ratings + public transparency page
```

- **The escrow is neutral:** vault funds can only move to the contractor stage-by-stage, or back to the funder as a refund. Nothing else.
- **The trust assumption is stated openly:** stage releases are gated by a server-side *oracle* keypair acting on verified evidence. Production path is a decentralized oracle set.
- **Roughness telemetry:** drive-by phone accelerometer readings (`AVG(ABS(accel_z))`, threshold-gated) stream into Tiger Data (TimescaleDB) hypertables, with an automatic local-Postgres fallback.
- **INR ↔ lamports** conversion at a fixed `SOL_INR_RATE` env rate.
- **Demo fast-forward** of the 30-day hold exists for presentations, gated behind `DEMO_MODE=true`.

### 3.4 Architecture

```
┌──────────────────────────── CLIENTS ────────────────────────────┐
│  Web (Next.js 14 App Router)      Mobile: REST /api/v1 +        │
│  citizen · org · auditor ·        Bearer tokens; oracle-relayer │
│  admin · contractor + MetaMask    signing (no keys on device)   │
└──────────────┬────────────────────────────┬─────────────────────┘
               │ httpOnly cookie (web)      │ Bearer token (mobile)
┌──────────────▼────────────────────────────▼─────────────────────┐
│                    NEXT.JS APP (single deployable)              │
│  • /api (web, cookie sessions)   • /api/v1 (mobile, tokens)     │
│  • Server components (reads)     • Route handlers (writes)      │
│  • middleware.ts: JWT verify + role route gating (one choke pt) │
├──────────────────────────────────────────────────────────────────┤
│ SERVICE LAYER (lib/* — all business rules, no HTTP)              │
│  auth · permissions · campaigns · milestones · proofs ·         │
│  verification (Gemini) · donations · fund_transactions ·        │
│  release_requests · refunds · hisaab · hisaab_actions ·         │
│  fund_requests · notifications · audit_log (hash chain) ·       │
│  integrity · reputation · solana · blockchain · storage · tiger │
├───────────────┬──────────────────┬──────────────────────────────┤
│ POSTGRES 16   │ EVM — VERA.sol   │ SOLANA — hisaab Anchor       │
│ system of     │ campaign, donate,│ report/confirm/escrow/       │
│ record: users,│ milestone escrow,│ release_stage/refund; PDA    │
│ campaigns,    │ 2-of-3 multisig, │ vault; on-chain 30-day hold  │
│ ledger, audit │ refund           │ timer; localnet              │
│ hash chain    │ (Hardhat node)   │ (test-validator)             │
├───────────────┴──────────────────┴──────────────────────────────┤
│ Google Gemini (vision: severity, before/after, invoice OCR)      │
│ Tiger Data / TimescaleDB (roughness time-series; local fallback) │
│ Disk object storage (media + SHA-256; only hashes go on-chain)   │
└──────────────────────────────────────────────────────────────────┘
```

Key patterns:

- **Server-side relayer/oracle keys** — users never need gas; on-chain authority comes from per-user wallet binding (EVM `personal_sign`, Solana PDA dedupe). This is what makes the mobile flow safe without keys on the device.
- **One auth system, two transports** — httpOnly JWT cookie (`fundtrail_session`) for web, Bearer token (`api_tokens` table) for mobile; same JWT claims + DB role check.
- **Fail-closed releases** — a milestone can never be marked CONFIRMED without a real tx hash.

---

## 4. Product Modules (the app surface)

### Roles (single `users` table, single `/login` + `/register` with role tabs)

| Role | Onboarding | Home | Can do |
|---|---|---|---|
| `USER` (citizen/donor) | Self-serve | `/dashboard` | Donate (ledger or wallet), report issues, confirm reports, roughness scans, trace money, notifications |
| `ORGANIZATION` | Self-serve → admin KYB verification | `/org/campaigns` | Create/manage campaigns, milestones, submit proofs, refund |
| `CONTRACTOR` | Self-serve → admin approval | `/contractor` | See assigned jobs, accept/decline, submit repair evidence + roughness, payout wallet setup, ratings |
| `AUDITOR` | **Invite-only** (admin mints) | `/auditor/dashboard` | Review assigned proofs, approve/reject, sign 2-of-3 releases, refunds |
| `ADMIN` | `admin:bootstrap` script only (never self-registered) | `/admin` | Hisaab console: complaint queue, fund requests, escrow creation, contractor directory & assignment; org verification; auditor invites |

Route trees are gated centrally in `middleware.ts`; a wrong-role visit gets an "Access Restricted" card linking to the user's *own* dashboard, never the landing page.

### Pages by area

- **Public (no login):** landing home (tunnel hero + cobe 3D globe + live platform stats), `/campaigns` directory + campaign detail + **public audit dashboard** `/campaigns/[id]/audit` + printable report, `/ngos` directory + reputation page, `/hisaab` street register with OSM map + report detail pages, tx explorer `/explorer/tx/[hash]` and `/tx/[hash]` (live JSON-RPC + DB cross-reference).
- **Auth:** `/login`, `/register` (role tabs: User / Organization / Contractor — admin/auditor cannot self-register).
- **Citizen/donor:** dashboard, donations list + detail, **Trace My Donation** `/donor/donations/[id]/trace`, notifications, Hisaab report creation/confirmation.
- **Organization:** campaign CRUD, milestone manager, proof submission with wallet binding, refund button.
- **Auditor:** review queue, review detail with evidence inspector, wallet-bound signing.
- **Admin (`/admin`):** overview, complaints queue, fund requests (create + status transitions), escrows, contractors directory, access control (org verification, auditor invites).
- **Contractor:** assignments (accept/decline), repair submission, Solana payout wallet form.

---

## 5. Smart Contracts

### 5.1 EVM — `contracts/VERA.sol` (Solidity 0.8.20)

Escrow contract holding campaigns, milestones and a 2-of-3 multisig release process:

- `createCampaign`, `setSigners` (3 signer addresses), `donate(campaignId)` (payable, `nonReentrant`)
- `createMilestone` (amount + recipient), `requestRelease` (starts the approval clock)
- `approveRelease` / `approveReleaseFor` (EIP-712 signature-based approval for bound signers) — release executes at **2 of 3**
- `releaseFunds` (on-chain transfer to milestone recipient)
- `refund` (pro-rata per donor via `donorContributions`), `markMilestoneFailed`
- View helpers: `getCampaign`, `getMilestone`
- Deployed to the **local Hardhat node** (chain id 31337); Sepolia is post-hackathon. Interacted with via **ethers v6** through a server-side relayer key; the relayer pattern is documented in `docs/blockchain.md`.

### 5.2 Solana — `contracts/hisaab/` (Anchor 0.30.1, Rust)

Program id: `AUH7tYQJFXjya5wgu9APf1Q5qDs8G9jKEEzxjA1VpxMw`. Four account PDAs and five instructions:

| Instruction | What it does |
|---|---|
| `init_report` | Anchors a citizen report (status, severity, evidence hash) |
| `confirm_report` | Per-citizen **PDA dedupe** — the same wallet physically cannot confirm twice |
| `init_escrow` | Creates the escrow + program-owned **vault PDA**; funder CPI-transfers the full amount |
| `release_stage` | **Oracle-only**, strictly sequential stages 1→3; stages 2–3 require `now >= hold_until` (**the 30-day hold is enforced on-chain** via `Clock::get()`) |
| `refund` | Returns vault funds to the funder |

Client side uses `@solana/web3.js` + `@coral-xyz/anchor` (`lib/solana.ts`). Build/deploy runs inside **WSL Ubuntu** (Anchor toolchain, with edition2024/MSRV dependency pins — `npm run build:hisaab` / `deploy:hisaab`), targeting the **local test-validator** (`npm run solana:localnet`).

---

## 6. Technology Stack — every library and what it's for

### Application core
| Tech | Purpose |
|---|---|
| **Next.js 14** (App Router) | Single deployable: server components for reads, route handlers for writes, `middleware.ts` as the single auth choke point |
| **React 18 + TypeScript 5.6** | UI + end-to-end typing (`npm run type-check`) |
| **Tailwind CSS 3.4** (+ PostCSS/Autoprefixer) | Styling; light editorial design system documented in `docs/design-system.md` |
| **lucide-react** | Icons |

### Database & storage
| Tech | Purpose |
|---|---|
| **PostgreSQL 16** via parameterized **`pg`** | System of record — users, campaigns, ledger, escrows, audit chain (no ORM; hand-written SQL + migrations) |
| **Tiger Data (TimescaleDB)** | Hypertables for roughness/telemetry time-series; automatic local-Postgres fallback when unset |
| **Disk object storage** (`lib/storage.ts`) | Evidence media with SHA-256 fingerprints + dedupe; only hashes go on-chain |

### Auth & security
| Tech | Purpose |
|---|---|
| **jose** | JWT sign/verify (edge-compatible — used inside `middleware.ts`) |
| **bcryptjs** | Password hashing |
| **zod** | Single source of validation schemas (`lib/validation.ts`); register whitelist allows only `USER|ORGANIZATION|CONTRACTOR` |
| httpOnly cookie `fundtrail_session` + `api_tokens` Bearer tokens | Web + mobile transports over the same identity layer |

### Blockchain — EVM side
| Tech | Purpose |
|---|---|
| **Solidity 0.8.20** | `VERA.sol` multisig escrow |
| **Hardhat 2.29 + hardhat-toolbox** | Local node, tests (`contracts/test/VERA.test.ts`), deploys |
| **ethers v6** | All EVM interaction from the server (`lib/blockchain.ts`, ABI in `lib/contracts/VERA_ABI.ts`) |

### Blockchain — Solana side
| Tech | Purpose |
|---|---|
| **Anchor 0.30.1 (Rust)** | The `hisaab` on-chain program (PDAs, vault, hold timer) |
| **@solana/web3.js** | RPC, keypairs, confirmations |
| **@coral-xyz/anchor** | TypeScript client for the program |
| **WSL Ubuntu toolchain** | Anchor/SBF build scripts (Windows host) |

### AI
| Tech | Purpose |
|---|---|
| **Google Gemini** (`@google/generative-ai`, model per `GEMINI_MODEL`) | Pothole severity/size extraction, Hinglish summaries, before/after repair comparison, invoice/receipt OCR with line-item + amount-matching and discrepancy flags. Degrades gracefully to `MANUAL_REVIEW` when the key is absent |

### Maps, 3D & motion
| Tech | Purpose |
|---|---|
| **leaflet + react-leaflet** (OSM tiles) | Hisaab street register map, report pins |
| **cobe** | Lightweight 3D globe on the public home page |
| **three / @react-three/fiber / @react-three/drei** | 3D components (globe CDN experiments) |
| **framer-motion, gsap, lenis, matter-js, canvas-confetti** | Motion/visual effects for the landing experience (parts of the older cinematic stack remain in `components/` as unrouted code pending cleanup) |

### Validation & utilities
`clsx` + `tailwind-merge` (class merging), `dotenv`, **tsx** (TypeScript script runner for all seed/test/migrate scripts), custom `lib/utils.ts` (INR formatting etc.).

### Infrastructure & deployment
- **Docker Compose** (`docker-compose.yml`): `web` + `postgres` + `hardhat-node`; **Nginx** TLS config; `Dockerfile`; **DEPLOY_VPS.md** for Ubuntu VPS (DigitalOcean/Vultr).
- **`npm run demo:stack`** — one-command demo orchestrator: boots Solana test-validator + Hardhat node + Next dev.
- 18 numbered SQL migrations in `db/migrations/` are the single source of truth for the schema.

---

## 7. Data Model (migrations 001–018)

Core tables:

- **`users`** — single table, 5 roles (`USER`, `ORGANIZATION`, `CONTRACTOR`, `AUDITOR`, `ADMIN`), plus `org_type` / `org_status` (KYB), `contractor_status`, `service_area`, `wallet_address` (EVM, signature-bound), `solana_pubkey`, `wallet_type`, `account_status`.
- **`campaigns` / `milestones` / `donations` / `fund_transactions`** — VERA Core: campaign lifecycle, milestone registry, double-entry ledger (`DONATION`/`LOCK`/`RELEASE`/`REFUND`) with recipient tracking and `is_demo` demo labeling.
- **`proofs` / `proof_files`** — evidence with SHA-256 hashes, AI screening results, auditor decisions.
- **`release_requests` / release signatures** — 2-of-3 multisig state, per-signer records, tx-hash fail-closed.
- **`audit_logs`** — hash chain (`sha256(prev_hash + payload)`), append-only DB trigger.
- **Hisaab:** `hisaab_reports`, `hisaab_confirmations`, `hisaab_escrows` (funder type, `fund_request_id`, `contractor_user_id`, `demo_mode`), `hisaab_repairs`, roughness readings (Tiger/local), `contractor_assignments` (`OFFERED/ACCEPTED/REJECTED/REPLACED/COMPLETED`), `fund_requests` (`DRAFT→SUBMITTED→APPROVED→SANCTIONED/REJECTED` with sanctioned amount + `gov_reference_no` + `document_hash`).
- **Platform:** `notifications` (in-app bell + polling), `api_tokens` (mobile auth).

---

## 8. API Surface

**Web API (`/api/*`, cookie sessions)** — ~50 route handlers grouped as: auth (login/logout/register/me + EVM & Solana wallet binding), campaigns (CRUD, donate, milestones, status, transactions), donations (list/detail/trace), milestones (proofs, release-request, status, refund), proofs (approve/reject/file), release-requests (sign/execute), audit (ledger, verify-chain, integrity, export), auditor reviews, hisaab (reports, confirm, media, roughness, escrows, fast-forward, refund, repairs, assignments, contractors, fund-requests), notifications, admin users, blockchain stats, health.

**Mobile API (`/api/v1/*`, Bearer tokens)** — `POST /auth/login` → token, `GET /me`, `GET/POST /hisaab/reports` (paginated, cursor-based), single-report GET, confirm endpoint. Documented in `docs/api-v1.md`. The oracle-relayer signing model means the mobile app never touches private keys.

---

## 9. Testing & Verification

| Suite | What it proves |
|---|---|
| `scripts/e2e-check.mjs` — **58/58 green** | Both full product loops end-to-end against the live server + local chains: health, role whitelist, per-role login/nav, middleware gates, the entire Hisaab loop (report → confirm×3 → fund request → sanction → assign → accept → escrow → repair → stage 1 → fast-forward 2/3 → PAID → refund-ready), the entire VERA loop (org campaign → demo donation → milestone → proof with Gemini OCR → auditor approve → release request → 2-of-3 signs → execute → audit chain), notifications, and `/api/v1` mobile auth — plus "honesty checks" asserting no fabricated telemetry |
| `test:phase1..5` (321 checks) | RBAC, ledger invariants, escrow state machine, proof verification, blockchain/multisig, productization |
| `test:tampering` | Audit hash chain detects and reports tampering |
| `test:override` | Admin override paths |
| `test:contracts` (Hardhat) | `VERA.sol` unit tests |
| `type-check` | Whole-repo TypeScript |

---

## 10. What Is Implemented (as of 2026-10-30)

Implementation followed the locked plan in `docs/AUDIT_AND_IMPLEMENTATION_PLAN.md` (Phase 0 → 1 → 2 → 3 → 4). **All five phases are complete and verified by the 58-check E2E suite.**

### ✅ Phase 0 — Security & stabilization
- Server-side register role whitelist (`USER|ORGANIZATION|CONTRACTOR` only — the admin/auditor self-registration hole is closed)
- Auth-gated audit ledger/export; proof-file authorization fixed
- ADMIN superuser 403s fixed via `assertCanManageCampaign`
- Fail-closed releases (no CONFIRMED without a tx hash)
- Dead cinematic components + stale constants removed from routes; schema regenerated from migrations

### ✅ Phase 1 — Navigation & unified auth
- `middleware.ts` as single route-gating choke point; per-role post-login redirect map
- Data-driven `ConsoleShell` navigation built from real DB state (real counts, real targets — zero hardcoded UUIDs/tx hashes)
- One login page + one register page with role tabs
- Migration `014`: roles renamed to `USER`/`ORGANIZATION`, new `CONTRACTOR` role, wallet columns (`wallet_address`, `solana_pubkey`, `wallet_type`)
- Admin org-verification (KYB) queue + auditor invite flow

### ✅ Phase 2 — Hisaab product loop
- **Admin console** `/admin`: complaint queue with SLA aging, fund-request workflow (`DRAFT→SUBMITTED→APPROVED→SANCTIONED`), escrow creation form (real funder, staged amounts, assigned contractor's bound Solana pubkey — all hardcodes removed), contractor directory
- **Contractor portal** `/contractor`: assignments, accept/decline, repair submission, payout timeline, wallet form
- **Solana program v2:** on-chain 30-day hold timer (`Clock::get()` in `release_stage`), `refund` wired through `lib/solana.ts` → API → UI, `PAID` status on-chain
- Runs on **Solana localnet** (test-validator) — no faucet dependency; honest LOCALNET badge in UI
- `npm run demo:stack` boots the entire demo stack in one command

### ✅ Phase 3 — VERA Core realness
- **Real Gemini OCR** on proof documents (line items, vendor, amount match, discrepancy flags) replacing the old filename-heuristic "verification"
- **Wallet Connect:** EVM `personal_sign`-verified binding (`components/wallet/ConnectWallet.tsx`), real-value donation path through `VERA.donate()` with correct wei (`ETH_INR_RATE`), real tx hashes persisted as CONFIRMED; wallet binding makes the 2-of-3 multisig genuinely per-signer
- Demo ledger entries flagged `is_demo` with persistent **DEMO FUNDS** badges
- Refund UI (pro-rata per donor) live for org/admin
- No hand-written fake hashes anywhere; seed scripts and all demo data removed (2026-11-01) — the database starts empty; fake stats fallbacks removed — honest offline states everywhere

### ✅ Phase 4 — Mobile API & polish
- `/api/v1` Bearer-token auth (`api_tokens`), documented in `docs/api-v1.md`
- New GETs (single report, roughness series), cursor pagination
- In-app notifications (table + bell + polling)
- Rate limiting on auth/report; N+1 fixes; public printable report pages

### ✅ Plus (latest commits)
- New public home page (tunnel hero, cobe 3D globe, live DB stats)
- Hisaab smart-contract integration hardening + multi-role workflow commit

### ⏳ Pending / next steps

| Item | Notes |
|---|---|
| Public testnets | EVM on Sepolia, Solana on devnet→mainnet — locked as post-hackathon |
| Real money rails | Razorpay/UPI for INR collection (reconsidered post-hackathon); ledger is demo-labeled meanwhile |
| Decentralized oracle | Replace the single server-side oracle/relayer key with an oracle set / validator committee |
| Sybil resistance | Distinct wallets + on-chain dedupe today; proof-of-personhood on the roadmap |
| Roughness normalization | Currently `AVG(ABS(accel_z))`, not vehicle/speed-normalized IRI |
| Push notifications / S3 storage / Redis rate limiting | In-app + disk + in-memory today, upgrade paths documented |

### ⚠️ Honest limitations (stated in-product, not hidden)

1. The Solana escrow is neutral and trust-minimized, but stage-release *decisions* come from our server oracle keypair after verified evidence.
2. Demo ledger amounts carry DEMO FUNDS badges; real value moves only via user-signed wallet donations (EVM) and the on-chain escrow (Solana localnet).
3. VERA guarantees money cannot move without recorded evidence and authorization — it does not claim physical omniscience over workmanship.
4. Government payments are not on-chain today; the sanctioned-amount workflow models them with document hashes.

---

## 11. Running It Locally

```bash
npm install
cp .env.example .env.local        # fill DATABASE_URL / JWT_SECRET / GEMINI_API_KEY
npm run db:migrate                # the database starts empty — no demo data
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=… npm run admin:bootstrap

npm run demo:stack                # Solana localnet + Hardhat node + next dev

# in another shell — deploy the VERA contract to the local Hardhat node
npx hardhat run scripts/deploy.js

# end-to-end verification of both product loops
node scripts/e2e-check.mjs        # 80 checks (suite bootstraps its own fixtures)
```

Useful scripts: `db:migrate` (schema), `admin:bootstrap` (first ADMIN account), `db:purge` (wipe all data, keep schema), `solana:setup` (keypairs + airdrops), `build:hisaab` / `deploy:hisaab` (WSL Anchor build/deploy), `tiger:setup` (hypertables), `test:phase1..5` / `test:contracts` / `test:tampering` (321 programmatic checks), `type-check`.

**Accounts:** register `USER` / `ORGANIZATION` / `CONTRACTOR` at `/register`
(orgs + contractors admin-approved at `/admin/access`, auditors admin-invited);
bootstrap the admin with `npm run admin:bootstrap`. No demo accounts ship with
the app — all campaigns and reports are created by you.

Key env vars: `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `BLOCKCHAIN_RPC_URL` + `CONTRACT_ADDRESS` (EVM), `HISAAB_RPC_URL` + oracle/funder keypairs + `NEXT_PUBLIC_HISAAB_PROGRAM_ID` (Solana), `TIGER_DATABASE_URL`, `DEMO_MODE`, `ETH_INR_RATE` / `SOL_INR_RATE`, `ROUGHNESS_THRESHOLD`.

---

## 12. Repo & Docs Map

| Path | Contents |
|---|---|
| `app/` | Next.js routes — `(public)`, `(auth)`, `dashboard`, `org/`, `admin/`, `auditor/`, `contractor/`, `donor/`, `hisaab/`, `campaigns/`, `ngos/`, `explorer/`, `tx/`, `notifications`, `api/` + `api/v1/` |
| `lib/` | Service layer — auth, permissions, campaigns, milestones, proofs, verification (Gemini), donations, fund_transactions, release_requests, refunds, hisaab(+actions), notifications, audit_log (hash chain), integrity, reputation, solana, blockchain, storage, tiger, validation (zod), rate_limit |
| `components/` | `console/` (shell, stat cards, pills), `hisaab/` (map, forms, panels), `wallet/` (ConnectWallet), `domain/`, `ui/` primitives, landing |
| `contracts/` | `VERA.sol` + Hardhat test · `hisaab/` Anchor workspace (Rust) |
| `db/migrations/` | 18 numbered SQL migrations (source of truth) |
| `scripts/` | migrate, seed, solana-setup, tiger-setup, demo-stack, e2e-check, phase tests |
| `docs/` | `architecture.md`, `blockchain.md` (canonical two-chain explainer), `verification.md`, `design-system.md`, `api-v1.md`, `deployment.md`, `AUDIT_AND_IMPLEMENTATION_PLAN.md` (audit + the locked plan this build followed) |
| Root | `README.md`, `DEPLOY_VPS.md`, `PATENT_CLAIMS.md` (patent filing for the proof-gated release mechanism), `FundTrail_System_Architecture_Updated.md` (legacy), `docker-compose.yml`, `Dockerfile`, `nginx/` |
