import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNgoPublicProfile } from '@/lib/reputation';
import { formatRupees } from '@/lib/utils';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Layers,
  FileCheck,
  Info,
  Calendar,
  ExternalLink,
  RotateCcw,
  Percent,
} from 'lucide-react';
import { ProgressBar } from '@/components/ProgressBar';
import { StatusBadge } from '@/components/StatusBadge';

export const dynamic = 'force-dynamic';

const gradeChip: Record<string, string> = {
  'A+': 'border-ok/20 bg-ok-soft text-ok',
  'A': 'border-ok/20 bg-ok-soft text-ok',
  'B': 'border-accent/20 bg-accent-faint text-accent-deep',
  'C': 'border-warn/25 bg-warn-soft text-warn',
  'D': 'border-bad/20 bg-bad-soft text-bad',
};

const gradeText: Record<string, string> = {
  'A+': 'text-ok',
  'A': 'text-ok',
  'B': 'text-accent-deep',
  'C': 'text-warn',
  'D': 'text-bad',
};

export default async function PublicNgoProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const profile = await getNgoPublicProfile(params.id);
  if (!profile) {
    notFound();
  }

  const { name, createdAt, reputation, campaigns } = profile;
  const { score, grade, badge, summary, factors, stats } = reputation;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20">
      {/* Back button */}
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-mute transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Campaigns
      </Link>

      {/* Header Profile Banner */}
      <div className="card rounded-xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-mist text-accent">
              <Building2 className="h-6 w-6" />
            </span>
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/20 bg-ok-soft px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-ok">
                <ShieldCheck className="h-3 w-3" />
                Verified Entity
              </span>
              <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{name}</h1>
              <p className="flex items-center gap-1.5 font-mono text-xs text-mute">
                <Calendar className="h-3.5 w-3.5 text-faint" />
                <span>
                  Onboarded on VERA since{' '}
                  {new Date(createdAt).toLocaleDateString('en-IN', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </p>
            </div>
          </div>

          {/* VERA TRUST SCORE (Requirement 19) */}
          <div className="flex shrink-0 items-center gap-4 rounded-xl border border-line bg-mist p-4">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-lg border font-mono text-2xl font-bold ${gradeChip[grade] || 'border-line bg-white text-ink'}`}
            >
              {grade}
            </span>
            <div>
              <span className="block font-mono text-[10px] uppercase tracking-wider text-mute">
                VERA TRUST SCORE
              </span>
              <span className="font-mono text-2xl font-bold tracking-tight text-ink">
                {score} / 100
              </span>
              <span
                className={`block font-mono text-[10px] font-semibold ${gradeText[grade] || 'text-mute'}`}
              >
                {badge}
              </span>
            </div>
          </div>
        </div>

        {summary && (
          <p className="mt-6 border-t border-line pt-4 text-sm leading-relaxed text-mute">
            {summary}
          </p>
        )}
      </div>

      {/* 5 Explainable Factors Grid (Requirement 19: Completed milestones, Rejected proofs, AI discrepancy flags, Refunds, Utilization) */}
      <div className="space-y-2.5">
        <h2 className="font-mono text-xs uppercase tracking-wider text-mute">
          Explainable Financial Reliability Factors
        </h2>

        <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 lg:grid-cols-5">
          {/* 1. Completed Milestones */}
          <div className="card space-y-1 p-4">
            <div className="flex items-center gap-1.5 text-mute">
              <CheckCircle2 className="h-3.5 w-3.5 text-ok" />
              <span className="font-mono text-[10px] uppercase tracking-wider">Completed</span>
            </div>
            <div className="font-mono text-xl font-bold text-ink">
              {stats.milestonesCompleted} / {stats.milestonesTotal}
            </div>
            <span className="block font-mono text-[10px] text-faint">Auditor Verified</span>
          </div>

          {/* 2. Rejected Proofs */}
          <div className="card space-y-1 p-4">
            <div className="flex items-center gap-1.5 text-mute">
              <FileCheck className="h-3.5 w-3.5" />
              <span className="font-mono text-[10px] uppercase tracking-wider">Rejected Proofs</span>
            </div>
            <div className={`font-mono text-xl font-bold ${stats.proofsRejected > 0 ? 'text-bad' : 'text-ink'}`}>
              {stats.proofsRejected}
            </div>
            <span className="block font-mono text-[10px] text-faint">
              {stats.proofsRejected === 0 ? '0 rejections' : '-10 pts penalty each'}
            </span>
          </div>

          {/* 3. AI Discrepancy Flags */}
          <div className="card space-y-1 p-4">
            <div className="flex items-center gap-1.5 text-mute">
              <AlertTriangle className="h-3.5 w-3.5 text-warn" />
              <span className="font-mono text-[10px] uppercase tracking-wider">AI Flags</span>
            </div>
            <div className={`font-mono text-xl font-bold ${stats.discrepanciesCount > 0 ? 'text-warn' : 'text-ink'}`}>
              {stats.discrepanciesCount}
            </div>
            <span className="block font-mono text-[10px] text-faint">
              {stats.discrepanciesCount === 0 ? 'No OCR mismatches' : 'OCR discrepancies'}
            </span>
          </div>

          {/* 4. Refunds */}
          <div className="card space-y-1 p-4">
            <div className="flex items-center gap-1.5 text-mute">
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="font-mono text-[10px] uppercase tracking-wider">Refunds</span>
            </div>
            <div className={`font-mono text-xl font-bold ${stats.refundsCount > 0 ? 'text-bad' : 'text-ink'}`}>
              {stats.refundsCount}
            </div>
            <span className="block font-mono text-[10px] text-faint">
              {stats.refundsCount === 0 ? '0 clawbacks' : 'Donor refunds'}
            </span>
          </div>

          {/* 5. Utilization */}
          <div className="card col-span-2 space-y-1 p-4 sm:col-span-1">
            <div className="flex items-center gap-1.5 text-mute">
              <Percent className="h-3.5 w-3.5 text-accent" />
              <span className="font-mono text-[10px] uppercase tracking-wider">Utilization</span>
            </div>
            <div className="font-mono text-xl font-bold text-accent-deep">
              {stats.utilizationRatePercent}%
            </div>
            <span className="block font-mono text-[10px] text-faint">Released / Raised</span>
          </div>
        </div>
      </div>

      {/* "How this score is calculated" (Requirement 19) */}
      <div className="card space-y-4 p-6">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-ink">
            <Info className="h-4 w-4 text-accent" />
            How this score is calculated
          </h2>
          <p className="mt-0.5 text-xs text-mute">
            VERA scores are 100% deterministic and transparent. No arbitrary AI hallucination,
            subjective feedback, or pay-to-play rankings.
          </p>
        </div>

        <div className="space-y-2 rounded-lg border border-line bg-mist p-4 font-mono text-xs leading-relaxed text-mute">
          <p className="font-semibold text-ink">Mathematical Trust Formula:</p>
          <ul className="list-inside list-disc space-y-1 text-[11px] text-mute">
            <li><strong>Base Score:</strong> 100 points neutral starting baseline.</li>
            <li><strong>Completed Milestones:</strong> +10 points per milestone verified and released (up to +30 max bonus).</li>
            <li><strong>High Utilization:</strong> +5 points bonus if fund utilization is ≥ 70% with zero discrepancies.</li>
            <li><strong>Proof Approval Rate:</strong> +5 points bonus for 100% first-pass proof approvals.</li>
            <li><strong>Penalties:</strong> -10 points per rejected proof, -5 points per AI OCR invoice discrepancy, -15 points per failed milestone, -10 points per donor refund.</li>
            <li><strong>Normalization:</strong> Score is clamped strictly between 0 and 100.</li>
          </ul>
        </div>

        {/* Breakdown Factors List */}
        <div className="space-y-2 pt-2">
          <h3 className="font-mono text-[10px] uppercase tracking-wider text-mute">
            Current Factor Breakdown for {name}
          </h3>
          <div className="divide-y divide-line overflow-hidden rounded-lg border border-line text-xs">
            {factors.map((f, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 bg-white p-3.5 transition-colors hover:bg-mist"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-ink">{f.name}</div>
                  <div className="text-[11px] text-mute">{f.description}</div>
                </div>
                <span
                  className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                    f.impact > 0
                      ? 'border-ok/20 bg-ok-soft text-ok'
                      : f.impact < 0
                      ? 'border-bad/20 bg-bad-soft text-bad'
                      : 'border-line bg-mist text-mute'
                  }`}
                >
                  {f.impact > 0 ? `+${f.impact}` : f.impact} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Public Campaigns Portfolio */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line p-5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-ink">
              <Layers className="h-4 w-4 text-accent" />
              Campaigns by {name} ({campaigns.length})
            </h2>
            <p className="mt-0.5 text-xs text-mute">
              Active and completed charitable initiatives with public audit trails
            </p>
          </div>
        </div>

        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-mist text-mute">
              <Layers className="h-5 w-5" />
            </span>
            <h3 className="text-sm font-semibold text-ink">
              No public campaigns registered for this organization.
            </h3>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {campaigns.map((camp) => (
              <div key={camp.id} className="space-y-3 p-5 transition-colors hover:bg-accent-faint/60">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{camp.title}</h3>
                    <p className="mt-0.5 line-clamp-1 text-xs text-mute">{camp.description}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-faint">
                      Beneficiary: <strong className="font-semibold text-ink">{camp.beneficiary}</strong>
                    </p>
                  </div>
                  <div className="self-start">
                    <StatusBadge status={camp.status} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <ProgressBar current={camp.raisedAmount} total={camp.targetAmount} />
                  <div className="flex justify-between font-mono text-xs">
                    <span className="font-semibold text-ink">
                      {formatRupees(camp.raisedAmount)} raised
                    </span>
                    <span className="text-mute">Goal: {formatRupees(camp.targetAmount)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="font-mono text-[11px] text-faint">
                    {camp.milestonesCount} Milestones Defined
                  </span>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/campaigns/${camp.id}`}
                      className="font-mono text-xs text-mute transition-colors hover:text-ink"
                    >
                      Campaign Details
                    </Link>
                    <Link
                      href={`/campaigns/${camp.id}/audit`}
                      className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-accent hover:underline"
                    >
                      <span>Public Audit</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
