#!/usr/bin/env bash
# Scans all locked crates in the registry cache for rust-version > 1.75 (MSRV)
# and reports offenders. Run inside WSL.
cd /mnt/d/HackXxMUJ/contracts/hisaab
REG=$(ls -d /root/.cargo/registry/src/*/ | head -1)

# locked crates from Cargo.lock
CRATES=$(grep -oP '(?<=^name = ")[^"]+(?=")' Cargo.lock | paste -d@ - <(grep -oP '(?<=^version = ")[^"]+(?=")' Cargo.lock))

while IFS= read -r spec; do
  CRATE="${spec%@*}"; VER="${spec#*@}"
  F="${REG}${CRATE}-${VER}/Cargo.toml"
  [ -f "$F" ] || continue
  RV=$(grep -m1 '^rust-version' "$F" | grep -oP '\d+\.\d+')
  if [ -n "$RV" ]; then
    MAJOR=${RV%%.*}; MINOR=${RV#*.}
    if [ "$MAJOR" -eq 1 ] && [ "$MINOR" -ge 76 ]; then
      echo "MSRV-BLOCKED: $spec needs rustc $RV"
    fi
  fi
done <<< "$CRATES"
echo SCAN_DONE
