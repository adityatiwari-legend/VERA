import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getDonationById } from '@/lib/donations';
import { formatRupees } from '@/lib/utils';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Lock,
  FileCheck,
  Coins,
  Route,
} from 'lucide-react';
import { BlockchainBadge } from '@/components/BlockchainBadge';
import { StatusBadge } from '@/components/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function DonationReceiptPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const donation = await getDonationById(params.id, user.id);
  if (!donation) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Top Navigation & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/donor/donations"
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-mute hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Donations
        </Link>
        <Link
          href={`/donor/donations/${donation.id}/trace`}
          className="btn-primary !px-3.5 !py-1.5 !text-xs"
        >
          <Route className="w-3.5 h-3.5" />
          Trace My Donation →
        </Link>
      </div>

      {/* Official Receipt Card */}
      <div className="card overflow-hidden">
        {/* Receipt Header */}
        <div className="p-6 sm:p-8 border-b border-line bg-mist">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-faint border border-accent/20 flex items-center justify-center text-accent">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="eyebrow">VERA Earmarked Receipt</span>
                <h1 className="text-xl font-semibold tracking-tight text-ink">Official Contribution Record</h1>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint block">
                Reference Number
              </span>
              <span className="chip mt-0.5 !text-xs !text-ink">
                {donation.reference}
              </span>
            </div>
          </div>
        </div>

        {/* Receipt Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Amount Callout */}
          <div className="p-5 rounded-lg bg-mist border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-mute block">
                Total Contribution
              </span>
              <span className="text-3xl font-semibold text-ink font-mono mt-1 block tracking-tight">
                {formatRupees(Number(donation.amount))}
              </span>
              <span className="text-[11px] text-faint mt-1 block">
                Programmatic escrow custody • Tamper-evident ledger
              </span>
            </div>

            <div className="self-start sm:self-auto">
              <StatusBadge status={donation.status} size="md" />
            </div>
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-lg border border-line bg-white">
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-faint mb-1">
                Earmarked Campaign
              </h3>
              <Link
                href={`/campaigns/${donation.campaign_id}`}
                className="font-semibold text-ink hover:text-accent transition-colors"
              >
                {donation.campaign_title}
              </Link>
            </div>

            <div className="p-3.5 rounded-lg border border-line bg-white">
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-faint mb-1">
                Target Beneficiary
              </h3>
              <p className="font-semibold text-ink">{donation.beneficiary || 'Designated Beneficiary'}</p>
            </div>

            <div className="p-3.5 rounded-lg border border-line bg-white">
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-faint mb-1">
                Donor Name
              </h3>
              <p className="font-semibold text-ink">{donation.donor_name}</p>
            </div>

            <div className="p-3.5 rounded-lg border border-line bg-white">
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-faint mb-1">
                Date &amp; Time
              </h3>
              <p className="font-semibold text-ink font-mono text-xs">
                {new Date(donation.created_at).toLocaleString('en-IN', {
                  dateStyle: 'long',
                  timeStyle: 'medium',
                })}
              </p>
            </div>

            <div className="sm:col-span-2 bg-mist p-4 rounded-lg border border-line space-y-2">
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-mute">
                Blockchain Testnet Settlement
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <BlockchainBadge
                  status={donation.blockchain_status}
                  txHash={donation.blockchain_tx_hash || donation.transaction_hash}
                />
              </div>
              <p className="text-[11px] text-mute">
                Anchored to the VERA smart contract on testnet. Funds remain strictly locked in escrow until 2-of-3 multisig release approval.
              </p>
            </div>

            {donation.purpose && (
              <div className="sm:col-span-2">
                <h3 className="font-mono text-[10px] uppercase tracking-wider text-faint mb-1">
                  Earmark Purpose Note
                </h3>
                <p className="text-ink bg-mist p-3 rounded-lg border border-line">
                  {donation.purpose}
                </p>
              </div>
            )}
          </div>

          {/* VERA Fund Trail Life-cycle Tracker */}
          <div className="pt-5 border-t border-line">
            <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
              <Coins className="w-3.5 h-3.5 text-accent" />
              VERA Fund Trail Progression
            </h3>

            <div className="space-y-3">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-ok-soft border border-ok/25 text-ok flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-ink">Donation Confirmed</h4>
                  <p className="text-[11px] text-mute mt-0.5">
                    Contribution registered and validated server-side in PostgreSQL.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-ok-soft border border-ok/25 text-ok flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-ink">Earmarked to Campaign</h4>
                  <p className="text-[11px] text-mute mt-0.5">
                    Tied immutably to "{donation.campaign_title}". Funds cannot be silently reallocated.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-accent-faint border border-accent/25 text-accent flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-ink">Funds Locked in Escrow</h4>
                  <p className="text-[11px] text-mute mt-0.5">
                    Accounting lock active. Funds are reserved and cannot be disbursed without milestone proof.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3 opacity-60">
                <div className="w-6 h-6 rounded-full bg-white border border-line-strong text-faint flex items-center justify-center shrink-0 mt-0.5">
                  <FileCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-mute">Milestone Proof &amp; Verification</h4>
                  <p className="text-[11px] text-faint mt-0.5">
                    NGO will submit evidence (receipts/invoices) for AI analysis and human auditor review.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex items-start gap-3 opacity-60">
                <div className="w-6 h-6 rounded-full bg-white border border-line-strong text-faint flex items-center justify-center shrink-0 mt-0.5">
                  <Route className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-mute">Disbursement to Beneficiary</h4>
                  <p className="text-[11px] text-faint mt-0.5">
                    Funds released only after milestone approval, anchored with public audit trails.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
