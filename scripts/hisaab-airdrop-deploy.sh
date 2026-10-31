#!/usr/bin/env bash
# Airdrops devnet SOL to payer/funder/oracle/contractor, then deploys the program.
set -u
source "$HOME/.cargo/env"
export PATH="$HOME/.cargo/bin:/usr/local/bin:$PATH"
cd /mnt/d/HackXxMUJ/contracts/hisaab

solana config set --url https://api.devnet.solana.com >/dev/null

airdrop_until () {
  local PUB=$1; local TARGET=$2
  for i in $(seq 1 8); do
    BAL=$(solana balance "$PUB" 2>/dev/null | awk '{print $1}' | cut -d. -f1)
    [ -n "$BAL" ] && [ "$BAL" -ge "$TARGET" ] && return 0
    solana airdrop 1 "$PUB" >/dev/null 2>&1 || sleep 6
  done
  solana balance "$PUB" 2>/dev/null
}

PAYER=$(solana-keygen pubkey /root/.config/solana/id.json)
FUNDER=$(solana-keygen pubkey keys/funder.json)
ORACLE=$(solana-keygen pubkey keys/oracle.json)
CONTRACTOR=$(solana-keygen pubkey keys/contractor.json)

echo "payer:      $(airdrop_until $PAYER 4 || echo 0) SOL"
echo "funder:     $(airdrop_until $FUNDER 2 || echo 0) SOL"
echo "oracle:     $(airdrop_until $ORACLE 1 || echo 0) SOL"
echo "contractor: $(airdrop_until $CONTRACTOR 1 || echo 0) SOL"

solana program deploy --program-id hisaab-keypair.json target/deploy/hisaab.so 2>&1 | tail -3
