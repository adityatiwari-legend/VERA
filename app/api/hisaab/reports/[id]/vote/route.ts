import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AppError } from '@/lib/permissions';
import { requireAnyAuth } from '@/lib/api_auth';
import { confirmReportAsUser } from '@/lib/hisaab_actions';
import { getPotholeReport } from '@/lib/hisaab';
import { query } from '@/lib/db';
import { rateLimit } from '@/lib/rate_limit';

export const dynamic = 'force-dynamic';

const voteSchema = z.object({
  vote_type: z.enum(['CONFIRM', 'REJECT', 'FLAG']),
  // Accepted for mobile compatibility; identity always comes from the session/token.
  citizen_id: z.string().uuid().optional().nullable(),
  reason: z.string().trim().max(1000).optional().nullable(),
});

/**
 * POST /api/hisaab/reports/[id]/vote  { vote_type, reason? }
 * CONFIRM delegates to the existing confirmation flow (pothole_confirmations,
 * 3-confirmations escalation). REJECT/FLAG are recorded in pothole_votes —
 * tallies are returned but do not auto-change the report status.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAnyAuth(req);
    rateLimit(`hisaab-vote:${user.id}`, 30, 60_000);
    const { id: reportId } = await params;

    const parsed = voteSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const report = await getPotholeReport(reportId); // 404 when missing

    if (parsed.data.vote_type === 'CONFIRM') {
      const result = await confirmReportAsUser(reportId, user);
      const tallies = await getTallies(reportId);
      return NextResponse.json({
        vote_type: 'CONFIRM',
        confirmations: result.count,
        required: 3,
        status: result.status,
        inserted: result.inserted,
        already_confirmed: !result.inserted,
        votes: tallies,
      });
    }

    await query(
      `INSERT INTO pothole_votes (report_id, user_id, vote_type, reason)
       VALUES ($1::uuid, $2::uuid, $3, $4)
       ON CONFLICT (report_id, user_id)
       DO UPDATE SET vote_type = EXCLUDED.vote_type, reason = EXCLUDED.reason, updated_at = NOW()`,
      [reportId, user.id, parsed.data.vote_type, parsed.data.reason ?? null]
    );

    const tallies = await getTallies(reportId);

    return NextResponse.json({
      vote_type: parsed.data.vote_type,
      recorded: true,
      status: report.status,
      confirmations: tallies.confirmations,
      votes: { REJECT: tallies.reject, FLAG: tallies.flag },
      message:
        'Vote recorded. Confirm/escalation logic is unchanged; REJECT/FLAG tallies are visible to admins for triage.',
    });
  } catch (error: any) {
    if (error?.statusCode === 429) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/hisaab/reports/[id]/vote error:', error);
    return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 });
  }
}

async function getTallies(reportId: string): Promise<{ confirmations: number; reject: number; flag: number }> {
  const res = await query<{ confirmations: string; reject: string; flag: string }>(
    `SELECT
       (SELECT COUNT(*)::text FROM pothole_confirmations WHERE report_id = $1::uuid) AS confirmations,
       (SELECT COUNT(*)::text FROM pothole_votes WHERE report_id = $1::uuid AND vote_type = 'REJECT') AS reject,
       (SELECT COUNT(*)::text FROM pothole_votes WHERE report_id = $1::uuid AND vote_type = 'FLAG') AS flag`,
    [reportId]
  );
  const row = res.rows[0];
  return {
    confirmations: Number(row?.confirmations ?? 0),
    reject: Number(row?.reject ?? 0),
    flag: Number(row?.flag ?? 0),
  };
}
