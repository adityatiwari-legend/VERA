import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/permissions';
import { listPotholeReports } from '@/lib/hisaab';
import { createPotholeReportFromForm } from '@/lib/hisaab_actions';
import { rateLimit, clientIp } from '@/lib/rate_limit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;
    const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : undefined;
    const { reports, total } = await listPotholeReports({ status, severity, limit, offset });
    return NextResponse.json({ reports, total, count: reports.length });
  } catch (error) {
    console.error('GET /api/hisaab/reports error:', error);
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(['USER', 'ADMIN']);
    rateLimit(`web-report:${user.id}:${clientIp(req)}`, 10, 60_000);

    const form = await req.formData();
    const { report, explorerUrl, geminiStatus } = await createPotholeReportFromForm(form, user);

    return NextResponse.json(
      {
        report,
        explorer_url: explorerUrl,
        gemini_status: geminiStatus,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.statusCode === 429) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error?.statusCode) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/hisaab/reports error:', error);
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
}
