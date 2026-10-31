#!/usr/bin/env bash
# Wraps cargo-build-sbf so `anchor build` uses platform-tools v1.58
# (cargo >= 1.85, required for edition2024 crates like zeroize_derive 1.5).
set -euo pipefail
REAL=/usr/local/solana/bin/cargo-build-sbf
if [ ! -x "$REAL" ]; then
  REAL=$(readlink -f "$(which cargo-build-sbf)" 2>/dev/null || true)
fi
echo "real cargo-build-sbf: $REAL"

if [ ! -f /usr/local/bin/cargo-build-sbf.real ]; then
  cp "$(which cargo-build-sbf)" /usr/local/bin/cargo-build-sbf.real
fi
cat > /usr/local/bin/cargo-build-sbf <<'EOF'
#!/usr/bin/env bash
exec /usr/local/bin/cargo-build-sbf.real --tools-version v1.58 "$@"
EOF
chmod +x /usr/local/bin/cargo-build-sbf
echo "SHIM_INSTALLED"
