import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, AppError } from '@/lib/permissions';
import { raiseMilestoneDispute } from '@/lib/disputes';
import { getReleaseRequestForMilestone } from '@/lib/release_requests';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const disputeSchema = z.object({
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(2000),
});

/**
 * POST /api/milestones/[id]/dispute  { reason }
 * Raises a dispute on a milestone. An OPEN dispute freezes the money flow
 * (no new release requests, no APPROVED signatures, no execution) until
 * resolved. Response also carries the milestone's latest `releaseRequest`
 * (may be null) because the mobile dispute flow parses that shape.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireRole(['ORGANIZATION', 'AUDITOR', 'ADMIN']);
    const { id: milestoneId } = await params;

    const parsed = disputeSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const dispute = await raiseMilestoneDispute(user.id, milestoneId, parsed.data.reason);
    const releaseRequest = await getReleaseRequestForMilestone(milestoneId);

    return NextResponse.json(
      {
        dispute,
        releaseRequest,
        message: 'Dispute recorded. Fund releases for this milestone are frozen until resolved.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/milestones/[id]/dispute error:', error);
    return NextResponse.json({ error: 'Failed to raise dispute' }, { status: 500 });
  }
}
