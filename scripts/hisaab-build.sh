#!/usr/bin/env bash
# Builds (and optionally deploys) the Hisaab Anchor program inside WSL Ubuntu.
# Usage: wsl -d Ubuntu -u root -- bash /mnt/d/HackXxMUJ/scripts/hisaab-build.sh [--deploy]
set -euo pipefail
cd /mnt/d/HackXxMUJ/contracts/hisaab
source "$HOME/.cargo/env"
export PATH="$HOME/.cargo/bin:/usr/local/bin:$PATH"

# 1. Cargo.lock must be version <=3 for the pinned SBF toolchain.
#    A v4 lock (written by newer cargo) breaks cargo build-sbf.
if [ -f Cargo.lock ]; then
  LOCK_VER=$(head -5 Cargo.lock | grep -oP 'version = \K[0-9]+' | head -1 || echo 3)
  if [ "${LOCK_VER:-3}" -ge 4 ]; then
    echo "Cargo.lock is v$LOCK_VER — regenerating as v3 with rust 1.79"
    rm -f Cargo.lock
  fi
fi
if [ ! -f Cargo.lock ]; then
  rustup run 1.79.0 cargo generate-lockfile --manifest-path Cargo.toml >/dev/null 2>&1 || \
    rustup run 1.79.0 cargo generate-lockfile >/dev/null
fi

# 1b. Pin crates that require edition2024 (the pre-flight dependency fetch runs
#     under cargo 1.75 from the pinned rustup toolchain, which cannot parse them;
#     the actual SBF compile runs under platform-tools v1.58 cargo >= 1.85).
if grep -q 'name = "zeroize_derive"' Cargo.lock && grep -A1 'name = "zeroize_derive"' Cargo.lock | grep -q '1.5.0'; then
  cargo update -p zeroize_derive --precise 1.4.2 2>/dev/null || true
fi

# 1c. Iteratively pin any remaining edition2024 crates (see script for the map).
bash /mnt/d/HackXxMUJ/scripts/hisaab-pin-deps.sh

# 2. Program keypair (stable program id across rebuilds)
if [ ! -f hisaab-keypair.json ] && [ -f target/deploy/hisaab-keypair.json ]; then
  cp target/deploy/hisaab-keypair.json hisaab-keypair.json
fi
if [ ! -f hisaab-keypair.json ]; then
  solana-keygen new --no-bip39-passphrase --silent -o hisaab-keypair.json
fi
# Anchor generates its own keypair in target/deploy — reconcile to one id.
if [ -f target/deploy/hisaab-keypair.json ]; then
  cp target/deploy/hisaab-keypair.json hisaab-keypair.json
fi
PROGRAM_ID=$(solana-keygen pubkey hisaab-keypair.json)
echo "Program ID: $PROGRAM_ID"

# 3. Patch declare_id! and Anchor.toml to match the keypair
sed -i "s/^declare_id!(\".*\")/declare_id!(\"$PROGRAM_ID\")/" programs/hisaab/src/lib.rs
sed -i "s/^hisaab = \".*\"/hisaab = \"$PROGRAM_ID\"/" Anchor.toml

# 4. Wallet + config for anchor build/deploy
if [ ! -f /root/.config/solana/id.json ]; then
  solana-keygen new --no-bip39-passphrase --silent -o /root/.config/solana/id.json
fi
solana config set --url https://api.devnet.solana.com >/dev/null
echo "Payer balance: $(solana balance 2>/dev/null || echo '0 SOL')"

# 5. Build
anchor build
echo "BUILD_DONE: target/deploy/hisaab.so"

# 6. Optional deploy
if [ "${1:-}" = "--deploy" ]; then
  solana program deploy --program-id hisaab-keypair.json target/deploy/hisaab.so
  echo "DEPLOY_DONE"
fi
