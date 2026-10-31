import { NextResponse } from 'next/server';
import { requireRole, AppError } from '@/lib/permissions';
import { processRefund } from '@/lib/refunds';
import { query } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await requireRole(['ORGANIZATION', 'AUDITOR', 'ADMIN']);
    const { id: milestoneId } = await params;

    const msRes = await query<{ campaign_id: string; amount: string }>(
      `SELECT campaign_id, amount::text FROM milestones WHERE id = $1`,
      [milestoneId]
    );

    if (msRes.rowCount === 0) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    const milestone = msRes.rows[0];

    const body = await request.json();
    const amount = Number(body.amount || milestone.amount);
    const reason = body.reason || 'Milestone failed verification criteria and fund refund initiated';
    const recipientAddress = body.recipientAddress;

    const result = await processRefund({
      userId: user.id,
      campaignId: milestone.campaign_id,
      milestoneId,
      amount,
      recipientAddress,
      reason
    });

    return NextResponse.json({
      ...result,
      message: 'Refund successfully executed on-chain and registered in ledger.'
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error in POST /api/milestones/[id]/refund:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
