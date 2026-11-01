import { NextRequest, NextResponse } from 'next/server';
import { AppError } from '@/lib/permissions';
import { requireAnyAuth } from '@/lib/api_auth';
import { confirmReportAsUser } from '@/lib/hisaab_actions';
import { explorerTxUrl } from '@/lib/solana';
import { rateLimit } from '@/lib/rate_limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAnyAuth(req); // cookie (web) or bearer (mobile); self-confirm blocked in lib
    rateLimit(`web-confirm:${user.id}`, 30, 60_000);
    const reportId = params.id;

    const result = await confirmReportAsUser(reportId, user);

    return NextResponse.json({
      confirmations: result.count,
      required: 3,
      status: result.status,
      inserted: result.inserted,
      already_confirmed: !result.inserted,
      solana_tx: result.solanaTx,
      explorer_url: result.solanaTx ? explorerTxUrl(result.solanaTx) : null,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/hisaab/reports/[id]/confirm error:', error);
    return NextResponse.json({ error: 'Failed to confirm report' }, { status: 500 });
  }
}
