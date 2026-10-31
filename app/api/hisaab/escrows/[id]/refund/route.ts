import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRole, AppError, NotFoundError } from '@/lib/permissions';
import { onChainRefundEscrow, isSolanaProgramConfigured, explorerTxUrl } from '@/lib/solana';
import { recordAuditLog } from '@/lib/audit_log';
import { notify } from '@/lib/notifications';
import { getPotholeReport } from '@/lib/hisaab';

export const dynamic = 'force-dynamic';

/**
 * ADMIN pulls the remaining vault balance back to the funder (repair rejected /
 * project abandoned). Marks the escrow REFUNDED in the ledger, records the
 * audit entry, and notifies reporter + contractor.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(['ADMIN']);

    const escrowRes = await query<{
      id: string;
      report_id: string;
      status: string;
      contractor_user_id: string | null;
      funder_label: string;
    }>(`SELECT id, report_id, status, contractor_user_id, funder_label FROM hisaab_escrows WHERE id = $1::uuid`, [
      params.id,
    ]);
    const escrow = escrowRes.rows[0];
    if (!escrow) throw new NotFoundError('Escrow not found');
    if (escrow.status !== 'ACTIVE') {
      throw new AppError(`Escrow is ${escrow.status}; only ACTIVE escrows can be refunded`, 400);
    }

    let solanaTx: string | null = null;
    if (isSolanaProgramConfigured()) {
      try {
        const res = await onChainRefundEscrow({ reportId: escrow.report_id });
        if (res) solanaTx = res.signature;
      } catch (err) {
        console.error('Solana refund failed (PG ledger records the refund):', err);
      }
    }

    await query(
      `UPDATE hisaab_escrows SET status = 'REFUNDED', solana_tx_hash = COALESCE($2, solana_tx_hash), updated_at = NOW()
       WHERE id = $1::uuid`,
      [escrow.id, solanaTx]
    );
    await query(`UPDATE pothole_reports SET status = 'CONFIRMED', updated_at = NOW() WHERE id = $1::uuid AND status = 'ESCALATED'`, [
      escrow.report_id,
    ]);
    if (escrow.contractor_user_id) {
      await query(
        `UPDATE contractor_assignments SET status = 'REPLACED'
         WHERE report_id = $1::uuid AND contractor_id = $2 AND status = 'ACCEPTED'`,
        [escrow.report_id, escrow.contractor_user_id]
      );
    }

    await recordAuditLog({
      campaignId: null,
      actorId: null,
      action: 'HISAAB_ESCROW_REFUNDED',
      entityType: 'hisaab_escrow',
      entityId: escrow.id,
      metadata: { report_id: escrow.report_id, solana_tx: solanaTx },
    });

    const report = await getPotholeReport(escrow.report_id);
    await notify(
      report.reporter_id,
      'HISAAB_ESCROW_REFUNDED',
      'Escrow refunded',
      'The admin returned the escrowed funds to the funder for this report. It is open for a new contractor.',
      `/hisaab/report/${escrow.report_id}`
    );
    if (escrow.contractor_user_id) {
      await notify(
        escrow.contractor_user_id,
        'HISAAB_ESCROW_REFUNDED',
        'Job escrow refunded',
        'The escrow for a job you were assigned was refunded to the funder.',
        '/contractor'
      );
    }

    return NextResponse.json({
      ok: true,
      status: 'REFUNDED',
      solana_tx: solanaTx,
      explorer_url: solanaTx ? explorerTxUrl(solanaTx) : null,
    });
  } catch (error) {
    if (error instanceof AppError || error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/hisaab/escrows/[id]/refund error:', error);
    return NextResponse.json({ error: 'Failed to refund escrow' }, { status: 500 });
  }
}
