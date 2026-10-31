import { NextResponse } from 'next/server';
import { requireAuth, AppError } from '@/lib/permissions';
import { getFundTransactionsForCampaign, getCampaignFinancialSummary } from '@/lib/fund_transactions';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();

    const [transactions, summary] = await Promise.all([
      getFundTransactionsForCampaign(params.id),
      getCampaignFinancialSummary(params.id),
    ]);

    return NextResponse.json({ transactions, summary });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error(`Error in GET /api/campaigns/${params.id}/transactions:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
