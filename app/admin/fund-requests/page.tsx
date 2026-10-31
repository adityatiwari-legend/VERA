import { Landmark } from 'lucide-react';
import { listFundRequests } from '@/lib/hisaab';
import { FundRequestStatus } from '@/types';
import { FundRequestCreateForm } from './FundRequestCreateForm';
import { FundRequestActions } from './FundRequestActions';
import { formatRupees } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, string> = {
  DRAFT: 'border-line bg-mist text-mute',
  SUBMITTED: 'border-warn/25 bg-warn-soft text-warn',
  APPROVED: 'border-accent/30 bg-accent-faint text-accent-deep',
  SANCTIONED: 'border-ok/20 bg-ok-soft text-ok',
  REJECTED: 'border-bad/20 bg-bad-soft text-bad',
};

const FLOW: Record<FundRequestStatus, FundRequestStatus[]> = {
  DRAFT: ['SUBMITTED', 'REJECTED'],
  SUBMITTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['SANCTIONED', 'REJECTED'],
  SANCTIONED: [],
  REJECTED: [],
};

export default async function AdminFundRequestsPage() {
  const fundRequests = await listFundRequests();

  return (
    <div className="space-y-5 pb-20">
      <div className="border-b border-line pb-5">
        <span className="eyebrow">ADMIN · GOVERNMENT FUNDS</span>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Fund requests</h1>
        <p className="mt-1 text-sm text-mute">
          Apply to government departments for repair budgets. Once SANCTIONED, a request can back an escrow.
        </p>
      </div>

      <FundRequestCreateForm />

      <div className="space-y-3">
        {fundRequests.map((fr) => (
          <div key={fr.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-semibold text-ink">{fr.title}</h3>
                  <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${STATUS_TONE[fr.status]}`}>
                    {fr.status}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-mute">{fr.description}</p>
                <p className="mt-1.5 font-mono text-[10px] text-mute">
                  {fr.department} · by {fr.admin_name} · {fr.report_ids?.length ?? 0} complaint(s) attached
                  {fr.gov_reference_no ? ` · Ref: ${fr.gov_reference_no}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg font-bold text-ink">{formatRupees(Number(fr.requested_amount))}</p>
                {fr.sanctioned_amount && (
                  <p className="font-mono text-[11px] text-ok">sanctioned {formatRupees(Number(fr.sanctioned_amount))}</p>
                )}
              </div>
            </div>
            {FLOW[fr.status as FundRequestStatus]?.length > 0 && (
              <div className="mt-3 border-t border-line pt-3">
                <FundRequestActions fundRequestId={fr.id} allowed={FLOW[fr.status as FundRequestStatus]} />
              </div>
            )}
          </div>
        ))}
        {fundRequests.length === 0 && (
          <div className="card p-10 text-center text-sm text-mute">
            No fund requests yet. Draft one above to apply for a government repair budget.
          </div>
        )}
      </div>
    </div>
  );
}
