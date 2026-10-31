import { NextRequest, NextResponse } from 'next/server';
import { getPotholeReport, getRoughnessSummary, listAssignments } from '@/lib/hisaab';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const report = await getPotholeReport(params.id);
    const roughness = await getRoughnessSummary(params.id);
    const assignments = await listAssignments({});
    return NextResponse.json({
      report: {
        ...report,
        confirmations_count: Number((report as any).confirmations_count ?? report.confirmations?.length ?? 0),
      },
      roughness,
      assignment: assignments.find((a) => a.report_id === params.id) ?? null,
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && (error as any).name === 'NotFoundError') {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    console.error('GET /api/hisaab/reports/[id] error:', error);
    return NextResponse.json({ error: 'Failed to load report' }, { status: 500 });
  }
}
