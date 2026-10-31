'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Lock,
  Rocket,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  HardHat,
  Landmark,
  Undo2,
} from 'lucide-react';
import { btnPrimary, card } from '@/components/console/ui';
import { explorerTxUrlFor } from '@/lib/explorer';

interface ContractorOption {
  id: string;
  name: string;
  service_area: string | null;
  solana_pubkey: string | null;
}

interface FundRequestOption {
  id: string;
  title: string;
  sanctioned_amount: string | number | null;
  department: string;
}

interface AssignmentShape {
  id: string;
  status: string;
  contractor_id: string;
  contractor_name?: string;
}

interface EscrowShape {
  id: string;
  stage1_amount: string | number;
  stage2_amount: string | number;
  stage3_amount: string | number;
  released_stage: number;
  status: string;
  hold_until: string | null;
  solana_escrow_pda: string | null;
  solana_tx_hash: string | null;
  contractor_label: string;
  funder_label: string;
  funder_type?: string;
  demo_mode?: boolean;
}

const fmt = (n: string | number) => `₹${Number(n).toLocaleString('en-IN')}`;

// The RPC URL is only used to classify the cluster client-side; the actual
// value never leaves the browser.
const clusterRpc = (cluster: string) =>
  cluster === 'localnet' ? 'http://localhost:8899' : 'https://api.devnet.solana.com';

export default function AdminFundPanel({
  reportId,
  reportStatus,
  escrow,
  assignment,
  contractors,
  fundRequests,
  demoMode,
  cluster,
  pendingRepair,
}: {
  reportId: string;
  reportStatus: string;
  escrow: EscrowShape | null;
  assignment: AssignmentShape | null;
  contractors: ContractorOption[];
  fundRequests: FundRequestOption[];
  demoMode: boolean;
  cluster: string;
  pendingRepair?: { id: string; geminiStatus: string } | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // assign form
  const [contractorId, setContractorId] = useState('');
  // escrow form
  const [funderLabel, setFunderLabel] = useState('');
  const [funderType, setFunderType] = useState('GOV_GRANT');
  const [fundRequestId, setFundRequestId] = useState('');
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const [s3, setS3] = useState('');

  const assign = async () => {
    setLoading('assign');
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/hisaab/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId, contractor_id: contractorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Assignment failed');
      setSuccess('Job offer sent to the contractor.');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const fundEscrow = async () => {
    setLoading('escrow');
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/hisaab/escrows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: reportId,
          contractor_id: assignment!.contractor_id,
          funder_label: funderLabel,
          funder_type: funderType,
          fund_request_id: fundRequestId || null,
          stage1_amount: Number(s1),
          stage2_amount: Number(s2),
          stage3_amount: Number(s3),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Escrow failed');
      setSuccess('Escrow funded and locked.');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const fastForward = async (stage: number) => {
    if (!escrow) return;
    setLoading(`ff${stage}`);
    setError(null);
    try {
      const res = await fetch(`/api/hisaab/escrows/${escrow.id}/fast-forward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fast-forward failed');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const approveRepair = async () => {
    if (!pendingRepair) return;
    setLoading('repair');
    setError(null);
    try {
      const res = await fetch(`/api/hisaab/repairs/${pendingRepair.id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Manual approval failed');
      setSuccess('Repair manually approved — stage 1 released.');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const refund = async () => {
    if (!escrow) return;
    setLoading('refund');
    setError(null);
    try {
      const res = await fetch(`/api/hisaab/escrows/${escrow.id}/refund`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refund failed');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  // ---------- Human-in-the-loop: repair awaiting manual approval ----------
  if (pendingRepair && escrow && escrow.released_stage === 0) {
    return (
      <div className={`${card} p-5`}>
        <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <HardHat className="h-4 w-4 text-warn" /> Repair awaiting review
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-mute">
          The contractor submitted repair evidence but AI verification did not auto-pass
          (status: <span className="font-mono">{pendingRepair.geminiStatus}</span>). Review the
          before/after photos below, then approve manually or refund the escrow.
        </p>
        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-bad-soft p-3 text-[13px] text-bad">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        <button onClick={approveRepair} disabled={loading !== null} className={`${btnPrimary} mt-3 w-full justify-center`}>
          {loading === 'repair' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Approve repair & release stage 1
        </button>
      </div>
    );
  }

  // ---------- Phase 3: escrow exists ----------
  if (escrow) {
    const stages = [
      { n: 1, label: 'Repair verified', amount: escrow.stage1_amount },
      { n: 2, label: 'Durability hold passed', amount: escrow.stage2_amount },
      { n: 3, label: 'Final sign-off', amount: escrow.stage3_amount },
    ];
    return (
      <div className="panel-night theme-night rounded-xl p-5 shadow-card">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-night-mute">
            Repair escrow
          </p>
          <div className="flex items-center gap-2">
            {escrow.demo_mode && (
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                DEMO FUNDS
              </span>
            )}
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 font-mono text-[11px] text-night-mute">
              {escrow.status}
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-500/15 p-3 text-[13px] text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <div className="mt-4 space-y-2">
          {stages.map((s) => {
            const released = escrow.released_stage >= s.n;
            return (
              <div
                key={s.n}
                className={`flex items-center justify-between rounded-lg border p-3.5 ${
                  released ? 'border-blue-400/30 bg-blue-400/10' : 'border-white/[0.08] bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-semibold ${
                      released ? 'bg-accent text-white' : 'bg-white/10 text-night-mute'
                    }`}
                  >
                    {released ? '✓' : s.n}
                  </span>
                  <div>
                    <p className="text-[13px] font-medium text-white">{s.label}</p>
                    <p className="font-mono text-[11px] text-night-dim">Stage {s.n}</p>
                  </div>
                </div>
                <p className={`font-mono text-sm font-semibold ${released ? 'text-blue-300' : 'text-night-mute'}`}>
                  {fmt(s.amount)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between font-mono text-xs">
          <span className="text-night-dim">
            {escrow.released_stage}/3 released · total{' '}
            {fmt(Number(escrow.stage1_amount) + Number(escrow.stage2_amount) + Number(escrow.stage3_amount))}
          </span>
          {escrow.solana_tx_hash && explorerTxUrlFor(clusterRpc(cluster), escrow.solana_tx_hash) && (
            <a
              href={explorerTxUrlFor(clusterRpc(cluster), escrow.solana_tx_hash) as string}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-blue-300 hover:text-blue-200"
            >
              Explorer <ArrowUpRight className="h-3 w-3" />
            </a>
          )}
          {escrow.solana_tx_hash && !explorerTxUrlFor(clusterRpc(cluster), escrow.solana_tx_hash) && (
            <span className="font-mono text-night-dim">tx {escrow.solana_tx_hash.slice(0, 10)}… · localnet</span>
          )}
        </div>

        {escrow.status === 'ACTIVE' && escrow.released_stage >= 1 && escrow.released_stage < 3 && demoMode && (
          <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3.5">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-amber-300">
              Demo fast-forward
            </p>
            <p className="mt-1 text-xs text-night-mute">
              Compress the durability hold and release stage {escrow.released_stage + 1} now. Disabled in production mode.
            </p>
            <button
              onClick={() => fastForward(escrow.released_stage + 1)}
              disabled={loading !== null}
              className="mt-2.5 inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-1.5 text-xs font-semibold text-night transition hover:bg-amber-300 disabled:opacity-50"
            >
              {loading === `ff${escrow.released_stage + 1}` ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Rocket className="h-3.5 w-3.5" />
              )}
              Release stage {escrow.released_stage + 1}
            </button>
          </div>
        )}

        {escrow.status === 'ACTIVE' && escrow.released_stage === 0 && (
          <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3.5">
            <p className="text-xs text-night-mute">
              Waiting for the contractor to submit verified repair evidence — stage 1 releases automatically
              when Gemini before/after and roughness checks pass.
            </p>
            <button
              onClick={refund}
              disabled={loading !== null}
              className="mt-2.5 inline-flex items-center gap-2 rounded-lg border border-rose-400/30 px-4 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50"
            >
              {loading === 'refund' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
              Refund escrow to funder
            </button>
          </div>
        )}
      </div>
    );
  }

  if (reportStatus !== 'CONFIRMED') {
    return (
      <div className={`${card} p-5`}>
        <p className="text-[13px] font-medium text-mute">Funding pipeline</p>
        <p className="mt-2 text-[13px] leading-relaxed text-mute">
          {reportStatus === 'OPEN'
            ? 'Needs 3 citizen confirmations before the admin can fund it.'
            : reportStatus === 'ESCALATED'
              ? 'Escrow is being set up for this report.'
              : 'This report is past the funding stage.'}
        </p>
      </div>
    );
  }

  // ---------- Phase 1: assign ----------
  if (!assignment) {
    return (
      <div className={`${card} p-5`}>
        <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <HardHat className="h-4 w-4 text-accent" /> Assign a contractor
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-mute">
          Offer this confirmed complaint to an approved contractor. Escrow unlocks once they accept.
        </p>
        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-bad-soft p-3 text-[13px] text-bad">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        <select
          value={contractorId}
          onChange={(e) => setContractorId(e.target.value)}
          className="input mt-3 !text-[13px]"
        >
          <option value="">Select approved contractor…</option>
          {contractors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.service_area ? ` — ${c.service_area}` : ''}
              {!c.solana_pubkey ? ' (wallet pending)' : ''}
            </option>
          ))}
        </select>
        <button
          onClick={assign}
          disabled={!contractorId || loading !== null}
          className={`${btnPrimary} mt-3 w-full justify-center`}
        >
          {loading === 'assign' ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardHat className="h-4 w-4" />}
          Send job offer
        </button>
        {contractors.length === 0 && (
          <p className="mt-2 text-[11px] text-warn">
            No approved contractors yet — approve applications in Admin → Contractors.
          </p>
        )}
      </div>
    );
  }

  // ---------- Phase 2: assignment made, fund escrow ----------
  const accepted = assignment.status === 'ACCEPTED';
  return (
    <div className={`${card} p-5`}>
      <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
        <Landmark className="h-4 w-4 text-accent" /> Fund the escrow
      </p>
      <p className="mt-1 font-mono text-[11px] text-mute">
        contractor: {assignment.contractor_name} · assignment {assignment.status}
      </p>
      {success && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-ok-soft p-2.5 text-[12px] text-ok">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> {success}
        </p>
      )}
      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-bad-soft p-3 text-[13px] text-bad">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {accepted ? (
        <>
          <div className="mt-3 space-y-2.5">
            <input
              value={funderLabel}
              onChange={(e) => setFunderLabel(e.target.value)}
              placeholder="Funder — e.g. PWD Jaipur (Sanction #REF-2214)"
              className="input !text-[13px]"
            />
            <div className="grid grid-cols-2 gap-2">
              <select value={funderType} onChange={(e) => setFunderType(e.target.value)} className="input !text-[13px]">
                <option value="GOV_GRANT">Government grant</option>
                <option value="CORPORATE_CSR">Corporate CSR</option>
                <option value="PLATFORM">Platform fund</option>
              </select>
              <select value={fundRequestId} onChange={(e) => setFundRequestId(e.target.value)} className="input !text-[13px]">
                <option value="">Link sanctioned request…</option>
                {fundRequests.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title} {f.sanctioned_amount ? `(${fmt(f.sanctioned_amount)})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" min="1" value={s1} onChange={(e) => setS1(e.target.value)} placeholder="Stage 1 ₹" className="input !text-[13px]" />
              <input type="number" min="1" value={s2} onChange={(e) => setS2(e.target.value)} placeholder="Stage 2 ₹" className="input !text-[13px]" />
              <input type="number" min="1" value={s3} onChange={(e) => setS3(e.target.value)} placeholder="Stage 3 ₹" className="input !text-[13px]" />
            </div>
            <p className="font-mono text-[10px] text-mute">
              Stage 1 ≈ repair, stages 2–3 unlock after the on-chain durability hold.
            </p>
          </div>
          <button
            onClick={fundEscrow}
            disabled={loading !== null || !funderLabel || !s1 || !s2 || !s3}
            className={`${btnPrimary} mt-3 w-full justify-center`}
          >
            {loading === 'escrow' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Lock escrow
          </button>
        </>
      ) : (
        <p className="mt-3 rounded-lg bg-warn-soft p-3 text-[12px] leading-relaxed text-warn">
          Waiting for {assignment.contractor_name ?? 'the contractor'} to accept the job. The offer appears in
          their contractor desk; escrow unlocks on acceptance.
        </p>
      )}
    </div>
  );
}
