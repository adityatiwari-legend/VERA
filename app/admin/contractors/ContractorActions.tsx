'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Ban, Loader2, Undo2 } from 'lucide-react';

export function ContractorActions({ contractorId, status }: { contractorId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = async (next: 'APPROVED' | 'SUSPENDED' | 'PENDING') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/hisaab/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractor_id: contractorId, status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update contractor');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        {status !== 'APPROVED' && (
          <button
            onClick={() => set('APPROVED')}
            disabled={loading}
            className="btn-primary !px-3 !py-1.5 !text-[11px]"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Approve
          </button>
        )}
        {status === 'APPROVED' && (
          <button
            onClick={() => set('SUSPENDED')}
            disabled={loading}
            className="rounded-lg border border-bad/25 bg-bad-soft px-3 py-1.5 font-mono text-[11px] font-semibold text-bad"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
            Suspend
          </button>
        )}
        {status === 'SUSPENDED' && (
          <button onClick={() => set('PENDING')} disabled={loading} className="btn-secondary !px-3 !py-1.5 !text-[11px]">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
            Reset to pending
          </button>
        )}
      </div>
      {error && <p className="text-[10px] text-bad">{error}</p>}
    </div>
  );
}
