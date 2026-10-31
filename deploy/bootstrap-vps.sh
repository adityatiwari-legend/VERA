#!/usr/bin/env bash
# =============================================================================
# VERA — one-time VPS bootstrap (Ubuntu 22.04/24.04, run as root)
#
# Installs Docker + git, clones the repo to /opt/vera, prepares the data
# volume, and installs the CI/CD deploy key if provided.
# Run this ONCE:  bash deploy/bootstrap-vps.sh
# Then create /opt/vera/.env (copy .env.example, fill in secrets) and run
# `bash deploy/deploy.sh` — after that, pushes to main auto-deploy via the
# GitHub Actions workflow (.github/workflows/deploy.yml).
#
# Optional env vars:
#   DEPLOY_PUBKEY  — ssh public key to authorize for CI/CD deployments
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/vera}"
REPO="${REPO:-https://github.com/adityatiwari-legend/VERA.git}"

log() { printf '\n\033[1;34m[vera-bootstrap]\033[0m %s\n' "$*"; }

log "Installing base packages (docker, git, curl)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git docker.io docker-compose-plugin
systemctl enable --now docker

log "Cloning / updating $REPO → $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch origin main
  git -C "$APP_DIR" reset --hard origin/main
else
  git clone "$REPO" "$APP_DIR"
fi

log "Creating postgres data volume"
docker volume inspect hackxxmuj_postgres_data >/dev/null 2>&1 \
  || docker volume create hackxxmuj_postgres_data

if [ -n "${DEPLOY_PUBKEY:-}" ]; then
  log "Installing CI/CD deploy key"
  mkdir -p /root/.ssh
  chmod 700 /root/.ssh
  grep -qxF "$DEPLOY_PUBKEY" /root/.ssh/authorized_keys 2>/dev/null \
    || echo "$DEPLOY_PUBKEY" >> /root/.ssh/authorized_keys
  chmod 600 /root/.ssh/authorized_keys
fi

if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  log "Created $APP_DIR/.env from the example — EDIT IT before the first deploy."
fi

log "Bootstrap complete. Next: edit /opt/vera/.env, then run bash deploy/deploy.sh"
