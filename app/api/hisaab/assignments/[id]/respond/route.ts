import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiRole } from '@/lib/api_auth';
import { AppError } from '@/lib/permissions';
import { respondToAssignment } from '@/lib/hisaab';
import { notify } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

const respondSchema = z.object({
  decision: z.enum(['ACCEPTED', 'DECLINED']),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireApiRole(req, ['CONTRACTOR', 'ADMIN']);
    const parsed = respondSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const assignment = await respondToAssignment(params.id, user.id, parsed.data.decision, user.role === 'ADMIN');

    await notify(
      assignment.assigned_by,
      parsed.data.decision === 'ACCEPTED' ? 'HISAAB_JOB_ACCEPTED' : 'HISAAB_JOB_DECLINED',
      parsed.data.decision === 'ACCEPTED' ? 'Job accepted' : 'Job declined',
      `${user.name} ${parsed.data.decision === 'ACCEPTED' ? 'accepted' : 'declined'} the repair assignment.`,
      '/admin/complaints'
    );

    return NextResponse.json({ assignment });
  } catch (error: any) {
    if (error instanceof AppError || error?.statusCode) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/hisaab/assignments/[id]/respond error:', error);
    return NextResponse.json({ error: 'Failed to respond to assignment' }, { status: 500 });
  }
}
