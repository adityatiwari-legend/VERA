import { NextResponse } from 'next/server';
import { requireRole, AppError } from '@/lib/permissions';
import { changeMilestoneStatusSchema } from '@/lib/validation';
import { updateMilestoneStatus } from '@/lib/milestones';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(['ORGANIZATION', 'ADMIN']);
    const body = await request.json();

    const validated = changeMilestoneStatusSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid milestone status', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await updateMilestoneStatus(user.id, params.id, validated.data.status, user.role === 'ADMIN');
    return NextResponse.json({ milestone: updated });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error(`Error in PATCH /api/milestones/${params.id}/status:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
