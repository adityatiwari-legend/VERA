#!/bin/sh
# Hardhat node entrypoint: start the chain, wait for it to answer JSON-RPC,
# deploy the VERA contract once, then keep the node in the foreground.
set -e

npx hardhat node --hostname 0.0.0.0 --port 8545 &
NODE_PID=$!

echo "[hardhat-entrypoint] waiting for node to answer JSON-RPC..."
i=0
while ! node -e "fetch('http://127.0.0.1:8545',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_chainId',params:[]})}).then(r=>r.json()).then(()=>process.exit(0)).catch(()=>process.exit(1))" 2>/dev/null; do
  i=$((i+1))
  [ "$i" -gt 60 ] && { echo "[hardhat-entrypoint] node did not come up"; exit 1; }
  sleep 1
done

echo "[hardhat-entrypoint] node is up — deploying VERA contract"
npx hardhat run scripts/deploy.js --network localhost || {
  echo "[hardhat-entrypoint] WARNING: contract deploy failed — chain stays up without a contract"
}

echo "[hardhat-entrypoint] chain ready on :8545"
wait $NODE_PID
