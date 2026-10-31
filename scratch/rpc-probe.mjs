const RPC = 'http://192.168.58.213:8899';
for (let i = 0; i < 6; i++) {
  const t0 = Date.now();
  try {
    const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' }) });
    const j = await r.json();
    console.log(i, r.status, j.result, Date.now() - t0 + 'ms');
  } catch (e) {
    console.log(i, 'FETCH FAILED', e.cause?.message || e.message, Date.now() - t0 + 'ms');
  }
  await new Promise(r => setTimeout(r, 300));
}
