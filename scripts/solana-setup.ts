/**
 * Solana devnet setup for Hisaab: oracle / funder / contractor keypairs,
 * airdrops, and the .env lines to paste into .env.local.
 * Run: npm run solana:setup
 */
import fs from 'fs';
import path from 'path';
import {
  Keypair,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
} from '@solana/web3.js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const KEYS_DIR = path.resolve(process.cwd(), 'contracts', 'hisaab', 'keys');
const RPC = process.env.HISAAB_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(RPC, 'confirmed');

function ensureKeypair(name: string): Keypair {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
  const file = path.join(KEYS_DIR, `${name}.json`);
  if (fs.existsSync(file)) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, 'utf-8'))));
  }
  const kp = Keypair.generate();
  fs.writeFileSync(file, JSON.stringify(Array.from(kp.secretKey)));
  return kp;
}

async function airdropWithRetry(pubkey: PublicKey, sol = 1, attempts = 5): Promise<number> {
  for (let i = 0; i < attempts; i++) {
    let bal = 0;
    try {
      bal = await connection.getBalance(pubkey);
    } catch (e) {
      console.log(`  ⚠️ Could not reach ${RPC} to check balance (${(e as Error).message}).`);
      return 0;
    }
    if (bal >= sol * LAMPORTS_PER_SOL) return bal;
    try {
      const sig = await connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature: sig, ...latest }, 'confirmed');
      return await connection.getBalance(pubkey);
    } catch (err) {
      const msg = (err as Error).message || '';
      if (msg.includes('410') || msg.includes('faucet is closed') || msg.includes('The RPC faucet is closed')) {
        console.log(`  ℹ️  Public RPC faucet is closed on ${RPC} (410 Gone).`);
        console.log(`     Use the web faucet to fund this address: https://faucet.solana.com`);
        break;
      }
      console.log(`  airdrop attempt ${i + 1} failed (${msg}) — retrying in 6s`);
      await new Promise((r) => setTimeout(r, 6000));
    }
  }
  try {
    return await connection.getBalance(pubkey);
  } catch {
    return 0;
  }
}

async function main() {
  console.log(`🔑 Solana setup on ${RPC}\n`);

  const oracle = ensureKeypair('oracle');
  const funder = ensureKeypair('funder');
  const contractor = ensureKeypair('contractor');

  // Program keypair (stable program id) — used by anchor build/deploy
  const programKeyFile = path.resolve(process.cwd(), 'contracts', 'hisaab', 'hisaab-keypair.json');
  if (!fs.existsSync(programKeyFile)) {
    const kp = Keypair.generate();
    fs.writeFileSync(programKeyFile, JSON.stringify(Array.from(kp.secretKey)));
  }
  const programId = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(programKeyFile, 'utf-8')))
  ).publicKey;

  for (const [name, kp] of [
    ['oracle', oracle],
    ['funder', funder],
    ['contractor', contractor],
  ] as const) {
    const bal = await airdropWithRetry(kp.publicKey, 1);
    console.log(`${name.padEnd(11)} ${kp.publicKey.toBase58()}  (${(bal / LAMPORTS_PER_SOL).toFixed(2)} SOL)`);
  }
  console.log(`program id  ${programId.toBase58()}\n`);

  console.log('Paste into .env.local:\n');
  console.log(`HISAAB_RPC_URL=${RPC}`);
  console.log(`HISAAB_ORACLE_KEYPAIR=${fs.readFileSync(path.join(KEYS_DIR, 'oracle.json'), 'utf-8')}`);
  console.log(`HISAAB_FUNDER_KEYPAIR=${fs.readFileSync(path.join(KEYS_DIR, 'funder.json'), 'utf-8')}`);
  console.log(`HISAAB_CONTRACTOR_PUBKEY=${contractor.publicKey.toBase58()}`);
  console.log(`NEXT_PUBLIC_HISAAB_PROGRAM_ID=${programId.toBase58()}`);
  console.log(`SOL_INR_RATE=20000`);

  const programFile = fs
    .readFileSync(programKeyFile, 'utf-8')
    .replace(/\s+/g, '');
  console.log(`\n(Program keypair lives at contracts/hisaab/hisaab-keypair.json — keep it stable to preserve the program id.)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
