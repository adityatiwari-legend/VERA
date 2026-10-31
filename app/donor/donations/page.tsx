import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getDonationsByDonor, getDonorStats } from '@/lib/donations';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { formatRupees } from '@/lib/utils';
import { HeartHandshake, Compass, ExternalLink, ArrowRight, ArrowLeft, Lock, Route } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DonorDonationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const [donations, stats] = await Promise.all([
    getDonationsByDonor(user.id),
    getDonorStats(user.id),
  ]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-line">
        <div className="space-y-2">
          <span className="eyebrow">Donor contribution history</span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">
            My Earmarked Contributions
          </h1>
          <p className="text-sm leading-relaxed text-mute max-w-2xl">
            Track your donated funds locked in transparent campaign escrows with programmatic allocation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="btn-secondary !px-3 !py-2 !text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <Link
            href="/campaigns"
            className="btn-primary !px-4 !py-2 !text-xs"
          >
            <Compass className="w-3.5 h-3.5" />
            Explore Campaigns
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Donated"
          value={formatRupees(Number(stats.total_donated))}
          icon={<HeartHandshake className="w-4 h-4" />}
          subtext="Earmarked contributions"
        />
        <StatCard
          label="Total Contributions"
          value={stats.total_donations}
          icon={<Lock className="w-4 h-4" />}
          subtext="Custody locked transactions"
        />
        <StatCard
          label="Campaigns Supported"
          value={stats.campaigns_supported}
          icon={<Compass className="w-4 h-4" />}
          subtext="Unique initiatives funded"
        />
      </div>

      {/* Donations Table */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-line flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight text-ink">Donation records</h2>
          <span className="chip">
            {donations.length} contribution{donations.length === 1 ? '' : 's'} recorded
          </span>
        </div>

        {donations.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-11 h-11 rounded-xl border border-line bg-mist text-mute flex items-center justify-center mx-auto mb-3">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-ink">No donations yet</h3>
            <p className="text-xs text-mute mt-1 max-w-sm mx-auto mb-5">
              You have not made any contributions yet. Browse active campaigns to start tracking transparent fund allocations.
            </p>
            <Link
              href="/campaigns"
              className="btn-primary !px-4 !py-2 !text-xs"
            >
              Browse Campaigns
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-mist font-mono text-[10px] uppercase tracking-wider text-mute">
                  <th className="py-3 px-5 font-medium">Campaign &amp; Purpose</th>
                  <th className="py-3 px-5 font-medium">Reference ID</th>
                  <th className="py-3 px-5 text-right font-medium">Amount</th>
                  <th className="py-3 px-5 text-center font-medium">Status</th>
                  <th className="py-3 px-5 font-medium">Date</th>
                  <th className="py-3 px-5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink">
                {donations.map((don) => (
                  <tr key={don.id} className="bg-white transition-colors hover:bg-accent-faint/60">
                    <td className="py-3.5 px-5">
                      <Link
                        href={`/campaigns/${don.campaign_id}`}
                        className="font-semibold text-ink hover:text-accent transition-colors block"
                      >
                        {don.campaign_title}
                      </Link>
                      {don.purpose && (
                        <p className="text-[11px] text-mute mt-0.5">
                          Purpose: {don.purpose}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-[11px] text-mute">
                      {don.reference}
                    </td>
                    <td className="py-3.5 px-5 text-right font-semibold text-ink font-mono text-sm">
                      {formatRupees(Number(don.amount))}
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <StatusBadge status={don.status} />
                      {don.is_demo !== false && (
                        <span className="ml-1.5 inline-block rounded-full border border-warn/25 bg-warn-soft px-1.5 py-0.5 font-mono text-[9px] font-bold text-warn">
                          DEMO
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-[11px] text-mute font-mono">
                      {new Date(don.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <Link
                          href={`/donor/donations/${don.id}/trace`}
                          className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-accent hover:text-accent-deep px-2.5 py-1 rounded-lg border border-accent/25 bg-accent-faint transition-colors"
                        >
                          <Route className="w-3 h-3" />
                          <span>Trace</span>
                        </Link>
                        <Link
                          href={`/donor/donations/${don.id}`}
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-mute hover:text-ink px-2 py-1 rounded-lg border border-line bg-white hover:border-line-strong transition-colors"
                        >
                          <span>Receipt</span>
                          <ExternalLink className="w-3 h-3" />
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
    </div>
  );
}
