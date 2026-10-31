/**
 * Tiger Data (TimescaleDB) setup: creates the roughness/agent-outcome
 * hypertables and prints a health summary.
 * Run: npm run tiger:setup
 */
import { ensureTigerSchema, isTigerConfigured, getPool } from '../lib/tiger';

async function main() {
  if (!isTigerConfigured()) {
    console.log('⚠  TIGER_DATABASE_URL is not set.');
    console.log('   1. Create a free Tiger Data service at https://tigerdata.com');
    console.log('   2. Add TIGER_DATABASE_URL=postgresql://... to .env.local');
    console.log('   3. Re-run: npm run tiger:setup');
    console.log('\nUntil then, time-series falls back to local Postgres tables (demo keeps working).');
    process.exit(0);
  }

  const ok = await ensureTigerSchema();
  if (!ok) {
    console.error('❌ Tiger Data schema setup failed — check the connection string.');
    process.exit(1);
  }

  const pool = getPool();
  const info = await pool!.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('roughness_readings')`
  );
  const ht = await pool!.query<{ hypertable_name: string }>(
    `SELECT hypertable_name FROM timescaledb_information.hypertables`
  );

  console.log('✅ Tiger Data ready');
  console.log('   tables:', info.rows.map((r: { table_name: string }) => r.table_name).join(', '));
  console.log('   hypertables:', ht.rows.map((r: { hypertable_name: string }) => r.hypertable_name).join(', '));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
