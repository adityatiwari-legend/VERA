import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getDonorStats, getDonationsByDonor } from '@/lib/donations';
import { query } from '@/lib/db';
import { StatCard } from '@/components/StatCard';
import ConnectWallet from '@/components/wallet/ConnectWallet';
import { formatRupees } from '@/lib/utils';
import { HeartHandshake, Compass, ArrowRight, ShieldCheck, Sparkles, ExternalLink, Lock } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// Presentation-only color mapping for donation status badges.
function donationBadgeClass(status: string) {
  switch (status) {
    case 'CONFIRMED':
      return 'border-lav-deep/20 bg-lav-soft text-lav-deep';
    case 'PENDING':
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
    case 'PROOF_SUBMITTED':
      return 'border-warn/25 bg-warn-soft text-warn';
    case 'RELEASED':
    case 'COMPLETED':
    case 'APPROVED':
      return 'border-ok/20 bg-ok-soft text-ok';
    case 'REFUNDED':
      return 'border-violet-200 bg-violet-50 text-violet-700';
    case 'REJECTED':
    case 'FAILED':
    case 'CANCELLED':
      return 'border-bad/20 bg-bad-soft text-bad';
    default:
      return 'border-line bg-mist text-mute';
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Role routing — one portal per role
  if (user.role === 'ORGANIZATION') {
    redirect('/org/campaigns');
  }
  if (user.role === 'CONTRACTOR') {
    redirect('/contractor');
  }
  if (user.role === 'AUDITOR') {
    redirect('/auditor/dashboard');
  }
  if (user.role === 'ADMIN') {
    redirect('/admin');
  }

  // Donor Dashboard Experience
  const [stats, donations] = await Promise.all([
    getDonorStats(user.id),
    getDonationsByDonor(user.id),
  ]);

  // Compute funds released across supported campaigns
  let fundsReleased = 0;
  try {
    const releasedRes = await query<{ total_released: string }>(
      `SELECT COALESCE(SUM(c.released_amount), 0)::numeric as total_released
       FROM campaigns c
       WHERE c.id IN (SELECT DISTINCT campaign_id FROM donations WHERE donor_id = $1)`,
      [user.id]
    );
    fundsReleased = Number(releasedRes.rows[0]?.total_released || 0);
  } catch (err) {
    fundsReleased = 0;
  }

  // Time-based greeting
  const currentHour = new Date().getHours();
  const greetingTime = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20">
      {/* Top Section */}
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <span className="eyebrow">MY VERA</span>
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {greetingTime}, {user.name}
          </h1>
          <p className="text-sm leading-relaxed text-mute">
            Your contribution overview and verifiable fund custody trail
          </p>
        </div>

        <Link href="/campaigns" className="btn-primary self-start !text-xs sm:self-auto">
          <Compass className="h-3.5 w-3.5" />
          Explore Campaigns
        </Link>
      </div>

      {!user.wallet_address && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-semibold text-ink">Bind a wallet to donate real value on-chain</p>
            <p className="mt-1 text-xs leading-relaxed text-mute">
              Optional. Connect MetaMask and sign a one-time message — after that, the donate dialog offers
              real on-chain contributions next to the clearly-labeled demo ledger.
            </p>
          </div>
          <ConnectWallet bound={user.wallet_address} compact={false} />
        </div>
      )}

      {/* Metrics: 4 stats as specified in Requirement 14 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Donated"
          value={formatRupees(Number(stats.total_donated))}
          icon={<HeartHandshake className="h-4 w-4" />}
          subtext="Earmarked contributions"
        />
        <StatCard
          label="Active Contributions"
          value={stats.total_donations}
          icon={<Lock className="h-4 w-4" />}
          subtext="Locked in smart custody"
        />
        <StatCard
          label="Funds Released"
          value={formatRupees(fundsReleased)}
          icon={<ShieldCheck className="h-4 w-4" />}
          subtext="Multisig verified tranches"
        />
        <StatCard
          label="Campaigns Supported"
          value={stats.campaigns_supported}
          icon={<Compass className="h-4 w-4" />}
          subtext="Directly funded initiatives"
        />
      </div>

      {/* Recent Donations Table (Requirement 14: Campaign, Amount, Date, Status, Trace) */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line p-5">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-ink">Recent Donations</h2>
            <p className="mt-0.5 text-xs text-mute">
              Programmatic allocation and milestone tracking for your contributions
            </p>
          </div>
          <Link
            href="/donor/donations"
            className="font-mono text-xs font-semibold text-accent hover:underline"
          >
            View All ({donations.length}) →
          </Link>
        </div>

        {donations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-mist text-mute">
              <HeartHandshake className="h-5 w-5" />
            </span>
            <h3 className="text-sm font-semibold text-ink">You have not made any donations yet.</h3>
            <p className="max-w-sm text-xs text-mute">
              Donations to verified campaigns will appear here with their full custody trail.
            </p>
            <Link
              href="/campaigns"
              className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-accent hover:underline"
            >
              Explore verified campaigns <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-mist font-mono text-[10px] uppercase tracking-wider text-mute">
                  <th className="px-5 py-3 font-medium">Campaign</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 text-center font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {donations.slice(0, 6).map((don) => (
                  <tr key={don.id} className="bg-white transition-colors hover:bg-accent-faint/60">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/campaigns/${don.campaign_id}`}
                        className="block font-semibold text-ink transition-colors hover:text-accent"
                      >
                        {don.campaign_title}
                      </Link>
                      <span className="font-mono text-[10px] text-faint">Ref: {don.reference}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-sm font-semibold text-ink">
                      {formatRupees(Number(don.amount))}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-mute">
                      {new Date(don.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium ${donationBadgeClass(don.status)}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                        {don.status === 'CONFIRMED' ? 'LOCKED IN ESCROW' : don.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <Link
                          href={`/donor/donations/${don.id}/trace`}
                          className="inline-flex items-center gap-1 rounded-lg border border-accent/20 bg-accent-faint px-2.5 py-1 font-mono text-[11px] font-semibold text-accent-deep transition-colors hover:bg-accent-soft"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Trace</span>
                        </Link>
                        <Link
                          href={`/donor/donations/${don.id}`}
                          className="rounded-lg p-1.5 text-mute transition-colors hover:bg-mist hover:text-ink"
                          title="Receipt"
                          aria-label="View receipt"
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
    </div>
  );
}
