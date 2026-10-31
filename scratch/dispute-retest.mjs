// One-off retest of the dispute freeze flow with corrected signer roles.
import { readFileSync } from 'node:fs';

const BASE = 'http://localhost:3001';
const jars = new Map();
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

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
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

const login = (jar, email) => api(jar, '/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'Password123!' }) });
await login('org', 'ngo@fundtrail.org');
await login('auditor', 'auditor@fundtrail.org');
await login('admin', 'admin@fundtrail.org');
await login('user', 'donor@fundtrail.org');

const stamp = Date.now();
const camp = await api('org', '/api/campaigns', {
  method: 'POST',
  body: JSON.stringify({ title: `Retest Drill ${stamp}`, description: 'Targeted dispute retest campaign.', target_amount: 100000, beneficiary: 'Retest Beneficiaries', status: 'ACTIVE' }),
});
const campaignId = camp.body?.campaign?.id ?? camp.body?.id;
ok('campaign created', camp.status === 201 && Boolean(campaignId));
await api('user', `/api/campaigns/${campaignId}/donate`, { method: 'POST', body: JSON.stringify({ amount: 50000 }) });
const ms = await api('org', `/api/campaigns/${campaignId}/milestones`, {
  method: 'POST',
  body: JSON.stringify({ title: 'Retest works package', description: 'Retest dispute freeze behaviour package.', amount: 40000, proof_required: true }),
});
const milestoneId = ms.body?.milestone?.id ?? ms.body?.id;
await api('org', `/api/milestones/${milestoneId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'IN_PROGRESS' }) });
const fd = new FormData();
fd.append('claimed_amount', '40000');
fd.append('description', 'Retest invoice for the dispute drill');
fd.append('files', new Blob([readFileSync('scratch/e2e-invoice.jpg')], { type: 'image/jpeg' }), 'retest-invoice.jpg');
const proof = await api('org', `/api/milestones/${milestoneId}/proofs`, { method: 'POST', body: fd });
const proofId = proof.body?.proof?.id;
await api('auditor', `/api/proofs/${proofId}/approve`, { method: 'POST', body: JSON.stringify({ decision: 'APPROVE', comment: 'Retest' }) });

const rr = await api('org', `/api/milestones/${milestoneId}/release-request`, { method: 'POST', body: JSON.stringify({ requested_amount: 40000 }) });
const rrId = rr.body?.releaseRequest?.id ?? rr.body?.id;
ok('release requested', Boolean(rrId));

const disp = await api('auditor', `/api/milestones/${milestoneId}/dispute`, { method: 'POST', body: JSON.stringify({ reason: 'Retest: vendor mismatch' }) });
ok('dispute raised', disp.status === 201 && disp.body?.dispute?.status === 'OPEN', JSON.stringify(disp.body).slice(0, 120));
ok('response carries releaseRequest', disp.body && 'releaseRequest' in disp.body);

const blocked = await api('org', `/api/release-requests/${rrId}/sign`, { method: 'POST', body: JSON.stringify({ comment: 'blocked?' }) });
ok('APPROVED sign blocked (409)', blocked.status === 409, JSON.stringify(blocked.body).slice(0, 100));

const rejSign = await api('admin', `/api/release-requests/${rrId}/sign`, { method: 'POST', body: JSON.stringify({ comment: '[DISPUTE]: retest', status: 'REJECTED' }) });
ok('REJECTED sign allowed', rejSign.status === 200);

const resolve = await api('auditor', `/api/milestones/${milestoneId}/dispute/resolve`, { method: 'POST', body: JSON.stringify({ resolution_notes: 'Retest: clarified, evidence valid' }) });
ok('dispute resolved', resolve.status === 200 && resolve.body?.dispute?.status === 'RESOLVED');

const sign1 = await api('auditor', `/api/release-requests/${rrId}/sign`, { method: 'POST', body: JSON.stringify({ comment: 'retest auditor sign' }) });
ok('sign 1/2 after resolve (auditor)', sign1.status === 200, JSON.stringify(sign1.body).slice(0, 100));
const sign2 = await api('org', `/api/release-requests/${rrId}/sign`, { method: 'POST', body: JSON.stringify({ comment: 'retest org sign' }) });
ok('sign 2/2 threshold', sign2.status === 200 && (sign2.body?.releaseRequest?.current_approvals ?? 0) >= 2, JSON.stringify(sign2.body).slice(0, 100));

const exec = await api('org', `/api/release-requests/${rrId}/execute`, { method: 'POST' });
ok('release executed', exec.status === 200, JSON.stringify(exec.body).slice(0, 100));

console.log(`\n=== RETEST: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
