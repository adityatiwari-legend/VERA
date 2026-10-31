import Link from 'next/link';
import {
  AlertTriangle,
  Landmark,
  HardHat,
  Lock,
  FileCheck,
  ArrowRight,
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { query } from '@/lib/db';
import { formatRupees } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminConsolePage() {
  const [complaintsRes, escalatedRes, fundReqRes, contractorRes, escrowRes, pendingProofsRes] =
    await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM pothole_reports WHERE status IN ('OPEN','CONFIRMED')`
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM pothole_reports WHERE status = 'CONFIRMED'`
      ),
      query<{ count: string; total: string }>(
        `SELECT COUNT(*) AS count, COALESCE(SUM(requested_amount),0)::numeric AS total
         FROM fund_requests WHERE status IN ('DRAFT','SUBMITTED','APPROVED')`
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM users WHERE role = 'CONTRACTOR' AND contractor_status = 'PENDING'`
      ),
      query<{ count: string; locked: string }>(
        `SELECT COUNT(*) AS count, COALESCE(SUM(stage1_amount+stage2_amount+stage3_amount),0)::numeric AS locked
         FROM hisaab_escrows WHERE status = 'ACTIVE'`
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM proofs WHERE status IN ('SUBMITTED','UNDER_REVIEW')`
      ),
    ]);

  const recent = await query(
    `SELECT r.id, r.address_label, r.severity, r.status, r.created_at, u.name AS reporter_name,
            (SELECT COUNT(*)::int FROM pothole_confirmations c WHERE c.report_id = r.id) AS confirmations
     FROM pothole_reports r JOIN users u ON u.id = r.reporter_id
     ORDER BY r.created_at DESC LIMIT 6`
  );

  const activeEscrows = Number(escrowRes.rows[0]?.count ?? 0);
  const lockedTotal = Number(escrowRes.rows[0]?.locked ?? 0);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col justify-between gap-3 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <span className="eyebrow">VERA ADMIN CONSOLE</span>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Hisaab Operations</h1>
          <p className="text-sm text-mute">
            Triage citizen complaints, secure government funds, engage contractors — every rupee on the ledger
          </p>
        </div>
        <Link href="/admin/complaints" className="btn-primary self-start !text-xs sm:self-auto">
          Open complaint queue
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Open complaints"
          value={Number(complaintsRes.rows[0]?.count ?? 0)}
          subtext="Awaiting triage or public confirmation"
          icon={<AlertTriangle className="h-4 w-4" />}
          accent="amber"
        />
        <StatCard
          label="Ready to fund"
          value={Number(escalatedRes.rows[0]?.count ?? 0)}
          subtext="Citizen-confirmed, escrow not yet created"
          icon={<FileCheck className="h-4 w-4" />}
          accent="cyan"
        />
        <StatCard
          label="Fund requests in flight"
          value={Number(fundReqRes.rows[0]?.count ?? 0)}
          subtext={`${formatRupees(Number(fundReqRes.rows[0]?.total ?? 0))} requested from government departments`}
          icon={<Landmark className="h-4 w-4" />}
          accent="indigo"
        />
        <StatCard
          label="Contractors pending"
          value={Number(contractorRes.rows[0]?.count ?? 0)}
          subtext="Applications to approve"
          icon={<HardHat className="h-4 w-4" />}
          accent="amber"
        />
        <StatCard
          label="Active escrows"
          value={activeEscrows}
          subtext={`${formatRupees(lockedTotal)} locked on the ledger`}
          icon={<Lock className="h-4 w-4" />}
          accent="mint"
        />
        <StatCard
          label="VERA proofs awaiting review"
          value={Number(pendingProofsRes.rows[0]?.count ?? 0)}
          subtext="Campaign milestone evidence"
          icon={<FileCheck className="h-4 w-4" />}
        />
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Latest complaints</h2>
          <Link href="/admin/complaints" className="font-mono text-[11px] font-semibold text-accent hover:underline">
            View all →
          </Link>
        </div>
        <ul className="divide-y divide-line">
          {recent.rows.map((r: any) => (
            <li key={r.id}>
              <Link
                href={`/hisaab/report/${r.id}`}
                className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-mist/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {r.address_label || 'Unnamed location'}
                  </p>
                  <p className="font-mono text-[10px] text-mute">
                    {r.reporter_name} · {new Date(r.created_at).toLocaleDateString('en-IN')} ·{' '}
                    {r.confirmations}/3 confirmations
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${
                      r.severity === 'HIGH'
                        ? 'border-bad/25 bg-bad-soft text-bad'
                        : r.severity === 'MEDIUM'
                          ? 'border-warn/25 bg-warn-soft text-warn'
                          : 'border-line bg-mist text-mute'
                    }`}
                  >
                    {r.severity ?? '—'}
                  </span>
                  <span className="rounded-full border border-line bg-mist px-2 py-0.5 font-mono text-[10px] text-mute">
                    {r.status}
                  </span>
                </div>
              </Link>
            </li>
          ))}
          {recent.rows.length === 0 && (
            <li className="py-8 text-center text-sm text-mute">No complaints yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
