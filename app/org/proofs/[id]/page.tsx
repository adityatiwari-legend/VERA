import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getProofById } from '@/lib/proofs';
import {
  ArrowLeft,
  FileCheck,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Cpu,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { formatRupees } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function NgoProofDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  let proof;
  try {
    proof = await getProofById(params.id, user);
  } catch (err: any) {
    if (err.statusCode === 404 || err.name === 'NotFoundError') {
      notFound();
    }
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="space-y-3 rounded-xl border border-bad/25 bg-white p-8 shadow-card">
          <h2 className="text-lg font-semibold text-bad">Access Restricted</h2>
          <p className="text-xs text-mute">{err.message}</p>
          <Link
            href="/org/campaigns"
            className="btn-secondary mt-4 inline-flex items-center gap-2 !px-4 !py-2 !text-xs"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const ver = proof.verification;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      {/* Back Button */}
      <Link
        href={proof.campaign_id ? `/org/campaigns/${proof.campaign_id}` : '/org/campaigns'}
        className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-mute transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Campaign</span>
      </Link>

      {/* Header Card */}
      <div className="card space-y-6 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-start">
          <div className="space-y-1.5">
            <span className="eyebrow">
              Evidence Submission #{proof.id.slice(0, 8)}
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              Milestone: {proof.milestone_title}
            </h1>
            <p className="text-xs text-mute">
              Campaign: <strong className="text-ink">{proof.campaign_title}</strong>
            </p>
          </div>

          <div className="flex flex-col gap-1.5 sm:items-end">
            <StatusBadge status={proof.status} size="sm" />
            <span className="font-mono text-[10px] text-faint">
              Submitted: {new Date(proof.submitted_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            </span>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 gap-3 font-mono text-xs sm:grid-cols-3">
          <div className="rounded-lg border border-line bg-mist p-4">
            <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-mute">
              CLAIMED UTILISATION
            </span>
            <span className="mt-1 block text-base font-bold text-ink">
              {formatRupees(Number(proof.claimed_amount))}
            </span>
          </div>

          <div className="rounded-lg border border-line bg-mist p-4">
            <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-mute">
              MILESTONE ALLOCATION
            </span>
            <span className="mt-1 block text-base font-bold text-ink">
              {formatRupees(Number(proof.milestone_amount || 0))}
            </span>
          </div>

          <div className="rounded-lg border border-line bg-mist p-4">
            <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-mute">
              FUND RELEASE STATUS
            </span>
            <span
              className={`mt-1 block text-xs font-semibold ${
                proof.status === 'APPROVED' ? 'text-ok' : proof.status === 'REJECTED' ? 'text-bad' : 'text-warn'
              }`}
            >
              {proof.status === 'APPROVED' ? 'Proof Verified (Awaiting Multisig)' : proof.status === 'REJECTED' ? 'Rejected' : 'Under Review'}
            </span>
          </div>
        </div>

        {/* Submitted Description */}
        <div className="space-y-1.5 text-xs">
          <span className="block font-mono text-[11px] font-medium uppercase tracking-wider text-mute">
            Execution Justification:
          </span>
          <p className="rounded-lg border border-line bg-mist p-4 text-sm leading-relaxed text-ink">
            {proof.description}
          </p>
        </div>

        {/* Rejection Notice & Resubmission CTA */}
        {proof.status === 'REJECTED' && (
          <div className="space-y-3 rounded-lg border border-bad/20 bg-bad-soft p-4 text-xs">
            <div className="flex items-center gap-2 font-semibold text-bad">
              <XCircle className="h-4 w-4 text-bad" />
              <span>Evidence Rejected by Independent Auditor</span>
            </div>
            <p className="pl-6 leading-relaxed text-bad/90">
              <strong>Auditor Feedback:</strong> {proof.rejection_reason || 'No specific rejection comments provided.'}
            </p>
            <div className="pl-6 pt-1">
              <Link
                href={`/org/campaigns/${proof.campaign_id}/milestones/${proof.milestone_id}/proof`}
                className="inline-flex items-center gap-2 rounded-lg border border-bad/30 bg-white px-3.5 py-1.5 text-xs font-semibold text-bad transition-colors hover:border-bad/60"
              >
                <span>Submit Corrected Evidence</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 
        ========================================================================
        AI ANALYSIS CARD (Requirement 16)
        Amount | Date | Vendor | Invoice | Discrepancy
        ========================================================================
      */}
      {ver && (
        <div className="card space-y-5 p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink">
                AI Optical Character Analysis & Discrepancy Report
              </h2>
            </div>
            <StatusBadge status={ver.ai_status === 'FLAG' ? 'UNDER REVIEW' : ver.ai_status} size="sm" />
          </div>

          {/* Key Metrics Grid: Amount, Date, Vendor, Invoice, Discrepancy */}
          <div className="grid grid-cols-2 gap-3 font-mono text-xs sm:grid-cols-5">
            <div className="rounded-lg border border-line bg-mist p-3">
              <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-faint">
                EXTRACTED AMOUNT
              </span>
              <span className="mt-1 block text-sm font-bold text-ink">
                {ver.extracted_amount ? formatRupees(Number(ver.extracted_amount)) : '—'}
              </span>
            </div>

            <div className="rounded-lg border border-line bg-mist p-3">
              <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-faint">
                INVOICE DATE
              </span>
              <span className="mt-1 block truncate text-xs font-bold text-ink">
                {new Date(proof.submitted_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </span>
            </div>

            <div className="rounded-lg border border-line bg-mist p-3">
              <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-faint">
                VENDOR NAME
              </span>
              <span className="mt-1 block truncate text-xs font-bold text-ink">
                {ver.extracted_vendor || '—'}
              </span>
            </div>

            <div className="rounded-lg border border-line bg-mist p-3">
              <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-faint">
                INVOICE #
              </span>
              <span className="mt-1 block truncate text-xs font-bold text-ink">
                {ver.extracted_invoice_number || '—'}
              </span>
            </div>

            <div className="rounded-lg border border-line bg-mist p-3">
              <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-faint">
                DISCREPANCY
              </span>
              <span
                className={`mt-1 block text-sm font-bold ${
                  Number(ver.discrepancy_amount) > 0 ? 'text-warn' : 'text-ok'
                }`}
              >
                {formatRupees(Number(ver.discrepancy_amount))}
              </span>
            </div>
          </div>

          {/* Verification Notes */}
          {ver.notes && (
            <div className="space-y-1 rounded-lg border border-line bg-mist p-4 text-xs">
              <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-faint">
                OCR Scanner Findings:
              </span>
              <p className="leading-relaxed text-ink">{ver.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Uploaded Evidence Files with SHA-256 Fingerprints */}
      <div className="card overflow-hidden font-mono text-xs">
        <div className="flex items-center justify-between border-b border-line p-5">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink">
              Cryptographic Evidence Files ({proof.files?.length || 0})
            </h2>
          </div>
          <span className="chip">SHA-256 Digested</span>
        </div>

        {proof.files && proof.files.length > 0 ? (
          <div className="divide-y divide-line">
            {proof.files.map((file) => (
              <div key={file.id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="shrink-0 rounded bg-mist p-2 text-mute">
                    {file.mime_type.includes('pdf') ? (
                      <FileText className="h-4 w-4 text-accent-deep" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-accent" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="max-w-xs truncate font-bold text-ink sm:max-w-md">{file.file_name}</p>
                      {file.integrity_failed && (
                        <span className="inline-flex items-center gap-1 rounded border border-bad/20 bg-bad-soft px-1.5 py-0.5 text-[10px] font-bold text-bad">
                          <AlertTriangle className="h-3 w-3" /> MODIFIED
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-faint">
                      {file.mime_type} • {(file.file_size / 1024).toFixed(0)} KB
                    </p>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-faint">SHA-256:</span>
                      <code className="max-w-xs truncate rounded border border-line bg-mist px-1.5 py-0.5 font-mono text-[10px] text-mute sm:max-w-md">
                        {file.sha256_hash}
                      </code>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <a
                    href={`/api/proof-files/${file.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary !px-3 !py-1.5 !text-xs"
                  >
                    <span>Inspect</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-faint">
            No files attached to this proof record.
          </div>
        )}
      </div>
    </div>
  );
}
