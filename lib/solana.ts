import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  TransactionSignature,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Program, AnchorProvider, BN, setProvider } from '@coral-xyz/anchor';
import { AppError } from './permissions';
import { getCluster } from './explorer';

/**
 * Hisaab on-chain layer (Solana devnet).
 *
 * Trust model (stated honestly in the UI and pitch): the escrow program is
 * neutral — funds live in a PDA vault and can only move to the contractor
 * stage-by-stage or back to the funder. Stage releases are gated by an
 * "oracle" authority, which is this server's keypair acting on verified
 * Gemini + citizen evidence. Citizen confirmations are signed by per-citizen
 * keypairs and deduped on-chain via confirmation PDAs.
 */

export const SOL_INR_RATE = Number(process.env.SOL_INR_RATE || 20000); // ₹ per SOL for demo math
export const REQUIRED_CONFIRMATIONS = 3;
export const HOLD_DAYS = 30;

const RPC_URL = process.env.HISAAB_RPC_URL || 'https://api.devnet.solana.com';
// Default = the committed deploy keypair's program id (contracts/hisaab/target/
// deploy/hisaab-keypair.json), so a fresh deployment reports the Solana
// integration as configured without extra env wiring. Override via env if you
// redeploy the program under a different id.
const PROGRAM_ID_STR =
  process.env.NEXT_PUBLIC_HISAAB_PROGRAM_ID ||
  'AUH7tYQJFXjya5wgu9APf1Q5qDs8G9jKEEzxjA1VpxMw';
const PLACEHOLDER_ID = 'Hisaab11111111111111111111111111111111111';

const IDL_PATH = path.resolve(process.cwd(), 'contracts', 'hisaab', 'target', 'idl', 'hisaab.json');

let connection: Connection | null = null;
let program: Program | null = null;
let programId: PublicKey | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(RPC_URL, 'confirmed');
  }
  return connection;
}

function loadIdl(): any | null {
  try {
    if (fs.existsSync(IDL_PATH)) {
      return JSON.parse(fs.readFileSync(IDL_PATH, 'utf-8'));
    }
  } catch (err) {
    console.error('Failed to load Hisaab IDL:', err);
  }
  return null;
}

export function isSolanaProgramConfigured(): boolean {
  if (PROGRAM_ID_STR === PLACEHOLDER_ID) return false;
  if (!loadIdl()) return false;
  return true;
}

export interface SolanaStatus {
  rpcUrl: string;
  network: string;
  programId: string | null;
  oracle: string | null;
  idlLoaded: boolean;
}

export function getSolanaStatus(): SolanaStatus {
  return {
    rpcUrl: RPC_URL,
    network: getCluster(),
    programId: PROGRAM_ID_STR === PLACEHOLDER_ID ? null : PROGRAM_ID_STR,
    oracle: getOracleKeypair()?.publicKey.toBase58() ?? null,
    idlLoaded: Boolean(loadIdl()),
  };
}

/** Oracle = server-side authority that pushes verified decisions on-chain. */
let oracleKeypair: Keypair | null | undefined;

export function getOracleKeypair(): Keypair | null {
  if (oracleKeypair === undefined) {
    const raw = process.env.HISAAB_ORACLE_KEYPAIR;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        oracleKeypair = Keypair.fromSecretKey(Uint8Array.from(parsed));
      } catch {
        console.error('HISAAB_ORACLE_KEYPAIR is not a valid JSON keypair array.');
        oracleKeypair = null;
      }
    } else {
      console.warn('HISAAB_ORACLE_KEYPAIR not set — Solana writes will fail until configured.');
      oracleKeypair = null;
    }
  }
  return oracleKeypair;
}

export function getFunderKeypair(): Keypair | null {
  const raw = process.env.HISAAB_FUNDER_KEYPAIR;
  if (!raw) return getOracleKeypair();
  try {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  } catch {
    return getOracleKeypair();
  }
}

function getProgram(): Program {
  if (program) return program;
  const idl = loadIdl();
  if (!idl) {
    throw new AppError('Hisaab program IDL not found — run `anchor build` in contracts/hisaab.', 503);
  }
  programId = new PublicKey(PROGRAM_ID_STR);
  // The provider wallet is the oracle relayer: it pays fees and signs
  // server-side. Instruction-specific signers (citizen wallets, funder) are
  // attached per-call via `.signers([...])`.
  const oracle = getOracleKeypair();
  const provider = new AnchorProvider(
    getConnection(),
    {
      publicKey: oracle?.publicKey ?? PublicKey.default,
      signTransaction: async (tx: any) => {
        if (oracle) tx.partialSign(oracle);
        return tx;
      },
      signAllTransactions: async (txs: any[]) => {
        for (const tx of txs) {
          if (oracle) tx.partialSign(oracle);
        }
        return txs;
      },
    } as any,
    { commitment: 'confirmed' }
  );
  setProvider(provider);
  program = new Program(idl as any, provider);
  return program;
}

// ---------------------------------------------------------------------------
// Seeds / PDAs
// ---------------------------------------------------------------------------

/** 16-byte report seed from a UUID string. */
export function seedFromId(id: string): Buffer {
  const hex = id.replace(/-/g, '');
  if (hex.length !== 32) throw new AppError('Report id is not a UUID', 400);
  return Buffer.from(hex, 'hex');
}

export function mediaHashBytes32(sha256Hex: string): Buffer {
  return Buffer.from(sha256Hex, 'hex');
}

export function reportPda(seed: Buffer): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('report'), seed],
    new PublicKey(PROGRAM_ID_STR)
  )[0];
}

export function escrowPda(seed: Buffer): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), seed],
    new PublicKey(PROGRAM_ID_STR)
  )[0];
}

export function vaultPda(seed: Buffer): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), seed],
    new PublicKey(PROGRAM_ID_STR)
  )[0];
}

export function confirmPda(seed: Buffer, confirmer: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('confirm'), seed, confirmer.toBuffer()],
    new PublicKey(PROGRAM_ID_STR)
  )[0];
}

export function inrToLamports(amountInr: number): number {
  return Math.round((amountInr / SOL_INR_RATE) * LAMPORTS_PER_SOL);
}

export function lamportsToInr(lamports: number): number {
  return Math.round((lamports / LAMPORTS_PER_SOL) * SOL_INR_RATE);
}

function latLngMicro(lat: number, lng: number): [BN, BN] {
  return [new BN(Math.round(lat * 1e6)), new BN(Math.round(lng * 1e6))];
}

/**
 * RPC calls retry once on transient transport failures ("fetch failed") —
 * the localnet validator restarting must not silently degrade a user action
 * to ledger-only.
 */
async function latestSignatureFor(pda: PublicKey): Promise<TransactionSignature | null> {
  try {
    const sigs = await getConnection().getSignaturesForAddress(pda, { limit: 5 });
    return sigs[0]?.signature ?? null;
  } catch {
    return null;
  }
}

async function withRpcRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message || err) + ' ' + String(err?.cause?.message || '');
      // WSL NAT drops connections between Windows and the validator now and
      // then — back off and retry before degrading a user action to ledger-only.
      if (/fetch failed|ECONNREFUSED|ECONNRESET|network|timeout/i.test(msg)) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------
// Instruction helpers (server-signed)
// ---------------------------------------------------------------------------

export async function onChainInitReport(params: {
  reportId: string;
  latitude: number;
  longitude: number;
  severity: number; // 0 LOW, 1 MEDIUM, 2 HIGH
  mediaSha256: string;
  reporterPubkey?: string;
}): Promise<{ signature: TransactionSignature; pda: string } | null> {
  if (!isSolanaProgramConfigured() || !getOracleKeypair()) return null;
  const seed = seedFromId(params.reportId);
  const pda = reportPda(seed);
  const [latBn, lngBn] = latLngMicro(params.latitude, params.longitude);
  try {
    const tx: any = await withRpcRetry(async () => (getProgram() as any)
      .methods
      .initReport([...seed], latBn, lngBn, params.severity, [...mediaHashBytes32(params.mediaSha256)])
      .accounts({
        report: pda,
        reporter: getOracleKeypair()!.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([getOracleKeypair()!])
      .rpc());
    return { signature: tx, pda: pda.toBase58() };
  } catch (err: any) {
    // Retry after a transport failure can hit "already in use" — the report
    // DID land. Recover the real signature instead of degrading to ledger-only.
    if (/already in use/i.test(String(err?.message))) {
      const sig = await latestSignatureFor(pda);
      if (sig) return { signature: sig, pda: pda.toBase58() };
    }
    throw err;
  }
}

export async function onChainConfirmReport(params: {
  reportId: string;
  confirmerKeypair: Keypair;
}): Promise<{ signature: TransactionSignature; pda: string } | null> {
  if (!isSolanaProgramConfigured() || !getOracleKeypair()) return null;
  const seed = seedFromId(params.reportId);
  const pda = confirmPda(seed, params.confirmerKeypair.publicKey);
  try {
    const tx: any = await withRpcRetry(async () => (getProgram() as any)
      .methods
      .confirmReport([...seed])
      .accounts({
        report: reportPda(seed),
        confirmation: pda,
        confirmer: params.confirmerKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([params.confirmerKeypair])
      .rpc());
    return { signature: tx, pda: pda.toBase58() };
  } catch (err: any) {
    if (/already in use/i.test(String(err?.message))) {
      const sig = await latestSignatureFor(pda);
      if (sig) return { signature: sig, pda: pda.toBase58() };
    }
    throw err;
  }
}

export async function onChainInitEscrow(params: {
  reportId: string;
  contractor: PublicKey;
  stageAmountsInr: [number, number, number];
  holdSeconds?: number;
}): Promise<{ signature: TransactionSignature; escrow: string; vault: string } | null> {
  if (!isSolanaProgramConfigured() || !getFunderKeypair()) return null;
  const seed = seedFromId(params.reportId);
  const esc = escrowPda(seed);
  const vault = vaultPda(seed);
  const lamports = params.stageAmountsInr.map((a) => new BN(inrToLamports(a)));
  const holdUntil = new BN(
    Math.floor(Date.now() / 1000) + Math.max(Math.floor(params.holdSeconds ?? 0), 0)
  );
  try {
    const tx: any = await withRpcRetry(async () => (getProgram() as any)
      .methods
      .initEscrow([...seed], getOracleKeypair()!.publicKey, lamports, holdUntil)
      .accounts({
        report: reportPda(seed),
        escrow: esc,
        vault,
        funder: getFunderKeypair()!.publicKey,
        contractor: params.contractor,
        systemProgram: SystemProgram.programId,
      })
      .signers([getFunderKeypair()!])
      .rpc());
    return { signature: tx, escrow: esc.toBase58(), vault: vault.toBase58() };
  } catch (err: any) {
    if (/already in use/i.test(String(err?.message))) {
      const sig = await latestSignatureFor(esc);
      if (sig) return { signature: sig, escrow: esc.toBase58(), vault: vault.toBase58() };
    }
    throw err;
  }
}

export async function onChainReleaseStage(params: {
  reportId: string;
  stage: number; // 1-based
}): Promise<{ signature: TransactionSignature } | null> {
  if (!isSolanaProgramConfigured() || !getOracleKeypair()) return null;
  const seed = seedFromId(params.reportId);
  const tx: any = await withRpcRetry(async () => (getProgram() as any)
    .methods
    .releaseStage(params.stage)
    .accounts({
      report: reportPda(seed),
      escrow: escrowPda(seed),
      vault: vaultPda(seed),
      oracle: getOracleKeypair()!.publicKey,
      contractor: (await fetchEscrowOnChain(seed))?.contractor ?? getFunderKeypair()!.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([getOracleKeypair()!])
    .rpc());
  return { signature: tx };
}

async function fetchEscrowOnChain(seed: Buffer): Promise<{
  contractor: PublicKey;
  funder: PublicKey;
  oracle: PublicKey;
  released_stage: number;
} | null> {
  try {
    const acc = await (getProgram() as any).account.escrow.fetch(escrowPda(seed));
    return acc ?? null;
  } catch {
    return null;
  }
}

/**
 * Pull the remaining vault balance back to the funder. The server signs as
 * the oracle (the program allows funder OR oracle as authority); PG marks the
 * escrow REFUNDED.
 */
export async function onChainRefundEscrow(params: {
  reportId: string;
}): Promise<{ signature: TransactionSignature } | null> {
  if (!isSolanaProgramConfigured() || !getOracleKeypair()) return null;
  const seed = seedFromId(params.reportId);
  const escrowState = await fetchEscrowOnChain(seed);
  const tx: any = await withRpcRetry(async () => (getProgram() as any)
    .methods
    .refund()
    .accounts({
      report: reportPda(seed),
      escrow: escrowPda(seed),
      vault: vaultPda(seed),
      authority: getOracleKeypair()!.publicKey,
      funder: escrowState?.funder ?? getFunderKeypair()!.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([getOracleKeypair()!])
    .rpc());
  return { signature: tx };
}

// ---------------------------------------------------------------------------
// Deployment honesty
// ---------------------------------------------------------------------------

let deployedCheck: { deployed: boolean; checkedAt: number } | null = null;

/** True when the program account actually exists on the current cluster. */
export async function isProgramDeployed(): Promise<boolean> {
  if (!isSolanaProgramConfigured()) return false;
  if (deployedCheck && Date.now() - deployedCheck.checkedAt < 60_000) return deployedCheck.deployed;
  let deployed = false;
  try {
    const info = await getConnection().getAccountInfo(new PublicKey(PROGRAM_ID_STR));
    deployed = Boolean(info);
  } catch {
    deployed = false;
  }
  deployedCheck = { deployed, checkedAt: Date.now() };
  return deployed;
}

// ---------------------------------------------------------------------------
// Reads + explorer helpers
// ---------------------------------------------------------------------------

export async function fetchReportOnChain(reportId: string): Promise<any | null> {
  if (!isSolanaProgramConfigured()) return null;
  try {
    return await (getProgram() as any).account.report.fetch(reportPda(seedFromId(reportId)));
  } catch {
    return null;
  }
}

export async function fetchEscrowState(reportId: string): Promise<any | null> {
  if (!isSolanaProgramConfigured()) return null;
  return fetchEscrowOnChain(seedFromId(reportId));
}

export { getCluster, explorerAccountUrl, explorerTxUrl } from './explorer';

export { LAMPORTS_PER_SOL };

/** Random devnet keypair as JSON array (for citizen wallets). */
export function generateKeypairJson(): { pubkey: string; keypairJson: string } {
  const kp = Keypair.generate();
  return {
    pubkey: kp.publicKey.toBase58(),
    keypairJson: JSON.stringify(Array.from(kp.secretKey)),
  };
}

export function keypairFromJson(json: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(json)));
}

export async function requestAirdrop(pubkey: PublicKey, sol = 1): Promise<boolean> {
  try {
    const sig = await getConnection().requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
    const latest = await getConnection().getLatestBlockhash();
    await getConnection().confirmTransaction({ signature: sig, ...latest }, 'confirmed');
    return true;
  } catch (err) {
    console.error('Airdrop failed:', err);
    return false;
  }
}

export { LAMPORTS_PER_SOL as _LAMPORTS };
export const sha256OfBuffer = (buf: Buffer) => crypto.createHash('sha256').update(buf).digest('hex');
