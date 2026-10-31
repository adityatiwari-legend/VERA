#!/usr/bin/env bash
# =============================================================================
# VERA — VPS deploy script (idempotent; safe to re-run on every push)
#
# Runs ON the VPS (default install dir: /opt/vera). Expected layout:
#   /opt/vera            — the git clone of github.com/adityatiwari-legend/VERA
#   /opt/vera/.env       — production secrets (NEVER committed to git)
#
# Stack (docker compose): vera-app (Next.js :3000) + vera-db (Postgres 16)
#                         + vera-nginx (:80/:443 → vera-app).
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/vera}"
BRANCH="${BRANCH:-main}"
SERVICE_DB="vera-db"
SERVICE_APP="vera-app"

log() { printf '\n\033[1;34m[vera-deploy]\033[0m %s\n' "$*"; }

cd "$APP_DIR"

log "Fetching latest $BRANCH from origin"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

# Disk guard — repeated image builds leave gigabytes of BuildKit cache behind
# (docker image prune does NOT touch it). A full disk passes the health check
# and then kills Postgres/app minutes later, so fail loudly BEFORE building.
free_mb() { df -Pm / | awk 'NR==2{print $4}'; }
if [ "$(free_mb)" -lt 2048 ]; then
  log "Low disk ($(( $(free_mb) / 1024 ))GB free) — pruning Docker build cache"
  docker builder prune -af >/dev/null || true
  docker image prune -af >/dev/null || true
fi
if [ "$(free_mb)" -lt 1024 ]; then
  log "ERROR: only $(( $(free_mb) / 1024 ))GB free on / — refusing to build. Reclaim space with: docker builder prune -af && docker image prune -af"
  exit 1
fi

# The compose file references an externally-created volume (kept from the
# original local setup). Create it once if this is a fresh server.
docker volume inspect hackxxmuj_postgres_data >/dev/null 2>&1 \
  || docker volume create hackxxmuj_postgres_data

if [ ! -f "$APP_DIR/.env" ]; then
  log "ERROR: $APP_DIR/.env is missing — copy .env.example and fill in the secrets first."
  exit 1
fi

log "Building + starting containers (app, db, nginx)"
docker compose up -d --build

log "Waiting for Postgres to accept connections"
for i in $(seq 1 30); do
  if docker compose exec -T "$SERVICE_DB" pg_isready -U postgres -d vera >/dev/null 2>&1; then
    break
  fi
  [ "$i" = 30 ] && { log "Postgres did not become ready in time"; exit 1; }
  sleep 2
done

log "Running database migrations"
# The runtime image is Next.js standalone (no npm/tsx) — migrations run in a
# dedicated tools container instead (see the `migrate` service in compose).
docker compose run --rm migrate

log "Restarting app to pick up any env changes"
docker compose up -d --no-deps "$SERVICE_APP"

log "Pruning dangling images + BuildKit cache from this build"
docker image prune -f >/dev/null
# The npm run build layer is ~1-2GB per push; without this the disk fills
# after a handful of deploys and takes the whole stack down.
docker builder prune -f >/dev/null

log "Disk after deploy: $(df -h / | awk 'NR==2{print $3 " used, " $4 " free (" $5 ")"}')"

log "Health check"
sleep 3
curl -fsS http://127.0.0.1:3000/api/health >/dev/null \
  && log "App healthy on :3000" \
  || { log "WARNING: /api/health did not answer on :3000"; docker compose ps; exit 1; }

log "DONE — deployment complete"
