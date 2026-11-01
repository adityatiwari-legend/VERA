import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { requireApiRole } from '@/lib/api_auth';
import { AppError, NotFoundError } from '@/lib/permissions';
import {
  createRepairSubmission,
  getPotholeReport,
  markRepairVerified,
  advanceEscrowStage,
  getEscrowForReport,
  getRoughnessSummary,
  getAcceptedAssignmentForReport,
} from '@/lib/hisaab';
import { saveReportMedia, resolveSafeStoragePath, readFileWithSha256 } from '@/lib/storage';
import { compareBeforeAfter, isGeminiConfigured } from '@/lib/gemini';
import { onChainReleaseStage, isSolanaProgramConfigured, explorerTxUrl } from '@/lib/solana';
import { notify, notifyRole } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

const ROUGHNESS_THRESHOLD = Number(process.env.ROUGHNESS_THRESHOLD || 3.0);

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiRole(req, ['CONTRACTOR', 'ADMIN']);

    const form = await req.formData();
    const reportId = String(form.get('report_id') || '');
    const afterPhoto = form.get('after_photo');
    if (!/^[0-9a-f-]{36}$/i.test(reportId)) {
      throw new AppError('Valid report_id is required', 400);
    }
    if (!(afterPhoto instanceof File) || afterPhoto.size === 0) {
      throw new AppError('An after-repair photo is required', 400);
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(afterPhoto.type)) {
      throw new AppError('Photo must be a JPG, PNG, or WEBP image', 400);
    }

    const report = await getPotholeReport(reportId);
    if (!report.media_file_path) {
      throw new AppError('Original report has no stored media', 400);
    }

    // Contractors may only submit repairs for reports assigned to them.
    if (user.role === 'CONTRACTOR') {
      const assignment = await getAcceptedAssignmentForReport(reportId, user.id);
      if (!assignment) {
        throw new AppError('You have no accepted assignment for this report', 403);
      }
      const escrowCheck = await getEscrowForReport(reportId);
      if (escrowCheck && escrowCheck.contractor_user_id !== user.id) {
        throw new AppError('This job is assigned to a different contractor', 403);
      }
    }

    const afterBuffer = Buffer.from(await afterPhoto.arrayBuffer());
    const media = await saveReportMedia(reportId, afterPhoto.name, afterPhoto.type, afterBuffer);

    // Before/after comparison by Gemini vision.
    const beforeAbsolute = resolveSafeStoragePath(report.media_file_path);
    const before = await readFileWithSha256(beforeAbsolute);
    const compare = await compareBeforeAfter(
      before.buffer,
      report.media_mime_type || 'image/jpeg',
      afterBuffer,
      afterPhoto.type
    );

    // Road roughness from the drive-by telemetry (Tiger Data time-series).
    const roughness = await getRoughnessSummary(reportId);
    const roughnessOk =
      roughness.score === null ? null : roughness.score <= ROUGHNESS_THRESHOLD;

    const submission = await createRepairSubmission({
      reportId,
      submittedBy: user.id,
      afterFile: {
        fileName: media.fileName,
        filePath: media.filePath,
        mimeType: media.mimeType,
        sha256: media.sha256Hash,
      },
      geminiCompare: compare.result,
      geminiStatus: compare.status,
      roughnessScore: roughness.score,
      roughnessSamples: roughness.samples,
    });

    // Gate: AI says repaired (+ roughness not clearly bad) → release stage 1.
    const verified =
      compare.status === 'PASS' && (roughnessOk === null || roughnessOk === true);

    let stage1Tx: string | null = null;
    let escrow = await getEscrowForReport(reportId);

    if (verified) {
      await markRepairVerified(reportId, submission.id, null);

      if (escrow && escrow.released_stage === 0) {
        if (isSolanaProgramConfigured()) {
          try {
            const res = await onChainReleaseStage({ reportId, stage: 1 });
            if (res) stage1Tx = res.signature;
          } catch (err) {
            console.error('Solana release_stage(1) failed (PG ledger keeps state):', err);
          }
        }
        escrow = await advanceEscrowStage(reportId, 1, stage1Tx);
      }
    }

    await notify(
      report.reporter_id,
      'HISAAB_REPAIR_SUBMITTED',
      'Repair evidence submitted',
      verified
        ? 'The contractor submitted repair evidence and AI verification passed. Funds are being released.'
        : 'The contractor submitted repair evidence. AI verification flagged it for manual review.',
      `/hisaab/report/${reportId}`
    );
    await notifyRole(
      ['ADMIN'],
      'HISAAB_REPAIR_SUBMITTED',
      'Repair submitted for review',
      `Repair evidence for "${report.address_label ?? 'report ' + reportId}" needs ${verified ? 'no action — auto-verified' : 'manual review'}.`,
      `/hisaab/report/${reportId}`
    );

    return NextResponse.json(
      {
        submission,
        verified,
        gemini: compare.result,
        gemini_status: compare.status,
        roughness: {
          score: roughness.score,
          samples: roughness.samples,
          threshold: ROUGHNESS_THRESHOLD,
          ok: roughnessOk,
        },
        escrow,
        stage1_tx: stage1Tx,
        explorer_url: stage1Tx ? explorerTxUrl(stage1Tx) : null,
      },
      { status: 201 }
    );
  } catch (error) {    if (error instanceof AppError || error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'ENOENT') {
      return NextResponse.json({ error: 'Stored before-photo missing on disk' }, { status: 500 });
    }
    console.error('POST /api/hisaab/repairs error:', error);
    return NextResponse.json({ error: 'Failed to submit repair' }, { status: 500 });
  }
}
