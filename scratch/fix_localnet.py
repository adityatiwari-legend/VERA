import io

p = 'scripts/hisaab-localnet.sh'
with io.open(p, encoding='utf-8') as f:
    src = f.read()

old = '''RPC=http://localhost:8899
solana config set --url "$RPC" >/dev/null

# 1. Start the validator if it isn't running
if ! solana cluster-version >/dev/null 2>&1; then
  echo "Starting solana-test-validator..."
  # ledger lives outside the repo — a WSL-owned ledger breaks Windows file stat
  # bind 0.0.0.0 so Windows can reach the validator via the WSL IP when the
  # localhost port-forward drops (it does after restarts)
  nohup solana-test-validator --reset --ledger /tmp/hisaab-ledger >/tmp/solana-test-validator.log 2>&1 &
  for i in $(seq 1 30); do
    if solana cluster-version >/dev/null 2>&1; then break; fi
    sleep 1
  done
fi'''

new = '''# Bind the validator to the WSL eth0 IP: the Windows->WSL localhost port
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
  nohup solana-test-validator --reset --ledger /tmp/hisaab-ledger --bind-address "$WSL_IP" >/tmp/solana-test-validator.log 2>&1 &
  for i in $(seq 1 45); do
    if solana cluster-version >/dev/null 2>&1; then break; fi
    sleep 1
  done
fi'''

assert old in src, 'localnet script block not found'
src = src.replace(old, new, 1)
with io.open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(src)
print('localnet script: IP-bound validator + env rewrite')
