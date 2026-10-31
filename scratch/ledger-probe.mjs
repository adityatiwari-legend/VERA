const r = await fetch('http://localhost:3000/api/auth/login', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({email:'admin@fundtrail.org',password:'Password123!'}) });
const c = r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
const t0 = Date.now();
const res = await fetch('http://localhost:3000/api/audit/ledger', { headers: { cookie: c } });
console.error('ledger:', res.status, 'in', Date.now() - t0, 'ms');
const t1 = Date.now();
const res2 = await fetch('http://localhost:3000/api/audit/verify-chain', { headers: { cookie: c } });
console.error('verify-chain:', res2.status, 'in', Date.now() - t1, 'ms');
