'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { card, btnPrimary } from '@/components/console/ui';

export default function ConfirmButton({
  reportId,
  initialCount,
  canConfirm,
  alreadyConfirmed,
}: {
  reportId: string;
  initialCount: number;
  canConfirm: boolean;
  alreadyConfirmed: boolean;
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [txUrl, setTxUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/hisaab/reports/${reportId}/confirm`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Confirmation failed');
      } else {
        setCount(data.confirmations);
        setDone(true);
        setTxUrl(data.explorer_url ?? null);
        router.refresh();
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${card} p-5`}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-mute">Citizen confirmations</p>
        <span className="font-mono text-xs font-medium text-faint">{count} of 3 required</span>
      </div>

      <div className="mt-4 flex gap-1.5">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              count >= n ? 'bg-accent' : 'bg-mist'
            }`}
          />
        ))}
      </div>

      {done && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-ok-soft p-3 text-[13px] text-ok">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Confirmed
            {txUrl && (
              <>
                {' — '}
                <a href={txUrl} target="_blank" rel="noreferrer" className="font-medium underline">
                  view on Solana Explorer
                </a>
              </>
            )}
          </span>
        </div>
      )}
      {alreadyConfirmed && !done && (
        <p className="mt-4 text-[13px] text-mute">You already confirmed this report.</p>
      )}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-bad-soft p-3 text-[13px] text-bad">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={confirm}
        disabled={loading || !canConfirm || alreadyConfirmed || count >= 3}
        className={`${btnPrimary} mt-5 w-full justify-center`}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {alreadyConfirmed
          ? 'Confirmed'
          : count >= 3
            ? 'Register complete'
            : 'I confirm this pothole'}
      </button>
      {!canConfirm && !alreadyConfirmed && count < 3 && (
        <p className="mt-3 text-center text-xs text-faint">
          Sign in to confirm. The reporter cannot confirm their own report.
        </p>
      )}
    </div>
  );
}
