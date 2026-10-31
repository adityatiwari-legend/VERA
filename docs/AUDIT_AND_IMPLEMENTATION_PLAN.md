# VERA — Full Product Audit & Implementation Plan

Date: 2026-10-30 · Scope: entire repo (VERA Core + Hisaab) · Status: **IMPLEMENTED 2026-10-30 — Phases 0–4 complete; E2E suite green (58/58, scripts/e2e-check.mjs)**

Verified live during audit: dev server running on :3000 (`/api/health` → database ✓, gemini ✓, solana_program "configured" ✓, tiger ✗), Hardhat node live (block 20, VERA contract deployed at `0x5FbD…aa3`), Solana Hisaab program **built but NOT deployed to devnet** (live `getAccountInfo` on program id → null), TypeScript compiles clean.

---

# PART A — AUDIT: What works, what's fake, what's broken

## A1. Current role model vs. what the product needs

| Needed role | Today | Verdict |
|---|---|---|
| User / citizen (report, confirm, donate, track) | `CITIZEN` exists in enum only — **register UI never offers it**, only seed script creates one; `DONOR` is the donor role | Broken onboarding |
| Organization (any org, not just NGO) | Only `NGO`; no verification/KYB, "Verified NGO Directory" label is unbacked | Partial |
| Auditor (reviews work, releases funds) | `AUDITOR` exists; **any auditor reviews/approves/refunds every campaign**, no assignment; register API lets anyone self-mint an AUDITOR | Partial + security hole |
| Hisaab admin (sees complaints, applies for govt funds, assigns contractor) | **Does not exist.** Only generic `ADMIN`; no admin dashboard; escrow/fast-forward buttons are inline on report page | Missing |
| Contractor (does the work) | **Does not exist.** No role, no assignment flow, no contractor portal. Contractor = env pubkey or free-text label; a seeded NGO-role user plays contractor | Missing |

**Critical security hole:** `lib/validation.ts:8` — public `POST /api/auth/register` accepts `role: 'ADMIN' | 'AUDITOR'` (UI hides it, API doesn't). Anyone can curl themselves into an admin session that can lock escrows and fast-forward the 30-day hold.

## A2. Backend route audit (38 routes) — summary

**Genuinely real and working end-to-end:**
- Auth (login/logout/me), JWT httpOnly cookie `fundtrail_session`, bcrypt, DB-backed role checks (`lib/auth.ts`, `lib/permissions.ts`)
- Campaign CRUD + status transitions (NGO path), milestones, proofs upload (disk + SHA-256 + dedupe), auditor approve/reject, release-request 2-of-3 DB multisig, audit hash chain (SHA-256 prev-hash, append-only DB trigger, real chain verification), audit ledger, integrity cross-checks vs EVM receipts, reputation engine, explorer tx view (live JSON-RPC + DB cross-ref)
- Hisaab: report creation (map pin + photo + Gemini severity), roughness telemetry → Tiger/local PG, citizen confirmations (3× threshold, self-confirm block), escrow ledger, repair submission with Gemini before/after compare → staged release, health endpoint

**Simulated / fake — presented as real (must fix for "everything real"):**

| What | Where | Problem |
|---|---|---|
| "AI/OCR proof verification" | `lib/verification.ts:42-141` | No OCR. Extracts "vendor ABC Electricals / INV-1029 / ₹2,85,000" by **filename keywords**; magic rule `claimed === 300000 → 285000` fabricates the demo discrepancy; invented confidence scores feed auditor queue, reputation penalties, and public audit timeline |
| Donations (money) | `lib/donations.ts:21,91,175`; `donate/route.ts:26` | `simulated: true`, no payment rail; on-chain path sends **INR amounts as ETH wei** (`lib/blockchain.ts:254-256`) |
| "Funds released on-chain" | `lib/release_requests.ts:477-511` | Without chain config, marks `RELEASED / CONFIRMED` with **null tx hash** and still says "released on-chain" |
| Blockchain stats fallback | `lib/blockchain.ts:561-568`, `blockchain/stats/route.ts:15-17` | Offline → hardcoded `blockNumber: 194821, 'Testnet Simulated'` |
| Hisaab escrow UI payload | `components/hisaab/EscrowPanel.tsx:47-51` | Hardcoded ₹20k/20k/10k + "Municipal Civic Fund (demo)" / "RoadWorks Contractor (demo)"; copy says "locks ₹50,000" |
| Synthetic roughness | `components/hisaab/RepairPanel.tsx:40-44` | No accelerometer → 60 `Math.random()` readings injected and submitted to the real API |
| Seed data | `scripts/seed.ts:115,262,293-314` | Fake `0x…` tx hashes stored as `CONFIRMED` → integrity report throws CRITICAL alerts for txs that never existed |
| 30-day hold | `lib/hisaab.ts:376-388` vs `lib.rs:103-130` | Enforced **only in Postgres**; on-chain `release_stage` has no clock check; fast-forward endpoint rewrites `hold_until` into the past |
| Landing fallbacks | `app/(public)/page.tsx:31-62` | Hardcoded platform stats + fabricated "Jaipur" campaign object if DB empty |

**Bugs (work wrong even in their own terms):**
- **ADMIN is broken as superuser**: campaign/milestone writes compare `ngo_id !== user.id` → every ADMIN write 403s (`lib/campaigns.ts:259,341`, `lib/milestones.ts:47,263,367`). `assertCanManageCampaign` (`permissions.ts:61`) is never called by any route.
- Public campaign page milestone tiles always render `0 / —`: page reads `ms.active_proof_status` which `getMilestonesForCampaign` never selects (`campaigns/[id]/page.tsx:236` vs `lib/milestones.ts:171-201`).
- Refund feature: backend fully implemented (DB + contract + `VERA.sol:335-360`) but **zero UI callers** — orphaned.
- Multisig tracker gets a **hardcoded fake session** `{ id: '', role: 'NGO', name: 'NGO Admin' }` (`app/ngo/campaigns/[id]/MilestoneManager.tsx:271`) → "you already signed" detection never works.
- Release approvals silently skipped when `users.wallet_address` is null — and **there is no UI/API to set a wallet address** (only seed script), so no real user ever touches the on-chain path.
- `GET /api/audit/ledger` is **public** (leaks NGO names, tx hashes, OCR discrepancies) and swallows DB errors as empty success; `audit/export` leaks donor email, ~9 queries per donation (N+1).
- `GET /api/proof-files/[id]`: CITIZEN and any AUDITOR can read **every** campaign's private evidence files.
- Any AUDITOR can refund any campaign, recipient is any caller-supplied address (`refund/route.ts:27`).
- `db/schema.sql` is stale (no CITIZEN role, missing migration-007 columns, **zero hisaab tables**) — migrations are the only source of truth.
- Upload limit mismatch: server default 10 MB (`lib/storage.ts:7`) vs UI claims "max 50 MB" (`ReportForm.tsx:122`).
- JWT secret has a hardcoded in-repo fallback (`lib/auth.ts:7`); citizen Solana secret keys sit in plaintext DB (`citizen_wallets.keypair_json`).

## A3. Hisaab + Solana program audit

- Anchor program (`contracts/hisaab/programs/hisaab/src/lib.rs`, 304 lines) is solid: `init_report`, `confirm_report` (PDA-dedupe per citizen), `init_escrow` (vault PDA, funder CPI-transfers full amount), `release_stage` (oracle-only, sequential), `refund`. IDL matches. `.so` built (291 KB, Oct 29).
- **Not deployed**: live devnet query returns null for program account. README admits faucet rate-limit. Every on-chain call is guarded + try/catch → the app is currently a **fully functional Postgres-ledger simulation**, and the header shows a dead Explorer link because "configured" ≠ "deployed".
- Program gaps for production: no on-chain hold timer, `refund` has no wrapper in `lib/solana.ts` (unreachable from app), report status `PAID` never set on-chain, contractor is a pinned pubkey with no identity.
- Roughness metric is `AVG(ABS(accel_z))` — not a real IRI; fine for demo, wrong for a market product claim.

## A4. Frontend / navigation audit — the exact culprits of "click → hero page"

1. **`app/auditor/dashboard/page.tsx:36` and `app/auditor/reviews/[id]/page.tsx:43`** — wrong-role card's only action is `<Link href="/">Return to Home</Link>`. Sidebar itself invites users to click AUDITOR (role-switch widget, `DashboardShell.tsx:306-343`), so donors get bounced to the hero constantly.
2. **Navbar/Footer "How it works" → `/#pipeline`** (`Navbar.tsx:135,230`, `Footer.tsx:37`) — from any dashboard route this navigates away to the landing page.
3. **Hardcoded dead nav items** in `DashboardShell.tsx`: NGO "Proof & Evidence" → milestone UUID `mmmm…0001` that **no seed ever creates** (404); AUDITOR "Releases" + ADMIN "System" → tx hash `0x7ad1dfc6…` that exists **nowhere in the repo** (explorer dead-end); ADMIN "Users" → `/dashboard` which immediately redirects ADMIN away; NGO "Milestones"/Reports/audit links → hardcoded Jaipur campaign UUID (works only on seeded DB).
4. NGO role-switch bounce: `/ngo/campaigns` silently redirects non-NGOs to `/dashboard` — feels like a dead button.
5. CITIZEN users land in the "VERA DONOR PORTAL" (no CITIZEN case anywhere in dashboard/shell).
6. `error.tsx` / `not-found.tsx` "Home" buttons also dump dashboard users to the hero.

**Dead code (old cinematic stack, ~30 components, none imported by any routed page):** `CinematicLanding`, `Hero`, `HeroAnimatedSection`, `ThreeWaterV`, `PhysicsCanvas`, `WelcomingAnimation`, `EscrowSimulator`, `ScrollIndicator`, `ScrambleText`, `SoundConsentGate`, `SoundToggle`, `SlotButton`, `BentoGrid`, `EditorialStatement`, `AuditorWalletModal`, `canvas/*`, `scroll/ScrollStage`, `landing/HeroSection`, `landing/EscrowVisual`, the entire `components/domain/*` cluster, `financial/{TrustScoreGauge,FundDistributionBar,StatCard,ProgressBar}`, most of `ui/*` primitives, `components/ui/demo.tsx` (modified but unrouted), `lib/constants.ts`, `lib/errors.ts`. All full of fake rupee amounts and fake tx hashes. Delete.

## A5. Mobile-readiness (for your teammate's Hisaab app)

Current blockers:
- **Auth is cookie-only** (httpOnly `fundtrail_session`) — no `Authorization: Bearer` path anywhere. RN needs a token flow.
- **No single-report GET endpoint** (`/api/hisaab/reports/[id]` doesn't exist; detail is server-rendered), no roughness GET, no pagination (limit capped 200), no API versioning/OpenAPI doc.
- Multipart uploads (photo/after_photo, jpeg/png/webp) are fine for RN FormData; server-side oracle relayer signing is actually **mobile-friendly** (app never touches keys).
- No CORS config (native RN unaffected, webviews break).
- `Permissions-Policy: geolocation=()` in `next.config.mjs:14` disables geolocation on the web app itself.

---

# PART B — TARGET PRODUCT DEFINITION

## B1. One platform, one login, five roles

**VERA** = trust infrastructure. **VERA Core** (donation campaigns, any organization — NGO, trust, CSR, school, RWA) + **Hisaab** (civic complaint → government fund → contractor → verified repair).

| Role | Registers how | Can do |
|---|---|---|
| `USER` (citizen) | Self-serve | Donate, report issues, confirm reports, roughness scans, trace money, view dashboards |
| `ORGANIZATION` | Self-serve → **admin/KYB verification** (org_status: PENDING→VERIFIED) | After verification: create campaigns, milestones, submit proofs (VERA Core); `org_type`: NGO / TRUST / CSR / SCHOOL / RWA / OTHER |
| `CONTRACTOR` | Self-serve → admin approval | See assigned jobs, accept, submit repair evidence, see staged payouts, payout wallet setup |
| `AUDITOR` | **Invite-only** (admin creates / invite token) | Assigned campaigns only: review proofs, approve/reject, sign releases, refunds |
| `ADMIN` | Seed only (never self-registered) | **Hisaab admin console**: complaint queue, verify/escalate, apply for government funds, sanction → escrow, assign contractors, monitor; also org verification, auditor invites, platform config |

One `/login` page, one `/register` page (role tabs: User / Organization / Contractor). Post-login redirect map by role → dedicated console. Auditor/admin never in the public register form.

## B2. The Hisaab product loop (the full missing flow)

```
Citizen reports (photo+GPS+Gemini severity)
  → 3 citizen confirmations → CONFIRMED
  → ADMIN triage queue (verify, prioritize, SLA aging)
  → ADMIN applies to government fund (fund_request: DRAFT→SUBMITTED→APPROVED→SANCTIONED, sanctioned amount)
  → ADMIN creates escrow from sanctioned funds (real funder record, staged amounts form — no hardcodes)
  → ADMIN assigns contractor (from contractor directory w/ ratings; contractor accepts)
  → Contractor repairs → submits after-photo + roughness drive
  → Gemini before/after + roughness gate → stage releases (30-day hold ON-CHAIN, demo fast-forward env-gated off)
  → Citizen verifies → report PAID → ratings + public transparency page
```

## B3. VERA Core fixes for "everything real"

1. Replace fake OCR with **real Gemini vision** on proof documents (key already set) — line items, amounts, vendor, discrepancy flags.
2. **Wallet binding**: wallet address capture at registration + org/auditor onboarding, so on-chain 2-of-3 multisig is genuinely multi-party (today one relayer key signs everything).
3. **Money model (LOCKED)**: demo-labeled ledger through the hackathon — every simulated amount carries a visible "DEMO FUNDS" badge, and the INR-as-wei path dies — **plus an optional Connect Wallet donation path**: users link MetaMask and donate real on-chain value via the VERA contract (correct wei, real tx hash, `blockchain_status=CONFIRMED`). Wallet binding doubles as the multisig signer identity (item 2).
4. Refund flow UI (pro-rata per donor, already in contract).
5. Kill all hardcoded hashes/fallbacks; integrity pages show honest "unverified/offline" states. Public testnet (Sepolia) is **post-hackathon** — the demo runs on the already-live local Hardhat node.
6. Seed = run the real flow against the local chain, never hand-written hashes.

---

# PART C — SYSTEM DESIGN & ARCHITECTURE

## C1. High-level architecture

```
┌──────────────────────────── CLIENTS ────────────────────────────┐
│  Web (Next.js 14 App Router)      Mobile: Hisaab app (teammate) │
│  citizen · org · auditor ·        REST /api/v1 + Bearer tokens, │
│  admin · contractor + MetaMask    oracle-relayer signing (no    │
│                                   keys on device)               │
└──────────────┬────────────────────────────┬─────────────────────┘
               │ httpOnly cookie (web)      │ Bearer token (mobile)
┌──────────────▼────────────────────────────▼─────────────────────┐
│                    NEXT.JS APP (single deployable)              │
│  • /api (web, cookie sessions)   • /api/v1 (mobile, tokens)     │
│  • Server components (read paths) • Route handlers (write paths)│
│  • middleware.ts: auth + role route gating (single choke point) │
├──────────────────────────────────────────────────────────────────┤
│ SERVICE LAYER (lib/* — all business rules, no HTTP)             │
│  auth · orgs · contractors · campaigns · proofs · verification  │
│  (Gemini) · releases · refunds · hisaab (reports/escrows/       │
│  repairs) · fund_requests · notifications · audit_log (hash     │
│  chain) · integrity · reputation · storage                      │
├───────────────┬──────────────────┬──────────────────────────────┤
│ POSTGRES      │ EVM (VERA Core)  │ SOLANA (Hisaab)              │
│ system of     │ VERA.sol escrow: │ hisaab program: report/      │
│ record: users,│ campaign, donate,│ confirm/escrow/release_stage │
│ orgs, contrac-│ milestone, 2-of-3│ + refund; hold timer in      │
│ tors, funds,  │ multisig, refund │ Escrow account; localnet now │
│ audit chain   │ Sepolia later    │ mainnet later                │
├───────────────┴──────────────────┴──────────────────────────────┤
│ Google Gemini (vision: severity, before/after, invoice OCR)     │
│ Tiger Data (roughness time-series; local PG fallback)           │
│ Disk/object storage (media + SHA-256, public hashes)            │
└──────────────────────────────────────────────────────────────────┘
```

Principles:
- **Postgres is the system of record; chains are proof layer.** Every state lives in PG with `blockchain_status ∈ {PENDING, CONFIRMED, FAILED, OFF}`; chain writes are best-effort at write time, reconciled by the existing integrity worker. Never mark CONFIRMED without a tx hash (currently violated by `release_requests.ts:477-511` — fail-closed instead).
- **Server-side relayer keys** (EVM relayer, Solana oracle) — users never need gas; on-chain authority comes from per-user wallet binding + EIP-712 signatures (EVM) and PDA dedupe (Solana). This is what makes it mobile-friendly.
- **One auth system, two transports**: cookie for web, Bearer token for mobile, same JWT claims + DB role check.

## C2. Data model changes (migrations 014+)

```sql
-- users (extend; keep single-table for roles, add org/contractor columns)
ALTER TABLE users
  ALTER COLUMN role ... CHECK (role IN ('USER','ORGANIZATION','CONTRACTOR','AUDITOR','ADMIN')),
  ADD COLUMN org_type TEXT,              -- NGO|TRUST|CSR|SCHOOL|RWA|OTHER
  ADD COLUMN org_status TEXT DEFAULT 'PENDING',  -- PENDING|VERIFIED|SUSPENDED
  ADD COLUMN org_registration_no TEXT,
  ADD COLUMN contractor_status TEXT,     -- PENDING|APPROVED|SUSPENDED
  ADD COLUMN service_area TEXT,
  ADD COLUMN wallet_address TEXT UNIQUE, -- EVM (was set only by seed before)
  ADD COLUMN solana_pubkey TEXT UNIQUE,
  ADD COLUMN wallet_type TEXT,           -- CUSTODIAL|SELF_CUSTODY
  ADD COLUMN account_status TEXT DEFAULT 'ACTIVE';

-- contractor_assignments: the missing Hisaab table
CREATE TABLE contractor_assignments (
  id UUID PK, escrow_id UUID → hisaab_escrows, contractor_id UUID → users,
  assigned_by UUID, status TEXT CHECK (status IN ('OFFERED','ACCEPTED','REJECTED','REPLACED','COMPLETED')),
  offered_at, responded_at, rating_after INT);

-- fund_requests: government fund application workflow
CREATE TABLE fund_requests (
  id UUID PK, admin_id UUID, title, description, department TEXT,
  requested_amount NUMERIC, sanctioned_amount NUMERIC,
  status TEXT CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','SANCTIONED','REJECTED')),
  gov_reference_no TEXT, document_hash TEXT,   -- hash-chained approval letter
  created_at, updated_at);

-- hisaab_escrows (extend)
ALTER TABLE hisaab_escrows
  ADD COLUMN contractor_user_id UUID → users,   -- real identity, not env pubkey
  ADD COLUMN funder_type TEXT,                  -- GOV_GRANT|CORPORATE_CSR|PLATFORM
  ADD COLUMN fund_request_id UUID → fund_requests,
  ADD COLUMN demo_mode BOOLEAN DEFAULT false;   -- gates fast-forward visibility

-- notifications (in-app; email/WhatsApp later)
CREATE TABLE notifications (id, user_id, type, payload JSONB, read_at, created_at);

-- api_tokens: mobile auth for teammate
CREATE TABLE api_tokens (id, user_id, token_hash TEXT, name, last_used_at, expires_at, created_at);
```

Fix in place: `db/schema.sql` regenerated from migrations (or deleted); rename DONOR→USER, NGO→ORGANIZATION with a compatibility view/alias so existing code paths migrate incrementally.

## C3. API surface (v1 — mobile-ready)

- `POST /api/v1/auth/login` → `{ token, user }` (Bearer, 30-day); `POST /api/v1/auth/logout`; `GET /api/v1/me`
- `GET /api/v1/hisaab/reports?cursor=&limit=` (paginated), `GET /api/v1/hisaab/reports/[id]` (**new** — single report incl. confirmations, escrow, repairs, roughness summary), `POST` report/confirm/repair (multipart, same shapes as web), `GET .../roughness`
- Org/admin/contractor endpoints mirror the web actions; OpenAPI spec generated from zod schemas (`lib/validation.ts` is already the single validation source)
- Uploads: multipart now; pre-signed URLs when storage moves to S3/R2
- Rate limiting: per-IP on login/register/report (in-memory → Redis later)

## C4. Navigation architecture (the nav fix)

- **Single data-driven shell**: `DashboardShell` renders from a per-role nav config built at request time from real DB state (counts, first campaign, pending queue sizes) — all hardcoded UUIDs/tx-hashes deleted. Menu items without a real target don't render.
- Route gating in **`middleware.ts`** (one choke point): unauthenticated → `/login?next=…`; wrong role → in-shell "Access Restricted" card whose only action goes to **that user's own dashboard** (never `/`). `/#pipeline` links render only inside the public shell.
- Post-login redirect map: `USER→/dashboard`, `ORGANIZATION→/org/campaigns`, `CONTRACTOR→/contractor`, `AUDITOR→/auditor`, `ADMIN→/admin`.
- Keep existing URLs (`/ngo/*` → redirect to `/org/*`, `/donor/*` → `/dashboard`) so nothing breaks mid-migration.

## C5. What goes on-chain vs off (honest-mode rules)

| On-chain | Off-chain (PG + hash chain) |
|---|---|
| Campaign/milestone state + amounts (EVM) | All documents/media (hashes only on-chain) |
| Donations (real value, correct decimals) | Roughness telemetry (Tiger), Gemini results |
| 2-of-3 release approvals (per-signer wallets) | Citizen confirmations count (PDA dedupe on Solana) |
| Escrow fund/release/refund (Solana vault) | Ratings, reputation, assignments |
| 30-day hold timer in `Escrow` account | Government fund requests (document hash on-chain) |

UI rule: a badge says "On-chain ✓ tx 0x…" only when a real tx hash exists; otherwise "Ledger-only" / "Chain offline". No cosmetic CONFIRMED.

---

# PART D — IMPLEMENTATION PLAN (decisions locked, no work started)

**Execution order (LOCKED): Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4.** The hackathon-critical path is 0 + 1 + 2. Phase 1 stays second even though Phase 2 is the priority, because the Hisaab admin/contractor consoles depend on the new role model and the rebuilt navigation. Phase 4's minimal token-auth slice can be pulled forward at any point if your teammate gets blocked.

## Phase 0 — Security + stabilization (≈1.5 days)
1. Register role whitelist server-side: `USER|ORGANIZATION|CONTRACTOR` only (kill ADMIN/AUDITOR self-registration) — `lib/validation.ts:8`, `app/api/auth/register/route.ts`
2. Assert `JWT_SECRET` present in production (remove fallback) — `lib/auth.ts:7`
3. Auth-gate `GET /api/audit/ledger` (AUDITOR/ADMIN) + stop swallowing errors; restrict `audit/export` to AUDITOR/ADMIN; fix proof-files/proofs authz (CITIZEN exposure)
4. Fix ADMIN-superuser 403s (use `assertCanManageCampaign` everywhere)
5. Fail-closed releases: never mark CONFIRMED without tx hash — `lib/release_requests.ts:477-511`
6. Delete ~30 dead components + `lib/constants.ts`, `lib/errors.ts`, merge `lib/audit.ts` → `audit_log.ts`
7. Regenerate `db/schema.sql` from migrations

## Phase 1 — Navigation + unified auth (≈2 days)
1. Middleware route gating + per-role redirect map; wrong-role cards link to own dashboard
2. Rewrite `DashboardShell`/`Navbar`/`Footer` as data-driven nav (real counts, real targets); delete every hardcoded UUID/tx hash; remove demo quick-fill creds from login
3. One login page (role-aware post-login routing, no session leak to logged-in users); one register page with role tabs User/Organization/Contractor
4. Migration: DONOR→USER, NGO→ORGANIZATION (+org_type/org_status), new CONTRACTOR role, wallet columns
5. Org verification queue + auditor invite flow in admin; wallet binding fields (EVM `wallet_address` + Solana `solana_pubkey`) with a simple paste-and-sign binding form at onboarding — full MetaMask connect UX lands in Phase 3.

## Phase 2 — Hisaab product loop (≈3–4 days)
1. **Admin console** `/admin`: complaint queue (map + SLA aging + filters), verify/escalate, contractor directory, fund_requests workflow (DRAFT→SUBMITTED→APPROVED→SANCTIONED), escrow creation form (real funder/amounts/contractor selection — replaces `EscrowPanel.tsx:47-51` hardcodes), assignment + monitoring; escrow creation takes the assigned contractor's **bound `solana_pubkey`** as `escrow.contractor` (replaces the env fallback `HISAAB_CONTRACTOR_PUBKEY`), demo fast-forward gated behind `DEMO_MODE=true`
2. **Contractor portal** `/contractor`: assigned jobs, accept/decline, repair submission (after-photo + roughness drive), payout timeline, ratings
3. Solana program v2: hold timer in `Escrow` (`Clock::get()` check in `release_stage`), wire `refund` into `lib/solana.ts` + API + UI, set `PAID` on-chain; **deploy to localnet** (LOCKED decision): `solana-test-validator` + `anchor deploy` with unlimited airdrops — no faucet dependency, devnet only if/when needed; UI shows an honest LOCALNET badge; add `npm run demo:stack` orchestrator that boots the whole demo (Postgres + Hardhat node + Solana test-validator + `next dev`)
4. Citizen loop polish: CITIZEN portal (my reports, my area map, notifications), real roughness IRI-style scoring, desktop synthetic-injection removed (labeled manual-entry fallback instead)

## Phase 3 — VERA Core realness (≈3 days)
1. Real Gemini OCR verification replacing `lib/verification.ts` heuristics (line items, vendor, amount match, discrepancy flags) — key already live
2. Wallet-bound multisig: `approveReleaseFor` requires EIP-712 signature from each bound signer; explorer/integrity show per-signer proof
3. **Demo ledger + Connect Wallet (LOCKED)**: ledger entries get `is_demo=true` and every simulated amount renders with a persistent "DEMO FUNDS" badge; add wallet connect via raw `window.ethereum` (EIP-1193, no heavy dependencies): connect → server-verified `personal_sign` challenge binds `users.wallet_address` (prevents address-spoofing) → the donate flow gains a "Donate with wallet" option that builds `VERA.donate()` with real wei value (INR converted at fixed `ETH_INR_RATE` env — same pattern as the existing `SOL_INR_RATE`), user signs in MetaMask, real tx hash persisted as CONFIRMED; the same binding makes the 2-of-3 multisig genuinely per-signer (item 2). Optional: Phantom binding of citizen `solana_pubkey` with the same signature-verification pattern (custodial citizen wallets stay the hackathon default).
4. Refund UI (pro-rata per donor via `donorContributions`) for NGO/auditor
5. Keep VERA on the local Hardhat node for the hackathon (Sepolia post-hackathon); regenerate seed by executing the real flow against it; remove fake stats fallbacks (`blockchain.ts:561-568`, landing page) — show honest offline states
6. Fix data-contract bugs: `active_proof_status` select, remove `MilestoneManager.tsx:271` fake session (pass real user), trace page stages

## Phase 4 — Mobile API + product polish (≈2–3 days)
1. `/api/v1` + Bearer tokens (`api_tokens` table, token management page) — hand teammate the OpenAPI doc + a seed Postman collection
2. New GETs: single report, roughness series, escrow status, campaign summary; pagination + cursor everywhere
3. In-app notifications (report confirmed, escrow funded, job assigned, stage released) — table + bell + polling (push later)
4. Performance: fix N+1s (`audit_report`, auditor queue, milestones listing), rate limiting on auth/report
5. Public transparency page per report/campaign (shareable, printable) + PWA manifest for the web app

**Total ≈ 12–13 working days.** Hackathon-critical path = Phase 0 → 1 → 2. Phase 3 makes VERA Core credible (wallet connect included); Phase 4 unblocks your teammate. Razorpay/UPI is a post-hackathon add-on if the product goes to market with INR collection.

---

# PART E — DECISIONS LOCKED (2026-10-30)

1. **Money**: demo-labeled ledger until after the hackathon, with an optional **Connect Wallet** donation path (real on-chain value via MetaMask; wallet binding doubles as the multisig signer identity). Razorpay/UPI reconsidered post-hackathon.
2. **Roles**: DONOR→USER, NGO→ORGANIZATION (with `org_type`). Final set: `USER · ORGANIZATION · CONTRACTOR · AUDITOR · ADMIN`.
3. **Chains**: dual — EVM for VERA Core, Solana for Hisaab (as built).
4. **Contractor**: a distinct approved platform account, **not** an organization type — contractors fix roads, organizations raise funds. Admin-approved, carries a payout wallet + rating.
5. **Chain targets**: Solana on **localnet** (`solana-test-validator`) for now, devnet only if needed; EVM on the local Hardhat node; public testnets post-hackathon.
6. **Build order**: Phase 0 → 1 → 2 (hackathon demo) → 3 → 4.
