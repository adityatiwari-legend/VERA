/**
 * Bootstrap an ADMIN account (the only role that cannot self-register and the
 * replacement for the old seed-only ADMIN). Creates no other data.
 * Run: ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run admin:bootstrap
 * Re-running with the same email resets that account's password/role.
 */
import { hashPassword } from '../lib/auth';
import { query, db } from '../lib/db';

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Platform Admin';

  if (!email || !email.includes('@')) {
    console.error('✖ ADMIN_EMAIL is required (a valid email address).');
    console.error('  Example: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=... npm run admin:bootstrap');
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error('✖ ADMIN_PASSWORD is required (minimum 8 characters).');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const res = await query<{ id: string; email: string }>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'ADMIN')
     ON CONFLICT (email) DO UPDATE
       SET name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           role = 'ADMIN'
     RETURNING id, email`,
    [name, email, passwordHash]
  );

  console.log(`✓ Admin ready: ${res.rows[0].email} (id ${res.rows[0].id})`);
  await db.end();
}

main().catch(async (err) => {
  console.error('✖ Admin bootstrap failed:', err instanceof Error ? err.message : err);
  await db.end().catch(() => {});
  process.exit(1);
});
