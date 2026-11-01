import { NextResponse } from 'next/server';
import { requireAuth, requireRole, AppError } from '@/lib/permissions';
import {
  createReleaseRequest,
  getReleaseRequestForMilestone
} from '@/lib/release_requests';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: milestoneId } = await params;
    const releaseRequest = await getReleaseRequestForMilestone(milestoneId);
    return NextResponse.json({ releaseRequest });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error in GET /api/milestones/[id]/release-request:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await requireRole(['ORGANIZATION', 'ADMIN', 'AUDITOR']);
    const { id: milestoneId } = await params;

    let amount: number | undefined;
    let notes: string | undefined;

    try {
      const body = await request.json();
      if (body.amount !== undefined) amount = Number(body.amount);
      notes = body.notes;
    } catch {
      // Empty body
    }

    const releaseRequest = await createReleaseRequest(user.id, {
      milestoneId,
      amount,
      notes
    });

    return NextResponse.json({
      releaseRequest,
      message: 'Release request created and awaiting 2-of-3 multisig approvals.'
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error in POST /api/milestones/[id]/release-request:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
