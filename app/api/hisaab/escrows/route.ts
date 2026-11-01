import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { requireRole, AppError, NotFoundError } from '@/lib/permissions';
import { requireAnyRole } from '@/lib/api_auth';
import { createEscrowSchema } from '@/lib/validation';
import { createEscrow, getPotholeReport } from '@/lib/hisaab';
import { notify } from '@/lib/notifications';
import { query } from '@/lib/db';
import {
  onChainInitEscrow,
  isSolanaProgramConfigured,
  getFunderKeypair,
  explorerTxUrl,
  HOLD_DAYS,
} from '@/lib/solana';

export const dynamic = 'force-dynamic';

/** GET /api/hisaab/escrows?status= (ADMIN) — escrow ledger list for admin tooling. */
export async function GET(req: NextRequest) {
  try {
    await requireAnyRole(req, ['ADMIN']);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const res = await query(
      `SELECT e.*, r.address_label, r.severity, r.status AS report_status,
              u.name AS contractor_name, u.email AS contractor_email
       FROM hisaab_escrows e
       JOIN pothole_reports r ON r.id = e.report_id
       LEFT JOIN users u ON u.id = e.contractor_user_id
       WHERE ($1::text IS NULL OR e.status = $1::text)
       ORDER BY e.created_at DESC
       LIMIT 200`,
      [status]
    );

    return NextResponse.json({ escrows: res.rows, count: res.rowCount ?? 0 });
  } catch (error: any) {
    if (error?.statusCode) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('GET /api/hisaab/escrows error:', error);
    return NextResponse.json({ error: 'Failed to load escrows' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAnyRole(req, ['ADMIN']);

    const parsed = createEscrowSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const report = await getPotholeReport(parsed.data.report_id);
    if (!['CONFIRMED'].includes(report.status)) {
      throw new AppError(
        `Report must be CONFIRMED (3 citizen confirmations) before funding. Current status: ${report.status}`,
        400
      );
    }

    const contractorRes = await query<{
      id: string;
      name: string;
      contractor_status: string | null;
      solana_pubkey: string | null;
    }>(
      `SELECT id, name, contractor_status, solana_pubkey FROM users WHERE id = $1::uuid`,
      [parsed.data.contractor_id]
    );
    const contractor = contractorRes.rows[0];
    if (!contractor || contractor.contractor_status !== 'APPROVED') {
      throw new AppError('Selected contractor is not approved', 400);
    }
    if (!contractor.solana_pubkey && isSolanaProgramConfigured()) {
      throw new AppError(
        'Contractor has not bound a Solana payout wallet yet. Ask them to set one in the contractor portal.',
        400
      );
    }

    const funder = getFunderKeypair();
    const contractorPubkey = contractor.solana_pubkey || '11111111111111111111111111111111';

    let solanaTx: string | null = null;
    let escrowPda: string | null = null;
    let vaultPda: string | null = null;

    if (isSolanaProgramConfigured() && funder) {
      try {
        const res = await onChainInitEscrow({
          reportId: parsed.data.report_id,
          contractor: new PublicKey(contractorPubkey),
          stageAmountsInr: [
            parsed.data.stage1_amount,
            parsed.data.stage2_amount,
            parsed.data.stage3_amount,
          ],
          holdSeconds: HOLD_DAYS * 24 * 60 * 60,
        });
        if (res) {
          solanaTx = res.signature;
          escrowPda = res.escrow;
          vaultPda = res.vault;
        }
      } catch (err) {
        console.error('Solana init_escrow failed (escrow kept in PG ledger):', err);
      }
    }

    const holdUntil = new Date(Date.now() + HOLD_DAYS * 24 * 60 * 60 * 1000);

    const escrow = await createEscrow({
      reportId: parsed.data.report_id,
      funderLabel: parsed.data.funder_label,
      funderType: parsed.data.funder_type,
      fundRequestId: parsed.data.fund_request_id ?? null,
      contractorUserId: contractor.id,
      contractorLabel: contractor.name,
      contractorWallet: contractorPubkey,
      assignmentId: null,
      demoMode: process.env.DEMO_MODE === 'true',
      stage1: parsed.data.stage1_amount,
      stage2: parsed.data.stage2_amount,
      stage3: parsed.data.stage3_amount,
      holdUntil,
      solanaEscrowPda: escrowPda,
      solanaVaultPda: vaultPda,
      solanaTxHash: solanaTx,
    });

    await notify(
      contractor.id,
      'HISAAB_ESCROW_FUNDED',
      'Escrow funded for your job',
      `₹${Number(escrow.stage1_amount) + Number(escrow.stage2_amount) + Number(escrow.stage3_amount)} locked in escrow for "${report.address_label ?? 'a reported road issue'}". Start the repair from your portal.`,
      `/contractor`
    );
    await notify(
      report.reporter_id,
      'HISAAB_ESCROW_FUNDED',
      'Your report is funded',
      `Funds are locked in escrow and a contractor has been engaged for your report.`,
      `/hisaab/report/${report.id}`
    );

    return NextResponse.json(
      { escrow, explorer_url: solanaTx ? explorerTxUrl(solanaTx) : null },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AppError || error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/hisaab/escrows error:', error);
    return NextResponse.json({ error: 'Failed to create escrow' }, { status: 500 });
  }
}
