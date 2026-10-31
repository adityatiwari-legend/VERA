'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { btnPrimary, card } from '@/components/console/ui';

/**
 * Admin backfill: anchor a report to the Solana program when it was created
 * while the local validator was unreachable.
 */
export default function AnchorReportButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const anchor = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/hisaab/reports/${reportId}/anchor`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Anchoring failed');
      setDone(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${card} p-5`}>
      <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
        <Link2 className="h-4 w-4 text-warn" /> Not anchored on-chain yet
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-mute">
        This report was created while the Solana validator was unreachable. Its evidence
        hash and coordinates live only in the ledger — anchor it to make it publicly
        verifiable against the program.
      </p>
      {error && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-bad-soft p-3 text-[13px] text-bad">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}
      {done ? (
        <p className="mt-3 flex items-center gap-2 text-[13px] font-medium text-ok">
          <CheckCircle2 className="h-4 w-4" /> Anchored — chain state panel is live below.
        </p>
      ) : (
        <button onClick={anchor} disabled={loading} className={`${btnPrimary} mt-3 w-full justify-center`}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          Anchor to Solana now
        </button>
      )}
    </div>
  );
}
