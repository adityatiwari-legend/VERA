import { NextResponse } from 'next/server';
import { requireAuth, AppError, ForbiddenError, NotFoundError } from '@/lib/permissions';
import { query } from '@/lib/db';
import { readFileWithSha256, resolveSafeStoragePath } from '@/lib/storage';
import { recordAuditLog } from '@/lib/audit_log';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id: fileId } = await params;

    // Fetch file record along with ownership context
    const sql = `
      SELECT 
        pf.id,
        pf.proof_id,
        pf.file_name,
        pf.file_path,
        pf.mime_type,
        pf.file_size,
        pf.sha256_hash,
        c.id as campaign_id,
        c.ngo_id
      FROM proof_files pf
      JOIN proofs p ON pf.proof_id = p.id
      JOIN milestones m ON p.milestone_id = m.id
      JOIN campaigns c ON m.campaign_id = c.id
      WHERE pf.id = $1
    `;

    const res = await query<{
      id: string;
      proof_id: string;
      file_name: string;
      file_path: string;
      mime_type: string;
      file_size: number;
      sha256_hash: string;
      campaign_id: string;
      ngo_id: string;
    }>(sql, [fileId]);

    if (res.rowCount === 0) {
      throw new NotFoundError('Proof file not found');
    }

    const fileRecord = res.rows[0];

    // Access Control Enforcement — allowlist: ADMIN/AUDITOR see all evidence,
    // the owning organization sees its own. Everyone else (incl. donors) is denied.
    if (user.role !== 'ADMIN' && user.role !== 'AUDITOR') {
      if (user.role !== 'ORGANIZATION' || fileRecord.ngo_id !== user.id) {
        throw new ForbiddenError('You do not have permission to access private evidence files.');
      }
    }

    // Resolve secure disk path
    const absolutePath = resolveSafeStoragePath(fileRecord.file_path);
    const { buffer: fileBuffer, sha256Hash: actualHash } = await readFileWithSha256(absolutePath);
    const integrityFailed = actualHash.toLowerCase() !== fileRecord.sha256_hash.toLowerCase();

    if (integrityFailed) {
      try {
        await recordAuditLog({
          campaignId: fileRecord.campaign_id,
          actorId: user.id,
          action: 'PROOF_FILE_INTEGRITY_FAILED',
          entityType: 'PROOF_FILE',
          entityId: fileRecord.id,
          metadata: {
            proof_id: fileRecord.proof_id,
            expected_sha256: fileRecord.sha256_hash,
            actual_sha256: actualHash,
            integrity_failed: true,
          },
        });
      } catch (auditError) {
        console.error('Failed to record proof integrity failure:', auditError);
      }
    }

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': fileRecord.mime_type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileRecord.file_name)}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, no-store, max-age=0',
        'X-VERA-Integrity': integrityFailed ? 'MODIFIED' : 'VERIFIED',
        'X-VERA-Integrity-Failed': integrityFailed ? 'true' : 'false',
        'X-VERA-Integrity-JSON': JSON.stringify({
          integrityFailed,
          expectedSha256: fileRecord.sha256_hash,
          actualSha256: actualHash,
        }),
      },
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error in GET /api/proof-files/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
