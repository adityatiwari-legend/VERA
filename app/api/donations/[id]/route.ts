import { NextResponse } from 'next/server';
import { requireAuth, AppError, NotFoundError } from '@/lib/permissions';
import { getDonationById } from '@/lib/donations';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const donation = await getDonationById(params.id, user.id);

    if (!donation) {
      throw new NotFoundError('Donation record not found');
    }

    return NextResponse.json({ donation });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error(`Error in GET /api/donations/${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
