// 1. bind a test wallet for the admin user, 2. call faucet, 3. check balance on chain
const BASE = 'http://localhost:3000';
const jars = new Map();
async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (jars.get('c')) headers.cookie = jars.get('c');
  if (opts.body) headers['content-type'] = 'application/json';
  const res = await fetch(BASE + path, { ...opts, headers });
  const sc = res.headers.getSetCookie?.() ?? [];
  if (sc.length) jars.set('c', sc.map((c) => c.split(';')[0]).join('; '));
  return { status: res.status, body: await res.json().catch(() => null) };
}
const login = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'admin@fundtrail.org', password: 'Password123!' }) });
console.log('login:', login.status);
// generate a throwaway EVM address (no signature needed for the faucet balance test? faucet requires only address)
const { ethers } = await import('ethers');
const wallet = ethers.Wallet.createRandom();
console.log('test wallet:', wallet.address);
const faucet = await api('/api/auth/wallet/evm/faucet', { method: 'POST', body: JSON.stringify({ address: wallet.address }) });
console.log('faucet:', faucet.status, JSON.stringify(faucet.body).slice(0, 140));
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
const bal = await provider.getBalance(wallet.address);
console.log('on-chain balance:', ethers.formatEther(bal), 'ETH');
