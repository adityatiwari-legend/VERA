import { NextRequest, NextResponse } from 'next/server';
import { requireAnyAuth } from '@/lib/api_auth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAnyAuth(req);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
