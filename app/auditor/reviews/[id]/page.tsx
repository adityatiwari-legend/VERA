import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getProofById } from '@/lib/proofs';
import { getAuditLogsForCampaign } from '@/lib/audit_log';
import { getMilestoneById } from '@/lib/milestones';
import { MilestoneReleaseTracker } from '@/components/MilestoneReleaseTracker';
import { BlockchainAuditViewer } from '@/components/BlockchainAuditViewer';
import { formatRupees } from '@/lib/utils';
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  History,
  ShieldAlert,
  Coins,
} from 'lucide-react';
import { AuditorActionForm } from './AuditorActionForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function AuditorReviewDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'AUDITOR' && user.role !== 'ADMIN') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="card border-bad/20 bg-bad-soft/40 p-8">
          <ShieldAlert className="w-10 h-10 text-bad mx-auto mb-3" />
          <h2 className="text-lg font-bold text-bad">Access Restricted</h2>
          <p className="text-xs text-mute mt-2">
            Only certified AUDITOR and ADMIN accounts may conduct evidence reviews.
          </p>
          <Link href="/" className="btn-secondary mt-6 !text-xs">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  let proof;
  try {
    proof = await getProofById(params.id, user);
  } catch (err: any) {
    notFound();
  }

  const [auditLogs, milestone] = await Promise.all([
    proof.campaign_id ? getAuditLogsForCampaign(proof.campaign_id) : Promise.resolve([]),
    proof.milestone_id ? getMilestoneById(proof.milestone_id) : Promise.resolve(null),
  ]);

  const ver = proof.verification;
  const claimed = Number(proof.claimed_amount);
  const detected = ver?.extracted_amount ? Number(ver.extracted_amount) : null;
  const discrepancy = Number(ver?.discrepancy_amount || 0);
  const hasDiscrepancy = discrepancy > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 pb-20 sm:px-6 lg:px-8">
      {/* Back to Dashboard */}
      <Link
        href="/auditor/dashboard"
        className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-mute hover:text-ink transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Auditor Dashboard
      </Link>

      {/* Overview Header */}
      <div className="card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-line">
          <div className="space-y-2">
            <span className="eyebrow">Auditor Examination #{proof.id.slice(0, 8)}</span>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">
              Milestone: {proof.milestone_title}
            </h1>
            <p className="text-sm text-mute flex flex-wrap items-center gap-2">
              <span>Campaign: {proof.campaign_title}</span>
              <span className="text-faint">•</span>
              <span>Submitted by {proof.ngo_name || 'ORGANIZATION'}</span>
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs font-semibold ${
                proof.status === 'APPROVED'
                  ? 'bg-ok-soft text-ok border-ok/20'
                  : proof.status === 'REJECTED'
                  ? 'bg-bad-soft text-bad border-bad/20'
                  : 'bg-warn-soft text-warn border-warn/25'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              {proof.status === 'APPROVED' ? 'APPROVED' : proof.status === 'REJECTED' ? 'REJECTED' : 'UNDER REVIEW'}
            </span>
            <span className="font-mono text-[10px] text-faint">
              Submitted {new Date(proof.submitted_at).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* NGO Expenditure Justification */}
        <div className="rounded-lg border border-line bg-mist/60 p-4 space-y-1.5 text-xs">
          <span className="font-mono text-[10px] uppercase tracking-wider text-mute block">
            NGO Expenditure Justification:
          </span>
          <p className="text-ink leading-relaxed">{proof.description}</p>
        </div>
      </div>

      {/* Discrepancy Alert */}
      {hasDiscrepancy && (
        <div className="rounded-lg border border-warn/25 bg-warn-soft p-3.5 flex items-start gap-2.5 text-xs text-warn">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Evidence Discrepancy Detected</p>
            <p className="mt-0.5 leading-relaxed">
              Extracted invoice amount ({formatRupees(detected || 0)}) differs from claimed utilisation ({formatRupees(claimed)}) by <strong>{formatRupees(discrepancy)}</strong>. Carefully review the attached invoices before taking action.
            </p>
          </div>
        </div>
      )}

      {/* Document-verification layout: evidence main area + verification side panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Financial Comparison & Discrepancy Board */}
          <section className="space-y-3">
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-mute">
              Financial Comparison & OCR Extraction
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* CLAIMED */}
              <div className="card p-4">
                <span className="font-mono text-[10px] font-semibold text-mute uppercase tracking-wider block">
                  Claimed utilisation
                </span>
                <span className="font-mono text-2xl font-bold text-ink block mt-1.5">
                  {formatRupees(claimed)}
                </span>
                <span className="font-mono text-[10px] text-faint mt-1 block">
                  Submitted by NGO
                </span>
              </div>

              {/* DETECTED */}
              <div className="card p-4">
                <span className="font-mono text-[10px] font-semibold text-accent-deep uppercase tracking-wider block">
                  Detected by OCR / AI
                </span>
                <span className="font-mono text-2xl font-bold text-accent-deep block mt-1.5">
                  {detected !== null ? formatRupees(detected) : '—'}
                </span>
                <span className="font-mono text-[10px] text-faint mt-1 block">
                  Confidence: {ver ? `${Math.round(ver.confidence * 100)}%` : 'N/A'}
                </span>
              </div>

              {/* DISCREPANCY */}
              <div
                className={`rounded-xl border p-4 ${
                  hasDiscrepancy
                    ? 'border-bad/20 bg-bad-soft'
                    : 'border-ok/20 bg-ok-soft'
                }`}
              >
                <span className={`font-mono text-[10px] font-semibold uppercase tracking-wider block ${hasDiscrepancy ? 'text-bad' : 'text-ok'}`}>
                  Discrepancy detected
                </span>
                <span className={`font-mono text-2xl font-bold block mt-1.5 ${hasDiscrepancy ? 'text-bad' : 'text-ok'}`}>
                  {hasDiscrepancy ? `+${formatRupees(discrepancy)}` : '₹0 (Match)'}
                </span>
                <span className={`font-mono text-[10px] mt-1 block font-semibold ${hasDiscrepancy ? 'text-bad' : 'text-ok'}`}>
                  {hasDiscrepancy ? '⚠ Discrepancy Flagged' : '✓ No Discrepancy'}
                </span>
              </div>
            </div>
          </section>

          {/* Uploaded Evidence Files & Cryptographic Fingerprints */}
          <section className="card overflow-hidden">
            <div className="p-5 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <h2 className="text-base font-semibold tracking-tight text-ink">
                  Cryptographically Fingerprinted Evidence ({proof.files?.length || 0})
                </h2>
              </div>
              <span className="font-mono text-[11px] text-faint">SHA-256 Tamper Evident</span>
            </div>

            {proof.files && proof.files.length > 0 ? (
              <div className="divide-y divide-line">
                {proof.files.map((file) => (
                  <div key={file.id} className="p-5 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-mist shrink-0">
                          {file.mime_type.includes('pdf') ? (
                            <FileText className="w-4 h-4 text-bad" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-accent" />
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold text-ink font-mono">{file.file_name}</p>
                            {file.integrity_failed && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-bad/20 bg-bad-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold text-bad">
                                <AlertTriangle className="w-3 h-3" /> MODIFIED
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-faint">
                            {file.mime_type} • {(file.file_size / 1024).toFixed(0)} KB • Uploaded {new Date(file.uploaded_at).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      <a
                        href={`/api/proof-files/${file.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary !px-3 !py-1.5 !text-xs shrink-0"
                      >
                        <span>Inspect Evidence</span>
                        <ExternalLink className="w-3 h-3 text-faint" />
                      </a>
                    </div>

                    {/* SHA-256 Hash Display */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-faint shrink-0">
                        SHA-256 Hash:
                      </span>
                      <code className="chip flex-1 select-all break-all !text-ink">
                        {file.sha256_hash}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center font-mono text-xs text-faint">
                No files available for this proof.
              </div>
            )}
          </section>

          {/* Auditor Formal Decision Component */}
          <AuditorActionForm
            proofId={proof.id}
            currentStatus={proof.status}
          />

          {/* Escrow Fund Release Governance Tracker */}
          <section className="card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/25 bg-accent-faint text-accent">
                  <Coins className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-ink">
                    Escrow Fund Release Governance (2-of-3 Multisig)
                  </h2>
                  <p className="text-xs text-mute">
                    Authorize, sign, and execute on-chain escrow release once evidence review is complete.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/25 bg-ok-soft px-3 py-1 font-mono text-xs font-semibold text-ok shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
                Multisig Custody
              </span>
            </div>

            {milestone ? (
              <MilestoneReleaseTracker
                milestone={milestone}
                currentUser={user}
              />
            ) : (
              <div className="p-4 text-center font-mono text-xs text-mute">
                Associated milestone information unavailable.
              </div>
            )}
          </section>

          {/* Immutable Blockchain Audit Trail for this Campaign */}
          <BlockchainAuditViewer
            logs={auditLogs}
            title="Campaign Immutable Audit Trail"
            subtitle="Verified chronological state transitions & cryptographic signatures"
          />
        </div>

        {/* Side panel: verification status & AI findings */}
        <aside className="space-y-6">
          <section className="card p-5 space-y-3">
            <h2 className="text-base font-semibold tracking-tight text-ink">Verification Status</h2>
            <div className="grid grid-cols-1 gap-2.5 text-[11px] font-mono">
              <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-mist/60 px-3 py-2">
                <span className="text-mute uppercase tracking-wider text-[10px]">AI Status</span>
                <span className="text-ink font-semibold">{ver?.ai_status || 'PENDING'}</span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-mist/60 px-3 py-2">
                <span className="text-mute uppercase tracking-wider text-[10px]">Confidence</span>
                <span className="text-ink font-semibold">{ver ? `${Math.round(ver.confidence * 100)}%` : 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-mist/60 px-3 py-2">
                <span className="text-mute uppercase tracking-wider text-[10px]">Duplicate Check</span>
                <span className={`font-semibold ${ver?.duplicate_detected ? 'text-bad' : 'text-ok'}`}>
                  {ver?.duplicate_detected ? 'Duplicate Found' : 'No duplicates'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-mist/60 px-3 py-2">
                <span className="text-mute uppercase tracking-wider text-[10px]">Discrepancy</span>
                <span className={`font-semibold ${hasDiscrepancy ? 'text-bad' : 'text-ok'}`}>
                  {hasDiscrepancy ? `+${formatRupees(discrepancy)}` : '₹0'}
                </span>
              </div>
            </div>
          </section>

          <section className="card p-5 space-y-3">
            <h2 className="text-base font-semibold tracking-tight text-ink">AI Extraction Findings</h2>
            <div className="grid grid-cols-1 gap-2.5 text-[11px] font-mono">
              <div>
                <span className="text-faint block text-[10px] uppercase tracking-wider">Extracted Vendor:</span>
                <span className="text-ink font-semibold">{ver?.extracted_vendor || 'N/A'}</span>
              </div>
              <div>
                <span className="text-faint block text-[10px] uppercase tracking-wider">Invoice Number:</span>
                <span className="text-ink font-semibold">{ver?.extracted_invoice_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-faint block text-[10px] uppercase tracking-wider">Document Date:</span>
                <span className="text-ink font-semibold">{ver?.extracted_date || 'N/A'}</span>
              </div>
            </div>
            {ver?.notes && (
              <p className="text-[11px] text-mute leading-relaxed pt-2.5 border-t border-line">
                {ver.notes}
              </p>
            )}
          </section>

          <section className="card p-5 space-y-3">
            <h2 className="text-base font-semibold tracking-tight text-ink">Related Milestone</h2>
            <div className="space-y-1.5 text-[11px] font-mono">
              <div>
                <span className="text-faint block text-[10px] uppercase tracking-wider">Milestone:</span>
                <span className="text-ink font-semibold">{proof.milestone_title}</span>
              </div>
              <div>
                <span className="text-faint block text-[10px] uppercase tracking-wider">Budget Cap:</span>
                <span className="text-ink font-semibold">{formatRupees(Number(proof.milestone_amount || 0))}</span>
              </div>
              <div>
                <span className="text-faint block text-[10px] uppercase tracking-wider">Campaign:</span>
                <span className="text-ink font-semibold">{proof.campaign_title}</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
