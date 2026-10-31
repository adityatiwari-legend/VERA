import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import ConsoleShell from '@/components/console/ConsoleShell';
import ReportForm from '@/components/hisaab/ReportForm';
import { card } from '@/components/console/ui';
import { Camera, Users, Landmark } from 'lucide-react';

export const dynamic = 'force-dynamic';

const STEPS = [
  {
    icon: Camera,
    title: 'Snap & analyze',
    body: 'Gemini measures the pothole — severity, size, risk — and writes a Hinglish summary. The photo gets a SHA-256 fingerprint.',
  },
  {
    icon: Users,
    title: 'Three citizens confirm',
    body: 'Independent people nearby confirm the report. Three distinct confirmations move it into the public register.',
  },
  {
    icon: Landmark,
    title: 'Escrow opens, proof pays',
    body: 'A funder locks the budget in a Solana vault. The contractor is paid stage-by-stage — only when before/after proof and road-roughness telemetry agree.',
  },
];

export default async function NewReportPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <ConsoleShell
      title="Report a pothole"
      subtitle="Takes under a minute. Your report becomes public evidence — the first step toward getting the road actually fixed."
      breadcrumb={['Console', 'Hisaab', 'New report']}
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ReportForm />
        </div>

        <div className="space-y-5">
          <div className={`${card} p-5`}>
            <p className="text-base font-semibold tracking-tight text-ink">How it works</p>
            <div className="mt-4 space-y-5">
              {STEPS.map((s, i) => (
                <div key={i} className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-faint">
                      <s.icon className="h-[18px] w-[18px] text-accent" />
                    </span>
                    {i < STEPS.length - 1 && <span className="mt-2 h-6 w-px bg-line" />}
                  </div>
                  <div className="pb-1">
                    <p className="text-[13px] font-semibold text-ink">{s.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-mute">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${card} p-5`}>
            <p className="text-base font-semibold tracking-tight text-ink">Why three confirmations?</p>
            <p className="mt-2 text-xs leading-relaxed text-mute">
              One photo can be faked; a street full of neighbors can't. Distinct signers confirm
              on-chain — the same wallet can never confirm twice — and every step lands in a
              hash-chained audit trail before any money moves.
            </p>
          </div>
        </div>
      </div>
    </ConsoleShell>
  );
}
