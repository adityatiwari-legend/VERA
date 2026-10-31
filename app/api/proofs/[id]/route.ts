import { NextResponse } from 'next/server';
import { requireAuth, AppError } from '@/lib/permissions';
import { getProofById } from '@/lib/proofs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id: proofId } = await params;

    const proof = await getProofById(proofId, user);
    return NextResponse.json({ proof });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error in GET /api/proofs/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
