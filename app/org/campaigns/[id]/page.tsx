import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getCampaignById } from '@/lib/campaigns';
import { getMilestonesForCampaign } from '@/lib/milestones';
import { getDonationsForCampaign } from '@/lib/donations';
import { getFundTransactionsForCampaign, getCampaignFinancialSummary } from '@/lib/fund_transactions';
import { getAuditLogsForCampaign } from '@/lib/audit_log';
import { StatusBadge } from '@/components/StatusBadge';
import { ProgressBar } from '@/components/ProgressBar';
import { CampaignStatusActions } from './CampaignStatusActions';
import { MilestoneManager } from './MilestoneManager';
import { BlockchainAuditViewer } from '@/components/BlockchainAuditViewer';
import { formatRupees } from '@/lib/utils';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Edit3,
  History,
  Lock,
  HeartHandshake,
  Coins,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CampaignDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const [campaign, milestones, donations, fundTransactions, summary, auditLogs] = await Promise.all([
    getCampaignById(params.id),
    getMilestonesForCampaign(params.id),
    getDonationsForCampaign(params.id),
    getFundTransactionsForCampaign(params.id),
    getCampaignFinancialSummary(params.id),
    getAuditLogsForCampaign(params.id),
  ]);

  if (!campaign) {
    notFound();
  }

  // Authorization check: NGO can only access own campaign
  if (user.role === 'ORGANIZATION' && campaign.ngo_id !== user.id) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="rounded-xl border border-bad/25 bg-white p-8 shadow-card">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-bad" />
          <h2 className="text-lg font-semibold text-bad">Access Denied</h2>
          <p className="mt-2 text-xs text-mute">
            You do not have permission to view or manage this campaign.
          </p>
          <Link
            href="/org/campaigns"
            className="btn-secondary mt-6 inline-flex items-center gap-2 !px-4 !py-2 !text-xs"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const target = summary ? summary.targetAmount : Number(campaign.target_amount);
  const raised = summary ? summary.raisedAmount : Number(campaign.raised_amount);
  const locked = summary ? summary.lockedAmount : Math.max(0, raised - Number(campaign.released_amount || 0));
  const released = summary ? summary.releasedAmount : Number(campaign.released_amount || 0);
  const remaining = summary ? summary.remainingAmount : Math.max(0, target - raised);
  const isEditable = campaign.status !== 'COMPLETED' && campaign.status !== 'CANCELLED';

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <Link
          href="/org/campaigns"
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-mute transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to NGO Dashboard
        </Link>
        <Link
          href={`/campaigns/${campaign.id}/audit`}
          className="inline-flex items-center gap-1.5 font-mono text-xs text-accent hover:underline"
        >
          <span>View Public Audit</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Header Card */}
      <div className="card space-y-6 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-start">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2">
              <StatusBadge status={campaign.status} />
              <span className="chip">ID: {campaign.id.slice(0, 8)}</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {campaign.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-mute">
              <span className="flex items-center gap-1.5 font-medium text-ink">
                <Building2 className="h-3.5 w-3.5 text-accent" />
                {campaign.ngo_name || 'Your Organization'}
              </span>
              <span className="text-faint">•</span>
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <Calendar className="h-3.5 w-3.5 text-faint" />
                Created {new Date(campaign.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </span>
            </div>
          </div>

          {isEditable && (
            <Link
              href={`/org/campaigns/${campaign.id}/edit`}
              className="btn-secondary !px-3 !py-1.5 !text-xs self-start"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit Metadata
            </Link>
          )}
        </div>

        {/* Financial Progress Bar */}
        <div className="space-y-4">
          <ProgressBar current={raised} total={target} label="Campaign Funding Progress" />

          {/* Financial Breakdown Grid */}
          <div className="grid grid-cols-2 gap-2.5 pt-1 sm:grid-cols-5">
            <div className="rounded-lg border border-line bg-mist p-3.5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-mute">Target</p>
              <p className="mt-0.5 font-mono text-base font-bold text-ink">{formatRupees(target)}</p>
            </div>

            <div className="rounded-lg border border-line bg-mist p-3.5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-accent-deep">Raised</p>
              <p className="mt-0.5 font-mono text-base font-bold text-accent-deep">{formatRupees(raised)}</p>
            </div>

            <div className="rounded-lg border border-line bg-mist p-3.5">
              <p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-warn">
                <Lock className="h-3 w-3" /> Locked
              </p>
              <p className="mt-0.5 font-mono text-base font-bold text-warn">{formatRupees(locked)}</p>
            </div>

            <div className="rounded-lg border border-line bg-mist p-3.5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-ok">Released</p>
              <p className="mt-0.5 font-mono text-base font-bold text-ok">{formatRupees(released)}</p>
            </div>

            <div className="col-span-2 rounded-lg border border-line bg-mist p-3.5 sm:col-span-1">
              <p className="font-mono text-[10px] uppercase tracking-wider text-mute">Remaining</p>
              <p className="mt-0.5 font-mono text-base font-bold text-ink">{formatRupees(remaining)}</p>
            </div>
          </div>
        </div>

        {/* State Transition Actions */}
        <div className="border-t border-line pt-4">
          <p className="mb-2.5 font-mono text-[11px] uppercase tracking-wider text-mute">
            Lifecycle Status Actions
          </p>
          <CampaignStatusActions campaignId={campaign.id} currentStatus={campaign.status} />
        </div>
      </div>

      {/* Description & Beneficiary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card space-y-2 p-5 md:col-span-2">
          <h2 className="font-mono text-[11px] uppercase tracking-wider text-mute">Campaign Scope & Objective</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink">
            {campaign.description}
          </p>
        </div>

        <div className="card space-y-2 p-5">
          <h2 className="font-mono text-[11px] uppercase tracking-wider text-mute">Designated Beneficiary</h2>
          <div className="rounded-lg border border-line bg-mist p-3 text-xs font-semibold text-accent-deep">
            {campaign.beneficiary}
          </div>
          <p className="text-[11px] leading-relaxed text-faint">
            Designated receiver of funds and direct outcome recipient.
          </p>
        </div>
      </div>

      {/* Milestone Manager Component */}
      <MilestoneManager
        campaignId={campaign.id}
        targetAmount={target}
        milestones={milestones}
        isEditable={isEditable}
        currentUser={{ id: user.id, role: user.role, name: user.name }}
      />

      {/* Received Donations Summary */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line p-5">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-ink">Campaign Contributions</h2>
          </div>
          <span className="font-mono text-[11px] text-faint">
            {donations.length} received
          </span>
        </div>

        {donations.length === 0 ? (
          <div className="p-10 text-center font-mono text-xs text-faint">
            No donations received yet for this campaign.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-mist font-mono text-[10px] uppercase tracking-wider text-mute">
                  <th className="px-5 py-2.5 font-medium">Donor</th>
                  <th className="px-5 py-2.5 font-medium">Reference</th>
                  <th className="px-5 py-2.5 font-medium">Purpose</th>
                  <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-5 py-2.5 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {donations.map((don) => (
                  <tr key={don.id} className="bg-white transition-colors hover:bg-accent-faint/60">
                    <td className="px-5 py-3 font-semibold text-ink">{don.donor_name}</td>
                    <td className="px-5 py-3 font-mono text-[11px] text-mute">{don.reference}</td>
                    <td className="px-5 py-3 text-mute">{don.purpose || 'General support'}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-ok">
                      {formatRupees(Number(don.amount))}
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] text-faint">
                      {new Date(don.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fund Transactions Trail */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line p-5">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-ink">Fund Accounting Ledger</h2>
          </div>
          <span className="font-mono text-[11px] text-faint">
            {fundTransactions.length} recorded
          </span>
        </div>

        {fundTransactions.length === 0 ? (
          <div className="p-10 text-center font-mono text-xs text-faint">
            No fund transactions recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-line">
            {fundTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3.5 text-xs transition-colors hover:bg-mist sm:px-5">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium ${
                      tx.type === 'DONATION'
                        ? 'border-accent/20 bg-accent-faint text-accent-deep'
                        : tx.type === 'LOCK'
                        ? 'border-warn/25 bg-warn-soft text-warn'
                        : 'border-ok/20 bg-ok-soft text-ok'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                    {tx.type}
                  </span>
                  <span className="font-mono text-[11px] text-mute">{tx.reference}</span>
                  {tx.milestone_title && (
                    <span className="text-faint">→ {tx.milestone_title}</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="block font-mono font-semibold text-ink">{formatRupees(Number(tx.amount))}</span>
                  <span className="font-mono text-[10px] text-faint">
                    {new Date(tx.created_at).toLocaleTimeString('en-IN', { timeStyle: 'short' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Immutable Blockchain Audit Trail */}
      <BlockchainAuditViewer logs={auditLogs} />
    </div>
  );
}
