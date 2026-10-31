import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getDonationJourney } from '@/lib/audit_timeline';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Info,
  Layers,
  Coins,
  Lock,
  Database,
  FileCheck,
  Cpu,
  UserCheck,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { formatRupees } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TraceDonationPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const journey = await getDonationJourney(params.id, user.id);
  if (!journey) {
    notFound();
  }

  const { donation, stages, milestones } = journey;

  // The 8 canonical steps specified by Requirement 13
  const timelineSteps = [
    {
      step: 1,
      title: 'Donation',
      subtitle: 'Contribution Received',
      description: `${formatRupees(donation.amount)} contribution received and assigned permanent reference: ${donation.reference}.`,
      isDone: true,
      timestamp: donation.created_at,
      icon: Coins,
    },
    {
      step: 2,
      title: 'Earmarked',
      subtitle: 'Programmatic Allocation',
      description: `Funds bound programmatically to "${donation.campaign_title}". Zero co-mingling with general NGO operational funds.`,
      isDone: true,
      timestamp: donation.created_at,
      icon: Lock,
    },
    {
      step: 3,
      title: 'Locked',
      subtitle: 'Escrow Custody',
      description: `Capital held in escrow custody until milestone deliverables are independently certified.`,
      isDone: true,
      timestamp: donation.created_at,
      icon: Database,
    },
    {
      step: 4,
      title: 'Assigned to milestone',
      subtitle: 'Budget Segmentation',
      description: `Programmatically allocated across ${milestones.length} bounded milestone tranches for ${donation.beneficiary}.`,
      isDone: milestones.length > 0,
      timestamp: null,
      icon: Layers,
    },
    {
      step: 5,
      title: 'Evidence submitted',
      subtitle: 'Vendor Invoices & Photos',
      description: milestones.some((m) => ['PROOF_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'RELEASED'].includes(m.status))
        ? 'Executing NGO uploaded vendor receipts and site inspection photographs with SHA-256 digests.'
        : 'Awaiting vendor invoice submission upon deliverable completion.',
      isDone: milestones.some((m) => ['PROOF_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'RELEASED'].includes(m.status)),
      timestamp: null,
      icon: FileCheck,
    },
    {
      step: 6,
      title: 'Verification',
      subtitle: 'Gemini document vision',
      description: milestones.some((m) => ['APPROVED', 'RELEASED'].includes(m.status))
        ? 'AI document reading extracted the vendor, invoice number and total; rule checks compared them against the claimed budget.'
        : 'AI screening executes immediately upon evidence upload.',
      isDone: milestones.some((m) => ['APPROVED', 'RELEASED'].includes(m.status)),
      timestamp: null,
      icon: Cpu,
    },
    {
      step: 7,
      title: 'Auditor approval',
      subtitle: 'Independent Certification',
      description: milestones.some((m) => ['APPROVED', 'RELEASED'].includes(m.status))
        ? 'Certified independent auditor inspected documentation and signed off on compliance.'
        : 'Human auditor sign-off pending evidence examination.',
      isDone: milestones.some((m) => ['APPROVED', 'RELEASED'].includes(m.status)),
      timestamp: null,
      icon: UserCheck,
    },
    {
      step: 8,
      title: 'Release',
      subtitle: '2-of-3 Multisig On-Chain',
      description: Number(donation.released_amount) > 0
        ? `Smart contract released tranche upon 2-of-3 multisig consensus. Real transaction hash recorded.`
        : 'Funds remain safely locked in escrow custody until final multisig consensus.',
      isDone: Number(donation.released_amount) > 0,
      timestamp: null,
      icon: ShieldCheck,
    },
  ];

  // Presentational: the first not-yet-completed stage is the live one.
  const currentStepNumber = timelineSteps.find((s) => !s.isDone)?.step ?? null;
  const doneCount = timelineSteps.filter((s) => s.isDone).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/donor/donations/${donation.id}`}
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-mute hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Contribution Receipt</span>
        </Link>
        <Link
          href={`/campaigns/${donation.campaign_id}/audit`}
          className="btn-secondary !px-3.5 !py-1.5 !text-xs"
        >
          <ShieldCheck className="w-4 h-4 text-accent" />
          <span>View Campaign Public Audit</span>
        </Link>
      </div>

      {/*
        ========================================================================
        HERO SECTION (Requirement 13)
        "Where did my donation go?"
        ========================================================================
      */}
      <div className="card p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <span className="eyebrow">Donor traceability ledger</span>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">
              Where did my donation go?
            </h1>
            <p className="text-xs text-mute font-mono">
              Campaign: <strong className="text-ink font-semibold">{donation.campaign_title}</strong> • Ref: {donation.reference}
            </p>
          </div>

          <div className="bg-mist border border-line p-5 rounded-xl text-left sm:text-right shrink-0">
            <span className="font-mono text-[10px] uppercase tracking-wider text-mute block font-medium">
              Donation
            </span>
            <div className="text-2xl sm:text-3xl font-semibold font-mono text-ink mt-0.5 tracking-tight">
              {formatRupees(donation.amount)}
            </div>
            <span className="text-[11px] font-mono text-mute">
              {new Date(donation.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            </span>
          </div>
        </div>
      </div>

      {/*
        ========================================================================
        PROGRAMMATIC ALLOCATION DISCLAIMER (Requirement 13)
        ========================================================================
      */}
      <div className="rounded-xl bg-accent-faint border border-accent/20 p-4 text-xs font-mono flex items-start gap-3 text-ink">
        <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-ink">
            Programmatic transparency notice:
          </p>
          <p className="text-mute leading-relaxed font-sans">
            This represents programmatic allocation within the campaign. VERA tracks earmarked funds and milestone commitments within verified smart contracts rather than individual physical bank notes.
          </p>
        </div>
      </div>

      {/*
        ========================================================================
        VERTICAL TIMELINE (Requirement 13)
        ✓ Donation          ✓ Earmarked          ✓ Locked
        ✓ Assigned to mile. ✓ Evidence submitted ✓ Verification
        ✓ Auditor approval  ✓ Release
        Green node = completed · Blue node = current · Amber badge = pending
        ========================================================================
      */}
      <div className="card p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <span className="eyebrow">Execution milestones</span>
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              Contribution Progression
            </h2>
          </div>
          <span className="chip">
            {doneCount} of 8 stages complete
          </span>
        </div>

        <div className="relative ml-3 sm:ml-4 border-l border-line pl-6 sm:pl-8 space-y-4">
          {timelineSteps.map((step) => {
            const isCurrent = step.step === currentStepNumber;
            return (
              <div key={step.step} className="relative">
                {/* Timeline node: numbered / event marker on the thin line */}
                <div
                  className={`absolute -left-9 sm:-left-11 top-4 w-6 h-6 rounded-full flex items-center justify-center border font-mono text-[10px] font-bold ${
                    step.isDone
                      ? 'bg-ok border-ok text-white'
                      : isCurrent
                      ? 'bg-accent border-accent text-white ring-4 ring-accent/15'
                      : 'bg-white border-line-strong text-faint'
                  }`}
                >
                  {step.isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : isCurrent ? (
                    <step.icon className="w-3.5 h-3.5" />
                  ) : (
                    step.step
                  )}
                </div>

                <div
                  className={`p-4 rounded-lg border transition-all space-y-2 ${
                    isCurrent
                      ? 'bg-accent-faint/70 border-accent/25'
                      : step.isDone
                      ? 'bg-white border-line hover:border-line-strong'
                      : 'bg-white border-line opacity-75'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${isCurrent || step.isDone ? 'text-ink' : 'text-mute'}`}>
                        {step.title}
                      </span>
                      <span className="text-line-strong text-xs">/</span>
                      <span className="text-xs text-mute font-medium">
                        {step.subtitle}
                      </span>
                    </div>

                    <StatusBadge
                      status={step.isDone ? 'APPROVED' : isCurrent ? 'IN PROGRESS' : 'PENDING'}
                      size="sm"
                    />
                  </div>

                  <p className="text-xs text-mute leading-relaxed">
                    {step.description}
                  </p>

                  {step.timestamp && (
                    <div className="text-[11px] font-mono text-faint pt-0.5">
                      Recorded: {new Date(step.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Campaign Milestone Allocation Context */}
      <div className="card p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <span className="eyebrow">Deliverable targets</span>
            <h3 className="text-base font-semibold tracking-tight text-ink">
              Supported Milestone Deliverables
            </h3>
          </div>
          <span className="chip">
            {milestones.length} milestone tranches
          </span>
        </div>

        {milestones.length === 0 ? (
          <div className="py-8 text-center">
            <Layers className="w-6 h-6 text-faint mx-auto mb-2" />
            <p className="text-xs text-mute">No milestone tranches recorded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-line text-xs">
            {milestones.map((m) => (
              <div key={m.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-ink">{m.title}</span>
                  <p className="text-[11px] text-mute mt-0.5">{m.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono font-semibold text-ink">{formatRupees(m.amount)}</span>
                  <StatusBadge status={m.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
