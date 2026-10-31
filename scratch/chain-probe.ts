import { fetchReportOnChain, isSolanaProgramConfigured, getConnection } from '../lib/solana';
import { query } from '../lib/db';

async function main() {
  console.log('configured:', isSolanaProgramConfigured());
  console.log('rpc:', getConnection().rpcEndpoint);
  const reports = await query<any>(
    `SELECT id, solana_report_pda FROM pothole_reports WHERE solana_report_pda IS NOT NULL ORDER BY created_at DESC LIMIT 1`
  );
  const r = reports.rows[0];
  console.log('report:', r?.id, 'pda:', r?.solana_report_pda);
  if (!r) return process.exit(0);
  try {
    const acc = await fetchReportOnChain(r.id);
    console.log('fetched:', acc ? { status: acc.status, confirmations: acc.confirmations, lat: String(acc.latMicro) } : null);
  } catch (e: any) {
    console.log('fetch threw:', e.message);
  }
  process.exit(0);
}
main();
