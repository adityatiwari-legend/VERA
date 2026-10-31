import Link from 'next/link';
import { AlertTriangle, FileCheck, ArrowRight } from 'lucide-react';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const STATUS_FILTERS = ['ALL', 'OPEN', 'CONFIRMED', 'ESCALATED', 'REPAIR_SUBMITTED', 'VERIFIED', 'PAID'] as const;

export default async function AdminComplaintsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status = STATUS_FILTERS.includes((searchParams.status ?? 'ALL') as any)
    ? searchParams.status ?? 'ALL'
    : 'ALL';

  const res = await query(
    `SELECT r.id, r.address_label, r.severity, r.status, r.description, r.created_at, r.updated_at,
            u.name AS reporter_name,
            (SELECT COUNT(*)::int FROM pothole_confirmations c WHERE c.report_id = r.id) AS confirmations,
            e.id AS escrow_id,
            (SELECT COUNT(*)::int FROM fund_request_reports frr
              JOIN fund_requests fr ON fr.id = frr.fund_request_id
              WHERE frr.report_id = r.id AND fr.status = 'SANCTIONED') AS sanctioned
     FROM pothole_reports r
     JOIN users u ON u.id = r.reporter_id
     LEFT JOIN hisaab_escrows e ON e.report_id = r.id
     WHERE ($1::text = 'ALL' OR r.status = $1::text)
     ORDER BY
       CASE r.status WHEN 'CONFIRMED' THEN 0 WHEN 'OPEN' THEN 1 WHEN 'ESCALATED' THEN 2 ELSE 3 END,
       r.created_at DESC
     LIMIT 100`,
    [status]
  );

  const rows = res.rows as any[];

  const statusTone: Record<string, string> = {
    OPEN: 'border-line bg-mist text-mute',
    CONFIRMED: 'border-accent/30 bg-accent-faint text-accent-deep',
    ESCALATED: 'border-lav-deep/25 bg-lav-soft text-lav-deep',
    REPAIR_SUBMITTED: 'border-warn/25 bg-warn-soft text-warn',
    VERIFIED: 'border-ok/20 bg-ok-soft text-ok',
    PAID: 'border-ok/20 bg-ok-soft text-ok',
  };

  return (
    <div className="space-y-5 pb-20">
      <div className="border-b border-line pb-5">
        <span className="eyebrow">ADMIN · COMPLAINT QUEUE</span>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Citizen complaints</h1>
        <p className="mt-1 text-sm text-mute">
          Confirmed reports (3 citizens) are ready to fund. Open reports need 2 more confirmations.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s}
            href={`/admin/complaints?status=${s}`}
            className={`rounded-full border px-3 py-1.5 font-mono text-[11px] font-semibold transition-colors ${
              status === s
                ? 'border-accent bg-accent text-white'
                : 'border-line bg-white text-mute hover:border-accent/40 hover:text-accent'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-mist/60 font-mono text-[10px] uppercase tracking-wider text-mute">
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Severity</th>
              <th className="px-4 py-3 font-medium">Confirmations</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Age</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const ageDays = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000);
              const fundable = r.status === 'CONFIRMED' && !r.escrow_id;
              return (
                <tr key={r.id} className="transition-colors hover:bg-mist/50">
                  <td className="max-w-xs px-4 py-3">
                    <Link href={`/hisaab/report/${r.id}`} className="block">
                      <p className="truncate font-medium text-ink">{r.address_label || 'Unnamed location'}</p>
                      <p className="truncate font-mono text-[10px] text-mute">
                        {r.reporter_name} · {new Date(r.created_at).toLocaleDateString('en-IN')}
                      </p>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
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
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-mute">{r.confirmations}/3</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${statusTone[r.status] ?? 'border-line bg-mist text-mute'}`}>
                      {r.status}
                    </span>
                    {r.sanctioned > 0 && (
                      <span className="ml-1 rounded-full border border-ok/25 bg-ok-soft px-2 py-0.5 font-mono text-[10px] text-ok">
                        FUNDED
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-3 font-mono text-xs ${ageDays > 30 && fundable ? 'font-bold text-bad' : 'text-mute'}`}>
                    {ageDays}d
                  </td>
                  <td className="px-4 py-3">
                    {fundable ? (
                      <Link
                        href={`/hisaab/report/${r.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent-faint px-2.5 py-1.5 font-mono text-[11px] font-semibold text-accent-deep hover:bg-accent hover:text-white"
                      >
                        <FileCheck className="h-3.5 w-3.5" />
                        Fund & assign
                      </Link>
                    ) : (
                      <Link
                        href={`/hisaab/report/${r.id}`}
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-accent hover:underline"
                      >
                        Inspect <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-mute">
                  No complaints in this bucket.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card flex items-start gap-3 p-4 text-xs text-mute">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
        <p>
          Flow: confirm a complaint → attach it to a government fund request (or fund directly) →
          assign an approved contractor → once the contractor accepts, lock the escrow.
        </p>
      </div>
    </div>
  );
}
