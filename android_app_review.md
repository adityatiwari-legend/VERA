# Android App Review — Important Changes To Make

**App:** VERA × RoadProof Flutter client (`MLH-RoadProofxVera/`, at commit `5d30777`)
**Date:** 2026-10-31 · **For:** the Android/Flutter developer · **From:** the web-app (backend) side
**Method:** 4 full review passes over every feature folder + core/router/storage/native config + `test/`, with **every contract finding cross-checked against the actual Next.js backend routes** (`app/api/**`, `lib/validation.ts`, `lib/*.ts`). Findings below are evidence-backed, not guesses.

**Severity:**
- **P0** = broken or dangerous in live mode (against the real backend) / security-relevant
- **P1** = wrong data shown, dead features, or will bite soon
- **P2** = quality/polish

Paths are relative to `MLH-RoadProofxVera/`.

---

## TL;DR — the 10 things that matter most

| # | Problem | Where | Tag |
|---|---------|-------|-----|
| 1 | Role enum doesn't match backend → **register 400s for 5 of 6 roles**; live ORGANIZATION logins silently become "Citizen" | `user_model.dart`, `remote_auth_repository.dart` | app fix |
| 2 | GoRouter has **no `refreshListenable`** → auth changes never re-run redirects (stranded on welcome / after logout / on 401) | `core/router/app_router.dart:39` | app fix |
| 3 | Cleartext `http://10.0.2.2:3000` is **blocked by Android 9+** — manifest has no network security config; live dev mode is the default | `android/.../AndroidManifest.xml` | app fix |
| 4 | **Zero role gating on routes** — any authenticated user can deep-link to auditor/multisig/contractor screens | `app_router.dart:46-52` | app fix |
| 5 | Live donation flow: **double POST** (adapter + repo both call `/donate`), and balance is always 0 → flow can't complete | `wallet_controller.dart`, `web3_rpc_blockchain_adapter.dart` | app fix |
| 6 | Repair completion **always 400s**: required `after_photo` file never attached | `remote_contractor_jobs_repository.dart:100` | app fix |
| 7 | Roughness telemetry posted with `report_id: 'temp-report-id'` (→ 400) and app/backend **scoring formulas disagree** | `create_report_screen.dart:531` + backend | app + backend decision |
| 8 | "Evidence" is synthetic: mock JPEG bytes hashed and shown as "cryptographic proof" — **no camera/GPS/sensors plugins exist at all** | pubspec + `mock_evidence_capture_service.dart` | app fix |
| 9 | Multisig execute **drops the recipient** (`recipient_address` vs backend `recipientAddress`) and multisig/audit/milestone screens use hardcoded mock IDs | `remote_financial_authorization_repository.dart:101` | app fix |
| 10 | Demo role switcher works in **live** mode → one tap logs into the seeded real ADMIN account (`Password123!`) | `app_scaffold.dart:252`, `auth_controller.dart:160` | app fix (backend: change seed creds) |

---

## P0 — Blockers (fix before any live use)

### A. Auth & roles

**A1. Register sends roles the backend rejects; login mangles the roles it accepts.**
- `lib/features/auth/domain/user_model.dart:2-7` — enum values `CITIZEN/DONOR/NGO/...`; `remote_auth_repository.dart:53-58` posts `'role': role.value`. Backend `lib/validation.ts:11` accepts only `USER | ORGANIZATION | CONTRACTOR` → **every registration except CONTRACTOR returns 400**.
- `register_screen.dart:127-139` also offers AUDITOR and ADMIN, which the backend explicitly forbids (invite-only / seed-only).
- Worse: `user_model.dart:25-34` `UserRole.fromString` defaults `'USER'` **and** `'ORGANIZATION'` to `UserRole.citizen` — so a live ORGANIZATION account logs in role-gated as Citizen, and the NGO multisig signer can never sign (`milestones_releases_screen.dart:436-440` requires `UserRole.ngo`).
- **Fix:** add mapping (`ORGANIZATION→ngo`, `USER→citizen/donor`), send backend enum values on register, drop AUDITOR/ADMIN from the picker.

**A2. Register is treated as a successful login.**
- Backend `app/api/auth/register/route.ts:56-58` intentionally does **not** set a session cookie, but `remote_auth_repository.dart:62-72` sees `user != null`, stores a session, and `register_screen.dart:42-44` navigates to the dashboard. Every subsequent call 401s → session-expiry handler yanks the user out.
- **Fix:** show a "registration successful, please log in" state; don't persist a session on register.

**A3. Demo role switcher is live and destructive.**
- `core/widgets/app_scaffold.dart:252-268` ("QUICK DEMO ROLE SWITCHER") and `settings_screen.dart:44-77` are **not gated by `useMockData`**. `switchDemoRole` (`auth_controller.dart:160-166`) does `login(demo.email, 'Password123!')` — and the backend seed creates `admin@vera.org` / `ngo@vera.org` / `auditor@vera.org` with exactly `Password123!` (`scripts/seed.ts`). Any authenticated live user can one-tap into a real ADMIN session.
- **Fix:** hide both switchers when `useMockData == false`; on the backend, change/remove seeded admin creds before anything public.

### B. Navigation & session

**B1. Router never re-runs redirects — no `refreshListenable`.**
- `core/router/app_router.dart:39` does a one-time `ref.read(authControllerProvider)` when the router is created. Consequences (all verified): a returning user with a valid session is **stranded on the welcome screen** after restore; `handleSessionExpired()` on 401 sets `user: null` but doesn't move the user; logout (`app_scaffold.dart:279`) doesn't navigate anywhere.
- **Fix:** pass a `GoRouterRefreshStream`/`ChangeNotifier` of auth state as `refreshListenable`, and defer redirects (`return null`) while `isLoading` during restore.

**B2. Zero role gating on protected routes.**
- `app_router.dart:46-52` only checks authenticated vs not. Deep links to `/auditor-review`, `/multisig-progress`, `/contractor-jobs/:id/start-work`, `/wallet` work for any role (drawer only hides the buttons).
- **Fix:** add a route→allowed-roles map in the redirect, aligned to backend roles (USER / ORGANIZATION / CONTRACTOR / AUDITOR / ADMIN).

**B3. Cached session is never revalidated.**
- `remote_auth_repository.dart:87-94`: `getCurrentUser` returns the cached user JSON **before** ever calling `/auth/me` — the server call is unreachable whenever a cache exists. Expired sessions boot as "logged in"; changed/banned roles persist forever.
- **Fix:** treat cache as stale-while-revalidate; always hit `/auth/me` (token or cookie) and refresh the cache.

**B4. Android blocks the default dev backend (cleartext HTTP).**
- `android/app/src/main/AndroidManifest.xml` has no `android:networkSecurityConfig` / `usesCleartextTraffic`, while dev mode defaults to live `http://10.0.2.2:3000/api` (`app_config.dart:107`; without `FLUTTER_TEST` and without `--dart-define=VERA_USE_MOCK=true`, dev starts in **live** mode). Every request throws `CleartextNotPermittedException` on Android 9+.
- **Fix:** add `res/xml/network_security_config.xml` allowing cleartext **only** for `10.0.2.2` (and the LAN IP used for device testing). Don't blanket-enable cleartext.

**B5. Release build signs with the debug keystore.**
- `android/app/build.gradle.kts:36` — `signingConfig = signingConfigs.getByName("debug")`. Any `flutter build apk --release` is unpublishable.
- **Fix:** real signing config via `key.properties` before distribution.

### C. Money & escrow flows

**C1. Live donation flow: blocked by a fake zero balance, and would double-donate if unblocked.**
- `wallet_controller.dart:271` throws when `balanceEth <= 0.001`, but `web3_rpc_blockchain_adapter.dart:68-79` returns `0.0` in both branches and nothing ever sets a live balance → live donations are impossible.
- If it got past that: adapter `signAndSubmitTransaction` already POSTs `/campaigns/{id}/donate` (`web3_rpc_blockchain_adapter.dart:116-122`), then the repo POSTs again (`remote_donations_repository.dart:94-100`) → **two donation rows, raised amount doubled**.
- **Fix:** pick one writer (adapter records *or* repo), pass the receipt through; query a real balance or gate the check to mock mode.

**C2. Multisig execute silently drops the recipient.**
- `remote_financial_authorization_repository.dart:101` sends `{'recipient_address': ...}` but the backend reads `body.recipientAddress` (`app/api/release-requests/[id]/execute/route.ts:18`). The address the NGO types is dropped; funds go to the contract default. The controller then claims "Funds successfully released on-chain" even when the backend returned ledger-only mode.
- **Fix:** send camelCase; reflect the backend `message` instead of hardcoding "on-chain".

**C3. Repair completion can never succeed — required `after_photo` never attached.**
- `remote_contractor_jobs_repository.dart:100` builds FormData without any file; backend `app/api/hisaab/repairs/route.ts:32` hard-requires an `after_photo` File. Every live submission 400s while the screen shows success.
- Also: `submitStartOfWork` (`:75`) is a pure local `copyWith` — "Start-of-work evidence registered! SHA-256 fingerprint anchored." is fiction (the hash is of a timestamp string, `start_work_evidence_screen.dart:42`).
- **Fix:** capture real bytes → `MultipartFile` under the backend's `after_photo` field; stop showing fake success for start-of-work.

**C4. Roughness telemetry can never be stored, and scoring formulas disagree.**
- `create_report_screen.dart:531` samples with `report_id: 'temp-report-id'`; the repo posts it after report creation but never substitutes the real report UUID → backend (`lib/validation.ts:244` requires a UUID) 400s, swallowed by `catch (_) {}` (`remote_reports_repository.dart:227`).
- Formula mismatch: app scores **deviation from gravity** (≈0.x), backend scores **mean |accel_z|** (≈9.8 for a phone at rest) against a 3.0 threshold → real device data would **auto-fail every repair**. *(Backend decision needed — I can change the backend formula.)*
- **Fix:** re-key the batch to the created report's id before posting; align scoring semantics (backend side on request).

### D. Trust & integrity (this app's whole point)

**D1. Fake evidence presented as real cryptographic proof.**
- `mock_evidence_capture_service.dart:71` generates ~40 bytes of synthetic "JPEG"; `create_report_screen.dart:32` **auto-captures it on screen open** and `:270` displays its hash as "EXACT FILE SHA-256 HASH". `pubspec.yaml` has **no camera / image_picker / geolocator / sensors plugins** — so camera capture, GPS geotagging, and accelerometer roughness are all simulated end-to-end while the UI claims otherwise.
- **Fix (two steps):** (1) immediately — label every hash/GPS/AI readout "SIMULATED" when mock services are in use; (2) properly — add `camera`/`image_picker`, `geolocator`, `sensors_plus`, runtime permissions, and real service implementations.

**D2. Screens that can show the wrong record.**
- `report_detail_screen.dart:98` falls back to `reports.first` when the id isn't in the cached feed → renders (and lets you **vote on**) a different citizen's report; it never calls `getReportDetail(id)`.
- `campaign_detail_screen.dart:22-27` uses `orElse: () => campaigns.first` → wrong campaign, wrong donate button.
- **Fix:** fetch by id on load; empty/error state instead of `.first` fallbacks.

**D3. Dispute flow is a fiction.**
- `remote_financial_authorization_repository.dart:113-147`: signs with `status: 'REJECTED'` (backend counts only `APPROVED` rows, so nothing freezes), then POSTs `/milestones/$id/dispute` **and** `/dispute/resolve` — neither route exists on the backend (404). Both failures swallowed; controller still reports "Fund releases frozen."
- **Fix:** hide dispute UI in live mode, or I add a real dispute endpoint to the backend *(backend decision needed)*.

**D4. Hardcoded mock IDs make flagship screens dead in live mode.**
- `milestones_releases_screen.dart:20,33-35` loads `'ms-jaipur-01'` etc. → backend returns `{ releaseRequest: null }` → **infinite spinner** (`:155-156`). `audit_trail_controller.dart:39,101` defaults to `'camp-jaipur-14'` → 404.
- **Fix:** seed selectors from real campaigns/milestones lists; render an empty state instead of spinning.

**D5. Demo role switcher / multisig progress / notifications / expenditure records are hardcoded demo data shown in live mode.**
- `multisig_progress_screen.dart:23,38` — `_auditorSigned = true` hardcoded, "3 OF 3", fake tx `0x88f19...`, no role gate on Execute.
- `notifications_controller.dart:20-57` — 100% in-memory literals (including fake ₹2,85,000 release notices) while the backend `GET/POST /notifications` exists and works; the shell unread badge is fake.
- `expenditure_records_screen.dart:46-63` — two hardcoded vendor "verified" receipts; fetches nothing.
- **Fix:** wire notifications to the real endpoint; render the real `activeRequest` in multisig progress; derive expenditure from `/campaigns/[id]/transactions` or `/audit/ledger`.

---

## P1 — Important

1. **Fabricated blockchain receipts** — `web3_rpc_blockchain_adapter.dart:129-137` mints `status: CONFIRMED, blockNumber: 194830, explorerUrl: sepolia.etherscan.io/...` from a plain ledger POST the backend explicitly marks "(DEMO — not real money)"; shown as "Block #194830 | 1 Confirmation" (`donation_review_screen.dart:243`). Show the backend's honest message.
2. **Hardcoded money in live UI** — `donations_screen.dart:102,118,124` (₹25,000 / ₹15,500 / ₹9,500 when API empty/fails, errors swallowed by `catch (_) {}` at `:38`); `wallet_transaction_screen.dart:235-236` (`'1.450 ETH'`, `'12.80 SOL'`). Render real zeros/empty states.
3. **Crash when relayer offline** — `donation_review_screen.dart:598` `net.contractAddress.substring(0, 10)` throws RangeError when live `getNetworkInfo()` returns `''`.
4. **On-chain donation path unreachable + wrong FX rate** — repo accepts `txHash`/`blockNumber` but never sends them; backend's real `tx_hash` verification path (`donate/route.ts:26-53`) is dead; wallet connect hardcodes `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`; app converts at ₹250,000/ETH vs backend ₹300,000 (≈20% off). Send `tx_hash` after real signature; source rate from `/blockchain/stats`.
5. **Contractor jobs parse ~15 fields the backend never sends** — `contractor_job_model.dart:113-122` reads `title/location/deadline/allocated_amount/stage1_amount/...`; backend assignment rows have only status/note/labels → live mode shows blank titles, fabricated `deadline = now+7d`, ₹0 stages. Map `report_address_label`, join escrow stage amounts, delete the rest.
6. **REJECT/FLAG votes call a nonexistent route** — `remote_reports_repository.dart:197` POSTs `/hisaab/reports/$id/vote`; no such backend route. The "3 flags → DISPUTED" feature can never fire; `map_nearby_screen.dart:459-470` shows "Verification vote recorded!" unconditionally. *(Backend decision needed: add the vote route, or route REJECT/FLAG to an existing mechanism.)*
7. **User inputs silently discarded** — backend report creation reads only `photo/latitude/longitude/address_label/description` (`lib/hisaab_actions.ts:36-44`); the app's `severity` choice, `size_estimate_cm`, and the client `media_sha256` are never sent/used. Either send them (I extend the schema) or remove the UI. *(Backend decision needed.)*
8. **Evidence screens hardcode AI verdicts and let contractors set the payout gate** — `submit_repair_evidence_screen.dart:17` (`_roughnessReading = 0.42`, submit = `Future.delayed` + success toast, no repo call); `repair_completion_screen.dart:528` — the "IRI Index" is a **draggable slider** with "Attach accelerometer readings" defaulting true; `evidence_integrity_screen.dart:25-40` always "verifies" after 400 ms. Wire to the real `POST /hisaab/repairs` response (`gemini_status`, roughness score).
9. **Signer matrix mismatch + sign-state loss** — `milestones_releases_screen.dart:593-599` matches slots by substring (`'ngo'`, `'certified'`, `'campaign'`) but live roles are `ORGANIZATION/AUDITOR/ADMIN` → all slots show AWAITING; the sign response isn't refetched so the Sign button reappears and re-signing 400s ("already submitted"). Match by `approver_role`, refetch via GET after sign.
10. **Audit "verification" is server-trust only** — `remote_audit_repository.dart:106-117` just reads `data['valid']`; the banner advertises "Hₙ = SHA-256(Hₙ₋₁ + Payload)" the client never recomputes; any network error renders a red "Broken chain detected". Also "Test Byte Integrity" (`audit_trail_screen.dart:354-357`) hashes the constant `[1,2,3,4]` → always "mismatch" for perfectly intact evidence. Implement the client-side recompute (algorithm in backend `lib/audit_log.ts:133-170`) or reword; distinguish offline from tampered.
11. **Live audit timeline renders as "Audit Event / System"** — `audit_entry_model.dart:68-78` reads `title/actor_label` but backend sends `action/actor_name/actor_role/entity_type/metadata`. Map the fields.
12. **Session restore + storage** — cached-session issue is B3 above; additionally `secure_storage_service.dart:22-24` swallows **all** errors (`catch (_) {}`) — a corrupted Keystore silently no-ops session writes. Surface failures; add a degraded flag.
13. **Permissions for features that don't exist** — `AndroidManifest.xml:5-7` declares CAMERA + fine/coarse location, but no plugin code exists and there's no runtime permission request. Wire the capture feature (see D1) or drop the three permissions (Play policy friction otherwise).

---

## P2 — Nice to have

- Validation errors never parsed: backend sends `details: {field: [...]}` but `api_client.dart:417` reads `fields` → field-level errors always empty.
- 401 on a wrong-password login fires the global "session expired" handler (`api_client.dart:69-77`) — flash of wrong message.
- RELEASE/REFUND ledger rows render as "CONFIRMED donations" (`remote_donations_repository.dart:30-35` ignores `type`).
- Duplicate route constants: `donorPortfolio = donations = '/donations'` (`route_paths.dart:22-23`); no router `errorBuilder` (`app_router.dart:36`).
- Hardcoded demo deep link in the production drawer: `/campaign-report/pothole-001-jaipur` (`app_scaffold.dart:210`); `StatusPill` hardcodes legacy M2 colors instead of `AppColors` tokens (`status_pill.dart:17,24`).
- Reporter can self-confirm in the verification queue (`verification_queue_screen.dart:127` — the detail screen checks `isReporter`, the queue doesn't); `already_confirmed`/`inserted` from the confirm response never read.
- Photo-less report submit sends a guaranteed-400 payload (`remote_reports_repository.dart:137`) — guard with a typed client-side error.
- Auditor approve/reject replaces the queue item with the bare proof row → evidence files/AI findings vanish from the card (`auditor_review_controller.dart:134-139`).
- `fast-forward` posts a **milestone** id to an **escrow** endpoint that requires ADMIN + `DEMO_MODE=true` (`remote_financial_authorization_repository.dart:175-178`) — dead code in remote mode.
- Fake copy-paste URLs in `final_campaign_report_screen.dart:85-88` (`api.vera.network/...`); `milestones_timeline_screen.dart:19-22` hardcodes campaigns + a "58% FULFILLED" badge.
- **Tests:** real invariants exist (SHA-256 tamper rejection, 2-of-3 threshold, 30-day holdback) but zero coverage for router guards, auth cache policy, storage failures, and an actual 401 through Dio; the "E2E acceptance" suite mostly exercises mocks.

---

## What's already good (keep these)

- **`ApiClient` is production-grade:** no blind retries on financial mutations, `UncertainTransactionException` + reconciliation path on timeouts/5xx, idempotency keys, redacted logging (`api_client.dart:130-156, 462-484`).
- **Escrow contract respected** — `hisaabEscrows` is never GET'd anywhere, matching the backend's POST-only route.
- **Geospatial math is correct** — haversine, antimeridian-aware bounds, NaN filtering, zoom-scaled clustering; no lat/lng swaps anywhere.
- **Map licensing done right** — CARTO/OSM attribution, fallback URL, offline banner.
- **Model parsing is defensive** for the main reads; campaign/donation `fromJson` matches the backend's snake_case aliases with null-safe numeric coercion.
- **Config & theme** — dart-define driven AppConfig with `FLUTTER_TEST` handling; proper dual-brightness Material 3 Civic/Audit palettes; INTERNET permission present.
- **Backend multisig is sound** and the app reads server-authoritative approval counters honestly.

---

## Suggested fix order

**Wave 1 — small diffs, unblocks live mode (≈1 day):** A1, A2, A3, B1, B2, B4, C2, C4-report-id-substitution, D4.
**Wave 2 — make the core loop real:** D1 plugins + real capture services + runtime permissions; C1; C3 (`after_photo` multipart); C4 scoring alignment (needs my backend change); D3 (decision: hide or add backend dispute route); P1-6 (decision: vote route).
**Wave 3 — truth-in-UI:** P1-1, 2, 3, 8, 10, 11; D5 (notifications + multisig progress + expenditure); strip/label every remaining fabricated number, hash, receipt, and quote.

**Backend decisions needed from Aditya** (I'll implement on the web side and log in `new_update.md` on your word):
1. Roughness scoring formula (gravity-deviation vs mean-|z|) and threshold.
2. Add `/milestones/[id]/dispute` (+ resolve) or drop dispute from mobile.
3. Add a REJECT/FLAG vote route or keep CONFIRM-only consensus.
4. Accept `severity` / `size_estimate_cm` / client `media_sha256` in report creation, or mobile drops those inputs.
5. Rotate/remove the seeded `Password123!` demo credentials.
