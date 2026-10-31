'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FolderPlus, AlertCircle } from 'lucide-react';

export default function NewCampaignPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE'>('DRAFT');

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          target_amount: parseFloat(targetAmount),
          beneficiary,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          setFieldErrors(data.details);
        }
        throw new Error(data.error || 'Failed to create campaign');
      }

      router.push(`/org/campaigns/${data.campaign.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16">
      <Link
        href="/org/campaigns"
        className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-mute transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to NGO Dashboard</span>
      </Link>

      <div className="card space-y-6 p-6 sm:p-8">
        <div className="flex items-center gap-3 border-b border-line pb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/20 bg-accent-faint text-accent">
            <FolderPlus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink">Create New Campaign</h1>
            <p className="mt-0.5 text-xs text-mute">
              Configure campaign deliverable metadata and financial target cap
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-bad/20 bg-bad-soft p-4 text-xs text-bad">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad" />
            <div className="flex-1">
              <p className="font-semibold">{error}</p>
              {Object.keys(fieldErrors).length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-bad/80">
                  {Object.entries(fieldErrors).map(([k, v]) => (
                    <li key={k}>{k}: {v.join(', ')}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="label-text">
              Campaign Title <span className="text-accent">*</span>
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Solar Water Purification for 10 Rural Schools"
              className="input"
            />
            <p className="text-[11px] text-faint">
              Concise, descriptive title identifying the initiative.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="label-text">
              Target Funding Goal (INR ₹) <span className="text-accent">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-faint">₹</span>
              <input
                type="number"
                required
                min={1}
                step={1}
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="500000"
                className="input !pl-8 font-semibold"
              />
            </div>
            <p className="text-[11px] text-faint">
              Must be positive. Raised and released balances strictly initialize at ₹0.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="label-text">
              Target Beneficiary <span className="text-accent">*</span>
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={200}
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              placeholder="e.g. 1,400 Primary School Students in Jaipur District"
              className="input"
            />
            <p className="text-[11px] text-faint">
              Who receives the physical deliverable or verified outcome.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="label-text">
              Detailed Description <span className="text-accent">*</span>
            </label>
            <textarea
              required
              rows={4}
              minLength={10}
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail the scope of work, expected impact, procurement schedule, and intended milestones..."
              className="input"
            />
          </div>

          <div className="space-y-1.5">
            <label className="label-text">Initial Campaign Status</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('DRAFT')}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                  status === 'DRAFT'
                    ? 'border-line-strong bg-mist text-ink'
                    : 'border-line bg-white text-mute hover:border-line-strong hover:text-ink'
                }`}
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => setStatus('ACTIVE')}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                  status === 'ACTIVE'
                    ? 'border-accent/25 bg-accent-faint text-accent-deep'
                    : 'border-line bg-white text-mute hover:border-line-strong hover:text-ink'
                }`}
              >
                Publish as Active
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
            <Link href="/org/campaigns" className="btn-secondary !px-4 !py-2 !text-xs">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary !px-5 !py-2.5 !text-xs"
            >
              {submitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <FolderPlus className="h-4 w-4" />
                  <span>Create Campaign</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
