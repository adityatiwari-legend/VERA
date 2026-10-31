import { HardHat, MapPin } from 'lucide-react';
import { listContractors } from '@/lib/hisaab';
import { ContractorActions } from './ContractorActions';

export const dynamic = 'force-dynamic';

export default async function AdminContractorsPage() {
  const contractors = await listContractors({});
  const pending = contractors.filter((c: any) => c.contractor_status === 'PENDING');
  const approved = contractors.filter((c: any) => c.contractor_status === 'APPROVED');
  const suspended = contractors.filter((c: any) => c.contractor_status === 'SUSPENDED');

  const renderCard = (c: any) => (
    <div key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <HardHat className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold text-ink">{c.name}</p>
          <span
            className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${
              c.contractor_status === 'APPROVED'
                ? 'border-ok/20 bg-ok-soft text-ok'
                : c.contractor_status === 'SUSPENDED'
                  ? 'border-bad/20 bg-bad-soft text-bad'
                  : 'border-warn/25 bg-warn-soft text-warn'
            }`}
          >
            {c.contractor_status}
          </span>
        </div>
        <p className="mt-0.5 font-mono text-[10px] text-mute">{c.email}</p>
        {c.service_area && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-mute">
            <MapPin className="h-3 w-3" /> {c.service_area}
          </p>
        )}
        <p className="mt-1 font-mono text-[10px] text-mute">
          payout wallet: {c.solana_pubkey ? `${c.solana_pubkey.slice(0, 8)}…${c.solana_pubkey.slice(-6)}` : 'not bound yet'}
        </p>
      </div>
      <ContractorActions contractorId={c.id} status={c.contractor_status} />
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="border-b border-line pb-5">
        <span className="eyebrow">ADMIN · CONTRACTOR DIRECTORY</span>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Contractors</h1>
        <p className="mt-1 text-sm text-mute">
          Only APPROVED contractors can be offered jobs, and only they can submit repair evidence.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-warn">
          Pending approval ({pending.length})
        </h2>
        {pending.map(renderCard)}
        {pending.length === 0 && <p className="text-xs text-mute">No pending applications.</p>}
      </section>

      <section className="space-y-2">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ok">
          Approved ({approved.length})
        </h2>
        {approved.map(renderCard)}
        {approved.length === 0 && <p className="text-xs text-mute">No approved contractors yet.</p>}
      </section>

      {suspended.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-bad">
            Suspended ({suspended.length})
          </h2>
          {suspended.map(renderCard)}
        </section>
      )}
    </div>
  );
}
