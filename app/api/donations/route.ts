import { NextResponse } from 'next/server';
import { requireAuth, AppError } from '@/lib/permissions';
import { getDonationsByDonor, getDonorStats } from '@/lib/donations';

export async function GET() {
  try {
    const user = await requireAuth();

    const [donations, stats] = await Promise.all([
      getDonationsByDonor(user.id),
      getDonorStats(user.id),
    ]);

    return NextResponse.json({ donations, stats });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error in GET /api/donations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
