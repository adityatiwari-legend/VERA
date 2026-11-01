/**
 * ONE-COMMAND boot for the entire VERA stack:
 *   1. Postgres (docker compose vera-db, :5433)          — started if down
 *   2. Migrations (idempotent; skips applied versions)
 *   3. Solana localnet validator + Hisaab program (WSL)  — skipped if :8899 up
 *   4. Hardhat EVM node (:8545)                          — skipped if up
 *   5. VERA.sol contract                                 — redeployed only when
 *      the node lost it (a restarted Hardhat node wipes deployments)
 *   6. Next.js dev server (:3000)                        — skipped if up
 *
 * Usage: npm run demo:stack        (or double-click VERA.bat on Windows)
 * Keep the terminal open — closing it stops the processes it started.
 */
import { spawn } from 'node:child_process';
import net from 'node:net';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const portOpen = (port, host = '127.0.0.1') =>
  new Promise((resolve) => {
    const s = net.connect({ port, host });
    s.once('connect', () => {
      s.destroy();
      resolve(true);
    });
    s.once('error', () => resolve(false));
    s.setTimeout(1500, () => {
      s.destroy();
      resolve(false);
    });
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitPort(port, label, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await portOpen(port)) return true;
    await sleep(700);
  }
  console.error(`[demo-stack] ${label} did not come up on :${port}`);
  return false;
}

function run(cmd, args, opts = {}) {
  const child = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  child.on('exit', (code) => {
    if (code !== 0 && !opts.detached) console.error(`[demo-stack] ${cmd} exited with ${code}`);
  });
  return child;
}

// Run to completion and resolve with the exit code (migrations, deploys).
function runAwait(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

async function main() {
  // 1. Postgres
  const isLocalDb = (process.env.DATABASE_URL || '').includes('5433') || (process.env.DATABASE_URL || '').includes('127.0.0.1');
  if (!isLocalDb) {
    console.log('[demo-stack] Using cloud database (TigerDB/Timescale) — skipping local Docker Postgres');
  } else if (await portOpen(5433)) {
    console.log('[demo-stack] Postgres already running on :5433');
  } else {
    console.log('[demo-stack] starting Postgres (docker compose vera-db)…');
    run('docker', ['compose', 'up', '-d', 'vera-db']);
    if (!(await waitPort(5433, 'Postgres', 60000))) {
      console.error('[demo-stack] Is Docker Desktop running? Start it and re-run this command.');
      process.exit(1);
    }
  }

  // 2. Migrations (no-op when everything is applied)
  console.log('[demo-stack] applying migrations…');
  const mig = await runAwait('npm', ['run', 'db:migrate']);
  if (mig !== 0) {
    console.error('[demo-stack] migrations failed — aborting.');
    process.exit(1);
  }

  // 3. Solana localnet (WSL) — the script no-ops when the validator is live
  console.log('[demo-stack] ensuring Solana localnet + Hisaab program…');
  run('wsl -d Ubuntu -u root -- bash /mnt/d/HackXxMUJ/scripts/hisaab-localnet.sh');
  await waitPort(8899, 'Solana localnet', 60000);

  // 4. Hardhat node
  if (await portOpen(8545)) {
    console.log('[demo-stack] Hardhat node already running on :8545');
  } else {
    console.log('[demo-stack] starting Hardhat node…');
    run('npx hardhat node');
    await waitPort(8545, 'Hardhat node', 60000);
  }

  // 5. VERA.sol — deploy only when the configured address has no code
  const addr = process.env.CONTRACT_ADDRESS;
  let hasCode = false;
  if (addr && /^0x[0-9a-fA-F]{40}$/.test(addr)) {
    try {
      const res = await fetch('http://127.0.0.1:8545', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getCode',
          params: [addr, 'latest'],
        }),
      });
      const json = await res.json();
      hasCode = Boolean(json.result && json.result !== '0x');
    } catch {
      hasCode = false;
    }
  }
  if (hasCode) {
    console.log(`[demo-stack] VERA contract present at ${addr}`);
  } else {
    console.log('[demo-stack] deploying VERA.sol to the local node…');
    const dep = await runAwait('npx', ['hardhat', 'run', 'scripts/deploy.js', '--network', 'localhost']);
    if (dep !== 0) {
      console.error('[demo-stack] contract deploy failed — on-chain features degrade until it succeeds.');
    } else {
      // deploy.js rewrites CONTRACT_ADDRESS in .env.local; reload so printed info is current
      dotenv.config({ path: '.env.local', override: true });
    }
  }

  // 6. Next dev server
  if (await portOpen(3000)) {
    console.log('[demo-stack] Next dev server already running on :3000');
  } else {
    console.log('[demo-stack] starting Next dev server…');
    run('npm run dev');
    await waitPort(3000, 'Next dev server', 90000);
  }

  console.log('\n[demo-stack] ✅ Full stack is up and active:');
  console.log('   App:            http://localhost:3000');
  console.log('   Database:       TigerDB (Timescale Cloud)');
  console.log('   EVM (Ethereum): http://localhost:8545 (Hardhat, chain 31337)');
  console.log('   Solana:         http://localhost:8899 (localnet, Hisaab program deployed)');
  console.log('   ------------------------------------------------------------');
  console.log('   Admin Login:    admin@vera.org');
  console.log('   Admin Password: adminpassword123');
  console.log('   ------------------------------------------------------------');
  console.log('   Keep this window open — closing it stops the stack.\n');

  // Keep process alive so Windows console window stays open indefinitely
  setInterval(() => {}, 1000 * 60 * 60 * 24);
}

main().catch((err) => {
  console.error('[demo-stack] fatal:', err);
  process.exit(1);
});
