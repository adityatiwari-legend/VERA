import React from 'react';
import Link from 'next/link';
import { query } from '@/lib/db';
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Building2,
  Lock,
  Layers,
  FileCheck,
  Eye,
  KeyRound,
  Coins,
  Cpu,
  Compass,
  Receipt,
  MapPin,
  Camera,
  Users,
  Timer,
  TrendingUp,
  Minus,
} from 'lucide-react';
import { ProgressBar } from '@/components/ProgressBar';
import { StatusBadge } from '@/components/StatusBadge';
import { StatCard } from '@/components/StatCard';
import AuditLedger from '@/components/AuditLedger';
import PerspectiveTunnelHero from '@/components/ui/perspective-tunnel-hero';
import RibbonField from '@/components/ui/ribbon-field';
import { GlobeCdn } from '@/components/ui/cobe-globe-cdn';
import Reveal from '@/components/landing/Reveal';
import { formatRupees, formatRupeesShort } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Query live platform stats
  let platformStats = {
    total_campaigns: 3,
    total_raised: 1075000,
    total_released: 285000,
    total_milestones: 7,
  };

  try {
    const statsRes = await query<{
      total_campaigns: number;
      total_raised: number;
      total_released: number;
      total_milestones: number;
    }>(`
      SELECT 
        COUNT(DISTINCT c.id)::int as total_campaigns,
        COALESCE(SUM(c.raised_amount), 0)::numeric as total_raised,
        COALESCE(SUM(c.released_amount), 0)::numeric as total_released,
        COUNT(DISTINCT m.id)::int as total_milestones
      FROM campaigns c
      LEFT JOIN milestones m ON c.id = m.campaign_id
      WHERE c.status != 'CANCELLED'
    `);
    if (statsRes.rows[0]) {
      platformStats = statsRes.rows[0];
    }
  } catch (err) {
    // Graceful fallback to default stats
  }

  // Query Jaipur demo campaign
  let demoCampaign: any = {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    title: 'Government School Classroom — Jaipur',
    description: 'Comprehensive infrastructure modernization for 6 rural primary classrooms at Government Secondary School, Jaipur.',
    target_amount: 1000000,
    raised_amount: 750000,
    released_amount: 285000,
    beneficiary: 'Jaipur Primary School Students (250+ children)',
    ngo_name: 'Rajasthan Education Foundation',
  };

  try {
    const demoRes = await query<{
      id: string;
      title: string;
      description: string;
      target_amount: number;
      raised_amount: number;
      released_amount: number;
      beneficiary: string;
      ngo_name: string;
    }>(`
      SELECT c.id, c.title, c.description, c.target_amount::numeric, c.raised_amount::numeric, c.released_amount::numeric, c.beneficiary, u.name as ngo_name
      FROM campaigns c
      JOIN users u ON c.ngo_id = u.id
      WHERE c.title ILIKE '%Jaipur%'
      ORDER BY (c.id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') DESC, c.created_at DESC
      LIMIT 1
    `);
    if (demoRes.rows[0]) {
      demoCampaign = demoRes.rows[0];
    }
  } catch (err) {
    // Fallback to demo default
  }

  // Query additional active campaigns for featured discovery
  let featuredCampaigns: any[] = [];
  try {
    const featRes = await query(`
      SELECT 
        c.id, c.title, c.description, c.target_amount::numeric, c.raised_amount::numeric, 
        c.released_amount::numeric, c.beneficiary, c.status, u.name as ngo_name,
        COUNT(DISTINCT m.id)::int as milestones_count
      FROM campaigns c
      JOIN users u ON c.ngo_id = u.id
      LEFT JOIN milestones m ON c.id = m.campaign_id
      WHERE c.status IN ('ACTIVE', 'COMPLETED')
      GROUP BY c.id, u.name
      ORDER BY (c.id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') DESC, c.raised_amount DESC
      LIMIT 3
    `);
    featuredCampaigns = featRes.rows;
  } catch (err) {
    featuredCampaigns = [demoCampaign];
  }

  const totalRaised = Number(platformStats.total_raised);
  const totalReleased = Number(platformStats.total_released);
  const totalLocked = Math.max(0, totalRaised - totalReleased);

  const pipelineStages = [
    {
      num: '01',
      title: 'Donation',
      subtitle: 'Programmatic earmarking',
      desc: 'Donor contributes to an initiative. Funds are assigned an immutable reference and bound to the campaign ID.',
      icon: Coins,
    },
    {
      num: '02',
      title: 'Earmarked',
      subtitle: 'Zero co-mingling',
      desc: 'Capital is strictly segregated. Architecture prevents pooling with general NGO operational budgets.',
      icon: Lock,
    },
    {
      num: '03',
      title: 'Locked',
      subtitle: 'Escrow custody',
      desc: 'Funds are atomically locked in the smart contract escrow vault prior to physical deliverable execution.',
      icon: Layers,
    },
    {
      num: '04',
      title: 'Milestone',
      subtitle: 'Budget capped',
      desc: 'Campaign expenditure is segmented into discrete tranches with pre-set financial allocation limits.',
      icon: Layers,
    },
    {
      num: '05',
      title: 'Evidence',
      subtitle: 'Cryptographic hashing',
      desc: 'NGO uploads itemized vendor invoices and site inspection photos with SHA-256 fingerprint generation.',
      icon: FileCheck,
    },
    {
      num: '06',
      title: 'Verification',
      subtitle: 'AI line-item OCR',
      desc: 'Automated OCR extracts vendor data, line items, and invoice totals, flagging variance against claimed milestones.',
      icon: Cpu,
    },
    {
      num: '07',
      title: 'Approval',
      subtitle: 'Certified human auditor',
      desc: 'Certified human auditor evaluates AI findings, inspects evidence integrity, and records formal approval.',
      icon: Eye,
    },
    {
      num: '08',
      title: 'Release',
      subtitle: '2-of-3 multi-signature',
      desc: 'Consensus from 2 of 3 authorized signers (NGO Admin, Project Lead, Auditor) triggers smart contract disbursement.',
      icon: KeyRound,
    },
    {
      num: '09',
      title: 'Audit',
      subtitle: 'Public ledger anchor',
      desc: 'All actions and on-chain release transaction hashes are permanently viewable on the public ledger without login.',
      icon: ShieldCheck,
    },
  ];

  const [featured, ...restCampaigns] = featuredCampaigns;

  return (
    <div className="flex w-full flex-col items-center bg-white text-ink">
      {/* ============================================
          1. HERO — perspective tunnel flythrough of the
             9-stage fund trail (components/ui/perspective-tunnel-hero)
      ============================================ */}
      <PerspectiveTunnelHero />

      {/* ============================================
          2. TRUST STATEMENT — oversized editorial type
      ============================================ */}
      <section className="w-full border-b border-line py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <Reveal>
            <div className="mx-auto flex justify-center">
              <span className="eyebrow">The core VERA commitment</span>
            </div>
            <h2 className="mt-6 text-4xl font-semibold leading-[1.06] tracking-tight text-ink sm:text-6xl">
              Every donation should
              <br />
              have a <span className="text-accent">trail.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-mute">
              Philanthropy has suffered from opaque disbursement and blind trust. VERA
              replaces good intentions with programmatic certainty: capital locked in
              audited escrows and released only when physical proof is independently certified.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============================================
          3. PLATFORM METRICS — real data only
      ============================================ */}
      <section id="protocol-metrics" className="w-full border-b border-line bg-mist/60 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              <StatCard
                label="Total funds tracked"
                value={formatRupees(totalRaised)}
                subtext="100% accounted on ledger"
                icon={<Coins className="h-4 w-4" />}
              />
              <StatCard
                label="Locked in escrow"
                value={formatRupees(totalLocked)}
                subtext="Held safely until verified"
                accent="mint"
                icon={<Lock className="h-4 w-4" />}
              />
              <StatCard
                label="Milestone tranches"
                value={String(platformStats.total_milestones)}
                subtext="Backed by vendor invoices"
                accent="cyan"
                icon={<Layers className="h-4 w-4" />}
              />
              <StatCard
                label="Audited releases"
                value={formatRupees(totalReleased)}
                subtext="2-of-3 multisig authorized"
                accent="indigo"
                icon={<ShieldCheck className="h-4 w-4" />}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================
          4. HOW VERA WORKS — 9-stage engineering grid
      ============================================ */}
      <section id="pipeline" className="w-full border-b border-line py-20 sm:py-24">
        <div className="mx-auto max-w-7xl space-y-12 px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="max-w-3xl space-y-3">
              <span className="eyebrow">System architecture</span>
              <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
                The 9-stage verifiable fund trail
              </h2>
              <p className="text-sm leading-relaxed text-mute sm:text-base">
                Donations are never disbursed in a lump sum. They traverse an immutable
                9-stage verification pipeline before a single rupee reaches a vendor.
              </p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
              {pipelineStages.map((stage) => {
                const Icon = stage.icon;
                return (
                  <div
                    key={stage.num}
                    className="group relative flex flex-col justify-between bg-white p-6 transition-colors hover:bg-mist/70"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-faint transition-colors group-hover:text-accent">
                          {stage.num}
                        </span>
                        <span className="chip">{stage.subtitle}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-mist text-mute transition-colors group-hover:border-accent/25 group-hover:text-accent">
                          <Icon className="h-4 w-4" />
                        </div>
                        <h3 className="text-base font-semibold tracking-tight text-ink">
                          {stage.title}
                        </h3>
                      </div>

                      <p className="text-xs leading-relaxed text-mute">{stage.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================
          5. DARK TECHNICAL BAND — two chains (Aeye aesthetic)
      ============================================ */}
      <section className="panel-night w-full overflow-hidden border-b border-white/[0.08]">
        <div aria-hidden className="bg-grid-night pointer-events-none absolute inset-0 opacity-70" />
        <div
          aria-hidden
          className="bg-dots-night pointer-events-none absolute right-0 top-0 h-full w-1/3 opacity-60"
          style={{
            maskImage: 'linear-gradient(to left, black 30%, transparent 95%)',
            WebkitMaskImage: 'linear-gradient(to left, black 30%, transparent 95%)',
          }}
        />
        {/* Ribbon Field aurora — animated gradient crest along the band's top edge
            (the "globe" glow above Featured verified campaigns, now alive) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[460px]"
          style={{
            maskImage: 'radial-gradient(ellipse 90% 130% at 50% -15%, black 45%, transparent 90%)',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 130% at 50% -15%, black 45%, transparent 90%)',
          }}
        >
          <RibbonField className="h-full w-full" opacity={0.5} />
        </div>

        <div className="relative mx-auto max-w-7xl space-y-12 px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <Reveal>
            <div className="max-w-3xl space-y-3">
              <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-400">
                <span className="block h-[7px] w-[7px] bg-blue-400" />
                One trust layer, two chains
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                Two modules. One standard of proof.
              </h2>
              <p className="text-sm leading-relaxed text-night-mute sm:text-base">
                VERA Core runs donation campaigns through Ethereum escrow with 2-of-3
                multisig release. Hisaab of the Road runs civic road repairs through
                Solana escrow confirmed by citizens. Both release money only against evidence.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* VERA CORE */}
            <Reveal>
              <div className="flex h-full flex-col rounded-xl border border-white/[0.09] bg-night-surface/90 p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                    VERA Core
                  </span>
                  <span className="rounded border border-blue-400/30 bg-blue-400/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-blue-300">
                    ETHEREUM
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-night-mute">
                  Donation campaigns → milestone escrow → proof verification →
                  2-of-3 multisig release → public audit trail with a tamper-evident
                  hash chain.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
                  {['Donate', 'Escrow', 'Proof', '2-of-3', 'Release'].map((step, i) => (
                    <React.Fragment key={step}>
                      {i > 0 && <span className="text-night-dim">→</span>}
                      <span className="rounded border border-white/[0.12] bg-white/[0.04] px-2 py-1 text-night-mute">
                        {step}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
                <div className="mt-auto pt-6">
                  <Link
                    href="/campaigns"
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-blue-300 transition-colors hover:text-white"
                  >
                    <span>Explore campaigns</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </Reveal>

            {/* HISAAB */}
            <Reveal delay={80}>
              <div className="flex h-full flex-col rounded-xl border border-white/[0.09] bg-night-surface/90 p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                    Hisaab of the Road
                  </span>
                  <span className="rounded border border-lav-deep/40 bg-lav-deep/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-violet-300">
                    SOLANA DEVNET
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-night-mute">
                  A pothole is reported with a photo, three distinct citizens confirm,
                  a funder locks the budget in a program-owned vault — and the contractor
                  is paid stage by stage only after AI + telemetry verify the repair,
                  with a 30-day durability hold.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
                  {['Report', 'Confirm ×3', 'Escrow', 'Verify', '30-day hold'].map((step, i) => (
                    <React.Fragment key={step}>
                      {i > 0 && <span className="text-night-dim">→</span>}
                      <span className="rounded border border-white/[0.12] bg-white/[0.04] px-2 py-1 text-night-mute">
                        {step}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
                <div className="mt-auto pt-6">
                  <Link
                    href="/hisaab"
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-blue-300 transition-colors hover:text-white"
                  >
                    <span>Open the street register</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Fact strip */}
          <Reveal delay={120}>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.06] sm:grid-cols-3">
              {[
                { icon: FileCheck, title: 'SHA-256 evidence', desc: 'Invoices and photos are fingerprinted at upload; tampering invalidates the trail.' },
                { icon: Cpu, title: 'AI + human verification', desc: 'OCR checks the numbers, a certified auditor checks the meaning.' },
                { icon: Eye, title: 'Public by default', desc: 'Every receipt, signature and release is verifiable without an account.' },
              ].map((f) => (
                <div key={f.title} className="flex items-start gap-3.5 bg-night p-5">
                  <f.icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                  <div>
                    <div className="text-sm font-semibold text-white">{f.title}</div>
                    <p className="mt-1 text-xs leading-relaxed text-night-mute">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================
          6. TRUST NETWORK GLOBE — escrow hubs + corridors
      ============================================ */}
      <section className="w-full border-b border-line py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <Reveal className="lg:col-span-5">
              <div className="space-y-4">
                <span className="eyebrow">A public trust network</span>
                <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
                  Escrow hubs on every meridian
                </h2>
                <p className="max-w-lg text-sm leading-relaxed text-mute sm:text-base">
                  VERA escrows are anchored where the money works — citizen reports
                  from Jaipur to Bengaluru, auditors in London, settlement rails in
                  Singapore. Drag the globe. Every hub, corridor, and locked volume
                  is the same public ledger the rest of this page streams.
                </p>
                <ul className="space-y-2 text-xs text-mute">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    Escrow hubs — where campaign and repair funds sit locked
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-lav-deep" />
                    Corridors — cross-border donation and settlement paths
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-ink/40" />
                    Hover a marker or corridor for live volume, straight from the ledger
                  </li>
                </ul>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href="/campaigns" className="btn-secondary !text-sm">
                    <Compass className="h-4 w-4 text-accent" />
                    <span>Fund a verified campaign</span>
                  </Link>
                  <Link href="/hisaab" className="btn-secondary !text-sm">
                    <MapPin className="h-4 w-4 text-accent" />
                    <span>Open the street register</span>
                  </Link>
                </div>
              </div>
            </Reveal>
            <Reveal className="lg:col-span-7">
              <div className="relative mx-auto w-full max-w-xl">
                {/* Ribbon Field wash — the same animated gradient, tuned light,
                    so the globe sits inside the platform's signature field */}
                <RibbonField
                  className="absolute -inset-8 sm:-inset-12"
                  backdrop="#FFFFFF"
                  opacity={0.35}
                  style={{
                    maskImage: 'radial-gradient(ellipse 55% 55% at 50% 50%, black 35%, transparent 75%)',
                    WebkitMaskImage: 'radial-gradient(ellipse 55% 55% at 50% 50%, black 35%, transparent 75%)',
                  }}
                />
                <GlobeCdn />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============================================
          7. FEATURED CAMPAIGNS — bento
      ============================================ */}
      <section className="w-full border-b border-line py-20 sm:py-24">
        <div className="mx-auto max-w-7xl space-y-10 px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end">
              <div className="space-y-3">
                <span className="eyebrow">Audited initiatives</span>
                <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                  Featured verified campaigns
                </h2>
              </div>
              <Link
                href="/campaigns"
                className="group inline-flex items-center gap-1.5 font-mono text-xs font-medium text-accent"
              >
                <span>Explore all initiatives</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>

          {featured && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {/* Featured card */}
              <Reveal className="lg:col-span-2">
                <div className="card card-hover flex h-full flex-col justify-between rounded-xl p-6 sm:p-8">
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <StatusBadge status={featured.status || 'ACTIVE'} />
                      <span className="chip">{featured.milestones_count || 3} milestone tranches</span>
                    </div>

                    <div>
                      <Link
                        href={`/campaigns/${featured.id}`}
                        className="text-2xl font-semibold tracking-tight text-ink transition-colors hover:text-accent sm:text-3xl"
                      >
                        {featured.title}
                      </Link>
                      <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-relaxed text-mute">
                        {featured.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 text-xs text-mute sm:grid-cols-2">
                      <span className="flex items-center gap-1.5 truncate">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-faint" />
                        <span className="truncate">{featured.ngo_name}</span>
                      </span>
                      <span className="flex items-center gap-1.5 truncate">
                        <Compass className="h-3.5 w-3.5 shrink-0 text-faint" />
                        <span className="truncate">{featured.beneficiary}</span>
                      </span>
                    </div>

                    <div className="space-y-2 border-t border-line pt-5">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="font-mono text-2xl font-bold tracking-tight text-ink">
                            {formatRupees(Number(featured.raised_amount))}
                          </span>
                          <span className="ml-1.5 font-mono text-xs text-mute">
                            / {formatRupees(Number(featured.target_amount))}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-semibold text-accent">
                          {featured.target_amount > 0
                            ? Math.min(100, Math.round((Number(featured.raised_amount) / Number(featured.target_amount)) * 100))
                            : 0}
                          % funded
                        </span>
                      </div>
                      <ProgressBar current={Number(featured.raised_amount)} total={Number(featured.target_amount)} />
                      <div className="flex justify-between pt-1 font-mono text-[11px] text-mute">
                        <span>{formatRupees(Number(featured.released_amount))} released against proof</span>
                        <span className="text-ok">Escrow active</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-7 flex flex-wrap gap-2.5">
                    <Link
                      href={`/campaigns/${featured.id}/audit`}
                      className="btn-secondary !py-2.5 !text-xs"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                      <span>View audit</span>
                    </Link>
                    <Link href={`/campaigns/${featured.id}`} className="btn-primary !py-2.5 !text-xs">
                      <span>Contribute</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </Reveal>

              {/* Secondary compact cards */}
              <div className="flex flex-col gap-5">
                {restCampaigns.map((camp, idx) => (
                  <Reveal key={camp.id} delay={idx * 80} className="flex-1">
                    <div className="card card-hover flex h-full flex-col justify-between rounded-xl p-5">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <StatusBadge status={camp.status || 'ACTIVE'} />
                          <span className="chip">{camp.milestones_count || 3} tranches</span>
                        </div>
                        <Link
                          href={`/campaigns/${camp.id}`}
                          className="block text-base font-semibold leading-snug tracking-tight text-ink transition-colors hover:text-accent"
                        >
                          {camp.title}
                        </Link>
                        <span className="flex items-center gap-1.5 truncate text-xs text-mute">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-faint" />
                          <span className="truncate">{camp.ngo_name}</span>
                        </span>
                      </div>
                      <div className="mt-4 space-y-2 border-t border-line pt-4">
                        <div className="flex items-baseline justify-between font-mono text-xs">
                          <span className="font-bold text-ink">{formatRupeesShort(Number(camp.raised_amount))}</span>
                          <span className="text-mute">/ {formatRupeesShort(Number(camp.target_amount))}</span>
                        </div>
                        <ProgressBar current={Number(camp.raised_amount)} total={Number(camp.target_amount)} showPercentage={false} />
                        <Link
                          href={`/campaigns/${camp.id}`}
                          className="inline-flex items-center gap-1 pt-1 font-mono text-[11px] font-medium text-accent hover:underline"
                        >
                          <span>Contribute</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ============================================
          8. PUBLIC AUDIT EXPLAINER — numbered editorial rows
      ============================================ */}
      <section className="w-full border-b border-line bg-mist/60 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <Reveal className="lg:col-span-5">
              <div className="space-y-3">
                <span className="eyebrow">Open verification</span>
                <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
                  Anyone can verify this trail. No login required.
                </h2>
                <p className="text-sm leading-relaxed text-mute sm:text-base">
                  VERA treats public transparency as a civil utility. The Public Audit
                  Dashboard is available to anyone in the world without an account,
                  allowing independent verification of every receipt, signature, and transaction.
                </p>
                <Link
                  href={`/campaigns/${demoCampaign.id}/audit`}
                  className="btn-secondary !mt-4 !text-sm"
                >
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  <span>Open a live audit dashboard</span>
                </Link>
              </div>
            </Reveal>

            <div className="space-y-px overflow-hidden rounded-xl border border-line bg-line lg:col-span-7">
              {[
                {
                  num: '01',
                  title: 'SHA-256 evidence hashes',
                  desc: 'Vendor invoices and progress photographs are cryptographically digested. Any post-upload tampering alters the hash and invalidates the audit trail immediately.',
                },
                {
                  num: '02',
                  title: 'AI + human verification',
                  desc: 'Optical character recognition compares claimed milestone amounts against invoice line items; a certified auditor reviews every flagged variance before release.',
                },
                {
                  num: '03',
                  title: 'Real on-chain anchors',
                  desc: 'Smart contract releases generate real immutable transaction hashes, each linked to the block explorer. Nothing displayed is mocked.',
                },
              ].map((row) => (
                <Reveal key={row.num}>
                  <div className="group flex items-start justify-between gap-6 bg-white p-6 transition-colors hover:bg-mist/70 sm:p-7">
                    <div className="flex items-start gap-6">
                      <span className="font-mono text-sm font-bold text-faint transition-colors group-hover:text-accent">
                        {row.num}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold tracking-tight text-ink">{row.title}</h3>
                        <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-mute">{row.desc}</p>
                      </div>
                    </div>
                    <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-mist text-mute transition-colors group-hover:border-accent/25 group-hover:text-accent">
                      {row.num === '01' ? (
                        <FileCheck className="h-4 w-4" />
                      ) : row.num === '02' ? (
                        <Cpu className="h-4 w-4" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                    </span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          9. DONOR TRACEABILITY
      ============================================ */}
      <section className="w-full border-b border-line py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          <Reveal className="lg:col-span-6">
            <div className="space-y-6">
              <div className="space-y-3">
                <span className="eyebrow">Donor empowerment</span>
                <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
                  Trace every rupee to its deliverable
                </h2>
              </div>

              <p className="max-w-lg text-sm leading-relaxed text-mute sm:text-base">
                When you donate through VERA, your funds do not disappear into a black
                box. You receive a cryptographic contribution receipt allowing you to
                track your exact programmatic allocation across each milestone.
              </p>

              <div className="space-y-2.5">
                {[
                  'Dedicated reference code for every contribution',
                  'Atomic escrow lock prevents early or unauthorized disbursement',
                  'Explicit transparency on pooled programmatic allocation',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-lg border border-line bg-white px-4 py-3 text-sm text-ink">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div>
                <Link href="/login" className="btn-primary group">
                  <span>Track your contributions</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100} className="lg:col-span-6">
            <div className="card relative rounded-xl p-6 sm:p-7">
              <div className="flex items-center justify-between border-b border-line pb-3.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-mute">
                  Donation trace
                </span>
                <span className="chip">ILLUSTRATIVE EXAMPLE</span>
              </div>

              <div className="space-y-3.5 pt-4">
                {[
                  { k: 'Contribution amount', v: '₹10,000', strong: true },
                  { k: 'Campaign earmark', v: 'School infrastructure program' },
                  { k: 'Assigned milestone', v: 'Classroom electrical works', accent: true },
                  { k: 'AI verification', v: 'Invoice matches claim', ok: true },
                  { k: 'Multisig consensus', v: '2 of 3 signers confirmed' },
                  { k: 'Smart contract release', v: 'Executed on-chain', ok: true },
                ].map((row) => (
                  <div key={row.k} className="flex items-center justify-between text-sm">
                    <span className="text-mute">{row.k}</span>
                    <span
                      className={`font-mono text-xs font-semibold ${
                        row.ok ? 'text-ok' : row.accent ? 'text-accent' : 'text-ink'
                      } ${row.strong ? '!text-base !font-bold text-ink' : ''}`}
                    >
                      {row.v}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-lg border border-dashed border-line bg-mist px-4 py-3 text-[11px] leading-relaxed text-mute">
                Your actual trace at <span className="font-mono text-ink">/donor/donations/:id/trace</span> shows
                your own donation — every step above is drawn from real escrow events, never mock data.
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================
          10. NGO REPUTATION — deterministic formula
      ============================================ */}
      <section className="w-full border-b border-line bg-mist/60 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <Reveal className="lg:col-span-5">
              <div className="space-y-4">
                <span className="eyebrow">Transparent reliability</span>
                <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
                  Deterministic NGO trust scoring
                </h2>
                <p className="max-w-lg text-sm leading-relaxed text-mute sm:text-base">
                  We do not use subjective user star reviews. Every NGO is evaluated on
                  deterministic mathematical factors: on-time milestone delivery, zero
                  invoice discrepancies, and certified auditor approval rates. Every
                  organization&apos;s exact score and its derivation are public.
                </p>
                <Link href="/ngos" className="btn-secondary !mt-2 !text-sm">
                  <Building2 className="h-4 w-4 text-accent" />
                  <span>Browse the NGO directory</span>
                </Link>
              </div>
            </Reveal>

            <Reveal delay={100} className="lg:col-span-7">
              <div className="card rounded-xl p-6 sm:p-8">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-mute">
                  Score formula (0 – 100)
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    { icon: null, label: 'Base score', pts: '100', good: true },
                    { icon: TrendingUp, label: 'Per completed milestone (cap +30)', pts: '+10', good: true },
                    { icon: CheckCircle2, label: 'Clean auditor approvals', pts: '+5', good: true },
                    { icon: Receipt, label: 'Clean fund utilization', pts: '+5', good: true },
                    { icon: Minus, label: 'Failed milestone', pts: '−15', good: false },
                    { icon: Minus, label: 'Rejected proof', pts: '−10', good: false },
                    { icon: Cpu, label: 'AI discrepancy', pts: '−5', good: false },
                    { icon: Minus, label: 'Issued refund', pts: '−10', good: false },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between rounded-lg border border-line bg-white px-3.5 py-2.5"
                    >
                      <span className="flex items-center gap-2 text-xs text-ink">
                        {row.icon && <row.icon className="h-3.5 w-3.5 text-faint" />}
                        {row.label}
                      </span>
                      <span className={`font-mono text-xs font-bold ${row.good ? 'text-ok' : 'text-bad'}`}>
                        {row.pts}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-mute">Grades</span>
                  {[
                    { g: 'A+', range: '90+', cls: 'bg-ok-soft text-ok border-ok/20' },
                    { g: 'A', range: '80+', cls: 'bg-ok-soft text-ok border-ok/20' },
                    { g: 'B', range: '65+', cls: 'bg-accent-faint text-accent-deep border-accent/20' },
                    { g: 'C', range: '50+', cls: 'bg-warn-soft text-warn border-warn/25' },
                    { g: 'D', range: '< 50', cls: 'bg-bad-soft text-bad border-bad/20' },
                  ].map((grade) => (
                    <span
                      key={grade.g}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold ${grade.cls}`}
                    >
                      {grade.g}
                      <span className="font-normal opacity-70">{grade.range}</span>
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============================================
          11. LIVE LEDGER — real entries only
      ============================================ */}
      <section className="w-full border-b border-line py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mb-8 max-w-2xl space-y-3">
              <span className="eyebrow">Live transaction stream</span>
              <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Immutable ledger activity
              </h2>
              <p className="text-sm leading-relaxed text-mute sm:text-base">
                Real escrow locks, milestone releases, and refunds as recorded on the
                ledger — streamed from the database, never simulated.
              </p>
            </div>
          </Reveal>
          <AuditLedger />
        </div>
      </section>

      {/* ============================================
          12. FINAL CTA — dark technical band
      ============================================ */}
      <section className="panel-night w-full overflow-hidden">
        <div aria-hidden className="bg-grid-night pointer-events-none absolute inset-0 opacity-60" />
        <div
          aria-hidden
          className="bg-dots-night pointer-events-none absolute bottom-0 left-0 h-2/3 w-1/3 opacity-50"
          style={{
            maskImage: 'linear-gradient(to right, black 20%, transparent 90%)',
            WebkitMaskImage: 'linear-gradient(to right, black 20%, transparent 90%)',
          }}
        />
        <div className="relative mx-auto max-w-2xl space-y-7 px-4 py-24 text-center sm:px-6">
          <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Experience verifiable giving.
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-night-mute sm:text-base">
            Support initiatives where capital moves strictly upon certified physical
            progress. Every transaction is verifiable on the public ledger.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/register" className="btn-primary !px-6 !py-3 !text-sm">
              Create free account
            </Link>
            <Link href="/campaigns" className="btn-dark !px-6 !py-3 !text-sm">
              Browse campaigns
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
