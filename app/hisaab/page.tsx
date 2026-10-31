import Link from 'next/link';
import { listPotholeReports } from '@/lib/hisaab';
import { explorerAccountUrl, getSolanaStatus } from '@/lib/solana';
import ConsoleShell from '@/components/console/ConsoleShell';
import StatCard from '@/components/console/StatCard';
import StatusPill from '@/components/console/StatusPill';
import MapWrapper from '@/components/hisaab/MapWrapper';
import { btnPrimary, card } from '@/components/console/ui';
import { MapPin, Banknote, BadgeCheck, Wallet, ArrowUpRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HisaabPage() {
  const { reports } = await listPotholeReports({ limit: 100 });
  const solana = getSolanaStatus();
  const onChain = Boolean(solana.programId && solana.idlLoaded);

  const open = reports.filter((r) => r.status === 'OPEN').length;
  const escalated = reports.filter((r) => ['ESCALATED', 'REPAIR_SUBMITTED', 'VERIFIED'].includes(r.status)).length;
  const lockedInr = reports.reduce((sum, r) => {
    if (!r.escrow) return sum;
    const e = r.escrow as any;
    return sum + Number(e.stage1_amount) + Number(e.stage2_amount) + Number(e.stage3_amount);
  }, 0);
  const paidReports = reports.filter((r) => r.status === 'PAID').length;

  return (
    <ConsoleShell
      title="Street Register"
      subtitle="The public ledger of road defects. Reports are Gemini-verified at upload, need three independent citizen confirmations, and only then can a funder lock repair money in escrow."
      breadcrumb={['Console', 'Hisaab']}
      actions={
        <Link href="/hisaab/report/new" className={btnPrimary}>
          <MapPin className="h-4 w-4" /> Report a pothole
        </Link>
      }
    >
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open reports" value={String(open)} icon={MapPin} tone="amber" sub="Waiting for 3 confirmations" />
        <StatCard label="In repair" value={String(escalated)} icon={BadgeCheck} tone="indigo" sub="Escrowed and being fixed" />
        <StatCard
          label="Locked in escrow"
          value={`₹${lockedInr.toLocaleString('en-IN')}`}
          icon={Wallet}
          tone="sky"
          sub="Released only against proof"
        />
        <StatCard label="Fully paid" value={String(paidReports)} icon={Banknote} tone="emerald" sub="Survived the 30-day hold" />
      </div>

      {/* Map + register list */}
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className={`${card} p-3`}>
            <MapWrapper
              reports={reports.map((r) => ({
                id: r.id,
                latitude: Number(r.latitude),
                longitude: Number(r.longitude),
                status: r.status,
                severity: r.severity,
                address_label: r.address_label,
                confirmations_count: r.confirmations_count ?? 0,
              }))}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-2.5">
              <div className="flex items-center gap-4 text-xs text-faint">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-warn" /> Open
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-accent" /> Confirmed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-lav-deep" /> Escrowed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-ok" /> Paid
                </span>
              </div>
              {onChain && solana.programId && (
                <a
                  href={explorerAccountUrl(solana.programId) ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs font-medium text-accent hover:text-accent-deep"
                >
                  Program on Solana Explorer <ArrowUpRight className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className={`${card} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <p className="text-base font-semibold tracking-tight text-ink">Public register</p>
            <span className="chip">{reports.length} reports</span>
          </div>
          <div className="max-h-[460px] divide-y divide-line overflow-y-auto">
            {reports.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-mute">
                No reports yet. Snap the next pothole you see.
              </p>
            )}
            {reports.slice(0, 14).map((r) => (
              <Link
                key={r.id}
                href={`/hisaab/report/${r.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-mist"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {r.address_label || `${Number(r.latitude).toFixed(3)}, ${Number(r.longitude).toFixed(3)}`}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-faint">
                    {r.confirmations_count ?? 0}/3 confirmations
                    {r.severity ? ` · ${r.severity}` : ''}
                  </p>
                </div>
                <StatusPill status={r.status} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </ConsoleShell>
  );
}
