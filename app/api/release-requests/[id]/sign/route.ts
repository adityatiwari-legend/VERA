import { NextResponse } from 'next/server';
import { requireRole, AppError } from '@/lib/permissions';
import { signReleaseRequest } from '@/lib/release_requests';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await requireRole(['ORGANIZATION', 'AUDITOR', 'ADMIN']);
    const { id: releaseRequestId } = await params;

    let comment: string | undefined;
    let status: 'APPROVED' | 'REJECTED' = 'APPROVED';

    try {
      const body = await request.json();
      if (body.comment) comment = body.comment;
      if (body.status === 'REJECTED') status = 'REJECTED';
    } catch {
      // Empty body
    }

    const result = await signReleaseRequest(user.id, releaseRequestId, {
      comment,
      status
    });

    return NextResponse.json({
      ...result,
      message: `Signature successfully submitted (${result.releaseRequest.current_approvals}/${result.releaseRequest.required_approvals} approvals).`
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error in POST /api/release-requests/[id]/sign:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
