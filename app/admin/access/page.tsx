import { Building2, ShieldCheck } from 'lucide-react';
import { query } from '@/lib/db';
import { AccessActions, AuditorInviteForm } from './AccessActions';

export const dynamic = 'force-dynamic';

export default async function AdminAccessPage() {
  const [orgsRes, auditorsRes] = await Promise.all([
    query(
      `SELECT id, name, email, org_type, org_status, org_registration_no, created_at
       FROM users WHERE role = 'ORGANIZATION' ORDER BY
       CASE org_status WHEN 'PENDING' THEN 0 ELSE 1 END, created_at DESC LIMIT 100`
    ),
    query(
      `SELECT id, name, email, created_at FROM users WHERE role = 'AUDITOR'
       ORDER BY created_at DESC LIMIT 50`
    ),
  ]);

  const orgs = orgsRes.rows as any[];
  const pendingOrgs = orgs.filter((o) => o.org_status === 'PENDING');

  return (
    <div className="space-y-6 pb-20">
      <div className="border-b border-line pb-5">
        <span className="eyebrow">ADMIN · ACCESS & VERIFICATION</span>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
          Organizations & auditors
        </h1>
        <p className="mt-1 text-sm text-mute">
          Organizations must be VERIFIED before raising campaigns. Auditors are invite-only.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-warn">
          <Building2 className="h-3.5 w-3.5" /> Pending organizations ({pendingOrgs.length})
        </h2>
        {pendingOrgs.map((o) => (
          <div key={o.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-semibold text-ink">{o.name}</p>
              <p className="font-mono text-[10px] text-mute">
                {o.email} · {o.org_type ?? '—'}
                {o.org_registration_no ? ` · ${o.org_registration_no}` : ''}
              </p>
            </div>
            <AccessActions userId={o.id} status={o.org_status} />
          </div>
        ))}
        {pendingOrgs.length === 0 && <p className="text-xs text-mute">No pending organizations.</p>}

        <details className="mt-2">
          <summary className="cursor-pointer font-mono text-[11px] text-mute hover:text-ink">
            All organizations ({orgs.length})
          </summary>
          <div className="mt-2 space-y-2">
            {orgs.filter((o) => o.org_status !== 'PENDING').map((o) => (
              <div key={o.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-semibold text-ink">{o.name}</p>
                  <p className="font-mono text-[10px] text-mute">
                    {o.email} · {o.org_type ?? '—'}
                  </p>
                </div>
                <AccessActions userId={o.id} status={o.org_status} />
              </div>
            ))}
          </div>
        </details>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-accent">
          <ShieldCheck className="h-3.5 w-3.5" /> Auditors ({auditorsRes.rows.length})
        </h2>
        <AuditorInviteForm />
        <div className="card divide-y divide-line p-4">
          {auditorsRes.rows.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-ink">{a.name}</p>
                <p className="font-mono text-[10px] text-mute">{a.email}</p>
              </div>
              <span className="font-mono text-[10px] text-mute">
                since {new Date(a.created_at).toLocaleDateString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
