# new_update.md — Backend Change Log for the Mobile (Android) Client

**Read this first.** This is the single source of truth for what changed in the **web app (Next.js backend)** that the VERA × RoadProof mobile app (`MLH-RoadProofxVera/`) talks to.

- **Rule 1:** Every time something is pushed/changed/added/removed in the web app, a new entry is added at the **top** of the Change Log section below. If you (mobile dev) only read this file, you know exactly what to sync.
- **Rule 2:** `MLH-RoadProofxVera/` (the Flutter/Android project) is **never modified from the web-app side**. All notes for the mobile dev are written as "action needed" items in the entries here.
- **Rule 3:** The web app is the **backend** for the app. Contract changes are always listed as: endpoint → method → request body → response shape → what changed.

Each entry format:

```
## [YYYY-MM-DD] Short title
Commit: <hash or "uncommitted">
Backend changes: added / changed / removed (files + endpoints)
Mobile action needed: <what the app must do / can now enable / must stop using>
```

---

## Change Log (newest first)

### [2026-10-31] CI/CD pipeline for VPS deployment — infra only, no API change
Commit: `af3cfb1`
Backend changes: deployment infrastructure only, zero app/API code changes:
- `.github/workflows/deploy.yml` — on every push to `main`, SSHes into the VPS and runs `deploy/deploy.sh` (secrets required: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`).
- `deploy/deploy.sh` — idempotent VPS deploy: git pull → `docker compose up -d --build` (app + Postgres + nginx) → wait for DB → `db:migrate` → restart → health check.
- `deploy/bootstrap-vps.sh` — one-time server bootstrap (installs Docker + git, clones repo to `/opt/vera`, creates the data volume, installs the CI/CD SSH deploy key).
- `Dockerfile` — build args for `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_CHAIN_ID` / `NEXT_PUBLIC_HISAAB_PROGRAM_ID` (these are inlined into the client bundle at build time — runtime env alone never set them).
- `docker-compose.yml` — all app env vars now flow through compose substitution from the project `.env` (GEMINI key, HISAAB keypairs, JWT, etc.) with safe local defaults.
Mobile action needed: none — no route, endpoint, or contract change.

### [2026-10-31] Console shells themed (ribbon sidebar ambient + fade-in) — frontend only, no API change
Commit: uncommitted
Backend changes: **none** — presentation only. All app/console pages get the site's signature theme:
- `components/DashboardShell.tsx` (user/org/admin/auditor/contractor portals) and `components/console/ConsoleShell.tsx` (Hisaab console): the dark sidebar now carries the RibbonField ambient gradient at its top (painted behind nav content via the sidebar's stacking context, masked so it fades before the nav items).
- Content area gets a minimal opacity-only entrance (`.animate-fade-in`, new in `globals.css`, replays per route, reduced-motion safe). Chosen over `.animate-rise` deliberately: pages like `/hisaab` use `position: fixed` overlays, and a transform-based wrapper animation would re-anchor them.
Mobile action needed: none — no route, endpoint, or contract change.

### [2026-10-31] Navbar rebuilt around the liquid water pill — frontend only, no API change
Commit: uncommitted
Backend changes: **none**. Frontend only:
- New `components/ui/liquid-glass-navbar.tsx` — the Nimbus "Waterline" liquid navbar (WebGL water surface inside the pill, droplet transitions, zero npm dependencies). Adapted for this codebase: anchors render via `next/link`, `useEffect` instead of `useLayoutEffect` (SSR-safe), and a controlled `active` of -1 renders the pill without a drop (home page has no active section).
- `components/Navbar.tsx` — desktop links are now the water pill (lucide icons + labels, active item derived from `usePathname`); the single scroll animation condenses the frosted header (border + shadow + reduced padding past 20px scroll). All existing behavior preserved: chain micro-bar, auth session, notification badge, role-based link, mobile hamburger menu (pill is hidden below `lg`).
Mobile action needed: none — no route, endpoint, or contract change.

### [2026-10-31] Landing-page section reorder — globe moved above Featured campaigns
Commit: uncommitted
Backend changes: **none** — frontend only. The "Trust Network Globe" section (escrow hubs, cobe globe + RibbonField wash) moved from section 10 to **directly above "Featured verified campaigns"** in `app/(public)/page.tsx`; section comments renumbered accordingly (globe=6, campaigns=7, explainer=8, donor=9, ngo=10). New page order: Hero → Trust → Metrics → How it works → Dark two-chain band → **Globe** → Featured campaigns → Audit explainer → Donor traceability → NGO reputation → Live ledger → Final CTA.
Mobile action needed: none — no route, endpoint, or contract change.

### [2026-10-31] Landing-page premium gradient (RibbonField) — frontend only, no API change
Commit: uncommitted
Backend changes: **none** — no `app/api/**`, contract, schema, or env changes. Frontend only:
- New `components/ui/ribbon-field.tsx` — live canvas recreation of the 21st.dev "Ribbon Field" gradient (White/Sky blue/Ultramarine/Iris, angle 32°, wave 14, animated via rAF; pauses offscreen; reduced-motion safe; no new npm dependencies).
- Integrated in three places on `app/(public)/page.tsx`: hero background layer (`perspective-tunnel-hero.tsx`), the dark two-chain band directly above "Featured verified campaigns" (replaces the static radial glow), and a light-mode wash halo behind the trust-network globe.
- `docs/design-system.md` §3 updated: RibbonField usage rules documented.
Mobile action needed: none — this does not touch the HTTP contract, auth, or any endpoint.

### [2026-10-31] Full mobile-app review delivered — no backend contract change
Commit: uncommitted
Backend changes: none to `app/api/**`. Added a repo-root doc: **`android_app_review.md`** — a prioritized (P0/P1/P2) review of the Flutter app with file:line references, based on 4 full review passes cross-checked against the live backend routes.
Mobile action needed: read `android_app_review.md` before the next build. Start with its "TL;DR top 10" table and "Suggested fix order" — Wave 1 items are small diffs that unblock live mode (role enum mapping, router `refreshListenable`, cleartext network config, route role gating, `recipientAddress` casing, mock-id hardcoding).
Open backend decisions (Aditya will decide; endpoints may be added later): roughness scoring formula, `/milestones/[id]/dispute` route, REJECT/FLAG vote route, report severity/size fields, seeded demo credentials rotation.

### [2026-10-31] Baseline — mobile repo cloned, backend contract snapshot
Commit: `19ae340` (web repo is a single squashed "initial commit"; this file becomes the record from here on)

**What happened:** The Flutter/Android app was cloned into `MLH-RoadProofxVera/` (its own nested git repo, currently at `5d30777`). No backend code changed in this entry — this is the **contract snapshot** the app can bind to today.

#### 1. How the app points at this backend
- Base URL used by the app: `http://10.0.2.2:3000/api` (Android-emulator loopback → host `localhost:3000`). Run the web app with `npm run dev`.
- App config: `lib/core/config/app_config.dart` — set `useMock: false` in `AppConfig.dev(...)`, or run with `--dart-define=VERA_USE_MOCK=false` / `--dart-define=VERA_API_URL=http://<LAN-IP>:3000/api` for a physical device.
- The app's staging/prod URLs (`staging.vera.network`, `api.vera.network`) are **placeholders**; only the local backend exists today.

#### 2. Auth — two stacks exist
| Stack | Endpoints | Mechanism | Response |
|---|---|---|---|
| Cookie (main app) | `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`, `GET /api/auth/me` | HTTP-only session cookie (app's Dio `CookieJar` handles it) | `{ user }` — **no token field** |
| Token (mobile-friendly subset) | `POST /api/v1/auth/login`, `GET /api/v1/me`, `GET/POST /api/v1/hisaab/reports`, `GET /api/v1/hisaab/reports/[id]`, `POST /api/v1/hisaab/reports/[id]/confirm` | `Authorization: Bearer <token>` | `{ token, user }` |

The app's `RemoteAuthRepository` tolerates both (uses `token` if present, else cookies). Note: `GET /api/auth/me` returns `{ user: null }` with **401** when there is no session.

#### 3. Role model (⚠️ mismatch with app's role selector)
- Backend self-serve roles: **`USER`**, **`ORGANIZATION`** (optionally with `org_type`: ORGANIZATION/TRUST/CSR/SCHOOL/RWA/OTHER), **`CONTRACTOR`**.
- `AUDITOR` is **invite-only** (admin creates it via `GET/POST /api/admin/users`), `ADMIN` is seed-only.
- The app's role selector currently offers `CITIZEN, DONOR, NGO, AUDITOR, ADMIN, CONTRACTOR` — these values **will be rejected** by `POST /api/auth/register`. **Mobile action needed:** map the selector to `USER` / `ORGANIZATION` / `CONTRACTOR`.

#### 4. Full endpoint inventory (live today)
- **Auth:** `auth/login` POST, `auth/register` POST, `auth/logout` POST, `auth/me` GET; wallets: `auth/wallet/evm` GET/POST, `auth/wallet/evm/faucet` POST, `auth/wallet/solana` POST
- **Campaigns:** `campaigns` GET/POST, `campaigns/active` GET, `campaigns/[id]` GET/PATCH/DELETE, `campaigns/[id]/donate` POST, `campaigns/[id]/milestones` GET/POST, `campaigns/[id]/transactions` GET, `campaigns/[id]/status` PATCH
- **Donations:** `donations` GET, `donations/[id]` GET
- **Milestones / escrow release:** `milestones/[id]` PATCH, `milestones/[id]/status` PATCH, `milestones/[id]/proofs` GET/POST, `milestones/[id]/release-request` GET/POST, `milestones/[id]/refund` POST; `proofs/[id]` GET, `proofs/[id]/approve` POST, `proofs/[id]/reject` POST, `proof-files/[id]` GET; `release-requests/[id]/sign` POST, `release-requests/[id]/execute` POST
- **RoadProof / Hisaab:** `hisaab/reports` GET/POST, `hisaab/reports/[id]` GET, `hisaab/reports/[id]/confirm` POST, `hisaab/reports/[id]/media` GET, `hisaab/reports/[id]/anchor` POST, `hisaab/reports/[id]/roughness` GET, `hisaab/roughness` POST, `hisaab/repairs` GET/POST, `hisaab/repairs/[id]/approve` POST, `hisaab/assignments` GET/POST, `hisaab/assignments/[id]/respond` POST, `hisaab/contractors` GET/POST, `hisaab/escrows` POST, `hisaab/escrows/[id]/fast-forward` POST, `hisaab/escrows/[id]/refund` POST, `hisaab/fund-requests` GET/POST, `hisaab/fund-requests/[id]/status` POST
- **Auditor:** `auditor/reviews` GET
- **Audit / chain:** `audit/ledger` GET, `audit/integrity` GET, `audit/verify-chain` GET, `audit/export` GET, `blockchain/stats` GET
- **Misc:** `notifications` GET/POST, `nav` GET, `admin/users` GET/POST, `health` GET

#### 5. Known gaps vs the app's endpoint list (mobile dev, heads-up)
- `ApiEndpoints.milestoneDispute` → `/milestones/$id/dispute` **does not exist** on the backend (there is `milestones/[id]/refund` and proofs approve/reject instead). Any dispute flow in the app is mock-only until we decide to add this endpoint.
- `hisaab/escrows` backend route is **POST-only** (no GET list yet) — an app screen expecting a GET escrow list will only work in mock mode.
- `notifications` GET exists (app's notifications feature can go live against it), but there is no read/unread state endpoint yet.

#### 6. Env vars the backend runs with
See `.env.example` (DATABASE, dual-chain keys: EVM RPC + Solana localnet, GEMINI key for the AI vision assessment). None of these affect the HTTP contract unless a provider is missing — in that case blockchain-dependent endpoints return errors, check `app/api/health/route.ts` first.

---

<!-- Add new entries ABOVE this line. Never delete old entries — the mobile dev may be syncing from an older commit. -->
