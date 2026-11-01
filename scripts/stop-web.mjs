/**
 * Stops the VERA web app: kills whatever process is LISTENING on :3000.
 * Chains (Hardhat :8545, Solana :8899) and Postgres are NOT touched.
 * Usage: npm run stop:web
 */
import { spawnSync, execSync } from 'node:child_process';
import net from 'node:net';

const PORT = 3000;

const portOpen = () =>
  new Promise((resolve) => {
    const s = net.connect({ port: PORT, host: '127.0.0.1' });
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

function listenerPids(port) {
  const pids = new Set();
  let out = '';
  try {
    out = execSync('netstat -ano', { encoding: 'utf8' });
  } catch {
    return pids;
  }
  for (const line of out.split(/\r?\n/)) {
    if (!/LISTENING/i.test(line)) continue;
    const cols = line.trim().split(/\s+/);
    // netstat -ano: TCP  <local>  <foreign>  <state>  <pid>
    const local = cols[1] || '';
    const pid = cols[cols.length - 1] || '';
    if (local.endsWith(`:${port}`) && /^\d+$/.test(pid)) pids.add(pid);
  }
  return pids;
}

async function main() {
  if (!(await portOpen())) {
    console.log(`[stop:web] nothing is listening on :${PORT} — web app already stopped.`);
    return;
  }

  const pids = listenerPids(PORT);
  if (pids.size === 0) {
    console.error(`[stop:web] port :${PORT} is busy but no owning PID was found (netstat parse).`);
    process.exit(1);
  }

  for (const pid of pids) {
    const isWin = process.platform === 'win32';
    const res = isWin
      ? spawnSync('taskkill', ['/PID', pid, '/T', '/F'], { stdio: 'pipe', encoding: 'utf8' })
      : spawnSync('kill', ['-9', pid], { stdio: 'pipe', encoding: 'utf8' });
    if (res.status === 0) {
      console.log(`[stop:web] stopped PID ${pid}`);
    } else {
      console.error(`[stop:web] failed to stop PID ${pid}: ${(res.stderr || res.stdout || '').trim()}`);
    }
  }

  // give the OS a moment to release the socket, then verify
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (!(await portOpen())) {
      console.log(`[stop:web] ✅ web app stopped — port :${PORT} is free. (Chains on :8545/:8899 untouched.)`);
      return;
    }
  }
  console.error(`[stop:web] port :${PORT} still busy — check: netstat -ano | findstr :${PORT}`);
  process.exit(1);
}

main().catch((err) => {
  console.error('[stop:web] fatal:', err);
  process.exit(1);
});
