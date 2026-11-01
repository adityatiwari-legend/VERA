'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {Milestone, MilestoneStatus, UserRole } from '@/types';
import {
  Milestone as MilestoneIcon,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Play,
  FileCheck,
  Clock,
} from 'lucide-react';
import { BlockchainBadge } from '@/components/BlockchainBadge';
import { RefundButton } from './RefundButton';
import { MilestoneReleaseTracker } from '@/components/MilestoneReleaseTracker';
import { StatusBadge } from '@/components/StatusBadge';
import { formatRupees } from '@/lib/utils';

interface MilestoneManagerProps {
  campaignId: string;
  targetAmount: number;
  milestones: Milestone[];
  isEditable: boolean;
  currentUser: { id: string; role: UserRole; name: string };
}

export const MilestoneManager: React.FC<MilestoneManagerProps> = ({
  campaignId,
  targetAmount,
  milestones,
  isEditable,
  currentUser,
}) => {
  const router = useRouter();

  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [proofRequired, setProofRequired] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAllocated = milestones.reduce((sum, m) => sum + Number(m.amount), 0);
  const unallocated = Math.max(0, targetAmount - totalAllocated);

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid positive milestone amount');
      return;
    }

    if (numAmount > unallocated) {
      setError(`Milestone amount exceeds unallocated campaign funding (${formatRupees(unallocated)} remaining)`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          amount: numAmount,
          proof_required: proofRequired,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        let msg = data.error || 'Failed to create milestone';
        if (data.details) {
          const detailMsgs = Object.entries(data.details)
            .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(', ') : errs}`)
            .join('; ');
          if (detailMsgs) msg += ` — ${detailMsgs}`;
        }
        throw new Error(msg);
      }

      setTitle('');
      setDescription('');
      setAmount('');
      setShowAddForm(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartMilestone = async (milestoneId: string) => {
    if (!confirm('Start this milestone? Status will transition from LOCKED to IN_PROGRESS.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/milestones/${milestoneId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start milestone');
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-line p-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <MilestoneIcon className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-ink">Campaign Milestones (Phase 2/3)</h2>
          </div>
          <p className="mt-1 font-mono text-xs text-mute">
            Allocated: {formatRupees(totalAllocated)} of {formatRupees(targetAmount)} ({unallocated <= 0 ? 'Fully Allocated' : `${formatRupees(unallocated)} unallocated`})
          </p>
        </div>

        {isEditable && unallocated > 0 && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary !px-3 !py-1.5 !text-xs self-start sm:self-auto"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Add Milestone
          </button>
        )}
      </div>

      {error && (
        <div className="m-5 flex items-center gap-2 rounded-lg border border-bad/20 bg-bad-soft p-3 text-xs text-bad">
          <AlertCircle className="h-4 w-4 shrink-0 text-bad" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Milestone Form */}
      {showAddForm && (
        <form onSubmit={handleCreateMilestone} className="space-y-3.5 border-b border-line bg-mist p-5">
          <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink">
            Define New Milestone
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label-text !text-[11px]">
                Milestone Title <span className="text-accent">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Electrical Work & Wiring"
                className="input !py-2 !text-xs"
              />
            </div>

            <div>
              <label className="label-text !text-[11px]">
                Allocated Amount (INR ₹) <span className="text-accent">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={unallocated}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Max: ${unallocated}`}
                className="input !py-2 !font-mono !text-xs font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="label-text !text-[11px]">
              Description & Verification Criteria <span className="text-accent">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail the materials to be purchased, contractors involved, and verification criteria for proof upload..."
              className="input !py-2 !text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="proofRequired"
              checked={proofRequired}
              onChange={(e) => setProofRequired(e.target.checked)}
              className="h-4 w-4 rounded border-line accent-accent"
            />
            <label htmlFor="proofRequired" className="text-xs font-medium text-ink">
              Require documentary evidence (receipts/invoices) before fund release
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="btn-secondary !px-3 !py-1.5 !text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary !px-3 !py-1.5 !text-xs"
            >
              {loading ? 'Saving...' : 'Save Milestone'}
            </button>
          </div>
        </form>
      )}

      {/* Milestones List */}
      {milestones.length === 0 ? (
        <div className="p-10 text-center font-mono text-xs text-faint">
          No milestones defined yet. Click "Add Milestone" to configure funding phases.
        </div>
      ) : (
        <div className="divide-y divide-line">
          {milestones.map((ms) => (
            <div key={ms.id} className="flex flex-col justify-between gap-4 p-5 transition-colors hover:bg-mist sm:flex-row sm:items-center">
              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-accent/20 bg-accent-faint font-mono text-xs font-bold text-accent-deep">
                    {ms.sequence}
                  </span>
                  <h3 className="text-sm font-semibold text-ink">{ms.title}</h3>
                  <StatusBadge status={ms.status} />
                  {ms.blockchain_status && (
                    <BlockchainBadge status={ms.blockchain_status} />
                  )}
                  {ms.blockchain_status === 'NOT_SUBMITTED' && (
                    <span className="hidden rounded border border-warn/25 bg-warn-soft px-2 py-0.5 font-mono text-[10px] text-warn xs:inline-flex">
                      LEDGER-ONLY
                    </span>
                  )}
                  {ms.proof_required && (
                    <span className="hidden xs:inline-flex items-center gap-1 rounded border border-line bg-mist px-2 py-0.5 font-mono text-[10px] text-mute">
                      <FileCheck className="h-3 w-3 text-faint" /> Proof Required
                    </span>
                  )}
                </div>
                <p className="max-w-xl pl-7 text-xs leading-relaxed text-mute">
                  {ms.description}
                </p>

                {ms.status === 'FAILED' && (
                  <div className="mt-2 pl-7">
                    <RefundButton milestoneId={ms.id} amount={Number(ms.amount)} />
                  </div>
                )}

                {/* Phase 4: Multisig Release Tracker */}
                {(ms.status === 'APPROVED' || ms.status === 'RELEASED' || ms.release_request) && (
                  <div className="pl-7 pt-2">
                    <MilestoneReleaseTracker
                      milestone={ms}
                      currentUser={currentUser}
                      onRefresh={() => router.refresh()}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pl-7 sm:shrink-0 sm:justify-end sm:pl-0">
                <div className="text-left sm:text-right">
                  <span className="block font-mono text-sm font-bold text-ink">
                    {formatRupees(Number(ms.amount))}
                  </span>
                  <span className="font-mono text-[10px] text-faint">
                    {Math.round((Number(ms.amount) / targetAmount) * 100)}% of Goal
                  </span>
                </div>

                {isEditable && ms.status === 'LOCKED' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartMilestone(ms.id)}
                      disabled={loading}
                      title="Start Milestone (Transition to IN_PROGRESS)"
                      className="inline-flex items-center gap-1 rounded-lg border border-warn/30 bg-warn-soft px-3 py-1.5 font-mono text-xs font-semibold text-warn transition-colors hover:border-warn/60 disabled:opacity-50"
                    >
                      <Play className="h-3 w-3" />
                      Start
                    </button>
                    <a
                      href={`/org/campaigns/${campaignId}/milestones/${ms.id}/proof`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-accent-deep"
                    >
                      <FileCheck className="h-3.5 w-3.5" />
                      Submit Proof
                    </a>
                  </div>
                )}

                {isEditable && (ms.status === 'IN_PROGRESS' || ms.status === 'REJECTED') && (
                  <a
                    href={`/org/campaigns/${campaignId}/milestones/${ms.id}/proof`}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors ${
                      ms.status === 'REJECTED'
                        ? 'bg-bad hover:bg-bad/90'
                        : 'bg-accent hover:bg-accent-deep'
                    }`}
                  >
                    <FileCheck className="h-3.5 w-3.5" />
                    {ms.status === 'REJECTED' ? 'Resubmit Proof' : 'Submit Proof'}
                  </a>
                )}

                {ms.status === 'PROOF_SUBMITTED' && (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-warn/25 bg-warn-soft px-2.5 py-1 font-mono text-xs font-semibold text-warn">
                    <Clock className="h-3 w-3" />
                    Under Review
                  </span>
                )}

                {ms.status === 'APPROVED' && (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-ok/20 bg-ok-soft px-2.5 py-1 font-mono text-xs font-semibold text-ok">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </span>
                )}

                {ms.status === 'RELEASED' && (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-ok/20 bg-ok-soft px-2.5 py-1 font-mono text-xs font-semibold text-ok">
                    <CheckCircle2 className="h-3 w-3" />
                    Released
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
