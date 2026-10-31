'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send, BadgeCheck, IndianRupee, XCircle } from 'lucide-react';
import { FundRequestStatus } from '@/types';

export function FundRequestActions({
  fundRequestId,
  allowed,
}: {
  fundRequestId: string;
  allowed: FundRequestStatus[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<FundRequestStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sanctionAmount, setSanctionAmount] = useState('');
  const [govRef, setGovRef] = useState('');

  const move = async (status: FundRequestStatus) => {
    setError(null);
    setLoading(status);
    try {
      const body: Record<string, unknown> = { status };
      if (status === 'SANCTIONED') {
        body.sanctioned_amount = Number(sanctionAmount);
        if (govRef.trim()) body.gov_reference_no = govRef.trim();
      }
      const res = await fetch(`/api/hisaab/fund-requests/${fundRequestId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update fund request');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-2">
      {error && <p className="rounded-lg border border-bad/20 bg-bad-soft p-2 text-xs text-bad">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {allowed.includes('SUBMITTED') && (
          <button onClick={() => move('SUBMITTED')} disabled={loading !== null} className="btn-secondary !px-3 !py-1.5 !text-[11px]">
            {loading === 'SUBMITTED' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Submit to department
          </button>
        )}
        {allowed.includes('APPROVED') && (
          <button onClick={() => move('APPROVED')} disabled={loading !== null} className="btn-secondary !px-3 !py-1.5 !text-[11px]">
            {loading === 'APPROVED' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
            Mark approved
          </button>
        )}
        {allowed.includes('SANCTIONED') && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min="1"
              value={sanctionAmount}
              onChange={(e) => setSanctionAmount(e.target.value)}
              placeholder="Sanctioned ₹"
              className="input !w-36 !py-1.5 !text-[11px]"
            />
            <input
              value={govRef}
              onChange={(e) => setGovRef(e.target.value)}
              placeholder="Gov reference no."
              className="input !w-44 !py-1.5 !text-[11px]"
            />
            <button onClick={() => move('SANCTIONED')} disabled={loading !== null || !sanctionAmount} className="btn-primary !px-3 !py-1.5 !text-[11px]">
              {loading === 'SANCTIONED' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <IndianRupee className="h-3.5 w-3.5" />}
              Record sanction
            </button>
          </div>
        )}
        {allowed.includes('REJECTED') && (
          <button onClick={() => move('REJECTED')} disabled={loading !== null} className="rounded-lg border border-bad/25 bg-bad-soft px-3 py-1.5 font-mono text-[11px] font-semibold text-bad">
            {loading === 'REJECTED' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
            Reject
          </button>
        )}
      </div>
    </div>
  );
}
