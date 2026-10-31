import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAuditorReviewQueue } from '@/lib/proofs';
import {
  ShieldCheck,
  AlertTriangle,
  FileSearch,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { formatRupees } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AuditorDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'AUDITOR' && user.role !== 'ADMIN') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="card border-bad/20 bg-bad-soft/40 p-8 space-y-3">
          <ShieldAlert className="w-10 h-10 text-bad mx-auto" />
          <h2 className="text-lg font-bold text-bad">Access Restricted</h2>
          <p className="text-xs text-mute">
            The Auditor Hub is strictly restricted to certified AUDITOR and ADMIN accounts.
          </p>
          <Link href="/" className="btn-secondary mt-4 !text-xs">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const proofs = await getAuditorReviewQueue();

  const pendingCount = proofs.filter(
    (p) => p.status === 'UNDER_REVIEW' || p.status === 'SUBMITTED'
  ).length;
  const flaggedCount = proofs.filter(
    (p) => p.verification?.ai_status === 'FLAG' || (p.verification?.discrepancy_amount || 0) > 0
  ).length;
  const approvedCount = proofs.filter((p) => p.status === 'APPROVED').length;
  const rejectedCount = proofs.filter((p) => p.status === 'REJECTED').length;

  const metrics = [
    {
      label: 'Pending review',
      value: pendingCount,
      hint: 'Awaiting human sign-off',
      Icon: Clock,
      tone: 'text-warn',
    },
    {
      label: 'Discrepancies',
      value: flaggedCount,
      hint: 'Line-item variance flagged',
      Icon: AlertTriangle,
      tone: 'text-bad',
    },
    {
      label: 'Approved',
      value: approvedCount,
      hint: 'Authorized for multisig',
      Icon: CheckCircle2,
      tone: 'text-ok',
    },
    {
      label: 'Rejected',
      value: rejectedCount,
      hint: 'Returned for correction',
      Icon: XCircle,
      tone: 'text-mute',
    },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 pb-20 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-line">
          <div className="space-y-2">
            <span className="eyebrow">Verification hub</span>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">
              Independent Auditor Workspace
            </h1>
            <p className="text-sm text-mute leading-relaxed">
              Review NGO milestone evidence, inspect OCR AI findings, and authorize or reject submissions.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-line bg-mist p-3 shrink-0">
            <ShieldCheck className="w-6 h-6 text-accent" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-mute">Certified Auditor</p>
              <p className="text-xs font-semibold text-ink">{user.name}</p>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map(({ label, value, hint, Icon, tone }) => (
            <div key={label} className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <span className={`font-mono text-[10px] uppercase tracking-wider font-semibold ${tone}`}>
                  {label}
                </span>
                <Icon className={`w-4 h-4 ${tone}`} />
              </div>
              <p className="font-mono text-2xl font-bold text-ink mt-1.5">{value}</p>
              <p className="text-[10px] text-faint mt-0.5">{hint}</p>
            </div>
          ))}
        </div>
      </div>

      {/*
        ========================================================================
        REVIEW QUEUE TABLE (Requirement 17)
        Campaign | Milestone | Claimed amount | Extracted amount | Difference | AI status | Submission date
        ========================================================================
      */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSearch className="w-4 h-4 text-accent" />
            <h2 className="text-base font-semibold tracking-tight text-ink">Review Queue</h2>
          </div>
          <span className="font-mono text-xs text-mute">{proofs.length} total records</span>
        </div>

        {proofs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-16 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-mist text-ok">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <p className="text-sm font-semibold text-ink">Review queue clear</p>
            <p className="max-w-sm text-xs text-mute">
              No milestone proofs are currently awaiting auditor verification.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-mist font-mono text-[10px] uppercase tracking-wider text-mute">
                <tr>
                  <th className="py-3 px-5 font-medium">Campaign</th>
                  <th className="py-3 px-5 font-medium">Milestone</th>
                  <th className="py-3 px-5 text-right font-medium">Claimed Amount</th>
                  <th className="py-3 px-5 text-right font-medium">Extracted Amount</th>
                  <th className="py-3 px-5 text-right font-medium">Difference</th>
                  <th className="py-3 px-5 text-center font-medium">AI Status</th>
                  <th className="py-3 px-5 text-center font-medium">Submission Date</th>
                  <th className="py-3 px-5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {proofs.map((proof) => {
                  const ver = proof.verification;
                  const claimedNum = Number(proof.claimed_amount);
                  const extractedNum = ver?.extracted_amount ? Number(ver.extracted_amount) : null;
                  const diff = extractedNum !== null ? Math.abs(claimedNum - extractedNum) : (ver?.discrepancy_amount ? Number(ver.discrepancy_amount) : 0);
                  const hasDiscrepancy = diff > 0;

                  return (
                    <tr key={proof.id} className="bg-white transition-colors hover:bg-accent-faint/60">
                      <td className="py-3.5 px-5">
                        <span className="font-semibold text-ink block truncate max-w-xs">
                          {proof.campaign_title}
                        </span>
                        <span className="font-mono text-[11px] text-mute block mt-0.5 truncate">
                          {proof.ngo_name}
                        </span>
                      </td>

                      <td className="py-3.5 px-5">
                        <span className="font-medium text-ink block truncate max-w-xs">
                          {proof.milestone_title}
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-right font-mono font-semibold text-ink">
                        {formatRupees(claimedNum)}
                      </td>

                      <td className="py-3.5 px-5 text-right font-mono text-mute">
                        {extractedNum !== null ? formatRupees(extractedNum) : '—'}
                      </td>

                      <td className="py-3.5 px-5 text-right font-mono">
                        {hasDiscrepancy ? (
                          <span className="font-semibold text-warn">
                            +{formatRupees(diff)}
                          </span>
                        ) : (
                          <span className="font-semibold text-ok">₹0 (Match)</span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-center">
                        <StatusBadge
                          status={ver?.ai_status === 'FLAG' ? 'UNDER REVIEW' : (ver?.ai_status || 'PENDING')}
                          size="sm"
                        />
                      </td>

                      <td className="py-3.5 px-5 text-center font-mono text-mute">
                        {new Date(proof.submitted_at).toLocaleDateString('en-IN', {
                          dateStyle: 'medium',
                        })}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <Link
                          href={`/auditor/reviews/${proof.id}`}
                          className="btn-primary !px-3 !py-1.5 !text-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
