import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRole, AppError, NotFoundError } from '@/lib/permissions';
import { fastForwardSchema } from '@/lib/validation';
import { advanceEscrowStage } from '@/lib/hisaab';
import { onChainReleaseStage, isSolanaProgramConfigured, explorerTxUrl } from '@/lib/solana';

export const dynamic = 'force-dynamic';

/**
 * DEMO-ONLY time compression for the 30-day durability hold.
 * Labeled as such everywhere it appears in the UI. Sets hold_until = NOW(),
 * then releases the requested stage on-chain and in the PG ledger.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(['ADMIN']);
    if (process.env.DEMO_MODE !== 'true') {
      throw new AppError('Fast-forward is disabled outside DEMO_MODE', 403);
    }
    const parsed = fastForwardSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const stage = parsed.data.stage;
    if (stage < 2) {
      throw new AppError('Fast-forward applies to hold-gated stages (2 and 3) only', 400);
    }

    const escrowRes = await query<{ id: string; report_id: string; released_stage: number; hold_until: string }>(
      `SELECT id, report_id, released_stage, hold_until FROM hisaab_escrows WHERE id = $1::uuid`,
      [params.id]
    );
    const escrow = escrowRes.rows[0];
    if (!escrow) throw new NotFoundError('Escrow not found');
    if (escrow.released_stage < 1) {
      throw new AppError('Stage 1 (repair verified) must be released first', 400);
    }

    // Compress the 30-day hold to "passed" (demo only).
    await query(`UPDATE hisaab_escrows SET hold_until = NOW() - INTERVAL '1 minute' WHERE id = $1::uuid`, [
      escrow.id,
    ]);

    let solanaTx: string | null = null;
    if (isSolanaProgramConfigured()) {
      try {
        const res = await onChainReleaseStage({ reportId: escrow.report_id, stage });
        if (res) solanaTx = res.signature;
      } catch (err) {
        console.error('Solana release_stage failed (PG ledger keeps state):', err);
      }
    }

    const updated = await advanceEscrowStage(escrow.report_id, stage, solanaTx);

    return NextResponse.json({
      escrow: updated,
      stage_released: stage,
      demo_fast_forward: true,
      explorer_url: solanaTx ? explorerTxUrl(solanaTx) : null,
    });
  } catch (error) {
    if (error instanceof AppError || error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/hisaab/escrows/[id]/fast-forward error:', error);
    return NextResponse.json({ error: 'Failed to fast-forward escrow' }, { status: 500 });
  }
}
