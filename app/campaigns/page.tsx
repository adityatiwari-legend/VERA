import React from 'react';
import Link from 'next/link';
import { query } from '@/lib/db';
import { Campaign } from '@/types';
import { ProgressBar } from '@/components/ProgressBar';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Compass,
  Building2,
  ArrowRight,
  ShieldCheck,
  Search,
  ArrowUpDown,
  Layers,
} from 'lucide-react';
import { formatRupees, formatRupeesShort } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function CampaignsExplorePage({
  searchParams,
}: {
  searchParams?: { q?: string; status?: string; sort?: string };
}) {
  const searchTerm = searchParams?.q?.trim() || '';
  const statusFilter = searchParams?.status?.toUpperCase() || 'ACTIVE';
  const sortBy = searchParams?.sort || 'recent';

  const validPublicStatuses = ['ACTIVE', 'COMPLETED', 'PAUSED'];

  let whereClause = `WHERE c.status IN ('ACTIVE', 'COMPLETED', 'PAUSED')`;
  const params: any[] = [];

  if (statusFilter !== 'ALL' && validPublicStatuses.includes(statusFilter)) {
    params.push(statusFilter);
    whereClause = `WHERE c.status = $${params.length}`;
  }

  if (searchTerm) {
    params.push(`%${searchTerm}%`);
    const pIndex = params.length;
    whereClause += ` AND (c.title ILIKE $${pIndex} OR c.description ILIKE $${pIndex} OR c.beneficiary ILIKE $${pIndex} OR u.name ILIKE $${pIndex})`;
  }

  let orderClause = 'ORDER BY c.created_at DESC';
  if (sortBy === 'raised') {
    orderClause = 'ORDER BY c.raised_amount DESC';
  } else if (sortBy === 'target') {
    orderClause = 'ORDER BY c.target_amount DESC';
  } else if (sortBy === 'progress') {
    orderClause = 'ORDER BY (c.raised_amount::numeric / NULLIF(c.target_amount::numeric, 0)) DESC';
  }

  const sql = `
    SELECT 
      c.id,
      c.ngo_id,
      c.title,
      c.description,
      c.target_amount::numeric as target_amount,
      c.raised_amount::numeric as raised_amount,
      c.released_amount::numeric as released_amount,
      c.beneficiary,
      c.status,
      c.created_at,
      u.name as ngo_name,
      COUNT(DISTINCT m.id)::int as milestones_count,
      COUNT(DISTINCT d.id)::int as donors_count
    FROM campaigns c
    JOIN users u ON c.ngo_id = u.id
    LEFT JOIN milestones m ON c.id = m.campaign_id
    LEFT JOIN donations d ON c.id = d.campaign_id AND d.status = 'CONFIRMED'
    ${whereClause}
    GROUP BY c.id, u.name
    ${orderClause}
  `;

  let campaigns: any[] = [];
  try {
    const res = await query<Campaign>(sql, params);
    campaigns = res.rows;
  } catch (err: any) {
    console.error('Failed to load campaigns:', err?.message || err);
    campaigns = [];
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 pb-20">
      {/* Page header */}
      <div className="space-y-3">
        <span className="eyebrow">Discovery directory</span>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Verified philanthropic initiatives
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-mute">
          Every initiative is segmented into deliverables with strict spending caps.
          Capital is locked in escrow custody and released only upon certified
          multi-signature consensus.
        </p>
      </div>

      {/* Search, filter & sort controls */}
      <div className="card flex flex-col justify-between gap-3 rounded-xl p-4 md:flex-row md:items-center">
        {/* Search input */}
        <form method="GET" className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            type="text"
            name="q"
            defaultValue={searchTerm}
            placeholder="Search campaign, beneficiary, or NGO…"
            className="input !py-2 !pl-9 !text-xs"
          />
          {statusFilter !== 'ACTIVE' && (
            <input type="hidden" name="status" value={statusFilter} />
          )}
          {sortBy !== 'recent' && (
            <input type="hidden" name="sort" value={sortBy} />
          )}
        </form>

        {/* Filter & sort bar */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <span className="hidden text-[11px] uppercase tracking-wider text-mute sm:inline">
            Status:
          </span>
          {[
            { label: 'Active', value: 'ACTIVE' },
            { label: 'Completed', value: 'COMPLETED' },
            { label: 'All', value: 'ALL' },
          ].map((tab) => {
            const isActive = statusFilter === tab.value;
            const qp = new URLSearchParams();
            if (searchTerm) qp.set('q', searchTerm);
            if (tab.value !== 'ACTIVE') qp.set('status', tab.value);
            if (sortBy !== 'recent') qp.set('sort', sortBy);
            const href = `/campaigns${qp.toString() ? `?${qp.toString()}` : ''}`;

            return (
              <Link
                key={tab.value}
                href={href}
                className={`rounded-lg border px-3 py-1.5 transition-all ${
                  isActive
                    ? 'border-accent/25 bg-accent-faint font-semibold text-accent-deep'
                    : 'border-line bg-white text-mute hover:border-line-strong hover:text-ink'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}

          <span className="mx-1 text-line-strong">|</span>

          {/* Sort menu */}
          <div className="flex items-center gap-1.5 text-mute">
            <ArrowUpDown className="h-3.5 w-3.5 text-faint" />
            <span className="text-[11px]">Sort:</span>
            {[
              { label: 'Recent', value: 'recent' },
              { label: 'Progress', value: 'progress' },
              { label: 'Goal', value: 'target' },
            ].map((s) => {
              const isActive = sortBy === s.value;
              const qp = new URLSearchParams();
              if (searchTerm) qp.set('q', searchTerm);
              if (statusFilter !== 'ACTIVE') qp.set('status', statusFilter);
              if (s.value !== 'recent') qp.set('sort', s.value);
              const href = `/campaigns${qp.toString() ? `?${qp.toString()}` : ''}`;

              return (
                <Link
                  key={s.value}
                  href={href}
                  className={`rounded px-1.5 py-1 text-[11px] transition-colors ${
                    isActive
                      ? 'font-bold text-ink underline decoration-accent decoration-2 underline-offset-4'
                      : 'text-mute hover:text-ink'
                  }`}
                >
                  {s.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Campaigns listing */}
      {campaigns.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 rounded-xl p-14 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-mist text-mute">
            <Compass className="h-5 w-5" />
          </span>
          <h2 className="text-base font-semibold text-ink">No matching campaigns found</h2>
          <p className="max-w-sm text-xs text-mute">
            Try adjusting your search keywords or filter settings.
          </p>
          <Link href="/campaigns" className="pt-2 font-mono text-xs font-semibold text-accent hover:underline">
            Clear filters →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((camp) => {
            const target = Number(camp.target_amount);
            const raised = Number(camp.raised_amount);
            const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
            const milestoneCount = camp.milestones_count || 0;

            return (
              <div
                key={camp.id}
                className="card card-hover flex flex-col justify-between rounded-xl p-5"
              >
                <div className="space-y-3.5">
                  {/* Top: status & tranche count */}
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={camp.status} />
                    <span className="chip">{milestoneCount} tranches</span>
                  </div>

                  {/* Title & description */}
                  <div>
                    <Link
                      href={`/campaigns/${camp.id}`}
                      className="block font-sans text-base font-semibold leading-snug tracking-tight text-ink transition-colors hover:text-accent"
                    >
                      {camp.title}
                    </Link>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-mute">
                      {camp.description}
                    </p>
                  </div>

                  {/* NGO & beneficiary meta */}
                  <div className="space-y-1 text-xs text-mute">
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-faint" />
                      <span className="truncate">{camp.ngo_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Compass className="h-3.5 w-3.5 shrink-0 text-faint" />
                      <span className="truncate">{camp.beneficiary}</span>
                    </div>
                  </div>

                  {/* Financial metrics */}
                  <div className="space-y-2 border-t border-line pt-3">
                    <div className="flex items-baseline justify-between font-mono">
                      <div>
                        <span className="text-lg font-bold text-ink">
                          {formatRupeesShort(raised)}
                        </span>
                        <span className="ml-1 text-xs text-mute">
                          / {formatRupeesShort(target)}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-accent">
                        {pct}% funded
                      </span>
                    </div>

                    <ProgressBar current={raised} total={target} showPercentage={false} />

                    <div className="flex items-center justify-between pt-0.5 font-mono text-[11px] text-mute">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3 text-faint" />
                        {formatRupees(Number(camp.released_amount || 0))} released
                      </span>
                      <span>Goal: {formatRupeesShort(target)}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom actions */}
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4">
                  <Link
                    href={`/campaigns/${camp.id}/audit`}
                    className="btn-secondary !px-3 !py-2 !text-xs"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                    <span>View audit</span>
                  </Link>

                  <Link
                    href={`/campaigns/${camp.id}`}
                    className="btn-primary !px-3 !py-2 !text-xs"
                  >
                    <span>Contribute</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
