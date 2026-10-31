import { NextRequest, NextResponse } from 'next/server';
import { requireRole, AppError } from '@/lib/permissions';
import { createFundRequestSchema } from '@/lib/validation';
import { createFundRequest, listFundRequests } from '@/lib/hisaab';
import { notifyRole } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN']);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const fundRequests = await listFundRequests(status);
    return NextResponse.json({ fund_requests: fundRequests });
  } catch (error) {
    console.error('GET /api/hisaab/fund-requests error:', error);
    return NextResponse.json({ error: 'Failed to load fund requests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(['ADMIN']);
    const parsed = createFundRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const fundRequest = await createFundRequest({
      adminId: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      department: parsed.data.department,
      requestedAmount: parsed.data.requested_amount,
      reportIds: parsed.data.report_ids,
    });

    await notifyRole(
      ['ADMIN'],
      'HISAAB_FUND_REQUEST',
      'Fund request drafted',
      `"${fundRequest.title}" (₹${fundRequest.requested_amount}) is ready to submit to ${fundRequest.department}.`,
      '/admin/fund-requests'
    );

    return NextResponse.json({ fund_request: fundRequest }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/hisaab/fund-requests error:', error);
    return NextResponse.json({ error: 'Failed to create fund request' }, { status: 500 });
  }
}
