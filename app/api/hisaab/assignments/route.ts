import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, AppError } from '@/lib/permissions';
import { createAssignmentSchema } from '@/lib/validation';
import { createAssignment, listAssignments } from '@/lib/hisaab';
import { notify } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuth();
    if (user.role === 'CONTRACTOR') {
      const assignments = await listAssignments({ contractorId: user.id });
      return NextResponse.json({ assignments });
    }
    // ADMIN (and other roles with visibility needs) see all
    const assignments = await listAssignments({});
    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('GET /api/hisaab/assignments error:', error);
    return NextResponse.json({ error: 'Failed to load assignments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(['ADMIN']);
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
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/hisaab/assignments error:', error);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}
