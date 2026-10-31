import { NextResponse } from 'next/server';
import { requireAuth, requireRole, AppError, NotFoundError, ForbiddenError } from '@/lib/permissions';
import { updateCampaignSchema } from '@/lib/validation';
import { getCampaignById, updateCampaign, cancelCampaign } from '@/lib/campaigns';
import { getAuditLogsForCampaign } from '@/lib/audit_log';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const campaign = await getCampaignById(params.id);

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    // If role is NGO, verify that the NGO owns this campaign
    if (user.role === 'ORGANIZATION' && campaign.ngo_id !== user.id) {
      throw new ForbiddenError('Access denied: You can only view your own campaigns');
    }

    const auditLogs = await getAuditLogsForCampaign(params.id);

    return NextResponse.json({ campaign, auditLogs });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error(`Error in GET /api/campaigns/${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(['ORGANIZATION', 'ADMIN']);
    const body = await request.json();

    const validated = updateCampaignSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await updateCampaign(params.id, user.id, validated.data, user.role === 'ADMIN');

    return NextResponse.json({ campaign: updated });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error(`Error in PATCH /api/campaigns/${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(['ORGANIZATION', 'ADMIN']);
    const cancelled = await cancelCampaign(params.id, user.id);

    return NextResponse.json({
      message: 'Campaign has been cancelled (soft-deleted to preserve audit trail)',
      campaign: cancelled,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error(`Error in DELETE /api/campaigns/${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
