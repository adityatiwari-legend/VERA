import { notFound } from 'next/navigation';
import Link from 'next/link';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getPotholeReport, getRoughnessSummary, listAssignments, listContractors, listFundRequests } from '@/lib/hisaab';
import { fetchReportOnChain, fetchEscrowState, lamportsToInr } from '@/lib/solana';
import { getRoughnessReadings } from '@/lib/tiger';
import { explorerAccountUrl, explorerTxUrl, getCluster } from '@/lib/solana';
import ConsoleShell from '@/components/console/ConsoleShell';
import StatusPill from '@/components/console/StatusPill';
import ConfirmButton from '@/components/hisaab/ConfirmButton';
import AdminFundPanel from '@/components/hisaab/AdminFundPanel';
import AnchorReportButton from '@/components/hisaab/AnchorReportButton';
import RepairPanel from '@/components/hisaab/RepairPanel';
import RoughnessSparkline from '@/components/hisaab/RoughnessSparkline';
import { card, pill } from '@/components/console/ui';
import { Sparkles, ArrowUpRight, ScrollText, ShieldCheck, Link2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  let report;
  try {
    report = await getPotholeReport(params.id);
  } catch {
    notFound();
  }

  const user = await getCurrentUser();
  const isAdmin = user?.role === 'ADMIN';
  const cluster = getCluster();
  const onChainReport = await fetchReportOnChain(params.id);
  const onChainEscrow = await fetchEscrowState(params.id);
  const [roughness, roughnessLive, auditRes] = await Promise.all([
    getRoughnessReadings(params.id),
    getRoughnessSummary(params.id),
    query(
      `SELECT a.action, a.metadata, a.created_at, u.name AS actor_name
       FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
       WHERE a.entity_type = 'pothole_report' AND a.entity_id = $1::uuid
       ORDER BY a.chain_position DESC LIMIT 20`,
      [params.id]
    ),
  ]);

  const [assignment, contractors, fundRequests] = isAdmin
    ? await Promise.all([
        (await listAssignments({})).find((a) => a.report_id === params.id) ?? null,
        listContractors({ status: 'APPROVED' }),
        listFundRequests('SANCTIONED'),
      ])
    : [null, [], []];

  const gemini = report.gemini_result;
  const mediaBefore = `/api/hisaab/reports/${params.id}/media?type=before`;
  const mediaAfter = report.repair?.after_file_path
    ? `/api/hisaab/reports/${params.id}/media?type=after`
    : null;

  const canConfirm =
    Boolean(user) && user!.id !== report.reporter_id && ['OPEN', 'CONFIRMED'].includes(report.status);
  const alreadyConfirmed = user
    ? report.confirmations.some((c) => c.user_id === user!.id)
    : false;
  // Repairs are submitted by the ASSIGNED contractor (or an admin).
  const repairAssignment =
    user?.role === 'CONTRACTOR'
      ? (await listAssignments({ contractorId: user.id })).find(
          (a) => a.report_id === params.id && a.status === 'ACCEPTED'
        ) ?? null
      : null;
  const canRepair =
    Boolean(user) &&
    (isAdmin || (repairAssignment && report.escrow?.contractor_user_id === user!.id));

  return (
    <ConsoleShell
      title={report.address_label || 'Pothole report'}
      subtitle={`Reported by ${report.reporter_name} · ${new Date(report.created_at).toLocaleString('en-IN')}`}
      breadcrumb={['Console', 'Street Register', 'Report']}
      actions={
        <div className="flex items-center gap-2.5">
          <StatusPill status={report.status} />
          {report.solana_report_pda && cluster !== 'localnet' && (
            <a
              href={explorerAccountUrl(report.solana_report_pda) ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-xs font-medium text-mute shadow-card transition hover:border-line-strong hover:text-ink"
            >
              On-chain <ArrowUpRight className="h-3 w-3" />
            </a>
          )}
          {report.solana_report_pda && cluster === 'localnet' && (
            <span
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 font-mono text-[11px] text-mute"
              title="Anchored on your local validator — see the live chain state panel below"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-ok" /> On-chain &middot; localnet
            </span>
          )}
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Left: evidence */}
        <div className="space-y-5 lg:col-span-3">
          <div className={`${card} p-4`}>
            <div className="flex items-center justify-between px-1 pb-3">
              <p className="text-base font-semibold tracking-tight text-ink">Photo evidence</p>
              <span className="font-mono text-[11px] text-faint">
                {report.media_sha256 ? `sha256 ${report.media_sha256.slice(0, 14)}…` : 'seeded report — no photo'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <figure className="overflow-hidden rounded-xl border border-line">
                {report.media_file_path ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaBefore} alt="Before" className="aspect-[4/3] w-full object-cover" />
                    <figcaption className="bg-mist px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-mute">
                      Before
                    </figcaption>
                  </>
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-mist text-xs text-mute">
                    No photo attached
                  </div>
                )}
              </figure>
              <figure className="overflow-hidden rounded-xl border border-line">
                {mediaAfter ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaAfter} alt="After" className="aspect-[4/3] w-full object-cover" />
                    <figcaption className="bg-mist px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-mute">
                      After repair
                    </figcaption>
                  </>
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-mist text-xs text-mute">
                    Awaiting after-repair photo
                  </div>
                )}
              </figure>
            </div>
          </div>

          {gemini && (
            <div className={`${card} p-5`}>
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-base font-semibold tracking-tight text-ink">
                  <Sparkles className="h-4 w-4 text-accent" /> Gemini analysis
                </p>
                <span className="font-mono text-xs text-faint">{report.gemini_status}</span>
              </div>
              <div className="mt-3.5 flex flex-wrap gap-2">
                <span className={`${pill} border-warn/20 bg-warn-soft text-warn`}>
                  {gemini.severity} severity
                </span>
                {gemini.size_estimate_cm && (
                  <span className={`${pill} border-line bg-mist text-mute`}>
                    ~{gemini.size_estimate_cm} cm
                  </span>
                )}
                {gemini.surface_type && (
                  <span className={`${pill} border-line bg-mist text-mute`}>
                    {gemini.surface_type}
                  </span>
                )}
                <span className={`${pill} border-line bg-mist text-mute`}>
                  {(gemini.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
              <blockquote className="mt-4 rounded-xl border-l-2 border-accent bg-mist p-4 text-[13px] leading-relaxed text-mute">
                “{gemini.description_hinglish}”
              </blockquote>
            </div>
          )}

          {onChainReport && (
            <div className={`${card} p-5`}>
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-base font-semibold tracking-tight text-ink">
                  <Link2 className="h-4 w-4 text-accent" /> Live chain state
                </p>
                <span className="font-mono text-[11px] text-faint">
                  {cluster === 'localnet' ? 'read from your local validator' : 'read from chain'}
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-faint">
                report PDA {report.solana_report_pda?.slice(0, 16)}&hellip; &middot; decoded live from the Solana program &mdash;
                this is what auditors verify, not a database copy
              </p>
              <div className="mt-3.5 grid grid-cols-2 gap-x-6 gap-y-2.5 text-[13px] sm:grid-cols-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Status</p>
                  <p className="mt-0.5 font-medium text-ink">
                    {['OPEN', 'CONFIRMED', 'ESCALATED', 'PAID'][onChainReport.status] ?? onChainReport.status}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Confirmations</p>
                  <p className="mt-0.5 font-medium text-ink">{String(onChainReport.confirmations)}/3</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Severity</p>
                  <p className="mt-0.5 font-medium text-ink">
                    {['LOW', 'MEDIUM', 'HIGH'][onChainReport.severity] ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Coordinates</p>
                  <p className="mt-0.5 font-mono text-xs text-mute">
                    {(Number(onChainReport.latMicro) / 1e6).toFixed(4)}, {(Number(onChainReport.lngMicro) / 1e6).toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Media hash</p>
                  <p className="mt-0.5 font-mono text-xs text-mute">
                    {Buffer.from(onChainReport.mediaHash ?? []).toString('hex').slice(0, 16)}&hellip;
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Anchored at</p>
                  <p className="mt-0.5 text-xs text-mute">
                    {new Date(Number(onChainReport.createdAt) * 1000).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              {onChainEscrow && (
                <div className="mt-4 rounded-xl border border-line bg-mist p-4">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-faint">
                    Escrow account
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Released</p>
                      <p className="mt-0.5 font-medium text-ink">{String(onChainEscrow.releasedStage)}/3 stages</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Stage amounts</p>
                      <p className="mt-0.5 font-medium text-ink">
                        {onChainEscrow.stageAmounts.map((l: bigint) => `₹${lamportsToInr(Number(l)).toLocaleString('en-IN')}`).join(' / ')}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Hold until</p>
                      <p className="mt-0.5 text-xs text-mute">
                        {onChainEscrow.holdUntil ? new Date(Number(onChainEscrow.holdUntil) * 1000).toLocaleDateString('en-IN') : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Contractor</p>
                      <p className="mt-0.5 font-mono text-xs text-mute">
                        {String(onChainEscrow.contractor).slice(0, 8)}…{String(onChainEscrow.contractor).slice(-4)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {roughness.rows.length > 0 && (
            <div className={`${card} p-5`}>
              <RoughnessSparkline values={roughness.rows.map((r) => Number(r.accel_z))} />
              <p className="mt-3 font-mono text-[11px] text-faint">
                {roughnessLive.samples} readings · mean |g| {roughnessLive.score?.toFixed(2) ?? '—'} · IRI-approx{' '}
                {roughnessLive.iriApprox?.toFixed(2) ?? '—'} m/km · store:{' '}
                {roughness.store === 'TIGER_DATA' ? 'Tiger Data hypertable' : 'local fallback'}
              </p>
            </div>
          )}

          <div className={`${card} p-5`}>
            <p className="flex items-center gap-2 text-base font-semibold tracking-tight text-ink">
              <ScrollText className="h-4 w-4 text-faint" /> Audit trail
            </p>
            <ul className="mt-3.5 space-y-2.5">
              {auditRes.rows.map((row: any, i: number) => (
                <li key={i} className="flex items-center justify-between gap-3 border-b border-line pb-2.5 text-[13px] last:border-0 last:pb-0">
                  <span className="text-mute">{row.action.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-[11px] text-faint">
                    {row.actor_name || 'system'} · {new Date(row.created_at).toLocaleTimeString('en-IN')}
                  </span>
                </li>
              ))}
              {auditRes.rows.length === 0 && (
                <li className="text-[13px] text-mute">No audit entries yet.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Right: action rail */}
        <div className="space-y-5 lg:col-span-2">
          <ConfirmButton
            reportId={params.id}
            initialCount={report.confirmations_count ?? 0}
            canConfirm={canConfirm}
            alreadyConfirmed={alreadyConfirmed}
          />

          <AdminFundPanel
            reportId={params.id}
            reportStatus={report.status}
            escrow={report.escrow as any}
            assignment={assignment as any}
            contractors={contractors as any}
            fundRequests={fundRequests as any}
            demoMode={process.env.DEMO_MODE === 'true'}
            cluster={cluster}
            pendingRepair={
              report.repair && report.repair.status === 'SUBMITTED'
                ? { id: report.repair.id, geminiStatus: report.repair.gemini_status }
                : null
            }
          />

          {isAdmin && report.solana_report_pda == null && (
            <AnchorReportButton reportId={params.id} />
          )}

          {canRepair && ['ESCALATED', 'REPAIR_SUBMITTED', 'CONFIRMED'].includes(report.status) && (
            <RepairPanel reportId={params.id} />
          )}

          {report.confirmations.length > 0 && (
            <div className={`${card} p-5`}>
              <p className="text-base font-semibold tracking-tight text-ink">Confirmations</p>
              <ul className="mt-3 space-y-2.5">
                {report.confirmations.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-2 text-mute">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-faint font-mono text-[11px] font-semibold text-accent">
                        {(c.user_name ?? '?').slice(0, 1).toUpperCase()}
                      </span>
                      {c.user_name}
                    </span>
                    {c.solana_tx_hash && (
                      <a
                        href={explorerTxUrl(c.solana_tx_hash ?? undefined)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 font-mono text-xs font-medium text-accent hover:text-accent-deep"
                      >
                        tx <ArrowUpRight className="h-3 w-3" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={`${card} p-5`}>
            <p className="flex items-center gap-2 text-base font-semibold tracking-tight text-ink">
              <ShieldCheck className="h-4 w-4 text-accent" /> Trust model
            </p>
            <p className="mt-2 text-xs leading-relaxed text-mute">
              The Solana escrow is neutral — funds sit in a program-owned vault, released
              stage-by-stage by the oracle only after Gemini and roughness checks pass. The
              durability hold is enforced by the on-chain clock, not just the ledger. Honest
              limits: contractor identity is platform-vetted, and Sybil resistance on
              confirmations is not solved yet.
            </p>
          </div>
        </div>
      </div>
    </ConsoleShell>
  );
}
