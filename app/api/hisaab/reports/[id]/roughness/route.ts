import { NextRequest, NextResponse } from 'next/server';
import { getRoughnessSummary } from '@/lib/hisaab';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const summary = await getRoughnessSummary(params.id);
    const { searchParams } = new URL(req.url);
    const withSeries = searchParams.get('series') === 'true';
    let series: unknown[] = [];
    if (withSeries) {
      const res = await query(
        `SELECT accel_z, speed_kmh, recorded_at, created_at
         FROM roughness_readings WHERE report_id = $1::uuid
         ORDER BY recorded_at ASC LIMIT 1000`,
        [params.id]
      );
      series = res.rows;
    }
    return NextResponse.json({ roughness: summary, series });
  } catch (error) {
    console.error('GET /api/hisaab/reports/[id]/roughness error:', error);
    return NextResponse.json({ error: 'Failed to load roughness data' }, { status: 500 });
  }
}
