import Link from 'next/link';
import { redirect } from 'next/navigation';
import { HardHat, MapPin, IndianRupee, Wallet, ShieldAlert } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { listAssignments } from '@/lib/hisaab';

import { AssignmentActions } from './AssignmentActions';
import { SolanaWalletForm } from './SolanaWalletForm';

export const dynamic = 'force-dynamic';

export default async function ContractorPortalPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/contractor');

  if (user.role !== 'CONTRACTOR' && user.role !== 'ADMIN') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="card border-bad/20 bg-bad-soft/40 p-8 space-y-3">
          <ShieldAlert className="mx-auto h-10 w-10 text-bad" />
          <h2 className="text-lg font-bold text-bad">Contractor desk</h2>
          <p className="text-xs text-mute">This workspace is for approved CONTRACTOR accounts.</p>
          <Link href="/dashboard" className="btn-secondary mt-4 !text-xs">
            Go to your workspace
          </Link>
        </div>
      </div>
    );
  }

  const assignments = user.role === 'ADMIN' ? await listAssignments({}) : await listAssignments({ contractorId: user.id });
  const offered = assignments.filter((a) => a.status === 'OFFERED');
  const active = assignments.filter((a) => a.status === 'ACCEPTED');
  const completed = assignments.filter((a) => a.status === 'COMPLETED');

  const pendingApproval = user.contractor_status === 'PENDING';
  const needsWallet = !user.solana_pubkey;

  const renderJob = (a: (typeof assignments)[number], kind: 'OFFERED' | 'ACCEPTED' | 'COMPLETED') => (
    <div key={a.id} className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <HardHat className={`h-4 w-4 ${kind === 'OFFERED' ? 'text-warn' : 'text-accent'}`} />
            <p className="text-sm font-semibold text-ink">
              {a.report_address_label || 'Road repair job'}
            </p>
            <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${
              kind === 'OFFERED'
                ? 'border-warn/25 bg-warn-soft text-warn'
                : kind === 'ACCEPTED'
                  ? 'border-accent/30 bg-accent-faint text-accent-deep'
                  : 'border-ok/20 bg-ok-soft text-ok'
            }`}>
              {kind}
            </span>
          </div>
          <p className="mt-1 font-mono text-[10px] text-mute">
            report status: {a.report_status} · offered {new Date(a.offered_at).toLocaleDateString('en-IN')} by {a.assigned_by_name}
          </p>
          {a.note && <p className="mt-1 text-xs text-mute">{a.note}</p>}
        </div>
        {kind === 'OFFERED' && <AssignmentActions assignmentId={a.id} />}
      </div>
      {kind === 'ACCEPTED' && (
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <p className="font-mono text-[11px] text-mute">
            {a.escrow_id
              ? 'Escrow funded — submit repair evidence from the report page.'
              : 'Accepted. Waiting for the admin to fund the escrow.'}
          </p>
          <Link href={`/hisaab/report/${a.report_id}`} className="btn-primary !px-3 !py-1.5 !text-[11px]">
            Open job
          </Link>
        </div>
      )}
      {kind === 'COMPLETED' && (
        <div className="mt-3 border-t border-line pt-3">
          <Link href={`/hisaab/report/${a.report_id}`} className="font-mono text-[11px] font-semibold text-accent hover:underline">
            View final report →
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="border-b border-line pb-6">
        <span className="eyebrow">CONTRACTOR DESK</span>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{user.name}</h1>
        <p className="mt-1 text-sm text-mute">
          Jobs assigned by the VERA admin · paid in stages from on-chain escrow · {completed.length} completed
        </p>
      </div>

      {(pendingApproval || needsWallet) && (
        <div className="card space-y-3 border-warn/25 bg-warn-soft/30 p-5">
          {pendingApproval && (
            <div className="flex items-start gap-2.5 text-xs text-warn">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                <strong>Account pending approval.</strong> An admin must approve your contractor account before
                job offers arrive.
              </p>
            </div>
          )}
          {needsWallet && (
            <div className="flex items-start gap-2.5 text-xs text-warn">
              <Wallet className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                <strong>No payout wallet bound.</strong> Escrow cannot be funded for your jobs until a Solana
                payout address is set.
              </p>
            </div>
          )}
          {needsWallet && <SolanaWalletForm />}
        </div>
      )}

      <section className="space-y-2">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-warn">
          Job offers ({offered.length})
        </h2>
        {offered.map((a) => renderJob(a, 'OFFERED'))}
        {offered.length === 0 && <p className="text-xs text-mute">No open offers right now.</p>}
      </section>

      <section className="space-y-2">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-accent">
          Active jobs ({active.length})
        </h2>
        {active.map((a) => renderJob(a, 'ACCEPTED'))}
        {active.length === 0 && <p className="text-xs text-mute">No active jobs.</p>}
      </section>

      {completed.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ok">
            Completed ({completed.length})
          </h2>
          {completed.map((a) => renderJob(a, 'COMPLETED'))}
        </section>
      )}

      <div className="card flex items-start gap-3 p-4 text-xs text-mute">
        <IndianRupee className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p>
          Payment schedule: stage 1 (≈40%) releases automatically when AI verification passes your repair
          evidence; stages 2 and 3 release after the on-chain durability hold expires.
        </p>
      </div>

      <div className="card flex items-start gap-3 p-4 text-xs text-mute">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p>
          Repair evidence = one after-photo + an 8-second drive over the repaired stretch so the phone
          accelerometer can score road roughness.
        </p>
      </div>
    </div>
  );
}
