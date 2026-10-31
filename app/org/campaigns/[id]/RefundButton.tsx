'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Undo2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Refund a FAILED milestone back to the campaign ledger. Records real ledger
 * REFUND entries (and an on-chain refund when the chain is configured).
 */
export function RefundButton({ milestoneId, amount }: { milestoneId: string; amount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/milestones/${milestoneId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          reason: reason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refund failed');
      setDone(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <p className="flex items-center gap-1.5 font-mono text-[11px] text-ok">
        <CheckCircle2 className="h-3.5 w-3.5" /> Refunded to campaign balance
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-warn/30 bg-warn-soft px-2.5 py-1.5 font-mono text-[11px] font-semibold text-warn"
      >
        <Undo2 className="h-3.5 w-3.5" /> Refund milestone
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-line bg-mist p-3">
      {error && (
        <p className="flex items-center gap-1.5 text-[11px] text-bad">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why is this milestone being refunded?"
        className="input !py-1.5 !text-[11px]"
      />
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={loading}
          className="rounded-lg border border-bad/25 bg-bad-soft px-3 py-1.5 font-mono text-[11px] font-semibold text-bad"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
          Confirm refund
        </button>
        <button onClick={() => setOpen(false)} className="btn-secondary !px-3 !py-1.5 !text-[11px]">
          Cancel
        </button>
      </div>
    </div>
  );
}
