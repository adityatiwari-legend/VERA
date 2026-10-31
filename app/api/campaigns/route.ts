import { NextResponse } from 'next/server';
import { requireAuth, requireRole, AppError } from '@/lib/permissions';
import { createCampaignSchema } from '@/lib/validation';
import { createCampaign, getCampaignsForNgo, getNgoCampaignStats } from '@/lib/campaigns';

export async function GET() {
  try {
    const user = await requireAuth();

    if (user.role === 'ORGANIZATION') {
      const [campaigns, stats] = await Promise.all([
        getCampaignsForNgo(user.id),
        getNgoCampaignStats(user.id),
      ]);
      return NextResponse.json({ campaigns, stats });
    }

    return NextResponse.json(
      { error: 'Campaign listing in this view is restricted to NGOs' },
      { status: 403 }
    );
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error in GET /api/campaigns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(['ORGANIZATION', 'ADMIN']);

    const body = await request.json();
    const validated = createCampaignSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const campaign = await createCampaign(user.id, validated.data, user.org_status);

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error in POST /api/campaigns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
