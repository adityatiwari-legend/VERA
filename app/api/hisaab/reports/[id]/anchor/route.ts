import { NextResponse } from 'next/server';
import { requireRole, AppError, NotFoundError } from '@/lib/permissions';
import { getPotholeReport, attachSolanaReportTx } from '@/lib/hisaab';
import { onChainInitReport, isSolanaProgramConfigured } from '@/lib/solana';
import { recordAuditLog } from '@/lib/audit_log';
import { notify } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

const SEVERITY_INDEX: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

/**
 * ADMIN self-healing: anchor a report that was created while the Solana
 * validator was unreachable. Idempotent — no-ops when a PDA already exists.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireRole(['ADMIN']);
    const report = await getPotholeReport(params.id);

    if (report.solana_report_pda) {
      return NextResponse.json({ ok: true, already_anchored: true, pda: report.solana_report_pda });
    }
    if (!isSolanaProgramConfigured()) {
      throw new AppError('Solana program is not configured', 503);
    }
    if (!report.media_sha256 || report.media_sha256.length !== 64) {
      throw new AppError('Report has no stored media hash to anchor', 400);
    }

    const res = await onChainInitReport({
      reportId: params.id,
      latitude: Number(report.latitude),
      longitude: Number(report.longitude),
      severity: SEVERITY_INDEX[report.severity ?? 'MEDIUM'] ?? 1,
      mediaSha256: report.media_sha256,
    });
    if (!res) throw new AppError('On-chain anchor failed', 500);

    await attachSolanaReportTx(params.id, res.pda, res.signature);

    await recordAuditLog({
      campaignId: null,
      actorId: admin.id,
      action: 'HISAAB_REPORT_ANCHORED',
      entityType: 'pothole_report',
      entityId: params.id,
      metadata: { pda: res.pda, solana_tx: res.signature, backfill: true },
    });

    await notify(
      report.reporter_id,
      'HISAAB_REPORT_ANCHORED',
      'Your report is now on-chain',
      'The report was anchored to the Solana program — its evidence hash and coordinates are now publicly verifiable.',
      `/hisaab/report/${params.id}`
    );

    return NextResponse.json({ ok: true, pda: res.pda, signature: res.signature });
  } catch (error) {
    if (error instanceof AppError || error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/hisaab/reports/[id]/anchor error:', error);
    return NextResponse.json({ error: 'Failed to anchor report' }, { status: 500 });
  }
}
