import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCampaignAuditDetails } from '@/lib/campaigns';
import { getCampaignAuditTimeline } from '@/lib/audit_timeline';
import { PrintButton } from './PrintButton';
import { formatRupees } from '@/lib/utils';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Coins,
  Layers,
  History,
  FileText,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CampaignReportPage({
  params,
}: {
  params: { id: string };
}) {
  const [details, timeline] = await Promise.all([
    getCampaignAuditDetails(params.id),
    getCampaignAuditTimeline(params.id),
  ]);

  if (!details) {
    notFound();
  }

  const { campaign, ngo, financialSummary, milestones, blockchain } = details;

  const reportDate = new Date().toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 pt-4 pb-20 print:max-w-none print:space-y-4 print:p-0">
      {/* Non-print navigation */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/campaigns/${campaign.id}/audit`}
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-mute transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Public Audit
        </Link>
        <PrintButton />
      </div>

      {/* Official Report Document Container */}
      <div className="card space-y-8 rounded-xl p-6 shadow-card sm:p-10 print:max-w-none print:space-y-4 print:border-none print:p-0 print:shadow-none">
        {/* Report Header */}
        <div className="flex flex-col justify-between gap-4 border-b-2 border-ink pb-6 sm:flex-row sm:items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-accent">
              <ShieldCheck className="h-4 w-4" />
              VERA Fund Trail Transparency Report
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Official Campaign Audit Statement
            </h1>
            <p className="text-xs text-mute">
              Cryptographically verified against PostgreSQL immutable ledger and EVM testnet anchors.
            </p>
          </div>

          <div className="space-y-1 text-left text-xs sm:text-right">
            <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Statement Date</p>
            <p className="font-mono text-[11px] text-ink">{reportDate}</p>
            <div className="inline-block rounded border border-line bg-mist px-2.5 py-0.5 font-mono text-[10px] font-semibold text-mute">
              ● {campaign.status}
            </div>
          </div>
        </div>

        {/* Section 1: Campaign Overview */}
        <div className="space-y-2.5">
          <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-mute">
            1. Campaign Overview
          </h2>
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-mist p-4 text-xs sm:grid-cols-4">
            <div>
              <span className="block font-mono text-[10px] uppercase text-faint">Initiative Title</span>
              <span className="mt-0.5 block font-semibold text-ink">{campaign.title}</span>
            </div>
            <div>
              <span className="block font-mono text-[10px] uppercase text-faint">Managing NGO</span>
              <span className="mt-0.5 block font-semibold text-ink">{ngo.name}</span>
            </div>
            <div>
              <span className="block font-mono text-[10px] uppercase text-faint">Target Beneficiary</span>
              <span className="mt-0.5 block font-semibold text-ink">{campaign.beneficiary}</span>
            </div>
            <div>
              <span className="block font-mono text-[10px] uppercase text-faint">Audit ID</span>
              <span className="mt-0.5 block font-mono text-[11px] text-mute">{campaign.id.slice(0, 12)}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Financial Summary */}
        <div className="space-y-2.5">
          <h2 className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-mute">
            <Coins className="h-3.5 w-3.5 text-faint" />
            2. Financial Summary &amp; Escrow Custody
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full overflow-hidden rounded-lg border border-line text-left text-xs">
              <thead className="bg-mist font-mono text-[10px] uppercase text-mute">
                <tr>
                  <th className="p-3 font-medium">Financial Metric</th>
                  <th className="p-3 text-right font-medium">Amount (INR)</th>
                  <th className="p-3 font-medium">Accounting State / Invariant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <tr>
                  <td className="p-3 font-semibold text-ink">Target Capital Goal</td>
                  <td className="p-3 text-right font-mono font-bold text-ink">{formatRupees(financialSummary.targetAmount)}</td>
                  <td className="p-3 text-mute">Authorized campaign funding ceiling</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-ok">Total Confirmed Donations</td>
                  <td className="p-3 text-right font-mono font-bold text-ok">{formatRupees(financialSummary.raisedAmount)}</td>
                  <td className="p-3 text-mute">Received and earmarked from {financialSummary.donorsCount} unique donor(s)</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-warn">Locked in Escrow</td>
                  <td className="p-3 text-right font-mono font-bold text-warn">{formatRupees(financialSummary.lockedAmount)}</td>
                  <td className="p-3 text-mute">Reserved in smart escrow custody awaiting milestone evidence</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-accent-deep">Total Released</td>
                  <td className="p-3 text-right font-mono font-bold text-accent-deep">{formatRupees(financialSummary.releasedAmount)}</td>
                  <td className="p-3 text-mute">Disbursed on-chain upon independent auditor and multisig authorization</td>
                </tr>
                {financialSummary.refundedAmount > 0 && (
                  <tr>
                    <td className="p-3 font-semibold text-bad">Total Refunded</td>
                    <td className="p-3 text-right font-mono font-bold text-bad">{formatRupees(financialSummary.refundedAmount)}</td>
                    <td className="p-3 text-mute">Returned to donors due to unfulfilled conditions</td>
                  </tr>
                )}
                <tr className="bg-mist font-bold">
                  <td className="p-3 text-ink">Current Escrow Balance</td>
                  <td className="p-3 text-right font-mono text-ink">{formatRupees(financialSummary.remainingBalance)}</td>
                  <td className="p-3 font-normal text-mute">Net active funds held in escrow custody</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Milestones */}
        <div className="space-y-2.5">
          <h2 className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-mute">
            <Layers className="h-3.5 w-3.5 text-faint" />
            3. Milestones Breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full overflow-hidden rounded-lg border border-line text-left text-xs">
              <thead className="bg-mist font-mono text-[10px] uppercase text-mute">
                <tr>
                  <th className="p-3 font-medium">#</th>
                  <th className="p-3 font-medium">Milestone Title</th>
                  <th className="p-3 text-right font-medium">Allocation</th>
                  <th className="p-3 text-right font-medium">Released</th>
                  <th className="p-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {milestones.map((ms) => (
                  <tr key={ms.id}>
                    <td className="p-3 font-mono font-bold text-mute">{ms.sequence}</td>
                    <td className="p-3">
                      <span className="block font-semibold text-ink">{ms.title}</span>
                      <span className="block text-[10px] text-faint">{ms.description}</span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-ink">{formatRupees(ms.allocatedAmount)}</td>
                    <td className="p-3 text-right font-mono font-semibold text-ok">{formatRupees(ms.releasedAmount)}</td>
                    <td className="p-3 text-center">
                      <span className="rounded border border-line bg-mist px-2 py-0.5 font-mono text-[10px] font-semibold text-mute">
                        {ms.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Evidence */}
        <div className="space-y-2.5">
          <h2 className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-mute">
            <FileText className="h-3.5 w-3.5 text-faint" />
            4. Cryptographic Evidence Records
          </h2>
          <div className="space-y-2 rounded-lg border border-line bg-mist p-4 text-xs">
            <p className="leading-relaxed text-ink">
              Every expense invoice submitted by the NGO is cryptographically fingerprinted using SHA-256 upon upload. Tampering with any byte invalidates verification on-chain.
            </p>
            <div className="divide-y divide-line pt-1">
              {milestones.map((ms) => (
                <div key={ms.id} className="flex items-center justify-between py-2">
                  <span className="font-semibold text-ink">{ms.title}</span>
                  <span className="font-mono text-xs text-ok">
                    {ms.proofCount > 0 ? `${ms.proofCount} Document(s) Hashed & Fingerprinted` : 'No evidence submitted'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 5: Verification */}
        <div className="space-y-2.5">
          <h2 className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-mute">
            <FileCheck className="h-3.5 w-3.5 text-faint" />
            5. Automated AI &amp; OCR Verification
          </h2>
          <div className="space-y-2 rounded-lg border border-line bg-mist p-4 text-xs">
            <p className="text-ink">
              Receipts undergo automated optical character recognition (OCR) and duplicate detection. Extracted amounts and tax invoice serial numbers are cross-referenced with milestone allocations to flag discrepancies.
            </p>
            <div className="grid grid-cols-1 gap-2 pt-1 font-mono text-[11px] sm:grid-cols-3">
              <div className="rounded border border-line bg-white p-2.5">
                <span className="block text-[10px] text-faint">OCR Precision Engine</span>
                <span className="font-bold text-ink">Standard Invariant OCR</span>
              </div>
              <div className="rounded border border-line bg-white p-2.5">
                <span className="block text-[10px] text-faint">Duplicate Hash Check</span>
                <span className="font-bold text-ok">Enforced on every upload</span>
              </div>
              <div className="rounded border border-line bg-white p-2.5">
                <span className="block text-[10px] text-faint">Auditor Cross-Check</span>
                <span className="font-bold text-accent-deep">Enforced Before Release</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Approvals */}
        <div className="space-y-2.5">
          <h2 className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-mute">
            <CheckCircle2 className="h-3.5 w-3.5 text-faint" />
            6. Auditor Verification &amp; Multisig Approvals
          </h2>
          <div className="space-y-2 rounded-lg border border-line bg-mist p-4 text-xs">
            <p className="text-ink">
              Human auditor verification is mandatory. Once evidence is verified, fund disbursement requires 2-of-3 multi-signature consensus among designated keys (NGO Admin, Project Lead, Certified Auditor).
            </p>
            <div className="flex items-center gap-3 pt-1 font-mono text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-ok">
                ✓ 2-of-3 Multisig Rule Enforced
              </span>
              <span className="text-line-strong">•</span>
              <span className="text-mute">Double-release prevented by contract state machine</span>
            </div>
          </div>
        </div>

        {/* Section 7: Blockchain Activity */}
        <div className="space-y-2.5">
          <h2 className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-mute">
            <ShieldCheck className="h-3.5 w-3.5 text-faint" />
            7. Blockchain Activity &amp; Smart Contract Anchors
          </h2>
          <div className="space-y-2 rounded-lg border border-line bg-mist p-4 text-xs">
            <div className="flex justify-between font-mono">
              <span className="text-faint">Blockchain Network:</span>
              <span className="font-bold text-ink">{blockchain.network}</span>
            </div>
            <div className="flex justify-between gap-4 font-mono">
              <span className="shrink-0 text-faint">Contract Address:</span>
              <span className="break-all text-right text-ink">{blockchain.contractAddress || '—'}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-faint">Confirmed On-Chain Transactions:</span>
              <span className="font-bold text-ink">{blockchain.transactions.length} record(s)</span>
            </div>
          </div>
        </div>

        {/* Section 8: Audit Timeline */}
        <div className="space-y-2.5">
          <h2 className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-mute">
            <History className="h-3.5 w-3.5 text-faint" />
            8. Chronological Audit Timeline
          </h2>
          <div className="divide-y divide-line overflow-hidden rounded-lg border border-line text-xs">
            {timeline.slice(0, 10).map((event) => (
              <div key={event.id} className="flex items-start justify-between gap-3 p-3 bg-white">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{event.title}</span>
                    <span className="rounded border border-line bg-mist px-1.5 py-0.5 font-mono text-[9px] font-semibold text-mute">
                      {event.type}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-mute">{event.description}</p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-faint">
                  {new Date(event.timestamp).toLocaleDateString('en-IN', { dateStyle: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Attestation & System Invariants */}
        <div className="flex flex-col items-center justify-between gap-2 border-t border-line pt-5 font-mono text-[10px] text-faint sm:flex-row">
          <span>VERA Protocol • Tamper-Evident Public Ledger</span>
          <span>ACID-Compliant PostgreSQL + EVM Smart Contract</span>
        </div>
      </div>
    </div>
  );
}
