#!/usr/bin/env bash
# Boots (if needed) a localnet validator and deploys the Hisaab program v2.
# Usage: wsl -d Ubuntu -u root -- bash /mnt/d/HackXxMUJ/scripts/hisaab-localnet.sh
set -euo pipefail
cd /mnt/d/HackXxMUJ/contracts/hisaab
source "$HOME/.cargo/env"
# /usr/local/bin hosts agave 4.x — must WIN over the older CLI shadowing in
# ~/.cargo/bin, otherwise deploy fails with an sbpf feature mismatch.
export PATH="/usr/local/bin:$HOME/.cargo/bin:$PATH"

# Bind the validator to the WSL eth0 IP: the Windows->WSL localhost port
# forward is unreliable across validator restarts, while the IP route is not.
WSL_IP=$(hostname -I | awk '{print $1}')
RPC="http://${WSL_IP}:8899"
solana config set --url "$RPC" >/dev/null

# Keep the app pointed at the same reachable URL (best-effort, Windows side)
if [ -f /mnt/d/HackXxMUJ/.env.local ]; then
  sed -i "s|^HISAAB_RPC_URL=.*|HISAAB_RPC_URL=${RPC}|" /mnt/d/HackXxMUJ/.env.local
fi

# 1. Start the validator if it isn't running
if ! solana cluster-version >/dev/null 2>&1; then
  echo "Starting solana-test-validator on ${WSL_IP}:8899 ..."
  # ledger lives outside the repo — a WSL-owned ledger breaks Windows file stat
  # setsid detaches the daemon from the wsl.exe session — without it the
  # validator dies when the launching session tears down (WSL2 behavior)
  setsid nohup solana-test-validator --reset --ledger /tmp/hisaab-ledger --bind-address "$WSL_IP" </dev/null >>/tmp/solana-test-validator.log 2>&1 &
  for i in $(seq 1 45); do
    if solana cluster-version >/dev/null 2>&1; then break; fi
    sleep 1
  done
fi
echo "Validator: $(solana cluster-version)"

# 2. Fund the payer + app keys. NEVER airdrop to the program-id keypair —
#    an account at the program address blocks deployment.
solana airdrop 10 2>/dev/null || true
for KEYFILE in keys/oracle.json keys/funder.json keys/contractor.json; do
  if [ -f "$KEYFILE" ]; then
    PUB=$(solana-keygen pubkey "$KEYFILE")
    BAL=$(solana balance "$PUB" 2>/dev/null | grep -oE '^[0-9]+' || echo 0)
    if [ "${BAL:-0}" -lt 2 ]; then
      solana airdrop 10 "$PUB" >/dev/null 2>&1 || true
    fi
    echo "$PUB  $(solana balance "$PUB" 2>/dev/null || echo '?')"
  fi
done

# 3. Deploy the program (stable program id from hisaab-keypair.json)
PROGRAM_ID=$(solana-keygen pubkey hisaab-keypair.json)
echo "Program ID: $PROGRAM_ID"
OWNER=$(solana account "$PROGRAM_ID" --output json 2>/dev/null | grep -o '"owner": "[^"]*"' | cut -d'"' -f4 || true)
if [ "$OWNER" = "BPFLoaderUpgradeab1e11111111111111111111111" ]; then
  echo "Program already deployed — upgrading"
  solana program deploy --program-id hisaab-keypair.json --upgrade-authority /root/.config/solana/id.json target/deploy/hisaab.so
else
  solana program deploy --program-id hisaab-keypair.json target/deploy/hisaab.so
fi

solana program show "$PROGRAM_ID" | head -6
echo "LOCALNET_DEPLOY_DONE"
