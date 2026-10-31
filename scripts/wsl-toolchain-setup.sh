#!/usr/bin/env bash
# Installs build deps, Rust, Solana CLI (Agave) and Anchor inside WSL Ubuntu.
# Idempotent: safe to re-run. Runs as root inside the distro.
set -euo pipefail

echo "=== [1/5] apt packages ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update -y -qq
apt-get install -y -qq build-essential pkg-config libssl-dev libudev-dev curl git jq bc unzip >/dev/null

echo "=== [2/5] Rust ==="
if ! command -v rustc >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable >/dev/null 2>&1
fi
source "$HOME/.cargo/env"
rustc --version

echo "=== [3/5] Solana CLI (Agave) ==="
if ! command -v solana >/dev/null 2>&1; then
  ASSET_URL=$(curl -s https://api.github.com/repos/anza-xyz/agave/releases/latest \
    | jq -r '.assets[].browser_download_url' \
    | grep 'x86_64-unknown-linux-gnu.tar.bz2$' \
    | grep -E 'solana-release|agave-release' | head -1)
  echo "Downloading: $ASSET_URL"
  DL=$(mktemp -d)
  curl -sL "$ASSET_URL" -o "$DL/sol.tar.bz2"
  tar -xjf "$DL/sol.tar.bz2" -C "$DL"
  RELEASE_DIR=$(find "$DL" -maxdepth 1 -type d -name '*-release' | head -1)
  mkdir -p /usr/local/solana
  cp -r "$RELEASE_DIR"/* /usr/local/solana/
  ln -sf /usr/local/solana/bin/* /usr/local/bin/
  rm -rf "$DL"
fi
solana --version

echo "=== [4/5] Anchor (via avm) ==="
source "$HOME/.cargo/env"
if ! command -v avm >/dev/null 2>&1; then
  cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
fi
if ! command -v anchor >/dev/null 2>&1; then
  avm install latest
  avm use latest
  ln -sf "$HOME/.avm/bin/anchor" /usr/local/bin/anchor
fi
anchor --version

echo "=== [5/5] Devnet config ==="
solana config set --url https://api.devnet.solana.com >/dev/null
solana config get

echo "TOOLCHAIN_SETUP_DONE"
