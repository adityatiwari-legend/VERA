import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api_auth';
import { confirmReportAsUser } from '@/lib/hisaab_actions';
import { explorerTxUrl } from '@/lib/solana';
import { rateLimit } from '@/lib/rate_limit';

export const dynamic = 'force-dynamic';

/** POST /api/v1/hisaab/reports/[id]/confirm — citizen confirms a report. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireApiAuth(req); // any member can confirm
    rateLimit(`v1-confirm:${user.id}`, 30, 60_000);

    const result = await confirmReportAsUser(params.id, user);

    return NextResponse.json({
      confirmations: result.count,
      required: 3,
      status: result.status,
      inserted: result.inserted,
      already_confirmed: !result.inserted,
      solana_tx: result.solanaTx,
      explorer_url: result.solanaTx ? explorerTxUrl(result.solanaTx) : null,
    });
  } catch (error: any) {
    if (error?.statusCode === 429) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error?.statusCode) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/v1/hisaab/reports/[id]/confirm error:', error);
    return NextResponse.json({ error: 'Failed to confirm report' }, { status: 500 });
  }
}
