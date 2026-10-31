import Link from 'next/link';
import { Lock, Clock, ShieldOff } from 'lucide-react';
import { query } from '@/lib/db';
import { formatRupees } from '@/lib/utils';
import { getCluster } from '@/lib/solana';

export const dynamic = 'force-dynamic';

export default async function AdminEscrowsPage() {
  const res = await query(
    `SELECT e.*, r.address_label, r.status AS report_status
     FROM hisaab_escrows e
     JOIN pothole_reports r ON r.id = e.report_id
     ORDER BY e.created_at DESC
     LIMIT 100`
  );
  const escrows = res.rows as any[];
  const cluster = getCluster();
  const demoMode = process.env.DEMO_MODE === 'true';

  const totalLocked = escrows
    .filter((e) => e.status === 'ACTIVE')
    .reduce((s, e) => s + Number(e.stage1_amount) + Number(e.stage2_amount) + Number(e.stage3_amount), 0);

  const totalReleased = escrows.reduce(
    (s, e) =>
      s +
      [1, 2, 3].slice(0, Number(e.released_stage)).reduce((a, i) => a + Number(e[`stage${i}_amount`]), 0),
    0
  );

  return (
    <div className="space-y-5 pb-20">
      <div className="border-b border-line pb-5">
        <span className="eyebrow">ADMIN · ESCROW MONITOR</span>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Repair escrows</h1>
        <p className="mt-1 text-sm text-mute">
          {formatRupees(totalLocked)} locked across {escrows.filter((e) => e.status === 'ACTIVE').length} active
          escrows · {formatRupees(totalReleased)} released to contractors
          {cluster === 'localnet' ? ' · Solana LOCALNET' : cluster === 'devnet' ? ' · Solana DEVNET' : ''}
        </p>
      </div>

      <div className="space-y-3">
        {escrows.map((e) => {
          const total = Number(e.stage1_amount) + Number(e.stage2_amount) + Number(e.stage3_amount);
          const stage = Number(e.released_stage);
          const holdPassed = e.hold_until ? new Date(e.hold_until) <= new Date() : false;
          return (
            <div key={e.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-accent" />
                    <Link href={`/hisaab/report/${e.report_id}`} className="truncate text-sm font-semibold text-ink hover:underline">
                      {e.address_label || 'Report ' + e.report_id.slice(0, 8)}
                    </Link>
                    <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${
                      e.status === 'ACTIVE' ? 'border-accent/30 bg-accent-faint text-accent-deep' : e.status === 'COMPLETED' ? 'border-ok/20 bg-ok-soft text-ok' : 'border-bad/20 bg-bad-soft text-bad'
                    }`}>
                      {e.status}
                    </span>
                    {e.demo_mode && (
                      <span className="rounded-full border border-warn/30 bg-warn-soft px-2 py-0.5 font-mono text-[10px] text-warn">
                        DEMO FUNDS
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-mute">
                    contractor: {e.contractor_label}
                    {e.contractor_user_id ? ' (verified account)' : ''} · funder: {e.funder_label} · {e.funder_type}
                  </p>
                  <p className="font-mono text-[10px] text-mute">
                    chain: {e.solana_tx_hash ? `${e.solana_tx_hash.slice(0, 12)}… (${cluster})` : 'ledger-only'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-bold text-ink">{formatRupees(total)}</p>
                  <p className="font-mono text-[10px] text-mute">stage {stage}/3 released</p>
                </div>
              </div>

              <div className="mt-3 flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-1.5 flex-1 rounded-full bg-mist">
                    <div
                      className={`h-1.5 rounded-full ${stage >= i ? 'bg-accent' : ''}`}
                      style={{ width: stage >= i ? '100%' : '0%' }}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-2.5 flex items-center gap-3 font-mono text-[10px] text-mute">
                {stage >= 1 && <span>✓ repair verified → {formatRupees(Number(e.stage1_amount))}</span>}
                {stage >= 2 && <span>✓ mid-term → {formatRupees(Number(e.stage2_amount))}</span>}
                {stage >= 3 && <span>✓ durability passed → {formatRupees(Number(e.stage3_amount))}</span>}
                {stage >= 1 && stage < 3 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    hold {holdPassed ? 'elapsed' : `until ${new Date(e.hold_until).toLocaleDateString('en-IN')}`}
                  </span>
                )}
                {stage === 0 && (
                  <span className="flex items-center gap-1">
                    <ShieldOff className="h-3 w-3" /> awaiting verified repair (releases stage 1)
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {escrows.length === 0 && (
          <div className="card p-10 text-center text-sm text-mute">
            No escrows yet. Fund a confirmed complaint from the complaint queue.
          </div>
        )}
      </div>

      {demoMode && (
        <p className="rounded-lg border border-warn/25 bg-warn-soft/50 p-3 font-mono text-[11px] text-warn">
          DEMO_MODE is ON: the 30-day durability hold can be fast-forwarded from a report page. Turn it off for honest timing.
        </p>
      )}
    </div>
  );
}
