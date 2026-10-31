import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getCampaignsForNgo } from '@/lib/campaigns';
import { query } from '@/lib/db';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { formatRupees } from '@/lib/utils';
import {
  FolderPlus,
  Layers,
  CheckCircle2,
  Building2,
  ExternalLink,
  Sparkles,
  Lock,
  Clock,
  Coins,
  AlertCircle,
  ShieldCheck,
  PlusCircle,
  FileUp,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NgoCampaignsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'ORGANIZATION' && user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const campaigns = await getCampaignsForNgo(user.id);

  // Requirement 15 Metrics:
  // Total Raised, Locked Funds, Released Funds, Active Campaigns, Pending Proofs, Milestones
  let totalRaised = 0;
  let totalReleased = 0;
  let lockedFunds = 0;
  let activeCampaignsCount = 0;
  let totalMilestonesCount = 0;
  let pendingProofsCount = 0;

  try {
    const statsRes = await query<{
      total_raised: string;
      total_released: string;
      locked_funds: string;
      active_campaigns: string;
    }>(
      `SELECT 
        COALESCE(SUM(raised_amount), 0)::numeric as total_raised,
        COALESCE(SUM(released_amount), 0)::numeric as total_released,
        COALESCE(SUM(raised_amount - released_amount), 0)::numeric as locked_funds,
        COUNT(*) FILTER (WHERE status = 'ACTIVE')::int as active_campaigns
       FROM campaigns
       WHERE ngo_id = $1`,
      [user.id]
    );

    if (statsRes.rows[0]) {
      totalRaised = Number(statsRes.rows[0].total_raised);
      totalReleased = Number(statsRes.rows[0].total_released);
      lockedFunds = Math.max(0, Number(statsRes.rows[0].locked_funds));
      activeCampaignsCount = Number(statsRes.rows[0].active_campaigns);
    }

    const msRes = await query<{ count: string }>(
      `SELECT COUNT(*)::int as count 
       FROM milestones m 
       JOIN campaigns c ON m.campaign_id = c.id 
       WHERE c.ngo_id = $1`,
      [user.id]
    );
    totalMilestonesCount = Number(msRes.rows[0]?.count || 0);

    const proofsRes = await query<{ count: string }>(
      `SELECT COUNT(*)::int as count 
       FROM proofs p 
       JOIN milestones m ON p.milestone_id = m.id 
       JOIN campaigns c ON m.campaign_id = c.id 
       WHERE c.ngo_id = $1 AND p.status IN ('SUBMITTED', 'UNDER_REVIEW')`,
      [user.id]
    );
    pendingProofsCount = Number(proofsRes.rows[0]?.count || 0);
  } catch (err) {
    console.error('Failed to load NGO stats:', err);
  }

  // Pending Actions: Milestones needing proof submission
  let pendingActions: any[] = [];
  try {
    const actionsRes = await query<{
      milestone_id: string;
      milestone_title: string;
      milestone_amount: string;
      milestone_status: string;
      campaign_id: string;
      campaign_title: string;
    }>(
      `SELECT 
        m.id as milestone_id,
        m.title as milestone_title,
        m.amount as milestone_amount,
        m.status as milestone_status,
        c.id as campaign_id,
        c.title as campaign_title
       FROM milestones m
       JOIN campaigns c ON m.campaign_id = c.id
       WHERE c.ngo_id = $1 AND m.status IN ('IN_PROGRESS', 'REJECTED')
       ORDER BY m.updated_at DESC
       LIMIT 4`,
      [user.id]
    );
    pendingActions = actionsRes.rows;
  } catch (err) {
    pendingActions = [];
  }

  // Recent Evidence
  let recentProofs: any[] = [];
  try {
    const proofsRes = await query<{
      proof_id: string;
      claimed_amount: string;
      status: string;
      submitted_at: string;
      milestone_title: string;
      campaign_id: string;
      campaign_title: string;
    }>(
      `SELECT 
        p.id as proof_id,
        p.claimed_amount,
        p.status,
        p.submitted_at,
        m.title as milestone_title,
        c.id as campaign_id,
        c.title as campaign_title
       FROM proofs p
       JOIN milestones m ON p.milestone_id = m.id
       JOIN campaigns c ON m.campaign_id = c.id
       WHERE c.ngo_id = $1
       ORDER BY p.submitted_at DESC
       LIMIT 4`,
      [user.id]
    );
    recentProofs = proofsRes.rows;
  } catch (err) {
    recentProofs = [];
  }

  // Financial Activity (Recent Donations)
  let recentDonations: any[] = [];
  try {
    const donRes = await query<{
      id: string;
      amount: string;
      reference: string;
      created_at: string;
      campaign_title: string;
    }>(
      `SELECT 
        d.id,
        d.amount,
        d.reference,
        d.created_at,
        c.title as campaign_title
       FROM donations d
       JOIN campaigns c ON d.campaign_id = c.id
       WHERE c.ngo_id = $1
       ORDER BY d.created_at DESC
       LIMIT 4`,
      [user.id]
    );
    recentDonations = donRes.rows;
  } catch (err) {
    recentDonations = [];
  }

  // First campaign ID for Quick CTAs
  const firstActiveCampaignId = campaigns[0]?.id;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <span className="eyebrow">
            <Building2 className="h-3 w-3" />
            NGO Operations Control
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {user.name} Operations
          </h1>
          <p className="text-sm text-mute">
            Manage campaigns, milestone evidence, and on-chain release authorizations.
          </p>
        </div>

        {/* Clear CTAs (Requirement 15: Create Campaign, Add Milestone, Submit Proof) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/org/campaigns/new" className="btn-primary !px-3.5 !py-2 !text-xs">
            <FolderPlus className="h-3.5 w-3.5" />
            <span>Create Campaign</span>
          </Link>

          {firstActiveCampaignId && (
            <>
              <Link
                href={`/org/campaigns/${firstActiveCampaignId}`}
                className="btn-secondary !px-3.5 !py-2 !text-xs"
              >
                <PlusCircle className="h-3.5 w-3.5 text-accent" />
                <span>Add Milestone</span>
              </Link>
              <Link
                href={`/org/campaigns/${firstActiveCampaignId}`}
                className="btn-secondary !px-3.5 !py-2 !text-xs"
              >
                <FileUp className="h-3.5 w-3.5 text-accent" />
                <span>Submit Proof</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 6 Key Operational Metrics (Requirement 15) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Total Raised"
          value={formatRupees(totalRaised)}
          icon={<Coins className="h-4 w-4 text-accent" />}
          subtext="Earmarked funds"
        />
        <StatCard
          label="Locked Funds"
          value={formatRupees(lockedFunds)}
          icon={<Lock className="h-4 w-4 text-warn" />}
          subtext="Custody in escrow"
        />
        <StatCard
          label="Released Funds"
          value={formatRupees(totalReleased)}
          icon={<CheckCircle2 className="h-4 w-4 text-ok" />}
          subtext="Disbursed on-chain"
        />
        <StatCard
          label="Active Campaigns"
          value={activeCampaignsCount}
          icon={<Layers className="h-4 w-4 text-accent" />}
          subtext={`${campaigns.length} total registered`}
        />
        <StatCard
          label="Pending Proofs"
          value={pendingProofsCount}
          icon={<Clock className="h-4 w-4 text-warn" />}
          subtext="Awaiting review"
        />
        <StatCard
          label="Milestones"
          value={totalMilestonesCount}
          icon={<Sparkles className="h-4 w-4 text-lav-deep" />}
          subtext="Delivery phases"
        />
      </div>

      {/* Grid: Pending Actions & Recent Evidence */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pending Actions */}
        <div className="card space-y-3 p-5">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warn" />
              <h2 className="text-sm font-semibold text-ink">Pending Actions</h2>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
              Requires NGO Evidence
            </span>
          </div>

          {pendingActions.length === 0 ? (
            <div className="py-8 text-center font-mono text-xs text-faint">
              No immediate pending actions. All active milestones are up to date.
            </div>
          ) : (
            <div className="divide-y divide-line">
              {pendingActions.map((action) => (
                <div key={action.milestone_id} className="flex items-center justify-between gap-3 py-3 text-xs">
                  <div>
                    <span className="block font-semibold text-ink">{action.milestone_title}</span>
                    <span className="text-[11px] text-mute">
                      {action.campaign_title} • Budget: {formatRupees(Number(action.milestone_amount))}
                    </span>
                  </div>
                  <Link
                    href={`/org/campaigns/${action.campaign_id}/milestones/${action.milestone_id}/proof`}
                    className="btn-primary !px-3 !py-1.5 !text-[11px] shrink-0"
                  >
                    <span>{action.milestone_status === 'REJECTED' ? 'Resubmit Proof' : 'Upload Proof'}</span>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Evidence */}
        <div className="card space-y-3 p-5">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-ink">Recent Evidence</h2>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
              OCR & Audit Trail
            </span>
          </div>

          {recentProofs.length === 0 ? (
            <div className="py-8 text-center font-mono text-xs text-faint">
              No evidence submitted yet.
            </div>
          ) : (
            <div className="divide-y divide-line">
              {recentProofs.map((proof) => (
                <div key={proof.proof_id} className="flex items-center justify-between gap-3 py-3 text-xs">
                  <div>
                    <span className="block font-semibold text-ink">{proof.milestone_title}</span>
                    <span className="text-[11px] text-mute">
                      Claimed: {formatRupees(Number(proof.claimed_amount))} • {proof.campaign_title}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={proof.status} />
                    <Link
                      href={`/ngo/proofs/${proof.proof_id}`}
                      className="rounded p-1 text-mute transition-colors hover:text-accent"
                      title="View Analysis"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Section: Campaigns Directory */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line p-5">
          <div>
            <h2 className="text-sm font-semibold text-ink">Managed Campaigns</h2>
            <p className="mt-0.5 text-xs text-mute">
              Active campaigns under management with verified target allocations
            </p>
          </div>
          <span className="font-mono text-xs text-faint">
            {campaigns.length} registered
          </span>
        </div>

        {campaigns.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-mist text-mute">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-ink">No campaigns yet</h3>
            <p className="mx-auto mt-1 mb-5 max-w-sm text-xs text-mute">
              Start by creating your organization's first transparent campaign to begin milestone-based funding.
            </p>
            <Link href="/org/campaigns/new" className="btn-primary !px-4 !py-2 !text-xs">
              <FolderPlus className="h-3.5 w-3.5" />
              Create First Campaign
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-mist font-mono text-[10px] uppercase tracking-wider text-mute">
                  <th className="px-5 py-3 font-medium">Campaign Title</th>
                  <th className="px-5 py-3 font-medium">Beneficiary</th>
                  <th className="px-5 py-3 text-right font-medium">Target</th>
                  <th className="px-5 py-3 text-right font-medium">Raised / Released</th>
                  <th className="px-5 py-3 text-center font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {campaigns.map((camp) => (
                  <tr key={camp.id} className="bg-white transition-colors hover:bg-accent-faint/60">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/org/campaigns/${camp.id}`}
                        className="block font-semibold text-ink transition-colors hover:text-accent"
                      >
                        {camp.title}
                      </Link>
                      <span className="font-mono text-[10px] text-faint">
                        Created {new Date(camp.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-mute">
                      {camp.beneficiary}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold text-ink">
                      {formatRupees(Number(camp.target_amount))}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs">
                      <span className="font-semibold text-ink">{formatRupees(Number(camp.raised_amount))}</span>
                      <span className="block text-[10px] text-ok">
                        Released: {formatRupees(Number(camp.released_amount || 0))}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={camp.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <Link
                          href={`/org/campaigns/${camp.id}`}
                          className="btn-secondary !px-2.5 !py-1 !text-[11px]"
                        >
                          Manage
                        </Link>
                        <Link
                          href={`/campaigns/${camp.id}/audit`}
                          className="rounded p-1.5 text-mute transition-colors hover:bg-mist hover:text-accent"
                          title="Public Audit"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Financial Activity (Recent Donations received) */}
      {recentDonations.length > 0 && (
        <div className="card space-y-3 p-5">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-ink">Financial Activity (Incoming Earmarks)</h2>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
              Immutable PostgreSQL Ledger
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recentDonations.map((don) => (
              <div key={don.id} className="space-y-1 rounded-lg border border-line bg-mist p-3">
                <span className="block truncate text-xs font-semibold text-ink">{don.campaign_title}</span>
                <span className="block font-mono text-base font-bold text-ok">
                  {formatRupees(Number(don.amount))}
                </span>
                <div className="flex items-center justify-between border-t border-line pt-1 font-mono text-[10px] text-faint">
                  <span>{don.reference}</span>
                  <span>{new Date(don.created_at).toLocaleDateString('en-IN', { dateStyle: 'short' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
