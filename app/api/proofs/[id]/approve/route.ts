import { NextResponse } from 'next/server';
import { requireRole, AppError } from '@/lib/permissions';
import { approveProof } from '@/lib/proofs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await requireRole(['AUDITOR', 'ADMIN']);
    const { id: proofId } = await params;

    let comment: string | undefined;
    try {
      const body = await request.json();
      comment = body.comment;
    } catch {
      // Body may be empty
    }

    const proof = await approveProof(user.id, proofId, comment);
    return NextResponse.json({ proof, message: 'Proof evidence approved successfully.' });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error in POST /api/proofs/[id]/approve:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
