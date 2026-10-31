import { NextResponse } from 'next/server';
import { requireRole, AppError } from '@/lib/permissions';
import { rejectProof } from '@/lib/proofs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await requireRole(['AUDITOR', 'ADMIN']);
    const { id: proofId } = await params;

    const body = await request.json();
    const comment = body?.comment;

    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return NextResponse.json(
        { error: 'A rejection comment/reason is required when rejecting proof.' },
        { status: 400 }
      );
    }

    const proof = await rejectProof(user.id, proofId, comment.trim());
    return NextResponse.json({ proof, message: 'Proof evidence rejected.' });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error in POST /api/proofs/[id]/reject:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
