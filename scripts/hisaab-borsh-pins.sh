#!/usr/bin/env bash
# One-shot borsh MSRV pins.
set -u
cd /mnt/d/HackXxMUJ/contracts/hisaab
source "$HOME/.cargo/env"
rustup run 1.79.0 cargo update -p borsh@1.8.1 --precise 1.5.5 2>&1 | grep -E "Downgrading|error" | head -2
rustup run 1.79.0 cargo update -p borsh-derive@1.8.1 --precise 1.5.5 2>&1 | grep -E "Downgrading|error" | head -2
echo BORSH_PINS_DONE
