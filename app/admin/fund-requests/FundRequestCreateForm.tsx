'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';

export function FundRequestCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/hisaab/fund-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          department,
          requested_amount: Number(amount),
          description,
          report_ids: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create fund request');
      setOpen(false);
      setTitle('');
      setDepartment('');
      setAmount('');
      setDescription('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary !text-xs">
        <Plus className="h-3.5 w-3.5" />
        Draft a fund request
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <h3 className="text-sm font-semibold text-ink">New government fund request</h3>
      {error && <p className="rounded-lg border border-bad/20 bg-bad-soft p-2.5 text-xs text-bad">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Ward 3 pothole repair batch — Monsoon 2026" className="input !text-sm" />
        <input required value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Department — e.g. PWD Jaipur" className="input !text-sm" />
        <input required type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Requested amount (₹)" className="input !text-sm" />
      </div>
      <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Scope, justification, and the complaints this covers…" className="input !text-sm" />
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="btn-primary !text-xs">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Create draft
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary !text-xs">
          Cancel
        </button>
      </div>
    </form>
  );
}
