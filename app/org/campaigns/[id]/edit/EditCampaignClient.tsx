'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Campaign } from '@/types';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

interface EditCampaignClientProps {
  campaign: Campaign;
}

export const EditCampaignClient: React.FC<EditCampaignClientProps> = ({ campaign }) => {
  const router = useRouter();

  const [title, setTitle] = useState(campaign.title);
  const [description, setDescription] = useState(campaign.description);
  const [targetAmount, setTargetAmount] = useState(campaign.target_amount.toString());
  const [beneficiary, setBeneficiary] = useState(campaign.beneficiary);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          target_amount: parseFloat(targetAmount),
          beneficiary,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          setFieldErrors(data.details);
        }
        throw new Error(data.error || 'Failed to update campaign');
      }

      router.push(`/org/campaigns/${campaign.id}`);
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
        href={`/org/campaigns/${campaign.id}`}
        className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-mute transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Campaign Details</span>
      </Link>

      <div className="card space-y-6 p-6 sm:p-8">
        <div className="border-b border-line pb-6">
          <h1 className="text-xl font-semibold tracking-tight text-ink">Edit Campaign Details</h1>
          <p className="mt-0.5 text-xs text-mute">
            Updating campaign will append an entry to the immutable audit trail
          </p>
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
              className="input"
            />
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
                className="input !pl-8 font-semibold"
              />
            </div>
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
              className="input"
            />
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
              className="input"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
            <Link
              href={`/org/campaigns/${campaign.id}`}
              className="btn-secondary !px-4 !py-2 !text-xs"
            >
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
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
