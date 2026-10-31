#!/usr/bin/env bash
# Installs newer SBF platform-tools (cargo >= 1.85 for edition2024 crates)
# and rebuilds the Hisaab program against it.
set -euo pipefail
cd /mnt/d/HackXxMUJ/contracts/hisaab
source "$HOME/.cargo/env"
export PATH="$HOME/.cargo/bin:/usr/local/bin:$PATH"

cargo build-sbf --tools-version v1.58 --install-only
ls /root/.cache/solana/ 2>/dev/null || true

export PLATFORM_TOOLS_VERSION=v1.58
anchor build
echo "BUILD_DONE: target/deploy/hisaab.so"
ls -la target/deploy/*.so target/idl/hisaab.json
