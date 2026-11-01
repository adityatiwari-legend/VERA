import { query } from '../lib/db';

async function main() {
  try {
    const users = await query('SELECT id, name, email, role, contractor_status, solana_pubkey FROM users');
    console.log('--- USERS IN DB ---');
    console.log(users.rows);

    const assignments = await query('SELECT * FROM contractor_assignments');
    console.log('--- ASSIGNMENTS IN DB ---');
    console.log(assignments.rows);

    const reports = await query('SELECT id, address_label, status FROM pothole_reports');
    console.log('--- REPORTS IN DB ---');
    console.log(reports.rows);

    const escrows = await query('SELECT * FROM hisaab_escrows');
    console.log('--- ESCROWS IN DB ---');
    console.log(escrows.rows);
  } catch (e) {
    console.error('Error running check-contractor:', e);
  } finally {
    process.exit(0);
  }
}

main();
