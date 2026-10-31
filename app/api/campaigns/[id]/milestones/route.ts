import { NextResponse } from 'next/server';
import { requireRole, AppError } from '@/lib/permissions';
import { createMilestoneSchema } from '@/lib/validation';
import { getMilestonesForCampaign, createMilestone } from '@/lib/milestones';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const milestones = await getMilestonesForCampaign(params.id);
    return NextResponse.json({ milestones });
  } catch (error: any) {
    console.error(`Error in GET /api/campaigns/${params.id}/milestones:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(['ORGANIZATION', 'ADMIN']);

    const body = await request.json();
    const validated = createMilestoneSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const milestone = await createMilestone(user.id, params.id, validated.data, user.role === 'ADMIN');

    return NextResponse.json({ milestone }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error(`Error in POST /api/campaigns/${params.id}/milestones:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
