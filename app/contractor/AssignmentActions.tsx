'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Loader2 } from 'lucide-react';

export function AssignmentActions({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<'ACCEPTED' | 'DECLINED' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const respond = async (decision: 'ACCEPTED' | 'DECLINED') => {
    setLoading(decision);
    setError(null);
    try {
      const res = await fetch(`/api/hisaab/assignments/${assignmentId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to respond');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <button onClick={() => respond('ACCEPTED')} disabled={loading !== null} className="btn-primary !px-3 !py-1.5 !text-[11px]">
          {loading === 'ACCEPTED' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Accept job
        </button>
        <button
          onClick={() => respond('DECLINED')}
          disabled={loading !== null}
          className="rounded-lg border border-bad/25 bg-bad-soft px-3 py-1.5 font-mono text-[11px] font-semibold text-bad"
        >
          {loading === 'DECLINED' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          Decline
        </button>
      </div>
      {error && <p className="text-[10px] text-bad">{error}</p>}
    </div>
  );
}
