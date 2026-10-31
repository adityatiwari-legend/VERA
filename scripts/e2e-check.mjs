/**
 * VERA end-to-end verification — exercises the real product loops against the
 * running dev server + local chains.
 *
 * Covers: health, role whitelist, login/nav per role, middleware gates,
 * Hisaab loop (report → confirm×3 → fund request → sanction → assign →
 * accept → escrow → repair → stage 1 → fast-forward 2/3 → PAID → refund-ready),
 * VERA loop (org campaign → demo donation → milestone → proof w/ Gemini OCR →
 * auditor approve → release request → 2-of-3 signs → execute → audit chain),
 * notifications, /api/v1 mobile auth.
 *
 * Usage: node scripts/e2e-check.mjs [baseUrl]
 */
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const BASE = process.argv[2] || 'http://localhost:3000';

// Self-sufficient: regenerate the test images when missing (needs Python+Pillow).
for (const f of ['scratch/e2e-before.jpg', 'scratch/e2e-after.jpg', 'scratch/e2e-invoice.jpg']) {
  if (!existsSync(f)) {
    const r = spawnSync('python', ['scripts/e2e-images.py'], { stdio: 'inherit' });
    if (r.status !== 0) {
      console.error('Failed to generate E2E images (python + Pillow required)');
      process.exit(1);
    }
    break;
  }
}

let pass = 0;
let fail = 0;
const failures = [];

function ok(name, cond, extra = '') {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    failures.push(name + (extra ? ` — ${extra}` : ''));
    console.log(`  ❌ ${name} ${extra}`);
  }
}

const jars = new Map();
async function api(jar, path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const cookie = jars.get(jar);
  if (cookie) headers.cookie = cookie;
  if (opts.body && !(opts.body instanceof FormData) && !headers['content-type']) {
    headers['content-type'] = 'application/json';
  }
  const res = await fetch(BASE + path, { ...opts, headers, redirect: 'manual' });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (setCookie.length) {
    const existing = (jars.get(jar) || '').split('; ').filter(Boolean);
    for (const c of setCookie) {
      const [pair] = c.split(';');
      const [k] = pair.split('=');
      const without = existing.filter((e) => !e.startsWith(k + '='));
      without.push(pair);
      jars.set(jar, without.join('; '));
    }
  }
  let body = null;
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, headers: res.headers };
}

async function login(jar, email, password = 'Password123!') {
  const r = await api(jar, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return r;
}

console.log(`\n=== VERA E2E against ${BASE} ===\n`);

// ---------------------------------------------------------------- 1. Health
console.log('1. Platform health');
{
  const r = await api('anon', '/api/health');
  ok('health ok', r.status === 200 && r.body.status === 'ok');
  ok('database connected', r.body.integrations?.database === true);
  ok('gemini configured', r.body.integrations?.gemini_vision === true);
  ok('solana configured', r.body.integrations?.solana_program === true);
}

// ------------------------------------------------- 2. Registration security
console.log('\n2. Registration security');
{
  const r1 = await api('anon', '/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Evil', email: `evil${Date.now()}@x.com`, password: 'password123', role: 'ADMIN' }),
  });
  ok('ADMIN self-registration rejected', r1.status === 400);
  const r2 = await api('anon', '/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Evil', email: `evil2${Date.now()}@x.com`, password: 'password123', role: 'AUDITOR' }),
  });
  ok('AUDITOR self-registration rejected', r2.status === 400);
}

// ---------------------------------------------------------------- 3. Logins
console.log('\n3. Role logins + nav');
{
  const admin = await login('admin', 'admin@fundtrail.org');
  ok('admin login', admin.status === 200 && admin.body.user?.role === 'ADMIN');
  const org = await login('org', 'ngo@fundtrail.org');
  ok('organization login', org.status === 200 && org.body.user?.role === 'ORGANIZATION');
  const auditor = await login('auditor', 'auditor@fundtrail.org');
  ok('auditor login', auditor.status === 200 && auditor.body.user?.role === 'AUDITOR');
  const user = await login('user', 'donor@fundtrail.org');
  ok('user login', user.status === 200 && user.body.user?.role === 'USER');
  const contractor = await login('contractor', 'thaker@vera.org');
  ok('contractor login', contractor.status === 200 && contractor.body.user?.role === 'CONTRACTOR');

  const navA = await api('admin', '/api/nav');
  ok('admin nav has console + complaints', JSON.stringify(navA.body.items || []).includes('/admin/complaints'));
  const navU = await api('user', '/api/nav');
  ok('user nav has street register', JSON.stringify(navU.body.items || []).includes('/hisaab'));

  // middleware gates
  const anonAdmin = await api('anon', '/admin');
  ok('anon /admin redirected to login', anonAdmin.status === 307 && String(anonAdmin.headers.get('location')).includes('/login'));
  const userToAdmin = await api('user', '/admin');
  ok('USER bounced from /admin', userToAdmin.status === 307);
}

// ------------------------------------------------------------- 4. Hisaab E2E
console.log('\n4. Hisaab citizen → government → contractor loop');
let reportId = null;
{
  const stamp = Date.now();
  // 4.1 three citizens report? Only one report needed; citizens 2/3 confirm.
  const fd = new FormData();
  fd.append('latitude', '26.9142');
  fd.append('longitude', '75.7891');
  fd.append('address_label', `E2E Test Road ${stamp}, Jaipur`);
  fd.append('description', 'Deep dangerous pothole created by the automated E2E check');
  const img = readFileSync('scratch/e2e-before.jpg');
  fd.append('photo', new Blob([img], { type: 'image/jpeg' }), 'e2e-before.jpg');

  const create = await api('user', '/api/hisaab/reports', { method: 'POST', body: fd });
  ok('report created', create.status === 201, JSON.stringify(create.body).slice(0, 120));
  reportId = create.body?.report?.id;
  ok('report id returned', Boolean(reportId));

  // contractor binds payout wallet (must exist before escrow)
  const wallet = await api('contractor', '/api/auth/wallet/solana', {
    method: 'POST',
    body: JSON.stringify({ pubkey: 'GdWeyhwVfQj7sqGT4RigiMhT513K9BnGMyQvxk4Cifsr' }),
  });
  ok('contractor payout wallet bound', wallet.status === 200);

  // 4.2 confirmations from 2 more distinct users (reporter cannot self-confirm)
  const c2 = await api('org', `/api/hisaab/reports/${reportId}/confirm`, { method: 'POST' });
  ok('confirmation 2 accepted', c2.status === 200 && c2.body.inserted === true, JSON.stringify(c2.body).slice(0, 100));
  const c3 = await api('auditor', `/api/hisaab/reports/${reportId}/confirm`, { method: 'POST' });
  ok('confirmation 3 accepted', c3.status === 200 && c3.body.inserted === true);
  const c4 = await api('contractor', `/api/hisaab/reports/${reportId}/confirm`, { method: 'POST' });
  ok('confirmation 4 flips to CONFIRMED', c4.status === 200 && c4.body.status === 'CONFIRMED', JSON.stringify(c4.body).slice(0, 100));
  const self = await api('user', `/api/hisaab/reports/${reportId}/confirm`, { method: 'POST' });
  ok('self-confirm blocked', self.status === 400);

  // 4.3 admin drafts + submits + approves + sanctions a fund request
  const fr = await api('admin', '/api/hisaab/fund-requests', {
    method: 'POST',
    body: JSON.stringify({
      title: `E2E ward repairs ${stamp}`,
      description: 'Automated E2E fund request for ward potholes.',
      department: 'PWD Jaipur (E2E)',
      requested_amount: 50000,
      report_ids: [reportId],
    }),
  });
  ok('fund request drafted', fr.status === 201, JSON.stringify(fr.body).slice(0, 120));
  const frId = fr.body?.fund_request?.id;
  const sub = await api('admin', `/api/hisaab/fund-requests/${frId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status: 'SUBMITTED' }),
  });
  ok('fund request submitted', sub.status === 200);
  const app = await api('admin', `/api/hisaab/fund-requests/${frId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status: 'APPROVED' }),
  });
  ok('fund request approved', app.status === 200);
  const san = await api('admin', `/api/hisaab/fund-requests/${frId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status: 'SANCTIONED', sanctioned_amount: 50000, gov_reference_no: `E2E-${stamp}` }),
  });
  ok('fund request sanctioned', san.status === 200);

  // 4.4 assign contractor → contractor accepts → escrow funded
  const assign = await api('admin', '/api/hisaab/assignments', {
    method: 'POST',
    body: JSON.stringify({ report_id: reportId, contractor_id: 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4' }),
  });
  ok('contractor assigned (OFFERED)', assign.status === 201, JSON.stringify(assign.body).slice(0, 120));
  const assignmentId = assign.body?.assignment?.id;

  const escrowTooEarly = await api('admin', '/api/hisaab/escrows', {
    method: 'POST',
    body: JSON.stringify({
      report_id: reportId,
      contractor_id: 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4',
      funder_label: `PWD Jaipur E2E ${stamp}`,
      stage1_amount: 20000,
      stage2_amount: 20000,
      stage3_amount: 10000,
      fund_request_id: frId,
    }),
  });
  ok('escrow blocked before acceptance', escrowTooEarly.status === 400);

  const accept = await api('contractor', `/api/hisaab/assignments/${assignmentId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ decision: 'ACCEPTED' }),
  });
  ok('contractor accepted job', accept.status === 200 && accept.body.assignment?.status === 'ACCEPTED');

  const escrow = await api('admin', '/api/hisaab/escrows', {
    method: 'POST',
    body: JSON.stringify({
      report_id: reportId,
      contractor_id: 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4',
      funder_label: `PWD Jaipur E2E ${stamp}`,
      funder_type: 'GOV_GRANT',
      fund_request_id: frId,
      stage1_amount: 20000,
      stage2_amount: 20000,
      stage3_amount: 10000,
    }),
  });
  ok('escrow funded after acceptance', escrow.status === 201, JSON.stringify(escrow.body).slice(0, 160));
  const escrowId = escrow.body?.escrow?.id;
  const hasChainTx = Boolean(escrow.body?.escrow?.solana_tx_hash);
  console.log(`     ↳ escrow ${escrowId} · on-chain tx: ${hasChainTx ? 'YES' : 'ledger-only'}`);

  // 4.5 contractor submits repair with after-photo + roughness
  const rough = await api('contractor', '/api/hisaab/roughness', {
    method: 'POST',
    body: JSON.stringify({
      report_id: reportId,
      device_label: 'e2e-drive-by',
      readings: Array.from({ length: 60 }, (_, i) => ({ accel_z: 0.4 + Math.sin(i / 5) * 0.15 })),
    }),
  });
  ok('roughness telemetry stored', rough.status === 201 || rough.status === 200, JSON.stringify(rough.body).slice(0, 100));

  const afterImg = readFileSync('scratch/e2e-after.jpg');
  const fd2 = new FormData();
  fd2.append('report_id', reportId);
  fd2.append('after_photo', new Blob([afterImg], { type: 'image/jpeg' }), 'e2e-after.jpg');
  const repair = await api('contractor', '/api/hisaab/repairs', { method: 'POST', body: fd2 });
  ok('repair submitted', repair.status === 201, JSON.stringify(repair.body).slice(0, 120));
  console.log(`     ↳ gemini: ${repair.body?.gemini_status} · roughness ok: ${repair.body?.roughness?.ok}`);
  if (repair.body?.verified === true) {
    ok('stage 1 auto-released by AI verification', true);
  } else {
    // human-in-the-loop: admin manually approves the repair
    const approve = await api('admin', `/api/hisaab/repairs/${repair.body?.submission?.id}/approve`, { method: 'POST' });
    ok('stage 1 released via admin manual approval', approve.status === 200, JSON.stringify(approve.body).slice(0, 140));
  }

  // contractor #2 must be rejected
  const strangerRepair = await api('user', '/api/hisaab/repairs', { method: 'POST', body: fd2 });
  ok('repair by non-contractor rejected', strangerRepair.status === 403 || strangerRepair.status === 401);

  // 4.6 demo fast-forward (DEMO_MODE=true) releases stages 2 and 3
  const ff2 = await api('admin', `/api/hisaab/escrows/${escrowId}/fast-forward`, {
    method: 'POST',
    body: JSON.stringify({ stage: 2 }),
  });
  ok('stage 2 released (demo fast-forward)', ff2.status === 200, JSON.stringify(ff2.body).slice(0, 140));
  const ff3 = await api('admin', `/api/hisaab/escrows/${escrowId}/fast-forward`, {
    method: 'POST',
    body: JSON.stringify({ stage: 3 }),
  });
  ok('stage 3 released → report PAID', ff3.status === 200 && ff3.body?.escrow?.status === 'COMPLETED');

  const detail = await api('anon', `/api/hisaab/reports/${reportId}`);
  ok('report reached PAID', detail.body?.report?.status === 'PAID');
  ok('assignment completed', detail.body?.assignment?.status === 'COMPLETED');
}

// -------------------------------------------------------------- 5. VERA E2E
console.log('\n5. VERA Core donation → proof → multisig release loop');
{
  const stamp = Date.now();
  // 5.1 org creates campaign (on-chain registration attempted against Hardhat)
  const camp = await api('org', '/api/campaigns', {
    method: 'POST',
    body: JSON.stringify({
      title: `E2E Water Access ${stamp}`,
      description: 'Automated E2E campaign for clean water access verification.',
      target_amount: 100000,
      beneficiary: 'E2E Village Beneficiaries',
      status: 'ACTIVE',
    }),
  });
  ok('campaign created', camp.status === 201, JSON.stringify(camp.body).slice(0, 140));
  const campaignId = camp.body?.campaign?.id ?? camp.body?.id;
  console.log(`     ↳ campaign ${campaignId} · chain status: ${camp.body?.campaign?.blockchain_status ?? camp.body?.blockchain_status}`);

  // 5.2 demo donation (clearly labeled)
  const don = await api('user', `/api/campaigns/${campaignId}/donate`, {
    method: 'POST',
    body: JSON.stringify({ amount: 50000, purpose: 'E2E demo donation' }),
  });
  ok('demo donation recorded', don.status === 201 && don.body.donation?.is_demo !== false);

  // 5.3 milestone
  const ms = await api('org', `/api/campaigns/${campaignId}/milestones`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Borewell drilling',
      description: 'Drill and commission the community borewell with pump installation.',
      amount: 40000,
      proof_required: true,
    }),
  });
  ok('milestone created', ms.status === 201, JSON.stringify(ms.body).slice(0, 120));
  const milestoneId = ms.body?.milestone?.id ?? ms.body?.id;

  // start milestone
  const start = await api('org', `/api/milestones/${milestoneId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'IN_PROGRESS' }),
  });
  ok('milestone started', start.status === 200);

  // 5.4 proof submission with a REAL Gemini OCR invoice
  const inv = readFileSync('scratch/e2e-invoice.jpg');
  const fd3 = new FormData();
  fd3.append('claimed_amount', '40000');
  fd3.append('description', 'Electrical wiring invoice for classroom block');
  fd3.append('files', new Blob([inv], { type: 'image/jpeg' }), 'invoice-e2e.jpg');
  const proof = await api('org', `/api/milestones/${milestoneId}/proofs`, { method: 'POST', body: fd3 });
  ok('proof submitted', proof.status === 201, JSON.stringify(proof.body).slice(0, 160));
  const proofId = proof.body?.proof?.id;
  const aiStatus = proof.body?.verification?.ai_status;
  console.log(`     ↳ gemini OCR status: ${aiStatus} · extracted amount: ${proof.body?.verification?.extracted_amount}`);

  // 5.5 auditor approves
  const approve = await api('auditor', `/api/proofs/${proofId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ decision: 'APPROVE', comment: 'E2E: evidence consistent' }),
  });
  ok('auditor approved proof', approve.status === 200, JSON.stringify(approve.body).slice(0, 140));

  // 5.6 release request + 2-of-3 multisig
  const rr = await api('org', `/api/milestones/${milestoneId}/release-request`, {
    method: 'POST',
    body: JSON.stringify({ requested_amount: 40000, notes: 'E2E release' }),
  });
  const rrId = rr.body?.releaseRequest?.id ?? rr.body?.id;
  ok('release requested', (rr.status === 200 || rr.status === 201) && Boolean(rrId), JSON.stringify(rr.body).slice(0, 140));
  const sign1 = await api('auditor', `/api/release-requests/${rrId}/sign`, {
    method: 'POST',
    body: JSON.stringify({ comment: 'E2E auditor sign' }),
  });
  ok('auditor signed release', sign1.status === 200, JSON.stringify(sign1.body).slice(0, 140));
  const sign2 = await api('org', `/api/release-requests/${rrId}/sign`, {
    method: 'POST',
    body: JSON.stringify({ comment: 'E2E org sign' }),
  });
  ok('2-of-3 threshold reached', sign2.status === 200 && (sign2.body?.releaseRequest?.current_approvals ?? 0) >= 2, JSON.stringify(sign2.body).slice(0, 140));

  const exec = await api('org', `/api/release-requests/${rrId}/execute`, { method: 'POST' });
  const execMsg = String(exec.body?.message || '');
  const txHash = exec.body?.releaseRequest?.blockchain_tx_hash ?? null;
  const claimsOnChain = /on-chain/i.test(execMsg);
  ok('release executed honestly', exec.status === 200 && claimsOnChain === Boolean(txHash), `${execMsg.slice(0, 100)} tx=${txHash}`);
  console.log(`     ↳ execute message: "${execMsg}" · tx: ${exec.body?.releaseRequest?.blockchain_tx_hash ?? 'none (ledger-only)'}`);

  // 5.7 audit chain verification
  const chain = await api('user', '/api/audit/verify-chain');
  ok('audit hash chain verifies', chain.status === 200 && chain.body?.valid === true, JSON.stringify(chain.body).slice(0, 140));

  // 5.8 audit ledger is now admin/auditor-gated
  const ledgerUser = await api('user', '/api/audit/ledger');
  ok('audit ledger gated from USER', ledgerUser.status === 403);
  const ledgerAdmin = await api('admin', '/api/audit/ledger');
  ok('audit ledger open to ADMIN', ledgerAdmin.status === 200);
}

// ------------------------------------------------ 6. Notifications + v1 API
console.log('\n6. Notifications + mobile /api/v1');
{
  const notif = await api('contractor', '/api/notifications');
  ok('contractor has notifications', notif.status === 200 && notif.body.notifications?.length > 0);

  const v1login = await api('v1', '/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'aarav@vera.org', password: 'Password123!' }),
  });
  ok('v1 login issues token', v1login.status === 200 && String(v1login.body?.token || '').startsWith('vera_'));

  jars.set('v1auth', undefined);
  const reports = await api('v1', '/api/v1/hisaab/reports', {
    headers: { authorization: `Bearer ${v1login.body?.token}` },
  });
  ok('v1 reports list with token', reports.status === 200 && Array.isArray(reports.body?.reports));
  const noAuth = await api('v1', '/api/v1/me');
  ok('v1 /me rejects anonymous', noAuth.status === 401);
  if (reportId) {
    const detail = await api('v1', `/api/v1/hisaab/reports/${reportId}`, {
      headers: { authorization: `Bearer ${v1login.body?.token}` },
    });
    ok('v1 single report works', detail.status === 200 && detail.body?.report?.id === reportId);
  }
}

// ------------------------------------------------------------- 7. Honesty
console.log('\n7. Honesty checks (no fabricated telemetry)');
{
  const stats = await api('anon', '/api/blockchain/stats');
  const body = stats.body || {};
  if (body.connected) {
    ok('chain stats real (connected)', typeof body.blockNumber === 'number' && body.contractAddress);
  } else {
    ok('chain stats honest (offline)', body.blockNumber === null && body.blockNumber !== 194821);
  }
  const anonLedger = await api('anon', '/api/audit/ledger');
  ok('audit ledger requires auth', anonLedger.status === 401 || anonLedger.status === 307);
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log('  • ' + f);
  process.exit(1);
}
