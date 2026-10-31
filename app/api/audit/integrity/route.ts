import { NextResponse } from 'next/server';
import { requireRole, AppError } from '@/lib/permissions';
import { runIntegrityChecks } from '@/lib/integrity';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireRole(['AUDITOR', 'ADMIN']);
    const campaignId = new URL(request.url).searchParams.get('campaignId') || undefined;
    const report = await runIntegrityChecks(campaignId);
    return NextResponse.json(report, { status: report.valid ? 200 : 409 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error in GET /api/audit/integrity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
