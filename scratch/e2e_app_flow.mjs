// E2E replay of the Flutter app's fixed data flow against a local dev server.
// Every request mirrors what MLH-RoadProofxVera now sends after the fix.
const BASE = process.env.BASE || 'http://localhost:3001';
const stamp = Date.now();
const email = `flowtest.${stamp}@example.com`;
const password = 'Password123!';
let failures = 0;

function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`);
  if (!ok) failures++;
}

// Minimal 1x1 JPEG (same fallback bytes the app sends when no photo was captured)
const jpegB64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
  'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
  'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==';

const jsonHeaders = (token) => ({
  'content-type': 'application/json',
  ...(token ? { authorization: `Bearer ${token}` } : {}),
});

// 1. Register (app: POST /auth/register)
const reg = await fetch(`${BASE}/api/auth/register`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'Flow Test', email, password, role: 'USER' }),
});
check('register USER', reg.status === 201, `status=${reg.status} body=${(await reg.text()).slice(0, 120)}`);

// 2. v1 login (app: POST /v1/auth/login → { token, user })
const login = await fetch(`${BASE}/api/v1/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const loginBody = await login.json();
const token = loginBody?.token;
check('v1 login returns bearer token', login.status === 200 && typeof token === 'string' && token.startsWith('vera_'), `status=${login.status} token=${token ? token.slice(0, 10) + '…' : 'MISSING'}`);

// 3. Session validation (app: GET /v1/me)
const me = await fetch(`${BASE}/api/v1/me`, { headers: jsonHeaders(token) });
const meBody = await me.json();
check('GET /v1/me with bearer', me.status === 200 && meBody?.user?.email === email, `status=${me.status} email=${meBody?.user?.email}`);

// 4. Submit report (app: POST /v1/hisaab/reports, multipart + photo)
const form = new FormData();
form.set('latitude', '26.853200');
form.set('longitude', '75.761800');
form.set('address_label', 'E2E Flow Test Road, Jaipur');
form.set('description', 'E2E flow test pothole from simulated mobile client');
form.set('severity', 'MEDIUM');
form.set('size_estimate_cm', '40');
form.set('client_submission_id', `client-sub-${stamp}`);
form.append('photo', new Blob([Buffer.from(jpegB64, 'base64')], { type: 'image/jpeg' }), 'evidence.jpg');

const reportRes = await fetch(`${BASE}/api/v1/hisaab/reports`, {
  method: 'POST',
  headers: { authorization: `Bearer ${token}` },
  body: form,
});
const reportBody = await reportRes.json().catch(() => ({}));
const reportId = reportBody?.report?.id;
check('POST /v1/hisaab/reports (bearer, multipart)', reportRes.status === 201 && !!reportId, `status=${reportRes.status} id=${reportId ?? 'MISSING'} err=${reportBody?.error ?? ''}`);

// 5. Report visible in the public list (web /hisaab reads the same table)
const list = await fetch(`${BASE}/api/v1/hisaab/reports?limit=50`);
const listBody = await list.json();
const found = (listBody?.reports ?? []).some((r) => r.id === reportId);
check('report appears in list API', found, `total=${listBody?.total}`);

// 6. Web UI page renders it (server component reads DB directly)
const page = await fetch(`${BASE}/hisaab`);
const pageHtml = await page.text();
check('/hisaab page renders the report', page.status === 200 && pageHtml.includes('E2E Flow Test Road, Jaipur'));

// 7. Vote (app: POST /hisaab/reports/{id}/vote, bearer — dual-stack route)
const vote = await fetch(`${BASE}/api/hisaab/reports/${reportId}/vote`, {
  method: 'POST',
  headers: jsonHeaders(token),
  body: JSON.stringify({ vote_type: 'FLAG', reason: 'E2E flow test flag' }),
});
const voteBody = await vote.json().catch(() => ({}));
check('vote FLAG with bearer', vote.status === 200 && voteBody?.votes?.FLAG >= 1, `status=${vote.status} votes=${JSON.stringify(voteBody?.votes)}`);

// 8. Confirm (app: POST /v1/hisaab/reports/{id}/confirm, bearer)
const confirm = await fetch(`${BASE}/api/v1/hisaab/reports/${reportId}/confirm`, {
  method: 'POST',
  headers: jsonHeaders(token),
});
const confirmBody = await confirm.json().catch(() => ({}));
check('confirm with bearer (v1)', confirm.status === 200 && confirmBody?.confirmations >= 1, `status=${confirm.status} confirmations=${confirmBody?.confirmations} err=${confirmBody?.error ?? ''}`);

// 9. Roughness telemetry (app: POST /hisaab/roughness, bearer — dual-stack route)
const rough = await fetch(`${BASE}/api/hisaab/roughness`, {
  method: 'POST',
  headers: jsonHeaders(token),
  body: JSON.stringify({
    report_id: reportId,
    device_label: 'e2e-device',
    readings: [{ accel_z: 0.42, speed_kmh: 31.5, recorded_at: null }],
  }),
});
check('roughness telemetry with bearer', rough.status === 201, `status=${rough.status} body=${(await rough.text()).slice(0, 120)}`);

// 10. Admin complaints page SQL (display query incl. new disputes tallies)
const { default: pg } = await import('pg');
const { config } = await import('dotenv');
config({ path: '.env.local' });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const adminSql = await (await import('node:fs/promises')).readFile(
  'scratch/admin_complaints_check.sql', 'utf8'
);
const adminRes = await client.query(adminSql, ['ALL']);
const adminRow = adminRes.rows.find((r) => r.id === reportId);
check(
  '/admin/complaints query returns report + dispute tallies',
  !!adminRow && adminRow.rejects === 0 && adminRow.flags === 1 && adminRow.confirmations === 1,
  adminRow ? `confirmations=${adminRow.confirmations} rejects=${adminRow.rejects} flags=${adminRow.flags}` : 'row missing'
);
// cleanup
await client.query(
  `DELETE FROM roughness_readings WHERE report_id=$1::uuid;
   DELETE FROM pothole_confirmations WHERE report_id=$1::uuid;
   DELETE FROM pothole_votes WHERE report_id=$1::uuid;
   DELETE FROM pothole_reports WHERE id=$1::uuid;
   DELETE FROM api_tokens WHERE user_id=(SELECT id FROM users WHERE email=$2);
   DELETE FROM audit_logs WHERE actor_id=(SELECT id FROM users WHERE email=$2);
   DELETE FROM users WHERE email=$2;`,
  [reportId, email]
).catch(async (e) => {
  // multi-statement needs simple query protocol
  for (const stmt of [
    `DELETE FROM roughness_readings WHERE report_id='${reportId}'`,
    `DELETE FROM pothole_confirmations WHERE report_id='${reportId}'`,
    `DELETE FROM pothole_votes WHERE report_id='${reportId}'`,
    `DELETE FROM pothole_reports WHERE id='${reportId}'`,
    `DELETE FROM api_tokens WHERE user_id=(SELECT id FROM users WHERE email='${email}')`,
    `DELETE FROM audit_logs WHERE actor_id=(SELECT id FROM users WHERE email='${email}')`,
    `DELETE FROM users WHERE email='${email}'`,
  ]) {
    await client.query(stmt);
  }
});
const left = await client.query(`SELECT COUNT(*)::int AS n FROM pothole_reports WHERE id='${reportId}'`);
check('cleanup removed test data', left.rows[0].n === 0);
await client.end();

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
