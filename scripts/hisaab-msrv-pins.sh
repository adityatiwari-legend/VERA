#!/usr/bin/env bash
# One-shot MSRV pins for the Hisaab build (rustc 1.75 SBF toolchain).
set -u
cd /mnt/d/HackXxMUJ/contracts/hisaab
source "$HOME/.cargo/env"

pins=(
  "unicode-segmentation@1.13.3 1.12.0"
  "rayon@1.12.0 1.10.0"
  "rayon-core@1.13.0 1.12.1"
  "js-sys@0.3.106 0.3.77"
  "wasm-bindgen@0.2.129 0.2.100"
  "wasm-bindgen-macro@0.2.129 0.2.100"
  "wasm-bindgen-macro-support@0.2.129 0.2.100"
  "wasm-bindgen-shared@0.2.129 0.2.100"
  "web-sys@0.3.106 0.3.77"
)
for pin in "${pins[@]}"; do
  spec="${pin% *}"; ver="${pin#* }"
  out=$(rustup run 1.79.0 cargo update -p "$spec" --precise "$ver" 2>&1)
  echo "$out" | grep -E "Updating|Downgrading|error" | head -2
done
echo MSRV_PINS_DONE
