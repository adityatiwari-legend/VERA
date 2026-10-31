import { getProgram, reportPda, seedFromId, getConnection } from '../lib/solana';
import { PublicKey } from '@solana/web3.js';

async function main() {
  const pda = new PublicKey('9Tityi9T53C8Cr1ADAYzuEVaEbbAApNXKVU3SLfghwwJ');
  try {
    const acc = await (getProgram() as any).account.report.fetch(pda);
    console.log('OK:', JSON.stringify({ status: acc.status, confirmations: acc.confirmations }, (_, v) => typeof v === 'bigint' ? String(v) : v));
  } catch (e: any) {
    console.log('FETCH ERROR:', e.message);
    // try raw account info to see if the account exists at all
    const info = await getConnection().getAccountInfo(pda);
    console.log('account exists:', Boolean(info), info?.data.length, 'bytes, owner:', info?.owner.toBase58().slice(0, 8));
  }
  process.exit(0);
}
main();
