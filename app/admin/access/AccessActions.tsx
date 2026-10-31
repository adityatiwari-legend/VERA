'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Ban, Loader2, UserPlus } from 'lucide-react';

export function AccessActions({ userId, status }: { userId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = async (next: 'VERIFIED' | 'SUSPENDED' | 'PENDING') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'org-status', user_id: userId, status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {status !== 'VERIFIED' && (
          <button onClick={() => set('VERIFIED')} disabled={loading} className="btn-primary !px-3 !py-1.5 !text-[11px]">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Verify
          </button>
        )}
        {status === 'VERIFIED' && (
          <>
            <span className="rounded-full border border-ok/20 bg-ok-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-ok">
              VERIFIED
            </span>
            <button onClick={() => set('SUSPENDED')} disabled={loading} className="rounded-lg border border-bad/25 bg-bad-soft px-3 py-1.5 font-mono text-[11px] font-semibold text-bad">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
              Suspend
            </button>
          </>
        )}
        {status === 'SUSPENDED' && (
          <button onClick={() => set('PENDING')} disabled={loading} className="btn-secondary !px-3 !py-1.5 !text-[11px]">
            Reset
          </button>
        )}
      </div>
      {error && <p className="text-[10px] text-bad">{error}</p>}
    </div>
  );
}

export function AuditorInviteForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-auditor', name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create auditor');
      setDone(true);
      setName('');
      setEmail('');
      setPassword('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-2 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <UserPlus className="h-4 w-4 text-accent" /> Invite an auditor
      </p>
      {done && <p className="text-[11px] text-ok">Auditor created — share the credentials securely.</p>}
      {error && <p className="text-[11px] text-bad">{error}</p>}
      <div className="grid gap-2 sm:grid-cols-3">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="input !text-xs" />
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input !text-xs" />
        <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temp password" className="input !text-xs" />
      </div>
      <button type="submit" disabled={loading} className="btn-primary !text-xs">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
        Create auditor account
      </button>
    </form>
  );
}
