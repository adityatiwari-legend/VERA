import React from 'react';
import Link from 'next/link';
import { ArrowRight, ExternalLink, CheckCircle2, ShieldCheck } from 'lucide-react';
import EscrowVisual from './EscrowVisual';

interface HeroSectionProps {
  platformStats: {
    total_campaigns: number;
    total_raised: number;
    total_released: number;
    total_milestones: number;
  };
  demoCampaign: {
    id: string;
    title: string;
    target_amount: number;
    raised_amount: number;
    released_amount: number;
    ngo_name?: string;
  };
}

export function HeroSection({ platformStats, demoCampaign }: HeroSectionProps) {
  return (
    <section className="relative w-full overflow-hidden">
      {/* Editorial wash + fine grid */}
      <div aria-hidden className="wash-hero pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="bg-grid-fine pointer-events-none absolute inset-0"
        style={{
          maskImage: 'radial-gradient(60rem 36rem at 60% 20%, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(60rem 36rem at 60% 20%, black 30%, transparent 75%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-10">
          {/* Left: editorial narrative */}
          <div className="lg:col-span-6">
            <div className="animate-rise eyebrow">
              Proof-gated money · Ethereum + Solana
            </div>

            <h1 className="animate-rise delay-1 mt-5 max-w-xl text-[42px] font-semibold leading-[1.04] tracking-tightest text-ink sm:text-6xl lg:text-[68px]">
              Every rupee traceable.
              <span className="block text-accent">Audited before it moves.</span>
            </h1>

            <p className="animate-rise delay-2 mt-6 max-w-lg text-base leading-relaxed text-mute sm:text-lg">
              VERA locks earmarked capital in escrow and releases it only when
              invoices, photos and auditors agree. Donors watch every milestone;
              nobody moves money on good intentions.
            </p>

            <div className="animate-rise delay-3 mt-8 flex flex-wrap items-center gap-3">
              <Link href="/campaigns" className="btn-primary !px-6 !py-3 !text-sm group">
                <span>Explore campaigns</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href={`/campaigns/${demoCampaign.id}/audit`} className="btn-secondary !px-5 !py-3 !text-sm">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <span>View public audit</span>
                <ExternalLink className="h-3.5 w-3.5 text-faint" />
              </Link>
            </div>

            <div className="animate-rise delay-4 mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-5 text-xs text-mute">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-ok" />
                Zero platform commission
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-ok" />
                Public audits, no login required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-ok" />
                Hash-chained audit records
              </span>
            </div>
          </div>

          {/* Right: abstract escrow composition (real data) */}
          <div className="animate-rise delay-3 lg:col-span-6">
            <EscrowVisual campaign={demoCampaign} milestoneCount={platformStats.total_milestones} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
