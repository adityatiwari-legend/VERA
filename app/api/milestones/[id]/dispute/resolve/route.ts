import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, AppError } from '@/lib/permissions';
import { resolveMilestoneDispute } from '@/lib/disputes';
import { getReleaseRequestForMilestone } from '@/lib/release_requests';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const resolveSchema = z.object({
  resolution_notes: z.string().trim().min(5, 'Resolution notes must be at least 5 characters').max(4000),
});

/**
 * POST /api/milestones/[id]/dispute/resolve  { resolution_notes }
 * Closes the OPEN dispute (AUDITOR/ADMIN only), unfreezing the money flow.
 * Response also carries the milestone's latest `releaseRequest` because the
 * mobile dispute flow parses that shape.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireRole(['AUDITOR', 'ADMIN']);
    const { id: milestoneId } = await params;

    const parsed = resolveSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const dispute = await resolveMilestoneDispute(user.id, milestoneId, parsed.data.resolution_notes);
    const releaseRequest = await getReleaseRequestForMilestone(milestoneId);

    return NextResponse.json({
      dispute,
      releaseRequest,
      message: 'Dispute resolved. Fund releases for this milestone are unfrozen.',
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/milestones/[id]/dispute/resolve error:', error);
    return NextResponse.json({ error: 'Failed to resolve dispute' }, { status: 500 });
  }
}
