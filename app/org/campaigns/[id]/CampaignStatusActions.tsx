'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CampaignStatus } from '@/types';
import { Play, Pause, CheckCheck, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface CampaignStatusActionsProps {
  campaignId: string;
  currentStatus: CampaignStatus;
}

export const CampaignStatusActions: React.FC<CampaignStatusActionsProps> = ({
  campaignId,
  currentStatus,
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: CampaignStatus) => {
    if (!confirm(`Are you sure you want to change status to "${newStatus}"?`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED') {
    return (
      <span className="font-mono text-xs italic text-faint">
        Status is terminal ({currentStatus}). No further status transitions permitted.
      </span>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-bad/20 bg-bad-soft p-2.5 text-xs text-bad">
          <AlertTriangle className="h-4 w-4 shrink-0 text-bad" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {currentStatus === 'DRAFT' && (
          <button
            onClick={() => handleStatusChange('ACTIVE')}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 font-mono text-xs font-semibold text-white transition-colors hover:bg-accent-deep disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Activate Campaign
          </button>
        )}

        {currentStatus === 'ACTIVE' && (
          <>
            <button
              onClick={() => handleStatusChange('PAUSED')}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-warn/30 bg-warn-soft px-3 py-1.5 font-mono text-xs font-semibold text-warn transition-colors hover:border-warn/60 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
              Pause Campaign
            </button>
            <button
              onClick={() => handleStatusChange('COMPLETED')}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent-faint px-3 py-1.5 font-mono text-xs font-semibold text-accent-deep transition-colors hover:border-accent/60 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              Mark Completed
            </button>
          </>
        )}

        {currentStatus === 'PAUSED' && (
          <button
            onClick={() => handleStatusChange('ACTIVE')}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 font-mono text-xs font-semibold text-white transition-colors hover:bg-accent-deep disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Resume Active
          </button>
        )}

        <button
          onClick={() => handleStatusChange('CANCELLED')}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-bad/30 bg-bad-soft px-3 py-1.5 font-mono text-xs font-semibold text-bad transition-colors hover:border-bad/60 disabled:opacity-50"
        >
          <XCircle className="h-3.5 w-3.5" />
          Cancel Campaign
        </button>
      </div>
    </div>
  );
};
