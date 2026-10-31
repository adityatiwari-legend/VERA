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
