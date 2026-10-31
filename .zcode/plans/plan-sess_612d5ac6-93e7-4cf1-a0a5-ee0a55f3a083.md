# VERA backend: login audit in admin portal + missing mobile endpoints + VPS ops checklist

## Context

The live backend (vera.adityatiwaridev.xyz) must fulfill an ops checklist, the Flutter mobile app calls endpoints that 404 on the backend, and every login must be visible in the admin portal. Key correction to the pasted checklist: this stack has **no Prisma** — it uses raw SQL migrations in `db/migrations/` (001–018) applied by `npm run db:migrate` / `docker compose run --rm migrate` on the VPS; storage dirs are auto-created by `lib/storage.ts` and volume-mounted (`vera_storage` → `/app/storage`); nginx passes `Set-Cookie` through untouched (verified config). The plan maps each checklist item to the real mechanism and fixes the actual gaps.

Decisions locked: deploy = **push only** (CI deploys if the 3 GitHub secrets are set); disputes = **block release while open**.

## A. Every login visible in the admin portal (headline feature)

1. **Migration `db/migrations/019_login_audit.sql`**
   - `login_events` table: `id`, `user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL`, `email TEXT NOT NULL`, `role TEXT`, `method TEXT CHECK (method IN ('WEB','API'))`, `success BOOLEAN NOT NULL`, `reason TEXT` (e.g. `UNKNOWN_EMAIL`, `INVALID_PASSWORD`), `ip_address TEXT`, `user_agent TEXT`, `created_at TIMESTAMPTZ DEFAULT NOW()`; indexes on `created_at DESC`, `user_id`, and a partial index on failures.
   - `ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ`.
2. **`lib/login_audit.ts`** — `recordLoginEvent(...)` helper, best-effort (try/catch + warn; must never break login).
3. **Wire recording** into:
   - `app/api/auth/login/route.ts` (success + both 401 paths, method `WEB`; also set `users.last_login_at = NOW()` on success)
   - `lib/api_auth.ts` `loginAndIssueToken` + `app/api/v1/auth/login/route.ts` (method `API`; distinguish `UNKNOWN_EMAIL` vs `INVALID_PASSWORD` internally, response stays "Invalid email or password"; `last_login_at` on success)
4. **Admin page `app/admin/logins/page.tsx`** — server component per the existing admin pattern (`eyebrow` header, `StatCard`, filter pills like `app/admin/complaints/page.tsx`, `card` table with mono `thead`, success/fail badges). Content: StatCards (logins 24h, distinct users 24h, failed attempts 24h) + last 200 events (time, email/user, role, method chip `WEB`/`API`, result badge, IP, truncated UA) with `?filter=ALL|SUCCESS|FAILED`. Admin access is inherited from `app/admin/layout.tsx` + `middleware.ts` automatically.
5. Cross-links: add "Login audit" link on the admin dashboard header (`app/admin/page.tsx`) and a `last_login_at` column on the Access management page (`app/admin/access/page.tsx`).

## B. Missing backend endpoints (mobile contract gaps)

1. **Milestone disputes** (mobile currently gets 404):
   - Migration `020_disputes_and_votes.sql`: `milestone_disputes` (`milestone_id` FK, `raised_by`, `reason`, `status OPEN|RESOLVED`, `resolution_notes`, `resolved_by`, `resolved_at`; partial unique index = one OPEN dispute per milestone) and `pothole_votes` (`report_id` FK, `user_id`, `vote_type CHECK IN ('REJECT','FLAG')`, `reason`, `UNIQUE(report_id,user_id)` — confirmations stay untouched).
   - `POST /api/milestones/[id]/dispute` — roles ORGANIZATION/AUDITOR/ADMIN, body `{reason}`; 409 if an OPEN dispute exists.
   - `POST /api/milestones/[id]/dispute/resolve` — roles AUDITOR/ADMIN, body `{resolution_notes}`.
   - **Blocking**: `lib/release_requests.ts` (`createReleaseRequest`) and the sign route (`app/api/release-requests/[id]/sign/route.ts`) return 409 while the milestone has an OPEN dispute.
2. **`POST /api/hisaab/reports/[id]/vote`** — `{vote_type: 'CONFIRM'|'REJECT'|'FLAG', reason?}`. Accepts **cookie OR bearer** auth (mobile may hold only the `vera_` token): try `requireAuth()`, fall back to `requireApiAuth()`, roles USER/ADMIN. CONFIRM delegates to existing `confirmReportAsUser`; REJECT/FLAG upsert into `pothole_votes`; response returns tallies. No automatic status change (documented).
3. **Register tolerance**: `lib/validation.ts` `registerSchema.org_type` also accepts the legacy `'ORGANIZATION'` the mobile app sends, normalized to `'NGO'` (web form unaffected).
4. **Report creation fields**: `createReportSchema` + `lib/hisaab_actions.ts` accept optional `severity` (`LOW|MEDIUM|HIGH`) and `size_estimate_cm` from the client as fallback when Gemini triage doesn't supply them (Gemini result wins when present); `client_submission_id` accepted + ignored.
5. **`GET /api/hisaab/escrows`** (ADMIN) — closes the "escrows POST-only" gap (list for admin tooling).

## C. VPS ops checklist mapped to the real stack

- New **`deploy/verify-ops.sh`** (read-only, idempotent, run on the VPS): compose ps health; `schema_migrations` count vs `db/migrations` files; seeded row counts (users/campaigns/milestones/contractor_assignments/pothole_reports); `/app/storage` write test inside the app container; `/opt/vera/.env` has `JWT_SECRET` set and ≠ the compose dev default, `GEMINI_API_KEY` set, `DEMO_MODE=true` (reports set/unset only, never prints values); `/api/health` OK; live login request shows `Set-Cookie: fundtrail_session` passthrough.
- **`docs/deployment.md`**: add an "Operational requirements checklist" section mapping each item to the real commands (`docker compose run --rm migrate`, seed via `docker compose run --rm migrate npm run db:seed` / `seed:hisaab`, storage volume, nginx cookie passthrough, env vars in `/opt/vera/.env`) — correcting the Prisma-based checklist.

## D. Changelog + ship

- **`new_update.md`** (mandatory per project rules): new entry at top — dispute endpoints live, vote route live (REJECT/FLAG no longer 404), legacy `org_type` accepted, `severity`/`size_estimate_cm` accepted, escrow GET added — with "Mobile action needed" per item.
- Commit everything and **push to `main`** (per your choice). Then check whether the Actions run triggered; if the secrets aren't set, CI won't deploy — I'll report status and give you the one command to verify on the VPS (`bash /opt/vera/deploy/verify-ops.sh`) once you push/deploy.

## E. Verification

1. Local: `npm run db:migrate` (applies 019/020 to local Postgres), `npm run build`.
2. Extend `scripts/e2e-check.mjs` with checks: login (web + v1) writes `login_events` rows + `last_login_at`; register with `org_type: 'ORGANIZATION'` → 201; dispute create → release-request blocked with 409 → resolve → release works; vote REJECT recorded; report POST with `severity` accepted; escrow GET admin-only. Run the full suite green against the local dev stack.
3. Browse `/admin/logins` locally (dev server + seeded login) to confirm the page renders in the design system.
4. Report CI/deploy status after push.
