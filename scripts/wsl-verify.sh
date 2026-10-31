#!/usr/bin/env bash
# Verifies the Solana/Anchor toolchain state inside WSL.
set -u
source "$HOME/.cargo/env" 2>/dev/null
export PATH="$HOME/.cargo/bin:/usr/local/bin:$PATH"
echo "--- anchor ---"
which anchor
anchor --version 2>&1 | head -1
echo "--- avm ---"
avm list 2>&1 | tail -3
echo "--- cargo build-sbf ---"
which cargo-build-sbf && cargo-build-sbf --version || echo "cargo-build-sbf NOT FOUND"
echo "--- platform-tools ---"
ls "$HOME/.platform-tools" 2>/dev/null || ls /root/.cache/sbf 2>/dev/null || echo "no platform-tools dir found"
echo "--- solana ---"
solana --version 2>&1 | head -1
solana config get 2>&1 | head -4
