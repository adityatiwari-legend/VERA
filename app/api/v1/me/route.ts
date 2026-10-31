import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api_auth';

export const dynamic = 'force-dynamic';

/** GET /api/v1/me → the authenticated user (Bearer token). */
export async function GET(req: NextRequest) {
  try {
    const user = await requireApiAuth(req);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
