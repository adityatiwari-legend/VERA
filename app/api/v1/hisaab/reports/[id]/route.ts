import { NextRequest, NextResponse } from 'next/server';
import { getPotholeReport, getRoughnessSummary, listAssignments } from '@/lib/hisaab';

export const dynamic = 'force-dynamic';

/** GET /api/v1/hisaab/reports/[id] → full report detail (public). */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const report = await getPotholeReport(params.id);
    const roughness = await getRoughnessSummary(params.id);
    const assignment = (await listAssignments({})).find((a) => a.report_id === params.id) ?? null;
    return NextResponse.json({ report, roughness, assignment });
  } catch (error: any) {
    if (error?.name === 'NotFoundError') {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    console.error('GET /api/v1/hisaab/reports/[id] error:', error);
    return NextResponse.json({ error: 'Failed to load report' }, { status: 500 });
  }
}
