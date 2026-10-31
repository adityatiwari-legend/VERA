import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getCampaignById } from '@/lib/campaigns';
import { query } from '@/lib/db';
import { Milestone, Proof } from '@/types';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { ProofSubmitForm } from './ProofSubmitForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
    milestoneId: string;
  };
}

export default async function SubmitProofPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const campaign = await getCampaignById(params.id);
  if (!campaign) {
    notFound();
  }

  // Authorization: Only owning NGO or Admin
  if (user.role === 'ORGANIZATION' && campaign.ngo_id !== user.id) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="rounded-xl border border-bad/25 bg-white p-8 shadow-card">
          <ShieldAlert className="mx-auto mb-3 h-12 w-12 text-bad" />
          <h2 className="text-xl font-semibold text-bad">Access Denied</h2>
          <p className="mt-2 text-xs text-mute">
            You can only submit milestone proofs for your own campaigns.
          </p>
          <Link
            href="/org/campaigns"
            className="btn-secondary mt-6 inline-flex items-center gap-2 !px-5 !py-2.5 !text-xs"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Fetch milestone
  const msRes = await query<Milestone>(
    `SELECT * FROM milestones WHERE id = $1 AND campaign_id = $2`,
    [params.milestoneId, params.id]
  );

  if (msRes.rowCount === 0) {
    notFound();
  }

  const milestone = msRes.rows[0];

  // Milestone must be IN_PROGRESS or REJECTED
  const isEligible = milestone.status === 'IN_PROGRESS' || milestone.status === 'REJECTED';

  // Check if there is an existing rejected proof to show rejection history
  const previousProofsRes = await query<Proof>(
    `SELECT * FROM proofs WHERE milestone_id = $1 ORDER BY submitted_at DESC`,
    [params.milestoneId]
  );
  const previousProofs = previousProofsRes.rows;

  const formatRupees = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      {/* Breadcrumb / Back Link */}
      <Link
        href={`/org/campaigns/${campaign.id}`}
        className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-mute transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Campaign
      </Link>

      {/* Header */}
      <div className="card space-y-6 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-center">
          <div>
            <span className="eyebrow">Phase 3 — Evidence Submission</span>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">
              Submit Milestone Proof
            </h1>
          </div>
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-semibold ${
            milestone.status === 'REJECTED'
              ? 'border-bad/20 bg-bad-soft text-bad'
              : 'border-warn/25 bg-warn-soft text-warn'
          }`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {milestone.status === 'REJECTED' ? 'CORRECTION REQUIRED' : milestone.status}
          </span>
        </div>

        {/* Milestone Meta */}
        <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-lg border border-line bg-mist p-4">
            <span className="block font-mono text-[10px] uppercase tracking-wider text-faint">Milestone</span>
            <span className="mt-1 block font-semibold text-ink">{milestone.title}</span>
          </div>
          <div className="rounded-lg border border-accent/20 bg-accent-faint p-4">
            <span className="block font-mono text-[10px] uppercase tracking-wider text-accent-deep">Allocated Budget</span>
            <span className="mt-1 block font-mono font-bold text-accent-deep">{formatRupees(Number(milestone.amount))}</span>
          </div>
          <div className="rounded-lg border border-line bg-mist p-4">
            <span className="block font-mono text-[10px] uppercase tracking-wider text-faint">Campaign</span>
            <span className="mt-1 block truncate font-medium text-ink">{campaign.title}</span>
          </div>
        </div>

        {/* Rejection notice if resubmitting */}
        {milestone.status === 'REJECTED' && previousProofs.length > 0 && previousProofs[0].rejection_reason && (
          <div className="space-y-1.5 rounded-lg border border-bad/20 bg-bad-soft p-5 text-xs">
            <div className="flex items-center gap-2 font-semibold text-bad">
              <ShieldAlert className="h-4 w-4 text-bad" />
              Previous Submission Rejected by Auditor:
            </div>
            <p className="pl-6 font-mono text-[11px] text-bad/90">
              "{previousProofs[0].rejection_reason}"
            </p>
            <p className="pl-6 pt-1 text-[11px] text-mute">
              Please upload corrected invoices/receipts and resubmit for verification.
            </p>
          </div>
        )}
      </div>

      {!isEligible ? (
        <div className="space-y-4 rounded-xl border border-warn/20 bg-warn-soft p-8 text-center">
          <h3 className="text-base font-semibold text-warn">Proof Submission Unavailable</h3>
          <p className="mx-auto max-w-md text-xs leading-relaxed text-warn/90">
            This milestone is currently in <strong>{milestone.status}</strong> status. Proof can only be submitted when the milestone is IN_PROGRESS or REJECTED.
          </p>
          <Link
            href={`/org/campaigns/${campaign.id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-warn/30 bg-white px-5 py-2.5 text-xs font-semibold text-warn transition-colors hover:border-warn/60"
          >
            Back to Campaign
          </Link>
        </div>
      ) : (
        /* Submission Form Component */
        <ProofSubmitForm
          campaignId={campaign.id}
          milestoneId={milestone.id}
          milestoneAmount={Number(milestone.amount)}
        />
      )}
    </div>
  );
}
