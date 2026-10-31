import { NextResponse } from 'next/server';
import { requireRole, AppError } from '@/lib/permissions';
import { getAuditorReviewQueue } from '@/lib/proofs';

export async function GET() {
  try {
    await requireRole(['AUDITOR', 'ADMIN']);
    const reviews = await getAuditorReviewQueue();
    return NextResponse.json({ reviews });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error in GET /api/auditor/reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
