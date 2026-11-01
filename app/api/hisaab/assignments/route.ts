import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth, requireApiRole } from '@/lib/api_auth';
import { createAssignmentSchema } from '@/lib/validation';
import { createAssignment, listAssignments } from '@/lib/hisaab';
import { notify } from '@/lib/notifications';
import { User } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    let user: User | null = null;
    try {
      user = await requireApiAuth(req);
    } catch {
      // Allow query param filtering if token is omitted or guest
    }

    const { searchParams } = new URL(req.url);
    const rawContractorId = searchParams.get('contractor_id');
    const contractorIdParam =
      rawContractorId && rawContractorId !== 'undefined' && rawContractorId !== 'null' && rawContractorId.trim() !== ''
        ? rawContractorId.trim()
        : undefined;

    const rawStatus = searchParams.get('status');
    const statusParam =
      rawStatus && rawStatus !== 'undefined' && rawStatus !== 'null' && rawStatus !== 'ALL' && rawStatus.trim() !== ''
        ? rawStatus.trim()
        : undefined;

    const targetContractorId = user?.role === 'CONTRACTOR' ? user.id : contractorIdParam;

    const assignments = await listAssignments({
      contractorId: targetContractorId,
      status: statusParam,
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('GET /api/hisaab/assignments error:', error);
    return NextResponse.json({ error: 'Failed to load assignments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiRole(req, ['ADMIN']);
    const parsed = createAssignmentSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const assignment = await createAssignment({
      reportId: parsed.data.report_id,
      contractorId: parsed.data.contractor_id,
      assignedBy: user.id,
      note: parsed.data.note ?? null,
    });

    await notify(
      parsed.data.contractor_id,
      'HISAAB_JOB_OFFERED',
      'New repair job offered',
      'You have been assigned a road repair job. Accept it from your contractor portal to start work.',
      '/contractor'
    );

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error: any) {
    if (error?.statusCode) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/hisaab/assignments error:', error);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}
