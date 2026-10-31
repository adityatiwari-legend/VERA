import { NextResponse } from 'next/server';
import { requireRole, AppError } from '@/lib/permissions';
import { updateMilestoneSchema } from '@/lib/validation';
import { updateMilestone } from '@/lib/milestones';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(['ORGANIZATION', 'ADMIN']);
    const body = await request.json();

    const validated = updateMilestoneSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await updateMilestone(user.id, params.id, validated.data, user.role === 'ADMIN');
    return NextResponse.json({ milestone: updated });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error(`Error in PATCH /api/milestones/${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
