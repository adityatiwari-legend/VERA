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

### [2026-11-01] App ↔ web data flow FIXED — app switched to the /api/v1 Bearer stack; shared routes now accept cookie OR bearer
Commit: uncommitted (web: `lib/api_auth.ts` + 4 route files + `app/admin/complaints/page.tsx`; mobile: this change was applied **inside `MLH-RoadProofxVera/` with the owner's explicit go-ahead — the "never touch the app" rule is lifted as of today**)
Verification: `npx tsc --noEmit` clean; simulated mobile flow E2E **7/7 PASS** against a local dev server (register → v1 login → bearer → multipart report POST → report rendered on `/hisaab` → REJECT vote with bearer → roughness telemetry with bearer → `/admin/complaints` query returns the row with dispute tallies).
Backend changes:
- **Added — dual-stack auth helper** (`lib/api_auth.ts`): `requireAnyAuth(req)` (web session cookie first, then `Authorization: Bearer vera_…`) and `requireAnyRole(req, roles)`. The old `requireApiAuth` doc-comment *claimed* a cookie fallback that never existed — now both directions really work.
- **Changed — every shared route the app calls now accepts both auth dialects:** `POST /api/hisaab/reports`, `POST /api/hisaab/reports/[id]/confirm`, `POST /api/hisaab/reports/[id]/vote` (was already dual), `POST /api/hisaab/roughness`. Role rules unchanged (`USER`/`ADMIN` for reports; self-confirm still blocked; rate limits unchanged).
- **Changed — `/admin/complaints` now surfaces `pothole_votes`:** new "Disputes" column with `n REJ` / `n FLAG` badges per row (REJECT/FLAG votes were being written but no page ever read them).
Mobile changes (applied in `MLH-RoadProofxVera/`):
- Auth now uses the documented mobile stack: `POST /api/v1/auth/login` → `{ token, user }`, token stored in secure storage, sent as `Authorization: Bearer`; `GET /api/v1/me` for session restore; register auto-login **fails loudly** instead of faking a sessionless login.
- Report submission now POSTs to `/api/v1/hisaab/reports` (bearer) with the web cookie route as fallback; the old "retry same finalized FormData" bug is gone.
- Defaults: dev → `http://10.0.2.2:3000/api` (emulator→`npm run dev`), staging/prod → `https://vera.adityatiwaridev.xyz/api`. The persisted-URL migration that rewrote everything to the dead Cloudflare quick-tunnel is removed; any saved `trycloudflare.com` URL is auto-dropped (quick tunnels are ephemeral).
- Android `network_security_config.xml` now permits cleartext to any host (dev posture) — pointing a real phone at your PC's Wi-Fi IP works without the old single-IP allowlist.
- New app-wide orange **"MOCK MODE — NOT SYNCED"** banner whenever mock mode is on (mock mode previously looked identical to a live sync — the #1 way to think the app "works" while sending zero traffic).
- Bearer token survives config changes: rebuilt `ApiClient`s lazily reload the token from secure storage (`tokenProvider`) instead of silently dropping it.
Mobile action needed: **rebuild + reinstall the app** (`flutter pub get && flutter run`). On the emulator it now targets `http://10.0.2.2:3000/api` out of the box — start `npm run dev` first. On a physical phone open **Settings → Backend API URL** and enter `http://<your-PC-WiFi-IP>:3000/api`. If the orange MOCK MODE banner shows, turn off **Settings → Mock Data Mode**. Old logins are invalidated once (token era begins) — just sign in again. Note: the local Flutter on PATH is 3.44.5/Dart 3.12.2, older than the pubspec's `^3.13.4` — build with a Flutter that ships Dart ≥ 3.13.

### [2026-11-01] ALL mock/demo data removed — database starts empty
Commit: uncommitted
Verification: `npm run type-check` clean; `node scripts/e2e-check.mjs` **80/80 passed** against a freshly purged DB (the suite bootstraps its own test accounts).
Backend changes:
- **Removed — all seed scripts and demo data.** `scripts/seed.ts` and `scripts/seed-hisaab.ts` are **deleted**, along with `npm run db:seed` / `npm run seed:hisaab`. The seeded demo accounts (`ngo@fundtrail.org`, `donor@fundtrail.org`, `auditor@fundtrail.org`, `admin@fundtrail.org`, `admin@vera.org`, `thaker@vera.org`, `aarav@`/`priya@`/`rohan@vera.org` — all password `Password123!`), the fake "Government School Classroom — Jaipur" campaign, its milestones/proofs/donations/multisig rows, and the MI Road Jaipur pothole report **no longer exist in any database that runs `npm run db:purge`**. The landing page no longer falls back to a hardcoded fake campaign or fake platform stats — it shows real (possibly zero) numbers and hides the featured section when there are no campaigns yet.
- **Added — `npm run admin:bootstrap`** (`scripts/create-admin.ts`): the only way to create an `ADMIN` (it was previously seed-only). Env-driven: `ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run admin:bootstrap` (idempotent; re-running resets that account's password/role). Also added `npm run db:purge` (`scripts/db-purge.ts`) — wipes ALL data rows, keeps schema (`-- --yes` to execute).
- **Unchanged — API contracts.** No route, request, or response shape changed: `/api/auth/register` still self-serves `USER`/`ORGANIZATION`/`CONTRACTOR` and rejects `ADMIN`/`AUDITOR`; auditors are still admin-invited via `/api/admin/users` (`action: 'create-auditor'`); org/contractor approval still via `/api/admin/users`.
Mobile action needed: **yes — demo credentials are dead.** If the app has any hard-coded/logged-in demo accounts (e.g. `aarav@vera.org` / `Password123!` for the v1 API walkthrough), remove them and use real registration: `POST /api/auth/register` then `POST /api/v1/auth/login` as before. On a purged environment the app must handle empty states (no campaigns, no reports). Any docs/screenshots referencing seeded accounts or the Jaipur demo data are stale.

### [2026-10-31] Solana integration now ships configured in production (was reporting Off)
Commit: uncommitted
Backend changes:
- **Fixed — `/api/health` reported `solana_program: false` on the VPS (sidebar "Solana: Off"):** two deployment defects, no app logic changed. (1) `lib/solana.ts` loads the Anchor IDL from `contracts/hisaab/target/idl/hisaab.json`, but the Docker **runner** stage only copied `public` + `.next` — the file never existed in the `vera-app` container. The Dockerfile now COPYs the IDL into the runner image. (2) `/contracts/hisaab/target/` was fully gitignored, so the VPS clone never had the IDL, the built `hisaab.so`, or the program keypair; `.gitignore` now tracks exactly `target/idl/hisaab.json`, `target/deploy/hisaab.so`, `target/deploy/hisaab-keypair.json` (everything else under `target/` stays ignored).
- **Changed — `NEXT_PUBLIC_HISAAB_PROGRAM_ID` now defaults to the real program id `AUH7tYQJFXjya5wgu9APf1Q5qDs8G9jKEEzxjA1VpxMw`** (the committed deploy keypair's pubkey — stable across rebuilds). Env override still wins. The old default was the `Hisaab111…` placeholder, which forced `isSolanaProgramConfigured()` false on any fresh deployment.
- Note: this flips the integration to **configured/enabled**. Actual on-chain transactions additionally require the program to be deployed on devnet + the oracle/funder keypairs funded (graceful PG-ledger degrade until then, unchanged).
Mobile action needed: none — no route, endpoint, or contract change; base URL and endpoints unchanged.

### [2026-10-31] Portal shells redesigned (premium night sidebars + sticky-offset fix) — frontend only, no API change
Commit: `3ff5f14`
Backend changes: **none** — zero `app/api/**`, schema, or contract changes. Presentation only:
- `app/globals.css`: new `.sidebar-night` surface (deterministic deep-night gradient + faint blue/violet top spotlight + 2px accent hairline) replacing the canvas RibbonField inside sidebars — at 240px scale the canvas muddied into a blotchy smear with a hard mask edge. Adds `.nav-bar-accent` (active-item glow) and `.animate-slide-in` (mobile drawer, reduced-motion safe).
- `components/DashboardShell.tsx`: sidebar rebuilt — brand block (V + VERA + `{ROLE} PORTAL`), refined active state (soft ring + glowing accent bar), soft count chips, elevated user card with avatar/initial + sign out, collapse states for every block. The sidebar and mobile menu bar now track the live sticky-header height via a ResizeObserver (the navbar condenses on scroll; the old fixed `top-[57px]` leaked an 8px gap once it shrank). Mobile drawer gets the slide-in animation, brand header, notifications link, and user card.
- `components/console/ConsoleShell.tsx` (Hisaab console): same premium surface; gains a collapse toggle (68px icon rail, content padding follows), a **VERA Core** section (Browse campaigns; Admin console for admins), and a **sign out** button (was missing entirely); collapsed user card stacks vertically.
- `components/Navbar.tsx`: optional `onStickyHeight` callback (ResizeObserver on the sticky header) consumed by DashboardShell; right-side user cluster gains an avatar initial + hairline divider. All nav destinations unchanged.
Mobile action needed: none — no route, endpoint, or contract change.

### [2026-10-31] Login audit in admin portal + mobile contract gaps closed (disputes, votes, legacy org_type, report fields, escrow GET)
Commit: `69846f5`
Backend changes:
- **Added — every login is now visible in the admin portal:** new `login_events` table (migration `019_login_audit.sql`) records every web (`POST /api/auth/login`) and mobile (`POST /api/v1/auth/login`) login attempt — success and failure (internal reason: `UNKNOWN_EMAIL` / `INVALID_PASSWORD`), with IP + user agent. New admin page `/admin/logins` (ADMIN only) shows 24h stats + the last 200 events with ALL/SUCCESS/FAILED filters; `users.last_login_at` is stamped on every successful login and shown on `/admin/access`.
- **Added — `POST /api/milestones/[id]/dispute`** `{reason}` → 201 `{dispute, releaseRequest, message}` (roles ORGANIZATION/AUDITOR/ADMIN; 409 if a dispute is already open). **Added — `POST /api/milestones/[id]/dispute/resolve`** `{resolution_notes}` → `{dispute, releaseRequest, ...}` (roles AUDITOR/ADMIN). While a dispute is OPEN: creating release requests, APPROVED multisig signatures, and release execution all return 409 for that milestone (REJECTED signatures stay allowed — that is the mobile dispute-rejection path). Both responses also carry the milestone's latest `releaseRequest` (may be null) because the mobile dispute flow parses that shape.
- **Added — `POST /api/hisaab/reports/[id]/vote`** `{vote_type: 'CONFIRM'|'REJECT'|'FLAG', reason?}` — accepts the cookie session OR a bearer token. CONFIRM delegates to the existing confirmation flow (`pothole_confirmations`, 3-confirmation escalation); REJECT/FLAG are recorded in a new `pothole_votes` table (tallies returned; no automatic report-status change).
- **Changed — `POST /api/auth/register`:** the legacy `org_type: "ORGANIZATION"` the mobile app sends is now accepted and normalized to `"NGO"` instead of 400ing.
- **Changed — report creation** (`POST /api/hisaab/reports` and `POST /api/v1/hisaab/reports`) now accepts optional `severity` (`LOW|MEDIUM|HIGH`), `size_estimate_cm`, and `client_submission_id` multipart fields. Client values act as a fallback when Gemini triage is unavailable or returns nothing (Gemini result wins when present); `client_submission_id` is accepted for idempotency-key compatibility and ignored.
- **Added — `GET /api/hisaab/escrows?status=`** (ADMIN) — escrow ledger list (was POST-only).
- Migrations: `019_login_audit.sql` (`login_events` + `users.last_login_at`), `020_disputes_and_votes.sql` (`milestone_disputes` + `pothole_votes`).
Mobile action needed: (1) The dispute flow works end-to-end now — `POST /milestones/$id/dispute` returns 201 with `dispute` + `releaseRequest`; keep the existing REJECTED-sign fallback path. (2) REJECT/FLAG votes no longer 404 — remove the "route missing" exception handling in citizen_reporting and surface the returned tallies. (3) `org_type: "ORGANIZATION"` is accepted but switch to the real enum (`NGO | TRUST | CSR | SCHOOL | RWA | OTHER`) when convenient. (4) `severity` / `size_estimate_cm` are now honored as fallbacks — no change required. (5) Login audit is transparent to clients — no action.

### [2026-10-31] Production HTTPS / SSL configured for vera.adityatiwaridev.xyz
Commit: uncommitted
Backend changes:
- `nginx/nginx.conf`: Configured `server_name vera.adityatiwaridev.xyz`, active Let's Encrypt TLS certificates on port 443 with modern ciphers and HSTS, and 301 permanent redirect from HTTP (port 80) to HTTPS.
- `docker-compose.yml`: Fixed nginx volume mount from named volume to host bind mount `/etc/letsencrypt:/etc/letsencrypt:ro` so Nginx reads Certbot-generated certificates directly; updated default `NEXT_PUBLIC_APP_URL` to `https://vera.adityatiwaridev.xyz`.
- `.env.example`: Updated example app URL to `https://vera.adityatiwaridev.xyz`.
Mobile action needed: Mobile app client base URL for production is now `https://vera.adityatiwaridev.xyz/api`.

### [2026-10-31] Register validation fix (org_type enum) + audit timeline Date crash fix
Commit: `badb99f`
Backend changes:
- **Fixed — `POST /api/auth/register` returned 400 "Validation failed" for valid NGO signups:** `lib/validation.ts` `org_type` enum listed a legacy `'ORGANIZATION'` value no client ever sent, while the web register form sends `'NGO'`. Enum is now `['NGO', 'TRUST', 'CSR', 'SCHOOL', 'RWA', 'OTHER']`. No DB constraint exists (`users.org_type` is free-form TEXT), so no migration needed.
- **Fixed — `/campaigns/[id]/audit` crashed with "Objects are not valid as a React child (found: [object Date])":** node-postgres parses `timestamptz` into JS `Date` objects, but `lib/audit_timeline.ts` typed them as `string` and `components/domain/AuditTimeline.tsx` rendered `ev.timestamp` raw. All timestamps out of `getCampaignAuditTimeline` / `getDonationJourney` are now normalized to ISO strings via an `iso()` helper (declared types are now honest), and AuditTimeline formats the timestamp with `toLocaleString('en-IN')`.
Mobile action needed: none — the register request/response contract is unchanged; the only behavioral change is that `org_type: "NGO"` (the value the web form always sent) now passes validation. If the app ever sends `org_type: "ORGANIZATION"`, switch it to one of `NGO | TRUST | CSR | SCHOOL | RWA | OTHER`.

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
