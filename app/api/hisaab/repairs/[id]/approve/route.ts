import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRole, AppError, NotFoundError } from '@/lib/permissions';
import { markRepairVerified, advanceEscrowStage, getEscrowForReport } from '@/lib/hisaab';
import { onChainReleaseStage, isSolanaProgramConfigured, explorerTxUrl } from '@/lib/solana';
import { recordAuditLog } from '@/lib/audit_log';
import { notify } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

/**
 * ADMIN human-in-the-loop override: approve a repair whose AI verification did
 * not auto-pass. Releases stage 1 exactly like the automatic path would.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireRole(['ADMIN']);

    const repairRes = await query<{ id: string; report_id: string; status: string }>(
      `SELECT id, report_id, status FROM repair_submissions WHERE id = $1::uuid`,
      [params.id]
    );
    const repair = repairRes.rows[0];
    if (!repair) throw new NotFoundError('Repair submission not found');
    if (repair.status === 'APPROVED') throw new AppError('Repair already approved', 400);

    let solanaTx: string | null = null;
    let escrow = await getEscrowForReport(repair.report_id);

    if (escrow && escrow.released_stage === 0) {
      if (isSolanaProgramConfigured()) {
        try {
          const res = await onChainReleaseStage({ reportId: repair.report_id, stage: 1 });
          if (res) solanaTx = res.signature;
        } catch (err) {
          console.error('Solana release_stage(1) failed (PG ledger keeps state):', err);
        }
      }
      escrow = await advanceEscrowStage(repair.report_id, 1, solanaTx);
    }

    await markRepairVerified(repair.report_id, repair.id, solanaTx);

    await recordAuditLog({
      campaignId: null,
      actorId: admin.id,
      action: 'HISAAB_REPAIR_MANUALLY_APPROVED',
      entityType: 'pothole_report',
      entityId: repair.report_id,
      metadata: { repair_id: repair.id, gemini_did_not_pass: true, solana_tx: solanaTx },
    });

    const reportRes = await query<{ reporter_id: string }>(
      `SELECT reporter_id FROM pothole_reports WHERE id = $1::uuid`,
      [repair.report_id]
    );
    await notify(
      reportRes.rows[0]?.reporter_id,
      'HISAAB_REPAIR_VERIFIED',
      'Repair verified',
      'An admin manually verified the repair evidence for your report. Stage 1 payment released.',
      `/hisaab/report/${repair.report_id}`
    );

    return NextResponse.json({
      ok: true,
      stage1_tx: solanaTx,
      explorer_url: solanaTx ? explorerTxUrl(solanaTx) : null,
      escrow,
    });
  } catch (error) {
    if (error instanceof AppError || error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/hisaab/repairs/[id]/approve error:', error);
    return NextResponse.json({ error: 'Failed to approve repair' }, { status: 500 });
  }
}
