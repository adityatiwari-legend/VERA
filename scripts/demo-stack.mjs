/**
 * Boots the full local demo stack for VERA:
 *   1. Solana localnet validator + Hisaab program (WSL, skipped if already up)
 *   2. Hardhat EVM node (skipped if :8545 already serving)
 *   3. Next.js dev server
 * Usage: npm run demo:stack
 */
import { spawn } from 'node:child_process';
import net from 'node:net';

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

async function main() {
  // 1. Solana localnet (WSL) — the script no-ops when the validator is live
  console.log('[demo-stack] ensuring Solana localnet + Hisaab program…');
  const sol = run('wsl -d Ubuntu -u root -- bash /mnt/d/HackXxMUJ/scripts/hisaab-localnet.sh');
  await waitPort(8899, 'Solana localnet', 60000);

  // 2. Hardhat node
  if (await portOpen(8545)) {
    console.log('[demo-stack] Hardhat node already running on :8545');
  } else {
    console.log('[demo-stack] starting Hardhat node…');
    run('npx hardhat node');
    await waitPort(8545, 'Hardhat node', 60000);
  }

  // 3. Next dev server
  if (await portOpen(3000)) {
    console.log('[demo-stack] Next dev server already running on :3000');
  } else {
    console.log('[demo-stack] starting Next dev server…');
    run('npm run dev');
    await waitPort(3000, 'Next dev server', 90000);
  }

  console.log('\n[demo-stack] ✅ Demo stack is up:');
  console.log('   App:         http://localhost:3000');
  console.log('   EVM (Ethereum):  http://localhost:8545 (Hardhat, chain 31337)');
  console.log('   Solana:      http://localhost:8899 (localnet, Hisaab program deployed)\n');
}

main().catch((err) => {
  console.error('[demo-stack] fatal:', err);
  process.exit(1);
});
