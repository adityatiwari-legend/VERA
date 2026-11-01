import { Pool } from 'pg';

async function main() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:postgrespassword@127.0.0.1:5433/fundtrail',
    connectionTimeoutMillis: 3000
  });

  try {
    const users = await pool.query('SELECT id, name, email, role, contractor_status FROM users');
    console.log('--- Users in OLD Docker Postgres ---');
    console.table(users.rows);

    const assignments = await pool.query('SELECT * FROM contractor_assignments');
    console.log('--- Assignments in OLD Docker Postgres ---');
    console.table(assignments.rows);

    const escrows = await pool.query('SELECT * FROM hisaab_escrows');
    console.log('--- Escrows in OLD Docker Postgres ---');
    console.table(escrows.rows);

    const reports = await pool.query('SELECT id, address_label, severity, status FROM pothole_reports');
    console.log('--- Reports in OLD Docker Postgres ---');
    console.table(reports.rows);
  } catch (err) {
    console.log('Old Docker Postgres check error:', err.message);
  } finally {
    await pool.end();
  }
}

main();

