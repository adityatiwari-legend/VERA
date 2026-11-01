import { query } from '../lib/db';
import { isTigerConfigured, getPool } from '../lib/tiger';

async function main() {
  console.log('--- Checking TigerDB / Timescale Cloud ---');
  
  // 1. Connection info
  const conn = await query<{ current_database: string; current_user: string; version: string }>(
    'SELECT current_database(), current_user, version()'
  );
  console.log('Database:', conn.rows[0].current_database);
  console.log('User:', conn.rows[0].current_user);
  console.log('Engine Version:', conn.rows[0].version.split(' ')[0], conn.rows[0].version.split(' ')[1]);

  // 2. All tables created by migrations
  const tables = await query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables 
     WHERE table_schema = 'public' 
     ORDER BY table_name ASC`
  );
  console.log('\n--- Migrated Tables (' + tables.rows.length + ' total) ---');
  console.log(tables.rows.map(r => r.table_name).join(', '));

  // 3. Check Hypertables (Tiger Data / Timescale feature)
  const hypertables = await query<{ hypertable_name: string }>(
    'SELECT hypertable_name FROM timescaledb_information.hypertables'
  );
  console.log('\n--- Timescale Hypertables ---');
  console.log(hypertables.rows.map(r => r.hypertable_name).join(', '));

  // 4. Sample record check (e.g. bootstrapped admin user)
  const users = await query<{ id: string; email: string; role: string; created_at: string }>(
    'SELECT id, email, role, created_at FROM users'
  );
  console.log('\n--- Bootstrapped Users in TigerDB ---');
  console.table(users.rows);

  process.exit(0);
}

main().catch(err => {
  console.error('Check failed:', err);
  process.exit(1);
});
