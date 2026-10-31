'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProofStatus } from '@/types';
import { CheckCircle2, XCircle, AlertCircle, Loader2, MessageSquare, RotateCcw } from 'lucide-react';

interface AuditorActionFormProps {
  proofId: string;
  currentStatus: ProofStatus;
}

export const AuditorActionForm: React.FC<AuditorActionFormProps> = ({
  proofId,
  currentStatus,
}) => {
  const router = useRouter();

  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isClosed = currentStatus === 'APPROVED' || currentStatus === 'REJECTED';

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to APPROVE this proof evidence? Note: In Phase 3, this verifies evidence integrity. Fund release occurs via 2-of-3 multisig.')) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/proofs/${proofId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: comment.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve proof.');
      }

      setSuccessMessage('Proof evidence successfully APPROVED. Milestone status updated for multisig consensus.');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred during approval.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestResubmission = async () => {
    if (!comment || comment.trim().length === 0) {
      setError('Please provide feedback explaining what needs to be corrected for resubmission.');
      return;
    }

    if (!confirm('Request evidence resubmission from the NGO?')) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/proofs/${proofId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: `[Resubmission Requested] ${comment.trim()}` }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to request resubmission.');
      }

      setSuccessMessage('Resubmission requested. NGO has been notified to provide corrected evidence.');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!comment || comment.trim().length === 0) {
      setError('A rejection reason/comment is required so the NGO can review audit findings.');
      return;
    }

    if (!confirm('Reject this proof evidence? This will be permanently recorded in the immutable audit log.')) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/proofs/${proofId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: `[Rejected] ${comment.trim()}` }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reject proof.');
      }

      setSuccessMessage('Proof evidence REJECTED. NGO milestone status updated to REJECTED.');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred during rejection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isClosed) {
    return (
      <div
        className={`rounded-xl border p-5 ${
          currentStatus === 'APPROVED'
            ? 'border-ok/20 bg-ok-soft'
            : 'border-bad/20 bg-bad-soft'
        }`}
      >
        <div className={`flex items-center gap-2 font-semibold text-sm ${currentStatus === 'APPROVED' ? 'text-ok' : 'text-bad'}`}>
          {currentStatus === 'APPROVED' ? (
            <CheckCircle2 className="w-4 h-4 text-ok" />
          ) : (
            <XCircle className="w-4 h-4 text-bad" />
          )}
          <span>Auditor Decision Recorded: {currentStatus}</span>
        </div>
        <p className="text-xs mt-1 text-mute">
          This evidence submission has been officially resolved. {currentStatus === 'APPROVED' ? 'Evidence is cryptographically verified.' : 'Returned to NGO for corrective action.'}
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6 sm:p-8 space-y-5">
      <div className="border-b border-line pb-4">
        <h3 className="text-base font-semibold tracking-tight text-ink">Auditor Formal Determination</h3>
        <p className="text-xs text-mute mt-0.5">
          Submit your binding audit verification. Rejection or resubmission requests require clear justification.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-bad/20 bg-bad-soft flex items-start gap-2.5 text-xs text-bad">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-lg border border-ok/20 bg-ok-soft flex items-start gap-2.5 text-xs text-ok">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Comment / Justification Box */}
      <div className="space-y-1.5">
        <label htmlFor={`auditor-notes-${proofId}`} className="font-mono text-[11px] uppercase tracking-wider text-mute flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-faint" />
          Auditor Findings & Notes
        </label>
        <textarea
          id={`auditor-notes-${proofId}`}
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Enter audit notes or specific findings (e.g., Extracted invoice amount ₹1,80,000 matches claimed amount. Tax invoice serial verified.)"
          disabled={isSubmitting}
          className="input !text-xs"
        />
        <p className="font-mono text-[11px] text-faint">
          Mandatory for rejection or resubmission. Recorded permanently in append-only audit trail.
        </p>
      </div>

      {/* Action Buttons: 3 actions matching Requirement 17 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        <button
          type="button"
          onClick={handleApprove}
          disabled={isSubmitting}
          className="btn-primary !py-2.5 !text-xs"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span>Approve Evidence</span>
        </button>

        <button
          type="button"
          onClick={handleRequestResubmission}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-warn/30 bg-warn-soft px-4 py-2.5 text-xs font-semibold text-warn transition-colors hover:bg-warn/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
          <span>Request Resubmission</span>
        </button>

        <button
          type="button"
          onClick={handleReject}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-bad/25 bg-bad-soft px-4 py-2.5 text-xs font-semibold text-bad transition-colors hover:bg-bad/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          <span>Reject Evidence</span>
        </button>
      </div>

      <p className="font-mono text-[11px] text-faint text-center">
        Escrow invariant: Approving evidence updates verification state. Fund release strictly requires 2-of-3 multisig consensus.
      </p>
    </div>
  );
};
