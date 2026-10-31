import { NextResponse } from 'next/server';
import { requireAuth, AppError } from '@/lib/permissions';
import { verifyAuditLogChain } from '@/lib/audit_log';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAuth();
    const result = await verifyAuditLogChain();
    return NextResponse.json(result, { status: result.valid ? 200 : 409 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error in GET /api/audit/verify-chain:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
