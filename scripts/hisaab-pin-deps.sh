#!/usr/bin/env bash
# Repeatedly fetches dependencies with the pinned (old) cargo and pins any
# edition2024-requiring crate to a known edition2021 version, until fetch is clean.
set -uo pipefail
cd /mnt/d/HackXxMUJ/contracts/hisaab
source "$HOME/.cargo/env"
export PATH="$HOME/.cargo/bin:/usr/local/bin:$PATH"

# crate -> newest edition2021 version
declare -A PIN_MAP=(
  [zeroize_derive]=1.4.2
  [cpufeatures]=0.2.17
  [blake3]=1.5.5
  [proc-macro-crate]=3.2.0
  [jobserver]=0.1.32
  [indexmap]=2.9.0
  [hashbrown]=0.15.4
  [zerocopy]=0.8.26
  [getrandom]=0.2.15
  [rand_core]=0.6.4
  [toml_edit]=0.22.27
  [home]=0.5.9
  [native-tls]=0.2.13
  [proc-macro2]=1.0.93
  [unicode-segmentation]=1.12.0
  [rayon]=1.10.0
  [rayon-core]=1.12.1
  [js-sys]=0.3.77
  [wasm-bindgen]=0.2.100
  [wasm-bindgen-macro]=0.2.100
  [wasm-bindgen-macro-support]=0.2.100
  [wasm-bindgen-shared]=0.2.100
  [web-sys]=0.3.77
  [borsh]=1.5.5
)

# Normalize lockfile to v3 (readable by the pinned toolchains)
LOCK_VER=$(head -5 Cargo.lock 2>/dev/null | grep -oP 'version = \K[0-9]+' | head -1 || echo 0)
if [ "${LOCK_VER:-0}" -ge 4 ]; then
  echo "Lock v$LOCK_VER -> regenerating v3"
  rm -f Cargo.lock
  rustup run 1.79.0 cargo generate-lockfile >/dev/null 2>&1
fi

for i in $(seq 1 16); do
  ERR=$(rustup run 1.79.0 cargo fetch 2>&1)
  if echo "$ERR" | grep -q "edition2024\|requires rustc"; then
    : # manifest-parse or MSRV failure handled below
  else
    echo "FETCH_CLEAN after $i pass(es)"
    exit 0
  fi
  CRATE=$(echo "$ERR" | grep -oP 'registry/src/[^/ ]+/\K[a-zA-Z0-9_.+-]+(?=/Cargo.toml)' | head -1)
  if [ -z "$CRATE" ]; then
    CRATE=$(echo "$ERR" | grep -oP 'package `\K[a-zA-Z0-9_-]+(?= v[0-9.]+ )' | head -1)
  fi
  CRATE=$(echo "$CRATE" | sed 's/-[0-9][0-9.+-]*$//')
  if [ -z "$CRATE" ]; then
    echo "UNRECOVERABLE FETCH ERROR:"
    echo "$ERR" | tail -5
    exit 1
  fi
  PIN=${PIN_MAP[$CRATE]:-}
  if [ -z "$PIN" ]; then
    echo "NO PIN MAPPED FOR CRATE: $CRATE"
    echo "$ERR" | tail -3
    exit 1
  fi
  echo "Pinning $CRATE -> $PIN"
  rustup run 1.79.0 cargo update -p "$CRATE" --precise "$PIN" 2>&1 | tail -1
done
echo "PASS_LIMIT_REACHED"
exit 1
