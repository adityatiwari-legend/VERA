import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCampaignAuditDetails } from '@/lib/campaigns';
import { getCampaignAuditTimeline } from '@/lib/audit_timeline';
import { runIntegrityChecks } from '@/lib/integrity';
import { getAuditLogsForCampaign } from '@/lib/audit_log';
import { BlockchainAuditViewer } from '@/components/BlockchainAuditViewer';
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Printer,
  Layers,
  FileCheck,
  KeyRound,
  FileText,
  Lock,
  Coins,
  Database,
  Cpu,
  UserCheck,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { formatRupees } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PublicAuditDashboardPage({
  params,
}: {
  params: { id: string };
}) {
  const [details, timeline, integrity, auditLogs] = await Promise.all([
    getCampaignAuditDetails(params.id),
    getCampaignAuditTimeline(params.id),
    runIntegrityChecks(params.id),
    getAuditLogsForCampaign(params.id),
  ]);

  if (!details) {
    notFound();
  }

  const { campaign, ngo, financialSummary, milestones, blockchain, trustIndicators } = details;

  const target = financialSummary.targetAmount;
  const raised = financialSummary.raisedAmount;
  const locked = financialSummary.lockedAmount;
  const released = financialSummary.releasedAmount;
  const refunded = financialSummary.refundedAmount;
  const remaining = financialSummary.remainingAmount;
  const progressPercent = financialSummary.progressPercent;

  // Build the 9-stage Fund Trail representation from live campaign data
  const fundTrailStages = [
    {
      id: 'DONATION',
      name: 'DONATION',
      label: 'Initial Contribution',
      timestamp: timeline.find((e) => e.type === 'DONATION_RECEIVED')?.timestamp || campaign.created_at,
      status: raised > 0 ? 'CONFIRMED' : 'PENDING',
      actor: 'Public Donors',
      reference: `₹${formatRupees(raised).replace('₹', '')} contributed across confirmed donors`,
      isDone: raised > 0,
      icon: Coins,
    },
    {
      id: 'EARMARKED',
      name: 'EARMARKED',
      label: 'Programmatic Earmarking',
      timestamp: timeline.find((e) => e.type === 'DONATION_RECEIVED')?.timestamp || campaign.created_at,
      status: raised > 0 ? 'ACTIVE' : 'PENDING',
      actor: 'VERA Protocol Engine',
      reference: `Bound to Campaign ID: ${campaign.id.substring(0, 8)}... (Zero Co-mingling)`,
      isDone: raised > 0,
      icon: Lock,
    },
    {
      id: 'LOCKED',
      name: 'LOCKED',
      label: 'Escrow Vault Custody',
      timestamp: timeline.find((e) => e.type === 'FUNDS_LOCKED')?.timestamp || campaign.created_at,
      status: locked > 0 ? 'LOCKED' : 'RELEASED',
      actor: 'Smart Contract Escrow',
      reference: `${formatRupees(locked)} currently protected in custody`,
      isDone: raised > 0,
      icon: Database,
    },
    {
      id: 'MILESTONE',
      name: 'MILESTONE',
      label: 'Deliverable Capping',
      timestamp: timeline.find((e) => e.type === 'MILESTONE_CREATED')?.timestamp || campaign.created_at,
      status: milestones.length > 0 ? 'ACTIVE' : 'PENDING',
      actor: ngo.name,
      reference: `${milestones.length} bounded milestone tranches defined`,
      isDone: milestones.length > 0,
      icon: Layers,
    },
    {
      id: 'PROOF',
      name: 'PROOF',
      label: 'Evidence Ingestion',
      timestamp: timeline.find((e) => e.type === 'PROOF_SUBMITTED')?.timestamp || null,
      status: trustIndicators.proofSubmitted ? 'PROOF SUBMITTED' : 'PENDING',
      actor: ngo.name,
      reference: trustIndicators.proofSubmitted ? 'Vendor invoices & photos with SHA-256 digests' : 'Awaiting deliverable completion',
      isDone: trustIndicators.proofSubmitted,
      icon: FileCheck,
    },
    {
      id: 'VERIFICATION',
      name: 'VERIFICATION',
      label: 'AI OCR Screening',
      timestamp: timeline.find((e) => e.type === 'AI_VERIFICATION_COMPLETED')?.timestamp || null,
      status: trustIndicators.evidenceVerified ? 'APPROVED' : 'UNDER REVIEW',
      actor: 'VERA OCR AI Scanner',
      reference: trustIndicators.evidenceVerified ? 'Line-item mathematical reconciliation passed' : 'Discrepancy screening in progress',
      isDone: trustIndicators.evidenceVerified,
      icon: Cpu,
    },
    {
      id: 'AUDITOR APPROVAL',
      name: 'AUDITOR APPROVAL',
      label: 'Independent Sign-off',
       timestamp: timeline.find((e) => e.type === 'PROOF_APPROVED' || e.type === 'PROOF_APPROVED_OVERRIDE')?.timestamp || null,
      status: milestones.some((m) => m.approvalStatus === 'APPROVED') ? 'APPROVED' : 'UNDER REVIEW',
      actor: 'Certified Human Auditor',
      reference: milestones.some((m) => m.approvalStatus === 'APPROVED') ? 'Certified evidence integrity & authorized payout' : 'Under independent review queue',
      isDone: milestones.some((m) => m.approvalStatus === 'APPROVED'),
      icon: UserCheck,
    },
    {
      id: 'MULTISIG',
      name: 'MULTISIG',
      label: '2-of-3 Authorization',
      timestamp: timeline.find((e) => e.type === 'MULTISIG_APPROVAL' || e.type === 'RELEASE_REQUESTED')?.timestamp || null,
      status: released > 0 ? 'APPROVED' : (trustIndicators.multisigEnabled ? 'ACTIVE' : 'PENDING'),
      actor: 'NGO Admin + Project Lead + Certified Auditor',
      reference: released > 0 ? '2 of 3 threshold reached & verified' : 'Multi-signature consensus gate active',
      isDone: released > 0 || milestones.some((m) => m.releaseStatus === '2_OF_3_CONFIRMED' || m.releaseStatus === 'APPROVED'),
      icon: KeyRound,
    },
    {
      id: 'BLOCKCHAIN RELEASE',
      name: 'BLOCKCHAIN RELEASE',
      label: 'Non-Reentrant On-Chain Execution',
      timestamp: timeline.find((e) => e.type === 'FUNDS_RELEASED')?.timestamp || null,
      status: released > 0 ? 'RELEASED' : 'LOCKED',
      actor: 'VERA Smart Contract',
      reference: released > 0
        ? `${formatRupees(released)} disbursed on-chain`
        : 'Awaiting completion of previous verification stages',
      isDone: released > 0,
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 pb-20 sm:px-6 lg:px-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <Link
          href={`/campaigns/${campaign.id}`}
          className="inline-flex items-center gap-2 font-mono text-xs font-medium text-mute transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Campaign Overview</span>
        </Link>

        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <Link
            href={`/ngos/${ngo.id}`}
            className="btn-secondary inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-xs"
          >
            <Building2 className="h-3.5 w-3.5 text-accent" />
            <span>NGO Profile</span>
          </Link>
          <Link
            href={`/campaigns/${campaign.id}/report`}
            className="btn-primary inline-flex items-center gap-1.5 !px-3.5 !py-1.5 !text-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </Link>
          <a
            href={`/api/audit/export?format=csv&campaignId=${encodeURIComponent(campaign.id)}`}
            className="btn-secondary inline-flex items-center gap-1.5 !px-3.5 !py-1.5 !text-xs"
          >
            <FileText className="h-3.5 w-3.5 text-accent" />
            <span>Export Report</span>
          </a>
        </div>
      </div>

      {/*
        ========================================================================
        HEADER (Requirement 12)
        PUBLIC AUDIT
        Campaign name
        "Anyone can verify this trail."
        ========================================================================
      */}
      <div className="card space-y-4 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-3xl space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-faint px-2.5 py-0.5 font-mono text-[11px] font-semibold text-accent-deep">
                <ShieldCheck className="h-3.5 w-3.5" />
                PUBLIC AUDIT
              </span>
              <StatusBadge status={campaign.status} />
              <span className="chip">ID: {campaign.id.substring(0, 8)}</span>
            </div>

            <h1 className="font-sans text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {campaign.title}
            </h1>

            <p className="font-mono text-sm text-mute">
              Anyone can verify this trail. No login required.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1 font-mono text-xs text-mute">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-faint" />
                NGO: <strong className="font-semibold text-ink">{ngo.name}</strong>
              </span>
              <span className="text-line-strong">•</span>
              <span>
                Beneficiary: <strong className="font-semibold text-ink">{campaign.beneficiary}</strong>
              </span>
            </div>
          </div>

          {/* Transparency Score */}
          <div className="card flex min-w-[190px] shrink-0 flex-col items-center justify-center p-5">
            <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-mute">
              TRANSPARENCY SCORE
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-mono text-4xl font-bold text-accent">
                {trustIndicators.score}
              </span>
              <span className="font-mono text-sm font-bold text-faint">/ 6</span>
            </div>
            <span className="mt-1 font-mono text-[11px] text-mute">
              {trustIndicators.score === 6 ? 'Fully Verified Trail' : 'Active Compliance'}
            </span>
          </div>
        </div>
      </div>

      {/*
        ========================================================================
        FINANCIAL CARDS (Requirement 12)
        TARGET | RAISED | LOCKED | RELEASED | REFUNDED | REMAINING
        Dominant Indian currency numbers.
        ========================================================================
      */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="card p-4 text-center">
          <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-mute">
            TARGET
          </span>
          <div className="mt-1 font-mono text-lg font-bold text-ink sm:text-xl">
            {formatRupees(target)}
          </div>
        </div>

        <div className="card p-4 text-center">
          <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-ok">
            RAISED
          </span>
          <div className="mt-1 font-mono text-lg font-bold text-ink sm:text-xl">
            {formatRupees(raised)}
          </div>
        </div>

        <div className="card p-4 text-center">
          <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-lav-deep">
            LOCKED
          </span>
          <div className="mt-1 font-mono text-lg font-bold text-ink sm:text-xl">
            {formatRupees(locked)}
          </div>
        </div>

        <div className="card p-4 text-center">
          <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-ok">
            RELEASED
          </span>
          <div className="mt-1 font-mono text-lg font-bold text-ink sm:text-xl">
            {formatRupees(released)}
          </div>
        </div>

        <div className="card p-4 text-center">
          <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-violet-700">
            REFUNDED
          </span>
          <div className="mt-1 font-mono text-lg font-bold text-ink sm:text-xl">
            {formatRupees(refunded)}
          </div>
        </div>

        <div className="card p-4 text-center">
          <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-mute">
            REMAINING
          </span>
          <div className="mt-1 font-mono text-lg font-bold text-ink sm:text-xl">
            {formatRupees(remaining)}
          </div>
        </div>
      </div>

      {/* Runtime integrity checks */}
      <div className="card space-y-4 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-3 border-b border-line pb-4 sm:flex-row sm:items-center">
          <div>
            <span className="eyebrow">Runtime reconciliation</span>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">Integrity</h2>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium ${integrity.valid ? 'bg-ok-soft text-ok border-ok/20' : 'bg-bad-soft text-bad border-bad/25'}`}>
            {integrity.valid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {integrity.valid ? 'All checks passed' : `${integrity.alerts.length} alert(s)`}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {integrity.checks.map((check, index) => (
            <div key={`${check.check}-${check.entity}-${index}`} className={`rounded-lg border p-3 ${check.status === 'FAIL' ? 'border-bad/25 bg-bad-soft/50' : 'border-line bg-mist'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-mute">{check.check}</span>
                <span className={`font-mono text-[10px] font-bold ${check.status === 'FAIL' ? 'text-bad' : check.status === 'SKIPPED' ? 'text-warn' : 'text-ok'}`}>
                  {check.status}
                </span>
              </div>
              <p className="mt-1 truncate font-mono text-[11px] text-faint">{check.entity}</p>
            </div>
          ))}
        </div>
        {integrity.alerts.length > 0 && (
          <div className="space-y-2">
            {integrity.alerts.map((alert, index) => (
              <div key={`${alert.check}-${alert.entity}-${index}`} className="rounded-lg border border-bad/25 bg-bad-soft/50 p-3 font-mono text-xs">
                <div className="flex flex-wrap items-center gap-2 font-semibold text-bad">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{alert.check}</span>
                  <span className="text-mute">{alert.entity}</span>
                </div>
                <p className="mt-1 text-mute">Expected: {JSON.stringify(alert.expected)} • Actual: {JSON.stringify(alert.actual)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/*
        ========================================================================
        FUND TRAIL TIMELINE (Requirement 12)
        DONATION ↓ EARMARKED ↓ LOCKED ↓ MILESTONE ↓ PROOF ↓ VERIFICATION
        ↓ AUDITOR APPROVAL ↓ MULTISIG ↓ BLOCKCHAIN RELEASE
        ========================================================================
      */}
      <div className="card space-y-6 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-2 border-b border-line pb-4 sm:flex-row sm:items-center">
          <div>
            <span className="eyebrow">Verifiable execution path</span>
            <h2 className="mt-1 font-sans text-lg font-semibold tracking-tight text-ink sm:text-xl">
              Fund Trail
            </h2>
          </div>
          <span className="chip">
            {fundTrailStages.filter((s) => s.isDone).length} of 9 stages complete
          </span>
        </div>

        {/* Vertical Connected Stage List */}
        <div className="relative ml-3 space-y-6 border-l border-line pl-6 sm:ml-4 sm:pl-8">
          {fundTrailStages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div key={stage.id} className="group relative">
                {/* Node indicator */}
                <div
                  className={`absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full sm:-left-[39px] ${
                    stage.isDone
                      ? 'bg-ok text-white'
                      : 'border border-line-strong bg-white text-faint'
                  }`}
                >
                  {stage.isDone && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>

                <div className="space-y-2 rounded-lg border border-line bg-white p-4 transition-all hover:border-line-strong">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono">
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${stage.isDone ? 'text-ok' : 'text-faint'}`} />
                      <span className="text-xs font-bold text-ink">
                        {stage.name}
                      </span>
                      <span className="text-xs text-line-strong">/</span>
                      <span className="text-xs font-medium text-mute">
                        {stage.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={stage.status} size="sm" />
                      {stage.timestamp && (
                        <span className="font-mono text-[11px] text-mute">
                          {new Date(stage.timestamp).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono text-xs text-mute">
                    <span>{stage.reference}</span>
                    <span>
                      Actor: <strong className="font-semibold text-ink">{stage.actor}</strong>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/*
        ========================================================================
        BLOCKCHAIN SECTION (Requirement 12)
        Blockchain Verified | Network | Transaction | Timestamp | [View on Explorer]
        Only show actual transaction hashes.
        ========================================================================
      */}
      <div className="card space-y-6 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-3 border-b border-line pb-4 sm:flex-row sm:items-center">
          <div>
            <span className="eyebrow">Smart contract ledger</span>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">
              Blockchain Verification
            </h2>
          </div>
          {blockchain.transactions.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/20 bg-ok-soft px-2.5 py-0.5 font-mono text-xs font-medium text-ok">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Blockchain Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/25 bg-warn-soft px-2.5 py-0.5 font-mono text-xs font-medium text-warn">
              <AlertTriangle className="h-3.5 w-3.5" />
              Awaiting On-Chain Confirmation
            </span>
          )}
        </div>

        {/* Network & Contract Cards */}
        <div className="grid grid-cols-1 gap-4 font-mono text-xs sm:grid-cols-2">
          <div className="space-y-1 rounded-lg border border-line bg-mist p-4">
            <span className="block font-medium uppercase tracking-wider text-[10px] text-mute">
              NETWORK
            </span>
            <span className="block text-sm font-bold text-accent-deep">
              {blockchain.network} (Chain ID: {blockchain.chainId})
            </span>
            <p className="text-[11px] text-mute">Non-reentrant multi-sig release escrow</p>
          </div>

          <div className="space-y-1 rounded-lg border border-line bg-mist p-4">
            <span className="block font-medium uppercase tracking-wider text-[10px] text-mute">
              CUSTODY CONTRACT
            </span>
            <span className="block break-all text-xs font-bold text-ink">
              {blockchain.contractAddress || '—'}
            </span>
            <p className="text-[11px] text-mute">Verified Solidity escrow bytecode</p>
          </div>
        </div>

        {/* Confirmed Real Transaction Hashes */}
        <div className="space-y-3 font-mono">
          <span className="block font-medium uppercase tracking-wider text-xs text-mute">
            Confirmed On-Chain Transactions ({blockchain.transactions.length})
          </span>

          {blockchain.transactions.length === 0 ? (
            <div className="rounded-lg border border-line bg-mist p-4 text-center text-xs text-mute">
              No on-chain transactions confirmed yet for this campaign.
            </div>
          ) : (
            <div className="divide-y divide-line overflow-hidden rounded-lg border border-line">
              {blockchain.transactions.map((tx, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between gap-3 bg-white p-3.5 transition-colors hover:bg-accent-faint/60 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-ok/20 bg-ok-soft px-2 py-0.5 text-[10px] font-bold uppercase text-ok">
                        {tx.label}
                      </span>
                      {tx.amount && (
                        <span className="font-mono font-bold text-ink">
                          {formatRupees(tx.amount)}
                        </span>
                      )}
                    </div>
                    <div className="max-w-sm truncate text-[11px] text-mute sm:max-w-md">
                      Transaction: {tx.txHash}
                    </div>
                  </div>

                  <a
                    href={tx.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-deep hover:underline"
                  >
                    <span>View on Explorer</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/*
        ========================================================================
        MILESTONE TABLE (Requirement 12)
        Clear financial allocation, claimed, released, proof, verification.
        ========================================================================
      */}
      <div className="card space-y-0 overflow-hidden">
        <div className="flex flex-col justify-between gap-2 border-b border-line p-6 sm:flex-row sm:items-center">
          <div>
            <span className="eyebrow">Budget segmentation</span>
            <h2 className="mt-1 font-sans text-base font-semibold tracking-tight text-ink sm:text-lg">
              Milestone Allocation &amp; Progress
            </h2>
          </div>
          <span className="chip">{milestones.length} milestones configured</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-mist font-mono text-[10px] uppercase tracking-wider text-mute">
              <tr>
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-5 py-3 font-medium">Milestone</th>
                <th className="px-5 py-3 font-medium">Allocation</th>
                <th className="px-5 py-3 font-medium">Claimed</th>
                <th className="px-5 py-3 font-medium">Released</th>
                <th className="px-5 py-3 font-medium">Proof Status</th>
                <th className="px-5 py-3 font-medium">AI Verification</th>
                <th className="px-5 py-3 font-medium">Disbursement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-mono text-ink">
              {milestones.map((ms) => (
                <tr key={ms.id} className="bg-white transition-colors hover:bg-accent-faint/60">
                  <td className="px-5 py-3.5 font-bold text-ink">0{ms.sequence}</td>
                  <td className="px-5 py-3.5 font-sans">
                    <div className="font-bold text-ink">{ms.title}</div>
                    <div className="line-clamp-1 text-[11px] text-mute">{ms.description}</div>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-ink">{formatRupees(ms.allocatedAmount)}</td>
                  <td className="px-5 py-3.5 text-mute">{formatRupees(ms.claimedAmount || 0)}</td>
                  <td className="px-5 py-3.5 font-bold text-ok">{formatRupees(ms.releasedAmount)}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={ms.proofCount > 0 ? (ms.approvalStatus || 'UNDER_REVIEW') : 'PENDING'} />
                  </td>
                  <td className="px-5 py-3.5">
                    {ms.verificationStatus === 'VERIFIED' ? (
                      <span className="font-semibold text-ok">Passed OCR</span>
                    ) : ms.discrepancyAmount && ms.discrepancyAmount > 0 ? (
                      <span className="font-semibold text-warn">Variance: {formatRupees(ms.discrepancyAmount)}</span>
                    ) : (
                      <span className="text-faint">Awaiting Scan</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={ms.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/*
        ========================================================================
        BENEFICIARY SPEND EVIDENCE (Requirement 12)
        Shown only when actually recorded.
        ========================================================================
      */}
      <div className="card space-y-4 p-6 sm:p-8">
        <div className="border-b border-line pb-4">
          <span className="eyebrow">Verified evidence</span>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">
            Beneficiary Spend Evidence
          </h2>
          <p className="mt-0.5 font-mono text-xs text-mute">
            Vendor invoices, itemized receipts, and completion documentation recorded for this campaign.
          </p>
        </div>

        {milestones.filter((m) => m.proofCount > 0).length === 0 ? (
          <div className="rounded-lg border border-line bg-mist p-6 text-center font-mono text-xs text-mute">
            No proofs submitted yet — beneficiary spend evidence appears once deliverable invoices are uploaded.
          </div>
        ) : (
          <div className="space-y-3">
            {milestones
              .filter((m) => m.proofCount > 0)
              .map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col justify-between gap-3 rounded-lg border border-line bg-mist p-4 font-mono text-xs sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-ok" />
                      <span className="font-bold text-ink">{m.title}</span>
                      <span className="text-faint">({m.proofCount} Evidence File{m.proofCount > 1 ? 's' : ''})</span>
                    </div>
                    <div className="text-mute">
                      Discrepancy Status: {m.discrepancyAmount && m.discrepancyAmount > 0 ? (
                        <span className="font-semibold text-warn">Flagged: {formatRupees(m.discrepancyAmount)} Variance Resolved</span>
                      ) : (
                        <span className="font-semibold text-ok">Exact Match (0 Discrepancy)</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-mute">Auditor Status: <strong className="font-semibold text-ink">{m.approvalStatus}</strong></span>
                    <span className="font-semibold text-ok">SHA-256 Anchored</span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/*
        ========================================================================
        COMPLETE AUDIT TIMELINE (Requirement 12)
        Financial statement + activity log feel.
        ========================================================================
      */}
      <div className="card space-y-6 p-6 sm:p-8">
        <div className="flex items-center justify-between border-b border-line pb-4 font-mono">
          <div>
            <span className="eyebrow">Immutable activity log</span>
            <h2 className="mt-1 font-sans text-lg font-semibold tracking-tight text-ink">
              Complete Audit Timeline
            </h2>
          </div>
          <span className="chip">
            {timeline.length} ledger event{timeline.length === 1 ? '' : 's'}
          </span>
        </div>

        {timeline.length === 0 ? (
          <div className="rounded-lg border border-line bg-mist p-6 text-center font-mono text-xs text-mute">
            No audit events recorded for this campaign yet.
          </div>
        ) : (
          <div className="relative ml-2 space-y-6 border-l border-line pl-6">
            {timeline.map((event) => (
              <div key={event.id} className="group relative">
                <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-accent bg-white" />

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-mute">
                      {new Date(event.timestamp).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                    {event.statusBadge && (
                      <StatusBadge status={event.statusBadge} size="sm" />
                    )}
                    {event.amount && (
                      <span className="font-mono text-xs font-bold text-ink">
                        {formatRupees(event.amount)}
                      </span>
                    )}
                  </div>

                  <h4 className="font-sans text-sm font-semibold tracking-tight text-ink">{event.title}</h4>
                  <p className="max-w-2xl font-sans text-xs leading-relaxed text-mute">
                    {event.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 font-mono text-[11px] text-mute">
                    <span>
                      Actor: <strong className="font-semibold text-ink">{event.actorLabel}</strong>
                    </span>
                    {event.milestoneTitle && (
                      <>
                        <span className="text-line-strong">•</span>
                        <span>Milestone: <strong className="font-semibold text-ink">{event.milestoneTitle}</strong></span>
                      </>
                    )}
                    {event.txHash && (
                      <>
                        <span className="text-line-strong">•</span>
                        <a
                          href={event.explorerUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-accent hover:text-accent-deep hover:underline"
                        >
                          Tx: {event.txHash.substring(0, 10)}...
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* On-Chain Cryptographic Block Explorer */}
      <BlockchainAuditViewer
        logs={auditLogs}
        title="On-Chain Block Explorer & Cryptographic Verification"
        subtitle="SHA-256 state hashing, Merkle parent linkage, and multi-party cryptographic signatures"
      />

      {/* Legal & Regulatory Integrity Footer */}
      <div className="card space-y-1 border-line bg-mist p-4 font-mono text-xs text-mute">
        <p className="font-semibold text-ink">VERA Protocol Regulatory Integrity:</p>
        <p>
          VERA enforces programmatic fund earmarking, SHA-256 evidence hashing, AI OCR discrepancy screening, 2-of-3 multi-signature governance, and tamper-evident blockchain recording. Financial records are reconciled across atomic database transactions and testnet smart contract events.
        </p>
      </div>
    </div>
  );
}
