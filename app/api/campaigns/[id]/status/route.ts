import { NextResponse } from 'next/server';
import { requireRole, AppError } from '@/lib/permissions';
import { changeStatusSchema } from '@/lib/validation';
import { updateCampaignStatus } from '@/lib/campaigns';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(['ORGANIZATION', 'ADMIN']);
    const body = await request.json();

    const validated = changeStatusSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid status value', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await updateCampaignStatus(params.id, user.id, validated.data.status, user.role === 'ADMIN');

    return NextResponse.json({ campaign: updated });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error(`Error in PATCH /api/campaigns/${params.id}/status:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
