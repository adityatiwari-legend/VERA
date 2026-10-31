#!/usr/bin/env bash
# deploy/verify-ops.sh — operational readiness checklist for the live VERA VPS.
#
# Run on the VPS from the repo checkout (default /opt/vera):
#   bash /opt/vera/deploy/verify-ops.sh
#
# Read-only except for a .ops-write-test touch inside the app's storage volume
# (removed immediately). Never prints secret values — only set/unset and
# default/not-default verdicts.
#
# Optional env overrides:
#   OPS_LOGIN_EMAIL / OPS_LOGIN_PASSWORD  (defaults: admin@vera.org / Password123!)
#     used only for the Set-Cookie passthrough probe.

set -u

cd "$(dirname "$0")/.."

PASS=0
FAIL=0

ok()   { echo "[OK]   $1"; PASS=$((PASS+1)); }
bad()  { echo "[FAIL] $1"; FAIL=$((FAIL+1)); }

echo "== VERA operational checklist =="
echo "Working dir: $(pwd)"
echo

# ---------------------------------------------------------------------------
# 1. Containers
# ---------------------------------------------------------------------------
if command -v docker >/dev/null 2>&1; then
  RUNNING=$(docker compose ps --status running --services 2>/dev/null | sort | tr '\n' ' ')
  for svc in vera-db vera-app hardhat-node nginx; do
    case " $RUNNING " in
      *" $svc "*) ok "container running: $svc" ;;
      *) bad "container NOT running: $svc" ;;
    esac
  done
else
  bad "docker not found"
fi

# ---------------------------------------------------------------------------
# 2. Migrations applied (this stack uses raw SQL migrations, not Prisma)
# ---------------------------------------------------------------------------
MIGRATION_FILES=$(ls db/migrations/*.sql 2>/dev/null | wc -l)
MIGRATIONS_APPLIED=$(docker compose exec -T vera-db psql -U postgres -d vera -tAc \
  "SELECT COUNT(*) FROM schema_migrations" 2>/dev/null | tr -d '[:space:]')
if [ -n "$MIGRATIONS_APPLIED" ] && [ "$MIGRATIONS_APPLIED" -ge "$MIGRATION_FILES" ] 2>/dev/null; then
  ok "migrations applied ($MIGRATIONS_APPLIED/$MIGRATION_FILES)"
else
  bad "migrations applied: ${MIGRATIONS_APPLIED:-none} of $MIGRATION_FILES — run: docker compose run --rm migrate"
fi

# ---------------------------------------------------------------------------
# 3. Seed data present (users/campaigns/milestones/contractors/reports)
# ---------------------------------------------------------------------------
seed_count() {
  docker compose exec -T vera-db psql -U postgres -d vera -tAc "SELECT COUNT(*) FROM $1" 2>/dev/null | tr -d '[:space:]'
}
for tbl in users campaigns milestones contractor_assignments pothole_reports hisaab_escrows; do
  C=$(seed_count "$tbl")
  if [ -n "$C" ] && [ "$C" -gt 0 ] 2>/dev/null; then
    ok "seed data: $tbl has $C rows"
  else
    bad "seed data: $tbl is empty or missing — run: docker compose run --rm migrate npm run db:seed && docker compose run --rm migrate npm run seed:hisaab"
  fi
done

# ---------------------------------------------------------------------------
# 4. Upload storage writable by the app container user
# ---------------------------------------------------------------------------
if docker compose exec -T vera-app sh -c 'touch /app/storage/.ops-write-test && rm /app/storage/.ops-write-test' >/dev/null 2>&1; then
  ok "storage volume /app/storage is writable by the app user"
else
  bad "storage volume /app/storage NOT writable — check the vera_storage volume and Dockerfile chown"
fi

# ---------------------------------------------------------------------------
# 5. Environment variables in /opt/vera/.env (values never printed)
# ---------------------------------------------------------------------------
ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
  JWT_LINE=$(grep -E '^JWT_SECRET=' "$ENV_FILE" | tail -1 | cut -d= -f2-)
  if [ -n "$JWT_LINE" ]; then
    if [ "$JWT_LINE" = "vera-super-secret-jwt-key-for-development-32chars!" ] \
       || [ "$JWT_LINE" = "fundtrail-dev-only-not-a-secret" ]; then
      bad "JWT_SECRET is the compose DEV default — generate a strong one: openssl rand -hex 32 >> .env"
    else
      ok "JWT_SECRET set (not a known dev default)"
    fi
  else
    bad "JWT_SECRET missing from .env (compose falls back to a dev string)"
  fi

  GEMINI_LINE=$(grep -E '^GEMINI_API_KEY=' "$ENV_FILE" | tail -1 | cut -d= -f2-)
  if [ -n "$GEMINI_LINE" ]; then
    ok "GEMINI_API_KEY set (AI photo triage live)"
  else
    bad "GEMINI_API_KEY missing from .env (reports fall back to MANUAL_REVIEW)"
  fi

  DEMO_LINE=$(grep -E '^DEMO_MODE=' "$ENV_FILE" | tail -1 | cut -d= -f2-)
  if [ "$DEMO_LINE" = "true" ]; then
    ok "DEMO_MODE=true (30-day durability fast-forward enabled for demos)"
  else
    bad "DEMO_MODE=$DEMO_LINE — set DEMO_MODE=true for the fast-forward demo flow"
  fi
else
  bad ".env not found in $(pwd) — copy .env.example and fill it in"
fi

# ---------------------------------------------------------------------------
# 6. App health (through the container, bypassing TLS)
# ---------------------------------------------------------------------------
if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
  ok "app health: /api/health responds on 127.0.0.1:3000"
else
  bad "app health check failed on 127.0.0.1:3000/api/health"
fi

# ---------------------------------------------------------------------------
# 7. Session cookie passthrough (nginx must not strip Set-Cookie)
# ---------------------------------------------------------------------------
LOGIN_EMAIL="${OPS_LOGIN_EMAIL:-admin@vera.org}"
LOGIN_PASSWORD="${OPS_LOGIN_PASSWORD:-Password123!}"
COOKIE_HEADER=$(curl -si -X POST "https://vera.adityatiwaridev.xyz/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$LOGIN_EMAIL\",\"password\":\"$LOGIN_PASSWORD\"}" 2>/dev/null \
  | grep -i '^set-cookie:' | head -1)
case "$COOKIE_HEADER" in
  *fundtrail_session*) ok "Set-Cookie passthrough: fundtrail_session reaches the client over HTTPS" ;;
  *) bad "no fundtrail_session Set-Cookie observed over HTTPS (check nginx / credentials)" ;;
esac

echo
echo "== $PASS passed, $FAIL failed =="
[ "$FAIL" -eq 0 ]
