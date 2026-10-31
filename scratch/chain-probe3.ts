import fs from 'fs';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, setProvider } from '@coral-xyz/anchor';

async function main() {
  const idl = JSON.parse(fs.readFileSync('contracts/hisaab/target/idl/hisaab.json', 'utf-8'));
  const connection = new Connection('http://192.168.58.213:8899', 'confirmed');
  const provider = new AnchorProvider(connection, {} as any, { commitment: 'confirmed' });
  setProvider(provider);
  const program = new Program(idl as any, provider);
  const pda = new PublicKey('9Tityi9T53C8Cr1ADAYzuEVaEbbAApNXKVU3SLfghwwJ');
  try {
    const acc = await (program as any).account.report.fetch(pda);
    console.log('DECODE OK:', JSON.stringify({
      status: acc.status, confirmations: acc.confirmations, severity: acc.severity,
      lat: String(acc.latMicro), createdAt: String(acc.createdAt),
    }));
  } catch (e: any) {
    console.log('DECODE ERROR:', e.message.slice(0, 200));
  }
  process.exit(0);
}
main();
