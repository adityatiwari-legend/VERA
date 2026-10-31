# VERA × Hisaab × AgentPass — Implementation Plan

**One product, three modules, one thesis: "VERA = proof-gated money."** A citizen, a contractor, or an AI agent — every escrow releases only against verified proof, and every actor builds portable reputation from what actually happened. Everything runs on the existing Next.js app + Postgres; Solana (devnet) hosts the Hisaab escrow; local Hardhat hosts VERA.sol + a new AgentRegistry; Tiger Data Cloud hosts the time-series. All of it is Ubuntu-VPS deployable (Dockerfile already exists).

## Prerequisites (you provide, ~10 min)
- **GEMINI_API_KEY** from aistudio.google.com (free tier is enough)
- **Tiger Data Cloud** free account → connection string (it's managed Postgres/TimescaleDB)
- Nothing else; Solana devnet SOL comes from faucet via script

---

## Workstream 1 — Solana toolchain + Hisaab Anchor program
1. **WSL Ubuntu setup** (one-time, ~30-45 min, kicks off first): `wsl --install -d Ubuntu` (WSL2 kernel already present via docker-desktop), then inside: build-essential/pkg-config/libssl-dev, Solana CLI (agave release tarball), rust stable, Anchor via `avm`. Build happens in WSL; keygen/airdrop/deploy also run from WSL. The built `.so` + program ID are committed as release artifacts so the Ubuntu VPS path is identical.
2. **`contracts/hisaab/`** — new Anchor workspace (separate from Hardhat):
   - State: `Report` PDA `["report", seed]` (reporter pubkey, lat/lng ×1e6 as i64, severity u8, media_hash [u8;32], confirmation count, status, created_at) and `Escrow` PDA `["escrow", seed]` + `["vault", seed]` (funder, contractor, oracle pubkey, amounts [u64;3], released stage u8).
   - Instructions: `init_report`, `confirm_report` (dedupe enforced on-chain via `["confirm", seed, confirmer]` PDA — same person physically cannot confirm twice), `init_escrow` (funder deposits SOL into vault), `release_stage(idx)` (**oracle-only** — our verified backend keypair pushes the decision after AI + citizens agree), `refund`.
   - ~150-200 lines. Honest model: escrow is neutral on-chain; oracle authority is the trust assumption (stated in pitch + README).
3. **`lib/solana.ts`** — `@solana/web3.js` + `@coral-xyz/anchor`, devnet connection, oracle keypair from env, typed helpers per instruction, explorer URL builder. **`scripts/solana-setup.ts`** — generates oracle/funder/contractor keypairs, airdrop retry loop, prints addresses.

## Workstream 2 — Schema
**Main Postgres (migration `011_hisaab_agentpass.sql`):**
- `users` role CHECK extended with `'CITIZEN'`
- `pothole_reports` (reporter, lat/lng, severity, size_cm, `gemini_result JSONB`, media sha256+path, status OPEN→CONFIRMED→ESCALATED→REPAIR_SUBMITTED→VERIFIED→PAID, solana PDA)
- `pothole_confirmations` (UNIQUE(report_id, user_id), solana tx)
- `hisaab_escrows` (amounts, released_stage, escrow/vault PDAs)
- `repair_submissions` (after-photo sha256, `gemini_compare JSONB`, roughness score)
- `agents` (wallet UNIQUE, name, spend_cap) + `agent_outcomes` (success, amount, ts)

**Tiger Data (separate pool in `lib/tiger.ts`, `TIGER_DATABASE_URL`):** hypertables for `roughness_readings` (accel_z, speed, ts) and `agent_outcomes`; idempotent `scripts/tiger-setup.ts`. Graceful fallback to main-DB tables if the service is unreachable (flagged in `/api/health`) — sponsor integration is real, demo never breaks.

## Workstream 3 — Gemini (`lib/gemini.ts`)
`@google/generative-ai` + Gemini Flash vision:
- `analyzePotholePhoto()` → strict JSON `{severity, size_estimate_cm, description_hinglish, confidence}` — plugs into the existing pipeline pattern (`lib/verification.ts`'s fixed output shape; failure → `MANUAL_REVIEW`, mirroring your AIStatus enum)
- `compareBeforeAfter(before, after)` → `{repaired, confidence, notes_hinglish}` — gates the release

## Workstream 4 — Hisaab API + UI (new CITIZEN role)
**RBAC touches (additive):** `types/index.ts`, `lib/validation.ts`, users-CHECK migration, `DashboardShell.getNavItems()`, register page, seed (3 citizen users, fixed UUIDs).

**API** (all follow your `requireRole` + zod + AppError patterns): `POST /api/hisaab/reports` (photo + geolocation → sha256 → Gemini → pg → on-chain report), `POST /api/hisaab/reports/[id]/confirm` (distinct CITIZEN; at 3/3 status flips and escrow opens), `POST /api/hisaab/escrows` (devnet deposit), `POST /api/hisaab/repairs` (after-photo → Gemini compare → roughness ingest → oracle releases stage 0/1 on-chain), `POST /api/hisaab/roughness` (phone DeviceMotion batch), `GET /api/hisaab/reports` (map feed). 30-day hold has an ADMIN-only, UI-labeled **DEMO fast-forward** endpoint.

**UI:** `/hisaab` public street register — react-leaflet + OSM tiles (no API key), pins by status; `/hisaab/report/new` camera+GPS capture with live Gemini verdict; `/hisaab/report/[id]` — Gemini card (Hinglish), confirmations, 3-stage escrow timeline with Solana Explorer links, before/after viewer, hand-rolled SVG roughness sparkline (no chart dep), audit trail reusing your AuditTimeline pattern.

## Workstream 5 — AgentPass (EVM, local Hardhat per your choice)
- **`contracts/AgentRegistry.sol`** (~80 lines): `registerAgent(wallet, cap)`, `recordOutcome(agent, success, amount)`, on-chain stats; deployed via existing Hardhat scripts.
- **`lib/agentpass.ts`**: reputation grade reusing the A+→D factor pattern from `lib/reputation.ts`; `merchantGate(agent, amount)` blocks grade < C or over-cap.
- **x402-style flow (mocked at the HTTP layer, honestly labeled):** unpaid request → `402 {price, terms, escrowRef}` → agent pays into VERA.sol milestone via your existing server-relayer pattern (`approveReleaseFor`) → service executes → outcome recorded → escrow releases on success.
- **`scripts/agent-demo.ts`**: legit agent (Gemini function-calling loop with its own ethers wallet) pays seamlessly; fraud agent racks 3 recorded failures → merchant returns 403 with reputation evidence.
- **`/agentpass` public dashboard**: merchant view — live agent traffic, per-agent reputation cards (reuse TrustScoreGauge), auto-block feed, escrow release log.

## Workstream 6 — Ubuntu VPS deploy (DO/Vultr track)
Compose extended: `web` + `postgres:16` + `hardhat-node` (so EVM runs on the VPS too; Solana stays devnet — no validator needed). `DEPLOY_VPS.md` documents compose up → migrate → seed → contract deploys. `.env` additions: `GEMINI_API_KEY`, `TIGER_DATABASE_URL`, `HISAAB_ORACLE_KEYPAIR`, `HISAAB_RPC_URL`, `AGENT_REGISTRY_ADDRESS`.

---

## Two-day schedule
- **Day 1 AM:** WSL/toolchain install (background) ‖ CITIZEN role + migrations + Gemini lib + report flow (pg-only first)
- **Day 1 PM:** Anchor program built + deployed to devnet; report → on-chain wired; escrow init working
- **Day 2 AM:** confirmations, repair flow, before/after compare, stage releases + fast-forward
- **Day 2 PM:** AgentPass end-to-end, roughness + Tiger Data chart, seed data, polish, rehearsal

**Pre-agreed cuts if late:** roughness → canned demo data; AgentPass dashboard → single page; existing rule-based invoice verification stays as-is (Gemini OCR upgrade only if ahead of schedule).

## Demo script (~4 min, judges)
1. Photo of the cardboard-road pothole → Gemini severity + Hinglish report lands on the public map
2. Two teammates confirm → "3/3, public register" → Solana Explorer tx on screen
3. ₹50,000 escrow locked (devnet), stage timeline visible
4. "Thaker" fills it → after-photo pass + drive-by roughness reading → Stage 1 releases on-chain
5. Reveal: **the same rails carry AI-agent traffic** — legit agent pays, fraud agent auto-blocked by reputation

## Honest limits (pitch + README)
Oracle-signed Solana releases (neutral escrow, trusted oracle); no Sybil resistance beyond distinct accounts (roadmap); x402 mocked at HTTP layer; roughness not speed/vehicle-normalized (roadmap); government payments not on-chain — devnet/civic-bounty framing.

## Known risks
Devnet faucet rate limits (script retries + web faucet backup); WSL download ~1-2 GB (starts immediately); Gemini vision latency 2-5 s (async UI progress); react-leaflet SSR (dynamic import).
