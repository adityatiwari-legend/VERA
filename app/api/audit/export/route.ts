import { NextResponse } from 'next/server';
import { requireRole, AppError } from '@/lib/permissions';
import { auditRowsToCsv, getAuditReportRows } from '@/lib/audit_report';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireRole(['AUDITOR', 'ADMIN']);
    const url = new URL(request.url);
    const format = (url.searchParams.get('format') || 'json').toLowerCase();
    if (format !== 'csv' && format !== 'json') {
      return NextResponse.json({ error: 'format must be csv or json' }, { status: 400 });
    }

    const campaignId = url.searchParams.get('campaignId') || undefined;
    const rows = await getAuditReportRows(campaignId);
    if (format === 'csv') {
      return new Response(auditRowsToCsv(rows), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="vera-audit-report.csv"',
          'Cache-Control': 'private, no-store',
        },
      });
    }

    return NextResponse.json({ rows, generatedAt: new Date().toISOString() });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error in GET /api/audit/export:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
