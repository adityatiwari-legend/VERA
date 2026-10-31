import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, AppError, NotFoundError } from '@/lib/permissions';
import { listContractors, setContractorStatus } from '@/lib/hisaab';
import { notify } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

const statusSchema = z.object({
  status: z.enum(['APPROVED', 'SUSPENDED', 'PENDING']),
});

export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN']);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const contractors = await listContractors({ status });
    return NextResponse.json({ contractors });
  } catch (error) {
    console.error('GET /api/hisaab/contractors error:', error);
    return NextResponse.json({ error: 'Failed to load contractors' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(['ADMIN']);
    const body = await req.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const contractorId = (body as { contractor_id?: string }).contractor_id;
    if (!contractorId) {
      throw new AppError('contractor_id is required', 400);
    }

    const contractor = await setContractorStatus(contractorId, parsed.data.status);

    await notify(
      contractorId,
      'CONTRACTOR_STATUS',
      `Contractor account ${contractor.contractor_status}`,
      parsed.data.status === 'APPROVED'
        ? 'You are approved. Bind your Solana payout wallet in the portal to receive job offers.'
        : `Your contractor account is now ${contractor.contractor_status}.`,
      '/contractor'
    );

    return NextResponse.json({ contractor });
  } catch (error) {
    if (error instanceof AppError || error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/hisaab/contractors error:', error);
    return NextResponse.json({ error: 'Failed to update contractor' }, { status: 500 });
  }
}
