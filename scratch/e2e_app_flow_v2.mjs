// E2E v2 — corrected assertions:
// - confirm with bearer is EXPECTED to 400 "You cannot confirm your own report"
//   (proves bearer auth reached the business rule on the v1 route).
// - cleanup keeps the user (append-only audit_logs FK pins it) but renames it.
const BASE = process.env.BASE || 'http://localhost:3001';
const stamp = Date.now();
const email = `flowtest.${stamp}@example.com`;
const password = 'Password123!';
let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`);
  if (!ok) failures++;
};

const jpegB64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
  'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
  'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==';

const reg = await fetch(`${BASE}/api/auth/register`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'Flow Test 2', email, password, role: 'USER' }),
});
check('register USER', reg.status === 201, `status=${reg.status}`);

const login = await fetch(`${BASE}/api/v1/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const { token } = await login.json();
check('v1 login → bearer token', login.status === 200 && token?.startsWith('vera_'));

const form = new FormData();
form.set('latitude', '26.853200');
form.set('longitude', '75.761800');
form.set('address_label', 'E2E Flow Test Road 2, Jaipur');
form.set('description', 'E2E v2 simulated mobile report');
form.set('severity', 'HIGH');
form.set('size_estimate_cm', '55');
form.set('client_submission_id', `client-sub-${stamp}`);
form.append('photo', new Blob([Buffer.from(jpegB64, 'base64')], { type: 'image/jpeg' }), 'evidence.jpg');

const reportRes = await fetch(`${BASE}/api/v1/hisaab/reports`, {
  method: 'POST',
  headers: { authorization: `Bearer ${token}` },
  body: form,
});
const reportBody = await reportRes.json().catch(() => ({}));
const reportId = reportBody?.report?.id;
check('POST /v1/hisaab/reports → 201', reportRes.status === 201 && !!reportId, `err=${reportBody?.error ?? ''}`);

// Confirm with the SAME bearer user → business rule 400 (auth itself passed)
const confirm = await fetch(`${BASE}/api/v1/hisaab/reports/${reportId}/confirm`, {
  method: 'POST',
  headers: { authorization: `Bearer ${token}` },
});
const confirmBody = await confirm.json().catch(() => ({}));
check(
  'v1 confirm route: bearer auth OK, self-confirm blocked',
  confirm.status === 400 && /cannot confirm your own/i.test(confirmBody?.error ?? ''),
  `status=${confirm.status} err=${confirmBody?.error ?? ''}`
);

// FLAG vote via the dual-stack web route with bearer
const vote = await fetch(`${BASE}/api/hisaab/reports/${reportId}/vote`, {
  method: 'POST',
  headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: JSON.stringify({ vote_type: 'REJECT', reason: 'e2e reject' }),
});
const voteBody = await vote.json().catch(() => ({}));
check('REJECT vote with bearer', vote.status === 200 && voteBody?.votes?.REJECT === 1, `votes=${JSON.stringify(voteBody?.votes)}`);

// Web page renders it
const page = await fetch(`${BASE}/hisaab`);
const pageHtml = await page.text();
check('/hisaab page renders the report', page.status === 200 && pageHtml.includes('E2E Flow Test Road 2, Jaipur'));

// Admin complaints display query (incl. new tallies)
const { default: pg } = await import('pg');
const { config } = await import('dotenv');
config({ path: '.env.local' });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const adminSql = await (await import('node:fs/promises')).readFile('scratch/admin_complaints_check.sql', 'utf8');
const adminRow = (await client.query(adminSql, ['ALL'])).rows.find((r) => r.id === reportId);
check(
  '/admin/complaints query: row + tallies',
  !!adminRow && adminRow.confirmations === 0 && adminRow.rejects === 1 && adminRow.flags === 0,
  adminRow ? `conf=${adminRow.confirmations} rej=${adminRow.rejects} flag=${adminRow.flags}` : 'row missing'
);

// Cleanup: delete report + children + token; user is pinned by append-only
// audit_logs FK → rename it so it is clearly identifiable as a test artifact.
const media = await client.query(`SELECT media_file_path FROM pothole_reports WHERE id=$1::uuid`, [reportId]);
for (const stmt of [
  [`DELETE FROM roughness_readings WHERE report_id=$1::uuid`, [reportId]],
  [`DELETE FROM pothole_confirmations WHERE report_id=$1::uuid`, [reportId]],
  [`DELETE FROM pothole_votes WHERE report_id=$1::uuid`, [reportId]],
  [`DELETE FROM pothole_reports WHERE id=$1::uuid`, [reportId]],
  [`DELETE FROM api_tokens WHERE user_id=(SELECT id FROM users WHERE email=$2)`, [reportId, email]],
  [`UPDATE users SET name='E2E Flow Test (leftover, safe to delete)' WHERE email=$2`, [reportId, email]],
]) {
  await client.query(stmt[0], stmt[1]);
}
const left = await client.query(`SELECT COUNT(*)::int AS n FROM pothole_reports WHERE id=$1::uuid`, [reportId]);
check('cleanup removed test report', left.rows[0].n === 0);
await client.end();

// remove orphaned media file from disk
if (media.rows[0]?.media_file_path) {
  const { unlink } = await import('node:fs/promises');
  const p = media.rows[0].media_file_path;
  if (!p.includes('..')) await unlink(p).catch(() => {});
}

// also annotate the v1 leftover user
process.exit(failures === 0 ? 0 : 1);
