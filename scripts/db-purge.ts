/**
 * Purge ALL application data while keeping the schema and migration
 * bookkeeping (schema_migrations). Irreversible — intended for resetting a
 * dev/demo database to a truly empty state.
 * Run:   npm run db:purge            → dry run, lists the tables
 *        npm run db:purge -- --yes   → actually TRUNCATE
 * Discovery is dynamic: every table in the public schema except
 * schema_migrations, so future migrations are covered automatically.
 */
import { query, db } from '../lib/db';

async function main() {
  const yes = process.argv.includes('--yes');

  const res = await query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename <> 'schema_migrations'
     ORDER BY tablename`
  );
  const tables = res.rows.map((r) => r.tablename);

  if (tables.length === 0) {
    console.log('No tables found — nothing to purge.');
    await db.end();
    return;
  }

  if (!yes) {
    console.log(`DRY RUN — ${tables.length} tables would be truncated:`);
    console.log('  ' + tables.join(', '));
    console.log('\nRe-run with --yes to actually purge: npm run db:purge -- --yes');
    await db.end();
    return;
  }

  await query(`TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
  console.log(`✓ Purged ${tables.length} tables — database is empty (schema preserved).`);

  try {
    const { isTigerConfigured } = await import('../lib/tiger');
    if (isTigerConfigured()) {
      console.log('⚠ TIGER_DATABASE_URL is set — roughness_readings in the remote Tiger Data service were NOT purged.');
    }
  } catch {
    // tiger module unavailable — local-only deployment, nothing to note
  }

  await db.end();
}

main().catch(async (err) => {
  console.error('✖ Purge failed:', err instanceof Error ? err.message : err);
  await db.end().catch(() => {});
  process.exit(1);
});
