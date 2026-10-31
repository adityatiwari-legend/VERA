'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Loader2 } from 'lucide-react';

export function SolanaWalletForm() {
  const router = useRouter();
  const [pubkey, setPubkey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/wallet/solana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pubkey: pubkey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to bind wallet');
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
      <p className="flex items-center gap-2 text-xs font-semibold text-ok">
        <Wallet className="h-4 w-4" /> Payout wallet bound. Escrow can now be funded for your jobs.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input
        required
        value={pubkey}
        onChange={(e) => setPubkey(e.target.value)}
        placeholder="Solana payout address (base58)"
        className="input !w-80 !py-1.5 !text-[11px] font-mono"
      />
      <button type="submit" disabled={loading} className="btn-primary !px-3 !py-1.5 !text-[11px]">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
        Bind payout wallet
      </button>
      {error && <p className="w-full text-[10px] text-bad">{error}</p>}
    </form>
  );
}
