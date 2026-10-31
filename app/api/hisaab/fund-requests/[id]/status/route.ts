import { NextRequest, NextResponse } from 'next/server';
import { requireRole, AppError } from '@/lib/permissions';
import { updateFundRequestStatusSchema } from '@/lib/validation';
import { updateFundRequestStatus } from '@/lib/hisaab';
import { notifyRole } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(['ADMIN']);
    const parsed = updateFundRequestStatusSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const fundRequest = await updateFundRequestStatus({
      id: params.id,
      status: parsed.data.status,
      sanctionedAmount: parsed.data.sanctioned_amount ?? null,
      govReferenceNo: parsed.data.gov_reference_no ?? null,
      note: parsed.data.note ?? null,
    });

    await notifyRole(
      ['ADMIN'],
      'HISAAB_FUND_REQUEST_STATUS',
      `Fund request ${fundRequest.status}`,
      `"${fundRequest.title}" is now ${fundRequest.status}.`,
      '/admin/fund-requests'
    );

    return NextResponse.json({ fund_request: fundRequest });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/hisaab/fund-requests/[id]/status error:', error);
    return NextResponse.json({ error: 'Failed to update fund request' }, { status: 500 });
  }
}
