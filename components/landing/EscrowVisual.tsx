import React from 'react';
import { CheckCircle2, KeyRound, FileCheck, ArrowRight, ShieldCheck } from 'lucide-react';
import { formatRupees } from '@/lib/utils';

interface EscrowVisualProps {
  campaign: {
    id: string;
    title: string;
    ngo_name?: string;
    target_amount: number;
    raised_amount: number;
    released_amount: number;
  };
  milestoneCount: number;
}

/**
 * Abstract escrow composition for the hero. Every number on the main card
 * comes from the live database (the seeded demo campaign) — the floating
 * chips are product facts, not metrics.
 */
export function EscrowVisual({ campaign, milestoneCount }: EscrowVisualProps) {
  const target = Number(campaign.target_amount) || 0;
  const raised = Number(campaign.raised_amount) || 0;
  const released = Number(campaign.released_amount) || 0;
  const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      {/* Layered lavender sculpture behind the card (TARS-inspired) */}
      <div
        aria-hidden
        className="absolute -right-8 -top-10 h-56 w-56 rounded-3xl bg-gradient-to-br from-lav to-accent/70 opacity-80"
      />
      <div
        aria-hidden
        className="absolute -left-6 bottom-8 h-28 w-28 rounded-2xl border border-line bg-lav-soft"
      />
      <div
        aria-hidden
        className="absolute -left-14 -top-4 hidden h-2.5 w-2.5 rounded-full bg-accent md:block"
      />
      <div
        aria-hidden
        className="absolute -bottom-6 right-16 hidden h-2 w-2 rounded-full bg-lav-deep md:block"
      />

      {/* Main escrow card — real demo-campaign data */}
      <div className="card relative z-10 rounded-2xl border-line/80 p-6 shadow-feature">
        <div className="flex items-center justify-between gap-3">
          <span className="chip">ESCROW · LIVE</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-mute">
            {milestoneCount} milestone tranches
          </span>
        </div>

        <h3 className="mt-4 line-clamp-2 text-lg font-semibold leading-snug tracking-tight text-ink">
          {campaign.title}
        </h3>
        {campaign.ngo_name && (
          <p className="mt-1 text-xs text-mute">{campaign.ngo_name}</p>
        )}

        <div className="mt-5 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold tracking-tight text-ink">
              {formatRupees(raised)}
            </span>
            <span className="font-mono text-xs text-mute">/ {formatRupees(target)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-mist">
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between pt-1 font-mono text-[11px] text-mute">
            <span>{pct}% funded</span>
            <span className="text-ok">{formatRupees(released)} released against proof</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4">
          {[
            { label: 'Locked in escrow', value: formatRupees(Math.max(0, raised - released)) },
            { label: 'Release rule', value: '2-of-3 multisig' },
            { label: 'Evidence', value: 'SHA-256' },
          ].map((m) => (
            <div key={m.label}>
              <div className="font-mono text-[9px] uppercase tracking-wider text-faint">{m.label}</div>
              <div className="mt-0.5 font-mono text-[11px] font-semibold text-ink">{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating fact chips */}
      <div className="animate-floaty absolute -right-4 top-16 z-20 hidden items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 shadow-lift sm:flex">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-faint text-accent">
          <KeyRound className="h-3.5 w-3.5" />
        </span>
        <div className="leading-tight">
          <div className="text-[11px] font-semibold text-ink">2-of-3 multisig</div>
          <div className="font-mono text-[9px] uppercase tracking-wider text-mute">on-chain release</div>
        </div>
      </div>

      <div className="animate-floaty-slow absolute -left-6 bottom-14 z-20 hidden items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 shadow-lift sm:flex">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-lav-soft text-lav-deep">
          <FileCheck className="h-3.5 w-3.5" />
        </span>
        <div className="leading-tight">
          <div className="text-[11px] font-semibold text-ink">SHA-256 evidence</div>
          <div className="font-mono text-[9px] uppercase tracking-wider text-mute">tamper-evident</div>
        </div>
      </div>

      {/* Thin connectors */}
      <div aria-hidden className="absolute -right-4 top-28 z-0 hidden h-px w-10 bg-line-strong lg:block" />
      <div aria-hidden className="absolute bottom-16 -left-6 z-0 hidden h-px w-8 bg-line-strong lg:block" />
    </div>
  );
}

export default EscrowVisual;
