const login = async () => {
  const r = await fetch('http://localhost:3000/api/auth/login', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({email:'admin@fundtrail.org',password:'Password123!'}) });
  const c = r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
  const reports = await fetch('http://localhost:3000/api/hisaab/reports?limit=50', { headers: { cookie: c } }).then(r=>r.json());
  const target = reports.reports.find(x => !x.solana_report_pda);
  console.error('target:', target?.id, target?.status);
  const res = await fetch('http://localhost:3000/api/hisaab/reports/' + target.id + '/anchor', { method: 'POST', headers: { cookie: c } });
  const body = await res.json();
  console.error('anchor:', res.status, JSON.stringify(body).slice(0, 300));
};
login();
