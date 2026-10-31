import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCampaignById } from '@/lib/campaigns';
import { getMilestonesForCampaign } from '@/lib/milestones';
import { getCampaignFinancialSummary } from '@/lib/fund_transactions';
import { getAuditLogsForCampaign } from '@/lib/audit_log';
import { ProgressBar } from '@/components/ProgressBar';
import { StatusBadge } from '@/components/StatusBadge';
import { BlockchainBadge } from '@/components/BlockchainBadge';
import { DonationModal } from './DonationModal';
import {
  ArrowLeft,
  Building2,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { formatRupees } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PublicCampaignDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [campaign, milestones, summary, auditLogs] = await Promise.all([
    getCampaignById(params.id),
    getMilestonesForCampaign(params.id),
    getCampaignFinancialSummary(params.id),
    getAuditLogsForCampaign(params.id),
  ]);

  if (!campaign) {
    notFound();
  }

  const target = summary ? summary.targetAmount : Number(campaign.target_amount);
  const raised = summary ? summary.raisedAmount : Number(campaign.raised_amount);
  const released = summary ? summary.releasedAmount : Number(campaign.released_amount || 0);
  const locked = summary ? summary.lockedAmount : Math.max(0, raised - released);
  const refunded = summary ? summary.refundedAmount : 0;
  const remaining = summary ? summary.remainingAmount : Math.max(0, target - raised);
  const percent = summary ? summary.progressPercent : (target > 0 ? Math.round((raised / target) * 100) : 0);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 pb-20 sm:px-6 lg:px-8">
      {/* Top Back Navigation */}
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-mute transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to All Campaigns</span>
      </Link>

      {/*
        ========================================================================
        TOP SECTION (Requirement 11)
        Campaign name | Beneficiary | NGO | Status | Escrow custody
        Primary CTA: Donate | Secondary: View Public Audit
        ========================================================================
      */}
      <div className="card space-y-6 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 border-b border-line pb-6 lg:flex-row lg:items-start">
          <div className="max-w-2xl space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge status={campaign.status} />
              <span className="chip">ID: {campaign.id.substring(0, 8)}</span>
              {campaign.blockchain_status && (
                <BlockchainBadge
                  status={campaign.blockchain_status}
                  network={campaign.blockchain_network || 'Hardhat Testnet'}
                />
              )}
            </div>

            <h1 className="font-sans text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {campaign.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 pt-1 font-mono text-xs text-mute">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-faint" />
                NGO: <strong className="font-semibold text-ink">{campaign.ngo_name}</strong>
              </span>
              <span className="text-line-strong">•</span>
              <span>
                Beneficiary: <strong className="font-semibold text-ink">{campaign.beneficiary}</strong>
              </span>
              <span className="text-line-strong">•</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-faint" />
                Launched {new Date(campaign.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </span>
            </div>
          </div>

          {/* Escrow custody snapshot & Action CTAs */}
          <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
            <div className="flex items-center gap-3 rounded-xl border border-line bg-mist p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-ok/20 bg-ok-soft text-ok">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-mute">
                  IN ESCROW CUSTODY
                </span>
                <span className="block font-mono text-lg font-bold text-ink">{formatRupees(locked)}</span>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 pt-1 sm:w-auto">
              {/* Secondary CTA: View Public Audit */}
              <Link
                href={`/campaigns/${campaign.id}/audit`}
                className="btn-secondary inline-flex flex-1 items-center justify-center gap-1.5 !px-4 !py-2.5 !text-xs sm:flex-initial"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                <span>View Public Audit</span>
              </Link>

              {/* Primary CTA: Donate */}
              {campaign.status === 'ACTIVE' ? (
                <DonationModal
                  campaignId={campaign.id}
                  campaignTitle={campaign.title}
                  remainingGoal={remaining}
                />
              ) : (
                <span className="inline-flex items-center rounded-lg border border-line bg-mist px-4 py-2.5 font-mono text-xs text-mute">
                  Campaign {campaign.status}
                </span>
              )}
            </div>
          </div>
        </div>

        {/*
          ========================================================================
          FINANCIAL SUMMARY (Requirement 11)
          Target | Raised | Locked | Released | Refunded | Remaining
          ========================================================================
        */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between font-mono text-xs">
              <span className="text-sm font-bold text-ink">{percent}% Funded</span>
              <span className="text-mute">
                {formatRupees(raised)} of {formatRupees(target)} Target
              </span>
            </div>
            <ProgressBar current={raised} total={target} />
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-center font-mono sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border border-line bg-mist p-3">
              <span className="block text-[10px] font-medium uppercase tracking-wider text-mute">TARGET</span>
              <span className="mt-1 block text-sm font-bold text-ink">{formatRupees(target)}</span>
            </div>

            <div className="rounded-lg border border-line bg-mist p-3">
              <span className="block text-[10px] font-medium uppercase tracking-wider text-ok">RAISED</span>
              <span className="mt-1 block text-sm font-bold text-ink">{formatRupees(raised)}</span>
            </div>

            <div className="rounded-lg border border-line bg-mist p-3">
              <span className="block text-[10px] font-medium uppercase tracking-wider text-lav-deep">LOCKED</span>
              <span className="mt-1 block text-sm font-bold text-ink">{formatRupees(locked)}</span>
            </div>

            <div className="rounded-lg border border-line bg-mist p-3">
              <span className="block text-[10px] font-medium uppercase tracking-wider text-ok">RELEASED</span>
              <span className="mt-1 block text-sm font-bold text-ink">{formatRupees(released)}</span>
            </div>

            <div className="rounded-lg border border-line bg-mist p-3">
              <span className="block text-[10px] font-medium uppercase tracking-wider text-violet-700">REFUNDED</span>
              <span className="mt-1 block text-sm font-bold text-ink">{formatRupees(refunded)}</span>
            </div>

            <div className="rounded-lg border border-line bg-mist p-3">
              <span className="block text-[10px] font-medium uppercase tracking-wider text-mute">REMAINING</span>
              <span className="mt-1 block text-sm font-bold text-ink">{formatRupees(remaining)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description & Beneficiary Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="card space-y-3 p-6 md:col-span-2">
          <span className="eyebrow">Initiative overview</span>
          <p className="whitespace-pre-line font-sans text-sm leading-relaxed text-mute">
            {campaign.description}
          </p>
        </div>

        <div className="card space-y-3 p-6">
          <span className="eyebrow">Target beneficiary</span>
          <div className="rounded-lg border border-line bg-mist p-3.5 font-mono text-xs font-semibold text-ink">
            {campaign.beneficiary}
          </div>
          <p className="font-sans text-[11px] leading-relaxed text-mute">
            Funds remain locked in escrow until certified proof confirms physical deliverable execution for this beneficiary.
          </p>
        </div>
      </div>

      {/*
        ========================================================================
        MILESTONE PROGRESS (Requirement 11)
        Each milestone clearly showing:
        Allocation | Claimed | Released | Proof status | Verification | Approval | Release status
        ========================================================================
      */}
      <div className="card space-y-6 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-2 border-b border-line pb-4 sm:flex-row sm:items-center">
          <div>
            <span className="eyebrow">Deliverable roadmap</span>
            <h2 className="mt-1 font-sans text-lg font-semibold tracking-tight text-ink">
              Milestone Progress &amp; Release States
            </h2>
          </div>
          <span className="chip">{milestones.length} milestone tranches</span>
        </div>

        {milestones.length === 0 ? (
          <div className="rounded-lg border border-line bg-mist p-6 text-center font-mono text-xs text-mute">
            No milestones configured for this campaign yet.
          </div>
        ) : (
          <div className="space-y-4">
            {milestones.map((ms) => {
              const allocated = Number(ms.amount);
              const claimed = ms.active_proof_status ? allocated : 0;
              const releasedAmount = ms.status === 'RELEASED' ? allocated : 0;

              return (
                <div
                  key={ms.id}
                  className="space-y-4 rounded-lg border border-line bg-white p-5 transition-all hover:border-line-strong"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-accent">
                          0{ms.sequence}
                        </span>
                        <span className="text-line-strong">/</span>
                        <span className="font-sans text-sm font-semibold tracking-tight text-ink">
                          {ms.title}
                        </span>
                      </div>
                      <p className="max-w-xl font-sans text-[11px] leading-relaxed text-mute">
                        {ms.description}
                      </p>
                    </div>

                    <StatusBadge status={ms.status} size="sm" />
                  </div>

                  {/* Milestone 7 Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 border-t border-line pt-2 text-center font-mono text-xs sm:grid-cols-4 lg:grid-cols-7">
                    <div className="rounded border border-line bg-mist p-2">
                      <span className="block text-[10px] text-faint">ALLOCATION</span>
                      <span className="mt-0.5 block font-bold text-ink">{formatRupees(allocated)}</span>
                    </div>

                    <div className="rounded border border-line bg-mist p-2">
                      <span className="block text-[10px] text-faint">CLAIMED</span>
                      <span className="mt-0.5 block font-bold text-ink">{formatRupees(claimed)}</span>
                    </div>

                    <div className="rounded border border-line bg-mist p-2">
                      <span className="block text-[10px] text-faint">RELEASED</span>
                      <span className="mt-0.5 block font-bold text-ok">{formatRupees(releasedAmount)}</span>
                    </div>

                    <div className="rounded border border-line bg-mist p-2">
                      <span className="block text-[10px] text-faint">PROOF STATUS</span>
                      <span className="mt-0.5 block truncate font-semibold text-ink">
                        {ms.active_proof_status
                          ? ms.active_proof_status.replace('_', ' ')
                          : '—'}
                      </span>
                    </div>

                    <div className="rounded border border-line bg-mist p-2">
                      <span className="block text-[10px] text-faint">VERIFICATION</span>
                      <span
                        className={`mt-0.5 block truncate font-semibold ${
                          ms.active_proof_status === 'APPROVED'
                            ? 'text-ok'
                            : ms.active_proof_status === 'REJECTED'
                            ? 'text-bad'
                            : ms.active_proof_status
                            ? 'text-warn'
                            : 'text-mute'
                        }`}
                      >
                        {ms.active_proof_status === 'APPROVED'
                          ? 'AI Verified'
                          : ms.active_proof_status === 'REJECTED'
                          ? 'Rejected'
                          : ms.active_proof_status
                          ? 'Under Review'
                          : '—'}
                      </span>
                    </div>

                    <div className="rounded border border-line bg-mist p-2">
                      <span className="block text-[10px] text-faint">APPROVAL</span>
                      <span className="mt-0.5 block truncate font-semibold text-ink">
                        {ms.status === 'APPROVED' || ms.status === 'RELEASED' ? 'Approved' : 'Reviewing'}
                      </span>
                    </div>

                    <div className="rounded border border-line bg-mist p-2">
                      <span className="block text-[10px] text-faint">RELEASE STATUS</span>
                      <span
                        className={`mt-0.5 block truncate font-semibold ${
                          ms.status === 'RELEASED' ? 'text-ok' : 'text-lav-deep'
                        }`}
                      >
                        {ms.status === 'RELEASED' ? 'Released' : 'Locked'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
