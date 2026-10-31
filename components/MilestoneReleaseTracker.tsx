'use client';

import React, { useState } from 'react';
import { Milestone, ReleaseRequest, UserRole } from '@/types';
import { BlockchainBadge } from './BlockchainBadge';
import { formatRupees } from '@/lib/utils';
import { getExplorerTxUrl } from '@/lib/blockchain';
import { Check, Clock, ShieldCheck, ArrowUpRight, AlertCircle, Loader2 } from 'lucide-react';

interface MilestoneReleaseTrackerProps {
  milestone: Milestone;
  currentUser?: {
    id: string;
    role: UserRole;
    name: string;
  } | null;
  onRefresh?: () => void;
}

export const MilestoneReleaseTracker: React.FC<MilestoneReleaseTrackerProps> = ({
  milestone,
  currentUser,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>(milestone.amount.toString());

  const releaseRequest = milestone.release_request;
  const approvals = releaseRequest?.approvals || [];
  const currentApprovals = releaseRequest?.current_approvals || 0;
  const requiredApprovals = releaseRequest?.required_approvals || 2;
  const isReleased = milestone.status === 'RELEASED';
  const isReady = releaseRequest?.status === 'READY_TO_RELEASE';
  const isApproved = milestone.status === 'APPROVED' || milestone.active_proof_status === 'APPROVED';

  // Check if current user has already signed
  const hasUserSigned = currentUser
    ? approvals.some((a) => a.approver_id === currentUser.id)
    : false;

  const handleRequestRelease = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/milestones/${milestone.id}/release-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(customAmount) || milestone.amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initiate release request');
      setSuccessMsg('Release authorization request created. Awaiting 2-of-3 multisig signatures.');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignApproval = async () => {
    if (!releaseRequest) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/release-requests/${releaseRequest.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit signature');
      setSuccessMsg(data.message || 'Signature confirmed on-chain!');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteRelease = async () => {
    if (!releaseRequest) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/release-requests/${releaseRequest.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to execute fund release');
      setSuccessMsg('Funds successfully released on-chain and confirmed in database!');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const requestedAmount = releaseRequest ? Number(releaseRequest.requested_amount) : Number(milestone.amount);
  const txHash = releaseRequest?.blockchain_tx_hash;
  const explorerUrl = txHash ? getExplorerTxUrl(undefined, txHash) : null;

  return (
    <div className="card mt-3 space-y-4 p-5 text-left">
      {/* Header: RELEASE AUTHORIZATION */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-mute">
              Consensus Authorization
            </span>
            <span className="text-line-strong">•</span>
            <span className="font-mono text-[10px] text-accent">2-of-3 Multisig</span>
          </div>
          <h4 className="mt-0.5 text-sm font-semibold tracking-tight text-ink">
            RELEASE AUTHORIZATION
          </h4>
        </div>

        <div className="flex items-center gap-2">
          {isReleased ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-ok/25 bg-ok-soft px-2.5 py-1 font-mono text-xs font-semibold text-ok">
              <Check className="h-3.5 w-3.5" />
              RELEASED ON-CHAIN
            </span>
          ) : isReady ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-accent/25 bg-accent-faint px-2.5 py-1 font-mono text-xs font-semibold text-accent-deep">
              <ShieldCheck className="h-3.5 w-3.5" />
              READY FOR RELEASE
            </span>
          ) : releaseRequest ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-warn/25 bg-warn-soft px-2.5 py-1 font-mono text-xs font-semibold text-warn">
              <Clock className="h-3.5 w-3.5" />
              {currentApprovals} / {requiredApprovals} APPROVED
            </span>
          ) : (
            <span className="inline-flex items-center rounded border border-line bg-mist px-2 py-0.5 font-mono text-[11px] text-mute">
              Awaiting Request
            </span>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-bad/20 bg-bad-soft p-3 text-xs text-bad">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-ok/20 bg-ok-soft p-3 text-xs text-ok">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Financial Authorization Metric */}
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-line bg-mist p-4 sm:flex-row sm:items-center">
        <div>
          <span className="block font-mono text-[11px] uppercase tracking-wider text-mute">
            Authorized Tranche Release
          </span>
          <span className="mt-0.5 block font-mono text-2xl font-bold tracking-tight text-ink">
            {formatRupees(requestedAmount)}
          </span>
        </div>
        <div className="text-left font-mono text-xs text-mute sm:text-right">
          <div>Allocation Cap: {formatRupees(Number(milestone.amount))}</div>
          <div className="mt-0.5 text-[11px] text-faint">
            Required: <span className="font-semibold text-ink">{requiredApprovals} of 3 approvals</span>
          </div>
        </div>
      </div>

      {/* Multisig Signers Checklist (Requirement 18 format) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between font-mono text-xs text-mute">
          <span className="text-[10px] uppercase tracking-wider">Multi-Party Signers</span>
          <span className="text-[11px] font-bold text-ink">
            Status: {currentApprovals} / {requiredApprovals} Approved
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
          {/* Signer 1: NGO Admin */}
          {(() => {
            const isSigned = approvals.some((a) => a.approver_role === 'ORGANIZATION' || a.approver_role === 'ADMIN');
            return (
              <div
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  isSigned
                    ? 'border-ok/25 bg-ok-soft text-ink'
                    : 'border-line bg-white text-mute'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className={isSigned ? 'font-bold text-ok' : 'text-faint'}>
                    {isSigned ? '✓' : '○'}
                  </span>
                  <div className="truncate">
                    <span className="block font-semibold text-ink">NGO Admin</span>
                    <span className="font-mono text-[10px] text-faint">Entity Lead</span>
                  </div>
                </div>
                <span
                  className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold ${
                    isSigned
                      ? 'border border-ok/25 bg-white text-ok'
                      : 'border border-line bg-mist text-faint'
                  }`}
                >
                  {isSigned ? 'Signed' : 'Pending'}
                </span>
              </div>
            );
          })()}

          {/* Signer 2: Project Lead */}
          {(() => {
            const isSigned = approvals.length >= 2;
            return (
              <div
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  isSigned
                    ? 'border-ok/25 bg-ok-soft text-ink'
                    : 'border-line bg-white text-mute'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className={isSigned ? 'font-bold text-ok' : 'text-faint'}>
                    {isSigned ? '✓' : '○'}
                  </span>
                  <div className="truncate">
                    <span className="block font-semibold text-ink">Project Lead</span>
                    <span className="font-mono text-[10px] text-faint">Campaign Owner</span>
                  </div>
                </div>
                <span
                  className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold ${
                    isSigned
                      ? 'border border-ok/25 bg-white text-ok'
                      : 'border border-line bg-mist text-faint'
                  }`}
                >
                  {isSigned ? 'Signed' : 'Pending'}
                </span>
              </div>
            );
          })()}

          {/* Signer 3: Auditor */}
          {(() => {
            const isSigned = approvals.some((a) => a.approver_role === 'AUDITOR');
            return (
              <div
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  isSigned
                    ? 'border-ok/25 bg-ok-soft text-ink'
                    : 'border-line bg-white text-mute'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className={isSigned ? 'font-bold text-ok' : 'text-faint'}>
                    {isSigned ? '✓' : '○'}
                  </span>
                  <div className="truncate">
                    <span className="block font-semibold text-ink">Auditor</span>
                    <span className="font-mono text-[10px] text-faint">Independent</span>
                  </div>
                </div>
                <span
                  className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold ${
                    isSigned
                      ? 'border border-ok/25 bg-white text-ok'
                      : 'border border-line bg-mist text-faint'
                  }`}
                >
                  {isSigned ? 'Signed' : 'Pending'}
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Blockchain On-Chain Details if confirmed */}
      {isReleased && txHash && (
        <div className="space-y-1.5 rounded-lg border border-ok/25 bg-ok-soft p-3.5">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="font-bold text-ok">✓ RELEASED ON-CHAIN</span>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-deep hover:underline"
              >
                View on Explorer <ArrowUpRight className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="break-all rounded border border-line bg-white px-2 py-1 font-mono text-[11px] text-mute">
            Transaction: {txHash}
          </div>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-2">
        {!releaseRequest && isApproved && !isReleased && (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="input !w-36 !px-3 !py-2 !text-xs font-mono"
              placeholder="Release Amount"
              aria-label="Release amount"
            />
            <button
              onClick={handleRequestRelease}
              disabled={loading}
              className="btn-primary !px-4 !py-2 !text-xs"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              <span>Request Release</span>
            </button>
          </div>
        )}

        {releaseRequest && !isReleased && (
          <div className="flex flex-wrap items-center gap-2">
            {!hasUserSigned && currentUser && currentUser.role !== 'USER' && (
              <button
                onClick={handleSignApproval}
                disabled={loading}
                className="btn-primary !px-4 !py-2 !text-xs"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                <span>Sign Multisig Approval ({currentApprovals}/2)</span>
              </button>
            )}

            {isReady && (currentUser?.role === 'ORGANIZATION' || currentUser?.role === 'ADMIN') && (
              <button
                onClick={handleExecuteRelease}
                disabled={loading}
                className="btn-primary !px-4 !py-2 !text-xs"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span>Execute On-Chain Release</span>
              </button>
            )}
          </div>
        )}

        <div className="font-mono text-[11px] text-faint">
          Deterministic 2-of-3 escrow invariant enforced on-chain
        </div>
      </div>
    </div>
  );
};

export default MilestoneReleaseTracker;
