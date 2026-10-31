# VERA Mobile API — /api/v1 (Hisaab)

Auth for the React Native app: **POST /api/v1/auth/login** returns a bearer token.
Send it on every call: `Authorization: Bearer vera_<token>`. Tokens are stored hashed
server-side; there is no logout endpoint — discard the token client-side, or ask the
backend to revoke. Web session cookies are NOT needed for /api/v1.

Base URL (dev): `http://<machine-ip>:3000` (phone and laptop on the same Wi-Fi).

---

## POST /api/v1/auth/login

```json
{ "email": "aarav@vera.org", "password": "Password123!" }
```
→ `200 { "token": "vera_…", "user": { "id", "name", "email", "role", … } }`
Roles: `USER` (citizen), `ORGANIZATION`, `CONTRACTOR`, `AUDITOR`, `ADMIN`.
Rate limit: 10/min per IP.

## GET /api/v1/me

→ `200 { "user": … }` · 401 if token invalid.

## GET /api/v1/hisaab/reports

Public. Query: `status` (OPEN|CONFIRMED|ESCALATED|REPAIR_SUBMITTED|VERIFIED|PAID), `severity` (LOW|MEDIUM|HIGH), `limit` (≤200, default 100), `offset`.

→ `200 { "reports": [ { id, latitude, longitude, address_label, severity, size_estimate_cm, description, gemini_result, status, reporter_name, confirmations_count, escrow|null, created_at, … } ], "total", "count" }`

## POST /api/v1/hisaab/reports

Auth: USER/ADMIN. `multipart/form-data`:

| field | type | notes |
|---|---|---|
| `photo` | file | jpeg/png/webp, ≤ 10 MB (`MAX_UPLOAD_SIZE_MB`) |
| `latitude` | number | -90..90 |
| `longitude` | number | -180..180 |
| `description` | string | ≥ 5 chars |
| `address_label` | string? | free text, e.g. "MI Road, Jaipur" |

Server runs Gemini vision for severity, stores the photo, hashes it (SHA-256) and
anchors the report on the Solana program when configured.

→ `201 { "report", "explorer_url", "gemini_status" }` · `gemini_status` is
`PASS` (AI read the photo), `MANUAL_REVIEW` (no key/unclear) or `ERROR` — the
report is created regardless. Rate limit: 10/min per user.

## GET /api/v1/hisaab/reports/[id]

Public. → `200 { "report": { …, confirmations: [], escrow, repair }, "roughness": { "score", "samples", "iriApprox" }, "assignment" }`

## POST /api/v1/hisaab/reports/[id]/confirm

Auth: USER/ADMIN. Citizens confirm a report; the 3rd distinct confirmation flips it
to `CONFIRMED`. Server-side dedupe + self-confirm block. On-chain: a per-citizen
keypair signs a confirmation PDA (oracle relayer handles fees — the mobile app
never touches Solana keys).

→ `200 { "confirmations", "required": 3, "status", "inserted", "already_confirmed", "solana_tx", "explorer_url" }`

## GET roughness series (debug)

`GET /api/v1/hisaab/reports/[id]/roughness?series=true` → summary + raw readings.

---

## Notes for the app

- **Money on reports is in INR.** `escrow.stage1/2/3_amount` are INR values;
  `roughness.iriApprox` is an IRI-style index (m/km) computed from drive-by
  accelerometer readings (`POST /api/hisaab/roughness` — JSON, cookie-auth web
  only for now; ask backend to expose it on v1 when needed).
- **Errors** are `{ "error": string }` with proper HTTP codes (400/401/403/404/429).
- **Rate limits** return 429 with a human-readable retry hint.
- DeviceMotion capture: record ~8s of `accelerationIncludingGravity.z` samples
  while driving over the defect and POST them to `/api/hisaab/roughness` (web
  session) — the reference implementation lives in
  `components/hisaab/RepairPanel.tsx`.
