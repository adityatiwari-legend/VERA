import { query, withTransaction } from './db';
import { Proof, ProofFile, VerificationResult, Milestone, Campaign, UserRole } from '../types';
import { SubmitProofInput, AuditorDecisionInput } from './validation';
import { saveProofFile, cleanupProofDirectory, StoredFileInfo, resolveSafeStoragePath, verifyStoredFileDigest } from './storage';
import { extractDocumentMetadata, runRuleBasedValidation } from './verification';
import { recordAuditLog } from './audit_log';
import { AppError, NotFoundError, ForbiddenError } from './permissions';
import crypto from 'crypto';

export interface UploadedFileInput {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}

async function attachFileIntegrity(file: ProofFile): Promise<ProofFile> {
  try {
    return {
      ...file,
      integrity_failed: !(await verifyStoredFileDigest(
        resolveSafeStoragePath(file.file_path),
        file.sha256_hash
      )),
    };
  } catch {
    return { ...file, integrity_failed: true };
  }
}

/**
 * Creates and submits a new proof for a milestone.
 * Runs atomically:
 * 1. Validates milestone ownership & status (IN_PROGRESS or REJECTED)
 * 2. Saves files to disk with SHA-256 fingerprints
 * 3. Inserts proofs, proof_files, and verification_results
 * 4. Updates milestone status to PROOF_SUBMITTED
 * 5. Records comprehensive audit log trail
 * 6. Cleans up disk if database transaction fails
 */
export async function createProof(
  ngoId: string,
  milestoneId: string,
  input: SubmitProofInput,
  files: UploadedFileInput[]
): Promise<Proof> {
  if (!files || files.length === 0) {
    throw new AppError('At least one proof file (invoice, receipt, or photo) must be uploaded.', 400);
  }

  const proofId = crypto.randomUUID();
  let savedFiles: StoredFileInfo[] = [];

  try {
    // 1. First save files securely to disk and compute SHA-256 hashes
    for (const file of files) {
      const stored = await saveProofFile(proofId, file.originalName, file.mimeType, file.buffer);
      savedFiles.push(stored);
    }

    // 2. Perform atomic database transaction
    return await withTransaction(async (client) => {
      // Lock milestone and campaign to check ownership and status
      const msRes = await client.query<Milestone & { ngo_id: string; campaign_title: string }>(
        `SELECT m.*, c.ngo_id, c.title as campaign_title
         FROM milestones m
         JOIN campaigns c ON m.campaign_id = c.id
         WHERE m.id = $1
         FOR UPDATE`,
        [milestoneId]
      );

      if (msRes.rowCount === 0) {
        throw new NotFoundError('Milestone not found');
      }

      const milestone = msRes.rows[0];

      // Ownership check: Only the NGO that owns the campaign can submit proof
      if (milestone.ngo_id !== ngoId) {
        throw new ForbiddenError('You can only submit proof for your own campaign milestones');
      }

      // Status check: Proof can only be submitted for IN_PROGRESS or previously REJECTED milestones
      if (milestone.status !== 'IN_PROGRESS' && milestone.status !== 'REJECTED') {
        throw new AppError(
          `Cannot submit proof for milestone in "${milestone.status}" status. Milestone must be IN_PROGRESS or REJECTED.`,
          400
        );
      }

      // Budget check: Claimed amount cannot exceed milestone allocation
      const milestoneAmount = parseFloat(milestone.amount.toString());
      if (input.claimed_amount > milestoneAmount) {
        throw new AppError(
          `Claimed amount (₹${input.claimed_amount.toLocaleString('en-IN')}) exceeds total milestone allocation (₹${milestoneAmount.toLocaleString('en-IN')}).`,
          400
        );
      }

      // Insert Proof record
      const insertProofSql = `
        INSERT INTO proofs (
          id,
          milestone_id,
          submitted_by,
          description,
          claimed_amount,
          status,
          submitted_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, 'UNDER_REVIEW', NOW(), NOW())
        RETURNING *
      `;

      const proofRes = await client.query<Proof>(insertProofSql, [
        proofId,
        milestoneId,
        ngoId,
        input.description,
        input.claimed_amount,
      ]);
      const proof = proofRes.rows[0];

      // Insert Proof Files
      const insertedProofFiles: ProofFile[] = [];
      for (const saved of savedFiles) {
        const insertFileSql = `
          INSERT INTO proof_files (
            proof_id,
            file_name,
            file_path,
            mime_type,
            file_size,
            sha256_hash,
            uploaded_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          RETURNING *
        `;
        const fileRes = await client.query<ProofFile>(insertFileSql, [
          proofId,
          saved.fileName,
          saved.filePath,
          saved.mimeType,
          saved.fileSize,
          saved.sha256Hash,
        ]);
        insertedProofFiles.push(fileRes.rows[0]);
      }

      // Run AI / OCR Extraction & Rule-based Validation
      const filesWithBuffers = savedFiles.map((sf, idx) => ({
        ...sf,
        buffer: files[idx]?.buffer,
      }));
      const extracted = await extractDocumentMetadata(filesWithBuffers, input.claimed_amount);
      const validationOutput = await runRuleBasedValidation(
        client,
        proofId,
        input.claimed_amount,
        milestoneAmount,
        savedFiles,
        extracted
      );

      // Insert Verification Results
      const insertVerificationSql = `
        INSERT INTO verification_results (
          proof_id,
          ai_status,
          confidence,
          extracted_amount,
          extracted_date,
          extracted_vendor,
          extracted_invoice_number,
          duplicate_detected,
          discrepancy_amount,
          notes,
          raw_result,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *
      `;

      const verRes = await client.query<VerificationResult>(insertVerificationSql, [
        proofId,
        validationOutput.ai_status,
        validationOutput.confidence,
        validationOutput.extracted_amount,
        validationOutput.extracted_date,
        validationOutput.extracted_vendor,
        validationOutput.extracted_invoice_number,
        validationOutput.duplicate_detected,
        validationOutput.discrepancy_amount,
        validationOutput.notes,
        JSON.stringify(validationOutput.raw_result),
      ]);
      const verification = verRes.rows[0];

      // Update Milestone Status to PROOF_SUBMITTED
      await client.query(
        `UPDATE milestones 
         SET status = 'PROOF_SUBMITTED', updated_at = NOW() 
         WHERE id = $1`,
        [milestoneId]
      );

      // Record Audit Logs
      await recordAuditLog({
        campaignId: milestone.campaign_id,
        actorId: ngoId,
        action: 'PROOF_CREATED',
        entityType: 'PROOF',
        entityId: proofId,
        metadata: {
          milestone_id: milestoneId,
          claimed_amount: input.claimed_amount,
          files_count: savedFiles.length,
        },
        client,
      });

      await recordAuditLog({
        campaignId: milestone.campaign_id,
        actorId: ngoId,
        action: 'PROOF_FILE_UPLOADED',
        entityType: 'PROOF_FILE',
        entityId: proofId,
        metadata: {
          files: savedFiles.map(f => ({
            file_name: f.fileName,
            sha256_hash: f.sha256Hash,
            size: f.fileSize,
          })),
        },
        client,
      });

      await recordAuditLog({
        campaignId: milestone.campaign_id,
        actorId: ngoId,
        action: 'PROOF_ANALYSIS_COMPLETED',
        entityType: 'PROOF',
        entityId: proofId,
        metadata: {
          ai_status: validationOutput.ai_status,
          confidence: validationOutput.confidence,
          extracted_amount: validationOutput.extracted_amount,
          discrepancy_amount: validationOutput.discrepancy_amount,
          duplicate_detected: validationOutput.duplicate_detected,
        },
        client,
      });

      await recordAuditLog({
        campaignId: milestone.campaign_id,
        actorId: ngoId,
        action: 'PROOF_SUBMITTED_FOR_REVIEW',
        entityType: 'PROOF',
        entityId: proofId,
        metadata: {
          milestone_id: milestoneId,
          milestone_title: milestone.title,
        },
        client,
      });

      proof.files = insertedProofFiles;
      proof.verification = verification;
      proof.milestone_title = milestone.title;
      proof.campaign_id = milestone.campaign_id;
      proof.campaign_title = milestone.campaign_title;

      return proof;
    });
  } catch (error) {
    // If anything failed, purge files from storage directory to prevent orphaned files
    cleanupProofDirectory(proofId);
    throw error;
  }
}

/**
 * Fetch a proof by ID with access control
 * - NGO owner of the campaign can access
 * - AUDITOR and ADMIN can access
 * - Others receive 403 Forbidden
 */
export async function getProofById(
  proofId: string,
  user: { id: string; role: UserRole }
): Promise<Proof> {
  const sql = `
    SELECT 
      p.*,
      m.title as milestone_title,
      m.amount::numeric as milestone_amount,
      m.status as milestone_status,
      c.id as campaign_id,
      c.title as campaign_title,
      c.ngo_id as campaign_ngo_id,
      u.name as ngo_name
    FROM proofs p
    JOIN milestones m ON p.milestone_id = m.id
    JOIN campaigns c ON m.campaign_id = c.id
    JOIN users u ON c.ngo_id = u.id
    WHERE p.id = $1
  `;

  const res = await query<Proof & { campaign_ngo_id: string }>(sql, [proofId]);

  if (res.rowCount === 0) {
    throw new NotFoundError('Proof not found');
  }

  const proof = res.rows[0];

  // Access Control Check
  if (user.role === 'USER') {
    throw new ForbiddenError('Donors do not have permission to view private proof evidence.');
  }

  if (user.role === 'ORGANIZATION' && proof.campaign_ngo_id !== user.id) {
    throw new ForbiddenError('You can only view proof evidence for your own campaigns.');
  }

  // Fetch associated files
  const filesRes = await query<ProofFile>(
    `SELECT * FROM proof_files WHERE proof_id = $1 ORDER BY uploaded_at ASC`,
    [proofId]
  );
  proof.files = await Promise.all(filesRes.rows.map(attachFileIntegrity));

  // Fetch verification result
  const verRes = await query<VerificationResult>(
    `SELECT * FROM verification_results WHERE proof_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [proofId]
  );
  proof.verification = verRes.rows[0] || null;

  return proof;
}

/**
 * List all proofs submitted for a specific milestone (including rejected historical proofs)
 */
export async function getProofsForMilestone(
  milestoneId: string,
  user: { id: string; role: UserRole }
): Promise<Proof[]> {
  // Check milestone access
  const msRes = await query<{ ngo_id: string }>(
    `SELECT c.ngo_id 
     FROM milestones m
     JOIN campaigns c ON m.campaign_id = c.id
     WHERE m.id = $1`,
    [milestoneId]
  );

  if (msRes.rowCount === 0) {
    throw new NotFoundError('Milestone not found');
  }

  if (user.role === 'USER') {
    throw new ForbiddenError('Donors cannot view private milestone proofs.');
  }

  if (user.role === 'ORGANIZATION' && msRes.rows[0].ngo_id !== user.id) {
    throw new ForbiddenError('You can only view proofs for your own campaigns.');
  }

  const sql = `
    SELECT 
      p.*,
      m.title as milestone_title,
      m.amount::numeric as milestone_amount
    FROM proofs p
    JOIN milestones m ON p.milestone_id = m.id
    WHERE p.milestone_id = $1
    ORDER BY p.submitted_at DESC
  `;

  const res = await query<Proof>(sql, [milestoneId]);
  const proofs = res.rows;

  for (const proof of proofs) {
    const files = await query<ProofFile>(
      `SELECT * FROM proof_files WHERE proof_id = $1 ORDER BY uploaded_at ASC`,
      [proof.id]
    );
    proof.files = await Promise.all(files.rows.map(attachFileIntegrity));

    const ver = await query<VerificationResult>(
      `SELECT * FROM verification_results WHERE proof_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [proof.id]
    );
    proof.verification = ver.rows[0] || null;
  }

  return proofs;
}

/**
 * List all proofs pending auditor review (or all reviews for Auditor Dashboard)
 */
export async function getAuditorReviewQueue(): Promise<Proof[]> {
  const sql = `
    SELECT 
      p.*,
      m.title as milestone_title,
      m.amount::numeric as milestone_amount,
      m.status as milestone_status,
      c.id as campaign_id,
      c.title as campaign_title,
      u.name as ngo_name
    FROM proofs p
    JOIN milestones m ON p.milestone_id = m.id
    JOIN campaigns c ON m.campaign_id = c.id
    JOIN users u ON c.ngo_id = u.id
    ORDER BY 
      CASE 
        WHEN p.status = 'UNDER_REVIEW' OR p.status = 'SUBMITTED' THEN 0 
        ELSE 1 
      END ASC,
      p.submitted_at DESC
  `;

  const res = await query<Proof>(sql);
  const proofs = res.rows;

  for (const proof of proofs) {
    const files = await query<ProofFile>(
      `SELECT * FROM proof_files WHERE proof_id = $1 ORDER BY uploaded_at ASC`,
      [proof.id]
    );
    proof.files = await Promise.all(files.rows.map(attachFileIntegrity));

    const ver = await query<VerificationResult>(
      `SELECT * FROM verification_results WHERE proof_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [proof.id]
    );
    proof.verification = ver.rows[0] || null;
  }

  return proofs;
}

/**
 * Auditor approves proof
 * Updates:
 * - Proof status = 'APPROVED'
 * - Milestone status = 'APPROVED'
 * - Does NOT change released_amount (strictly Phase 4)
 * - Logs PROOF_APPROVED or PROOF_APPROVED_OVERRIDE when flagged evidence is explicitly overridden
 */
export async function approveProof(
  auditorId: string,
  proofId: string,
  comment?: string | null
): Promise<Proof> {
  return withTransaction(async (client) => {
    // 1. Lock proof, milestone, and campaign
    const pRes = await client.query<Proof & { campaign_id: string; milestone_status: string }>(
      `SELECT 
         p.*, 
         m.campaign_id, 
         m.status as milestone_status
       FROM proofs p
       JOIN milestones m ON p.milestone_id = m.id
       WHERE p.id = $1
       FOR UPDATE`,
      [proofId]
    );

    if (pRes.rowCount === 0) {
      throw new NotFoundError('Proof not found');
    }

    const proof = pRes.rows[0];

    if (proof.status === 'APPROVED') {
      throw new AppError('Proof is already approved.', 400);
    }

    if (proof.status !== 'UNDER_REVIEW' && proof.status !== 'SUBMITTED') {
      throw new AppError(`Cannot approve proof in "${proof.status}" status.`, 400);
    }

    // An auditor approval is the authorized override for an unresolved
    // discrepancy. Record that distinction before changing the proof state.
    const verificationRes = await client.query<{ ai_status: string }>(
      `SELECT ai_status
       FROM verification_results
       WHERE proof_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [proofId]
    );
    const overriddenAiStatus = verificationRes.rows[0]?.ai_status || null;
    const isOverride = overriddenAiStatus === 'FLAG' || overriddenAiStatus === 'FAIL';

    // 2. Update Proof status
    const updateProofRes = await client.query<Proof>(
      `UPDATE proofs 
       SET status = 'APPROVED', updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [proofId]
    );
    const updatedProof = updateProofRes.rows[0];

    // 3. Update Milestone status to APPROVED
    // IMPORTANT: released_amount remains 0.00! Funds are strictly NOT released in Phase 3.
    await client.query(
      `UPDATE milestones 
       SET status = 'APPROVED', updated_at = NOW() 
       WHERE id = $1`,
      [proof.milestone_id]
    );

    // 4. Record Audit Log
    await recordAuditLog({
      campaignId: proof.campaign_id,
      actorId: auditorId,
      action: isOverride ? 'PROOF_APPROVED_OVERRIDE' : 'PROOF_APPROVED',
      entityType: 'PROOF',
      entityId: proofId,
      metadata: {
        milestone_id: proof.milestone_id,
        auditor_comment: comment || 'Evidence approved by auditor.',
        ...(isOverride
          ? {
              override: true,
              overridden_ai_status: overriddenAiStatus,
            }
          : {}),
      },
      client,
    });

    return updatedProof;
  });
}

/**
 * Auditor rejects proof
 * Updates:
 * - Proof status = 'REJECTED'
 * - Proof rejection_reason = comment
 * - Milestone status = 'REJECTED'
 * - Logs PROOF_REJECTED
 */
export async function rejectProof(
  auditorId: string,
  proofId: string,
  comment: string
): Promise<Proof> {
  if (!comment || comment.trim().length === 0) {
    throw new AppError('A rejection reason/comment is required when rejecting proof.', 400);
  }

  return withTransaction(async (client) => {
    // 1. Lock proof, milestone, and campaign
    const pRes = await client.query<Proof & { campaign_id: string; milestone_status: string }>(
      `SELECT 
         p.*, 
         m.campaign_id, 
         m.status as milestone_status
       FROM proofs p
       JOIN milestones m ON p.milestone_id = m.id
       WHERE p.id = $1
       FOR UPDATE`,
      [proofId]
    );

    if (pRes.rowCount === 0) {
      throw new NotFoundError('Proof not found');
    }

    const proof = pRes.rows[0];

    if (proof.status === 'APPROVED') {
      throw new AppError('Cannot reject an already approved proof.', 400);
    }

    // 2. Update Proof status
    const updateProofRes = await client.query<Proof>(
      `UPDATE proofs 
       SET status = 'REJECTED', rejection_reason = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [comment.trim(), proofId]
    );
    const updatedProof = updateProofRes.rows[0];

    // 3. Update Milestone status to REJECTED (allowing NGO correction / resubmission)
    await client.query(
      `UPDATE milestones 
       SET status = 'REJECTED', updated_at = NOW() 
       WHERE id = $1`,
      [proof.milestone_id]
    );

    // 4. Record Audit Log
    await recordAuditLog({
      campaignId: proof.campaign_id,
      actorId: auditorId,
      action: 'PROOF_REJECTED',
      entityType: 'PROOF',
      entityId: proofId,
      metadata: {
        milestone_id: proof.milestone_id,
        rejection_reason: comment.trim(),
      },
      client,
    });

    return updatedProof;
  });
}
