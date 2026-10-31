import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { NotFoundError, AppError } from '@/lib/permissions';
import { resolveSafeStoragePath, readFileWithSha256 } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * Serves Hisaab report media (before/after photos) by report id —
 * paths always resolve from the DB, never from client input.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') === 'after' ? 'after' : 'before';

    let filePath: string | null = null;
    let mimeType = 'image/jpeg';

    if (type === 'before') {
      const res = await query(
        `SELECT media_file_path, media_mime_type FROM pothole_reports WHERE id = $1::uuid`,
        [params.id]
      );
      filePath = res.rows[0]?.media_file_path ?? null;
      mimeType = res.rows[0]?.media_mime_type || mimeType;
    } else {
      const res = await query(
        `SELECT after_file_path, after_mime_type FROM repair_submissions
         WHERE report_id = $1::uuid ORDER BY created_at DESC LIMIT 1`,
        [params.id]
      );
      filePath = res.rows[0]?.after_file_path ?? null;
      mimeType = res.rows[0]?.after_mime_type || mimeType;
    }

    if (!filePath) throw new NotFoundError(`${type} photo not found`);

    const absolute = resolveSafeStoragePath(filePath);
    const { buffer } = await readFileWithSha256(absolute);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('GET /api/hisaab/reports/[id]/media error:', error);
    return NextResponse.json({ error: 'Failed to load media' }, { status: 500 });
  }
}
