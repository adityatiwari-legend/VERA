import { query, withTransaction } from './db';
import { recordAuditLog } from './audit_log';
import {
  PotholeReport,
  PotholeConfirmation,
  HisaabEscrow,
  RepairSubmission,
  GeminiPotholeResult,
  GeminiCompareResult,
  AIStatus,
  FundRequest,
  ContractorAssignment,
} from '../types';
import { AppError, NotFoundError } from './permissions';

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface CreateReportParams {
  id?: string;
  reporterId: string;
  latitude: number;
  longitude: number;
  addressLabel: string | null;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  sizeEstimateCm: number | null;
  geminiResult: GeminiPotholeResult | null;
  geminiStatus: AIStatus;
  media: {
    fileName: string;
    filePath: string;
    mimeType: string;
    sha256: string;
  };
  solanaPda?: string | null;
  solanaTxHash?: string | null;
}

export async function createPotholeReport(params: CreateReportParams): Promise<PotholeReport> {
  return withTransaction(async (client) => {
    const res = await client.query<PotholeReport>(
      `INSERT INTO pothole_reports (
         id, reporter_id, latitude, longitude, address_label, description,
         severity, size_estimate_cm, gemini_result, gemini_status,
         media_file_name, media_file_path, media_mime_type, media_sha256,
         solana_report_pda, solana_tx_hash, status
       )
       VALUES (COALESCE($16::uuid, gen_random_uuid()),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'OPEN')
       RETURNING *`,
      [
        params.reporterId,
        params.latitude,
        params.longitude,
        params.addressLabel,
        params.description,
        params.severity,
        params.sizeEstimateCm,
        params.geminiResult ? JSON.stringify(params.geminiResult) : null,
        params.geminiStatus,
        params.media.fileName,
        params.media.filePath,
        params.media.mimeType,
        params.media.sha256,
        params.solanaPda ?? null,
        params.solanaTxHash ?? null,
        params.id ?? null,
      ]
    );
    const report = res.rows[0];

    await recordAuditLog({
      campaignId: null,
      actorId: params.reporterId,
      action: 'HISAAB_REPORT_CREATED',
      entityType: 'pothole_report',
      entityId: report.id,
      metadata: {
        severity: params.severity,
        gemini_status: params.geminiStatus,
        media_sha256: params.media.sha256,
        latitude: params.latitude,
        longitude: params.longitude,
        solana_tx: params.solanaTxHash ?? null,
      },
      client,
    });

    return report;
  });
}

export async function attachSolanaReportTx(
  reportId: string,
  pda: string,
  txHash: string
): Promise<void> {
  await query(
    `UPDATE pothole_reports SET solana_report_pda = $2, solana_tx_hash = $3, updated_at = NOW()
     WHERE id = $1::uuid`,
    [reportId, pda, txHash]
  );
}

interface ReportRow extends Omit<PotholeReport, 'confirmations_count'> {
  confirmations_count?: string | number;
  escrow_id?: string;
}

export async function listPotholeReports(opts: {
  status?: string;
  severity?: string;
  reporterId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ reports: PotholeReport[]; total: number }> {
  const limit = Math.min(opts.limit ?? 100, 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const countRes = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM pothole_reports r
     WHERE ($1::text IS NULL OR r.status = $1) AND ($2::text IS NULL OR r.severity = $2)
       AND ($3::uuid IS NULL OR r.reporter_id = $3::uuid)`,
    [opts.status ?? null, opts.severity ?? null, opts.reporterId ?? null]
  );
  const res = await query<any>(
    `SELECT r.*, u.name AS reporter_name,
            (SELECT COUNT(*)::int FROM pothole_confirmations c WHERE c.report_id = r.id) AS confirmations_count,
            e.id AS escrow_id, e.status AS escrow_status, e.funder_label AS escrow_funder, e.funder_type AS escrow_funder_type,
            e.contractor_label AS escrow_contractor, e.contractor_wallet AS escrow_wallet, e.contractor_user_id AS escrow_contractor_user_id,
            e.stage1_amount, e.stage2_amount, e.stage3_amount,
            e.released_stage AS escrow_released, e.hold_until AS escrow_hold, e.demo_mode AS escrow_demo_mode,
            e.solana_escrow_pda AS escrow_pda, e.solana_vault_pda AS escrow_vault_pda,
            e.solana_tx_hash AS escrow_tx, e.created_at AS escrow_created
     FROM pothole_reports r
     JOIN users u ON u.id = r.reporter_id
     LEFT JOIN hisaab_escrows e ON e.report_id = r.id
     WHERE ($1::text IS NULL OR r.status = $1) AND ($2::text IS NULL OR r.severity = $2)
       AND ($3::uuid IS NULL OR r.reporter_id = $3::uuid)
     ORDER BY r.created_at DESC
     LIMIT $4 OFFSET $5`,
    [opts.status ?? null, opts.severity ?? null, opts.reporterId ?? null, limit, offset]
  );
  const reports = res.rows.map((r: any) => ({
    ...r,
    confirmations_count: Number(r.confirmations_count ?? 0),
    escrow: r.escrow_id
      ? {
          id: r.escrow_id,
          report_id: r.id,
          funder_label: r.escrow_funder,
          funder_type: r.escrow_funder_type,
          contractor_label: r.escrow_contractor,
          contractor_user_id: r.escrow_contractor_user_id,
          contractor_wallet: r.escrow_wallet,
          demo_mode: r.escrow_demo_mode,
          stage1_amount: r.stage1_amount,
          stage2_amount: r.stage2_amount,
          stage3_amount: r.stage3_amount,
          released_stage: Number(r.escrow_released ?? 0),
          hold_until: r.escrow_hold,
          status: r.escrow_status,
          solana_escrow_pda: r.escrow_pda,
          solana_vault_pda: r.escrow_vault_pda,
          solana_tx_hash: r.escrow_tx,
          created_at: r.escrow_created,
        }
      : null,
  }));
  return { reports, total: Number(countRes.rows[0]?.count ?? reports.length) };
}

export async function getPotholeReport(id: string): Promise<PotholeReport & {
  confirmations: PotholeConfirmation[];
  escrow: HisaabEscrow | null;
  repair: RepairSubmission | null;
}> {
  const res = await query<ReportRow>(
    `SELECT r.*, u.name AS reporter_name,
            (SELECT COUNT(*)::int FROM pothole_confirmations c WHERE c.report_id = r.id) AS confirmations_count
     FROM pothole_reports r
     JOIN users u ON u.id = r.reporter_id
     WHERE r.id = $1::uuid`,
    [id]
  );
  if (!res.rows[0]) throw new NotFoundError('Report not found');

  const confRes = await query<PotholeConfirmation & { user_name: string }>(
    `SELECT c.*, u.name AS user_name
     FROM pothole_confirmations c JOIN users u ON u.id = c.user_id
     WHERE c.report_id = $1::uuid ORDER BY c.created_at ASC`,
    [id]
  );
  const escRes = await query<HisaabEscrow>(
    `SELECT * FROM hisaab_escrows WHERE report_id = $1::uuid LIMIT 1`,
    [id]
  );
  const repRes = await query<RepairSubmission & { contractor_name?: string }>(
    `SELECT rs.*, u.name AS contractor_name
     FROM repair_submissions rs LEFT JOIN users u ON u.id = rs.submitted_by
     WHERE rs.report_id = $1::uuid ORDER BY rs.created_at DESC LIMIT 1`,
    [id]
  );

  return {
    ...res.rows[0],
    confirmations_count: Number(res.rows[0].confirmations_count ?? 0),
    confirmations: confRes.rows,
    escrow: escRes.rows[0] ?? null,
    repair: repRes.rows[0] ?? null,
  };
}

// ---------------------------------------------------------------------------
// Confirmations
// ---------------------------------------------------------------------------

export async function addConfirmation(
  reportId: string,
  userId: string,
  solanaPda: string | null,
  solanaTxHash: string | null
): Promise<{ inserted: boolean; count: number; status: string }> {
  return withTransaction(async (client) => {
    const reportRes = await client.query<{ id: string; reporter_id: string; status: string }>(
      `SELECT id, reporter_id, status FROM pothole_reports WHERE id = $1::uuid FOR UPDATE`,
      [reportId]
    );
    if (!reportRes.rows[0]) throw new NotFoundError('Report not found');
    const report = reportRes.rows[0];

    if (report.reporter_id === userId) {
      throw new AppError('You cannot confirm your own report', 400);
    }
    if (!['OPEN', 'CONFIRMED'].includes(report.status)) {
      throw new AppError(`Report is already ${report.status}`, 400);
    }

    const ins = await client.query(
      `INSERT INTO pothole_confirmations (report_id, user_id, solana_confirm_pda, solana_tx_hash)
       VALUES ($1::uuid, $2, $3, $4)
       ON CONFLICT (report_id, user_id) DO NOTHING
       RETURNING id`,
      [reportId, userId, solanaPda, solanaTxHash]
    );
    const inserted = ins.rows.length > 0;

    const cntRes = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM pothole_confirmations WHERE report_id = $1::uuid`,
      [reportId]
    );
    const count = Number(cntRes.rows[0].count);

    if (count >= 3 && report.status === 'OPEN') {
      await client.query(
        `UPDATE pothole_reports SET status = 'CONFIRMED', updated_at = NOW() WHERE id = $1::uuid`,
        [reportId]
      );
    }

    if (inserted) {
      await recordAuditLog({
        campaignId: null,
        actorId: userId,
        action: 'HISAAB_REPORT_CONFIRMED',
        entityType: 'pothole_report',
        entityId: reportId,
        metadata: { confirmations: count, solana_tx: solanaTxHash },
        client,
      });
    }

    return {
      inserted,
      count,
      status: count >= 3 ? 'CONFIRMED' : report.status,
    };
  });
}

// ---------------------------------------------------------------------------
// Escrow
// ---------------------------------------------------------------------------

export interface CreateEscrowParams {
  reportId: string;
  funderLabel: string;
  funderType: 'GOV_GRANT' | 'CORPORATE_CSR' | 'PLATFORM';
  fundRequestId: string | null;
  contractorUserId: string;
  contractorLabel: string;
  contractorWallet: string | null;
  assignmentId: string | null;
  demoMode: boolean;
  stage1: number;
  stage2: number;
  stage3: number;
  holdUntil: Date;
  solanaEscrowPda?: string | null;
  solanaVaultPda?: string | null;
  solanaTxHash?: string | null;
}

export async function createEscrow(params: CreateEscrowParams): Promise<HisaabEscrow> {
  return withTransaction(async (client) => {
    const reportRes = await client.query<{ status: string }>(
      `SELECT status FROM pothole_reports WHERE id = $1::uuid FOR UPDATE`,
      [params.reportId]
    );
    if (!reportRes.rows[0]) throw new NotFoundError('Report not found');

    const existing = await client.query(
      `SELECT id FROM hisaab_escrows WHERE report_id = $1::uuid`,
      [params.reportId]
    );
    if (existing.rows[0]) {
      throw new AppError('An escrow already exists for this report', 409);
    }

    // A contractor can only be paid via an assignment they have accepted.
    const assignment = params.assignmentId
      ? await client.query(
          `SELECT id, status FROM contractor_assignments
           WHERE id = $1::uuid AND report_id = $2::uuid AND contractor_id = $3::uuid FOR UPDATE`,
          [params.assignmentId, params.reportId, params.contractorUserId]
        )
      : await client.query(
          `SELECT id, status FROM contractor_assignments
           WHERE report_id = $1::uuid AND contractor_id = $2::uuid
           ORDER BY offered_at DESC LIMIT 1 FOR UPDATE`,
          [params.reportId, params.contractorUserId]
        );
    const assignmentRow = assignment.rows[0];
    if (!assignmentRow || assignmentRow.status !== 'ACCEPTED') {
      throw new AppError(
        'Contractor must have an accepted assignment for this report before escrow is funded',
        400
      );
    }

    const res = await client.query<HisaabEscrow>(
      `INSERT INTO hisaab_escrows (
         report_id, funder_label, funder_type, fund_request_id,
         contractor_label, contractor_user_id, contractor_wallet, assignment_id, demo_mode,
         stage1_amount, stage2_amount, stage3_amount, hold_until,
         solana_escrow_pda, solana_vault_pda, solana_tx_hash
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        params.reportId,
        params.funderLabel,
        params.funderType,
        params.fundRequestId,
        params.contractorLabel,
        params.contractorUserId,
        params.contractorWallet,
        assignmentRow.id,
        params.demoMode,
        params.stage1,
        params.stage2,
        params.stage3,
        params.holdUntil,
        params.solanaEscrowPda ?? null,
        params.solanaVaultPda ?? null,
        params.solanaTxHash ?? null,
      ]
    );

    await client.query(
      `UPDATE pothole_reports SET status = 'ESCALATED', updated_at = NOW() WHERE id = $1::uuid`,
      [params.reportId]
    );

    await recordAuditLog({
      campaignId: null,
      actorId: null,
      action: 'HISAAB_ESCROW_CREATED',
      entityType: 'hisaab_escrow',
      entityId: res.rows[0].id,
      metadata: {
        report_id: params.reportId,
        contractor_user_id: params.contractorUserId,
        funder_type: params.funderType,
        fund_request_id: params.fundRequestId,
        demo_mode: params.demoMode,
        total: params.stage1 + params.stage2 + params.stage3,
        hold_until: params.holdUntil.toISOString(),
        solana_tx: params.solanaTxHash ?? null,
      },
      client,
    });

    return res.rows[0];
  });
}

export async function getEscrowForReport(reportId: string): Promise<HisaabEscrow | null> {
  const res = await query<HisaabEscrow>(
    `SELECT * FROM hisaab_escrows WHERE report_id = $1::uuid LIMIT 1`,
    [reportId]
  );
  return res.rows[0] ?? null;
}

export async function advanceEscrowStage(
  reportId: string,
  stage: number,
  solanaTxHash: string | null
): Promise<HisaabEscrow> {
  return withTransaction(async (client) => {
    const res = await client.query<HisaabEscrow>(
      `SELECT * FROM hisaab_escrows WHERE report_id = $1::uuid FOR UPDATE`,
      [reportId]
    );
    const escrow = res.rows[0];
    if (!escrow) throw new NotFoundError('Escrow not found');
    if (escrow.status !== 'ACTIVE') throw new AppError('Escrow is not active', 400);
    if (stage !== escrow.released_stage + 1) {
      throw new AppError(`Expected stage ${escrow.released_stage + 1}, got ${stage}`, 400);
    }

    const isFinal = stage >= 2;
    if (isFinal) {
      const now = new Date();
      const holdUntil = escrow.hold_until ? new Date(escrow.hold_until) : null;
      if (!holdUntil || holdUntil > now) {
        throw new AppError(
          holdUntil
            ? `30-day durability hold active until ${holdUntil.toISOString()}`
            : 'Hold deadline not set',
          400
        );
      }
    }

    const updated = await client.query<HisaabEscrow>(
      `UPDATE hisaab_escrows
       SET released_stage = $2::int,
           status = CASE WHEN $2::int >= 3 THEN 'COMPLETED' ELSE status END,
           updated_at = NOW()
       WHERE id = $1::uuid
       RETURNING *`,
      [escrow.id, stage]
    );

    if (isFinal) {
      await client.query(
        `UPDATE pothole_reports SET status = 'PAID', updated_at = NOW() WHERE id = $1::uuid`,
        [reportId]
      );
      if (escrow.contractor_user_id) {
        await client.query(
          `UPDATE contractor_assignments SET status = 'COMPLETED', responded_at = COALESCE(responded_at, NOW())
           WHERE report_id = $1::uuid AND contractor_id = $2 AND status = 'ACCEPTED'`,
          [reportId, escrow.contractor_user_id]
        );
      }
    }

    await recordAuditLog({
      campaignId: null,
      actorId: null,
      action: 'HISAAB_STAGE_RELEASED',
      entityType: 'hisaab_escrow',
      entityId: escrow.id,
      metadata: { stage, report_id: reportId, solana_tx: solanaTxHash },
      client,
    });

    return updated.rows[0];
  });
}

// ---------------------------------------------------------------------------
// Repairs
// ---------------------------------------------------------------------------

export async function createRepairSubmission(params: {
  reportId: string;
  submittedBy: string;
  afterFile: { fileName: string; filePath: string; mimeType: string; sha256: string };
  geminiCompare: GeminiCompareResult | null;
  geminiStatus: AIStatus;
  roughnessScore: number | null;
  roughnessSamples: number | null;
}): Promise<RepairSubmission> {
  return withTransaction(async (client) => {
    const res = await client.query<RepairSubmission>(
      `INSERT INTO repair_submissions (
         report_id, submitted_by, after_file_name, after_file_path, after_mime_type,
         after_sha256, gemini_compare, gemini_status, roughness_score, roughness_samples
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        params.reportId,
        params.submittedBy,
        params.afterFile.fileName,
        params.afterFile.filePath,
        params.afterFile.mimeType,
        params.afterFile.sha256,
        params.geminiCompare ? JSON.stringify(params.geminiCompare) : null,
        params.geminiStatus,
        params.roughnessScore,
        params.roughnessSamples,
      ]
    );

    await client.query(
      `UPDATE pothole_reports SET status = 'REPAIR_SUBMITTED', updated_at = NOW() WHERE id = $1::uuid`,
      [params.reportId]
    );

    await recordAuditLog({
      campaignId: null,
      actorId: params.submittedBy,
      action: 'HISAAB_REPAIR_SUBMITTED',
      entityType: 'pothole_report',
      entityId: params.reportId,
      metadata: {
        after_sha256: params.afterFile.sha256,
        gemini_status: params.geminiStatus,
        roughness_score: params.roughnessScore,
      },
      client,
    });

    return res.rows[0];
  });
}

export async function markRepairVerified(
  reportId: string,
  repairId: string,
  solanaTxHash: string | null
): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE repair_submissions SET status = 'APPROVED', solana_tx_hash = COALESCE($3, solana_tx_hash)
       WHERE id = $2::uuid AND report_id = $1::uuid`,
      [reportId, repairId, solanaTxHash]
    );
    await client.query(
      `UPDATE pothole_reports SET status = 'VERIFIED', updated_at = NOW() WHERE id = $1::uuid`,
      [reportId]
    );
    await recordAuditLog({
      campaignId: null,
      actorId: null,
      action: 'HISAAB_REPAIR_VERIFIED',
      entityType: 'pothole_report',
      entityId: reportId,
      metadata: { repair_id: repairId, solana_tx: solanaTxHash },
      client,
    });
  });
}

// ---------------------------------------------------------------------------
// Citizen wallets (devnet identity per user)
// ---------------------------------------------------------------------------

export async function getCitizenWallet(userId: string): Promise<{ pubkey: string; keypairJson: string } | null> {
  const res = await query<{ pubkey: string; keypair_json: string }>(
    `SELECT pubkey, keypair_json FROM citizen_wallets WHERE user_id = $1::uuid`,
    [userId]
  );
  if (res.rows[0]) return { pubkey: res.rows[0].pubkey, keypairJson: res.rows[0].keypair_json };
  return null;
}

export async function ensureCitizenWallet(
  userId: string,
  generate: () => { pubkey: string; keypairJson: string }
): Promise<{ pubkey: string; keypairJson: string }> {
  const existing = await getCitizenWallet(userId);
  if (existing) return existing;
  const fresh = generate();
  await query(
    `INSERT INTO citizen_wallets (user_id, pubkey, keypair_json)
     VALUES ($1::uuid, $2, $3)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, fresh.pubkey, fresh.keypairJson]
  );
  const after = await getCitizenWallet(userId);
  return after ?? fresh;
}

// ---------------------------------------------------------------------------
// Roughness aggregation
// ---------------------------------------------------------------------------

export async function getRoughnessSummary(reportId: string): Promise<{
  score: number | null;
  samples: number;
  iriApprox: number | null;
}> {
  const res = await query<{ avg_abs: string | null; stddev: string | null; samples: string }>(
    `SELECT AVG(ABS(accel_z)) AS avg_abs,
            COALESCE(STDDEV_POP(accel_z), 0) AS stddev,
            COUNT(*) AS samples
     FROM roughness_readings WHERE report_id = $1::uuid`,
    [reportId]
  );
  const row = res.rows[0];
  const stdDev = row?.stddev ? Number(row.stddev) : 0;
  return {
    score: row?.avg_abs ? Number(row.avg_abs) : null,
    samples: Number(row?.samples ?? 0),
    // IRI-approx (m/km): detrended vertical acceleration spread, scaled to a
    // road-roughness index. Calibration factor tuned on phone-class accelerometers.
    iriApprox: row?.samples && Number(row.samples) > 0 ? Number((stdDev * 8).toFixed(2)) : null,
  };
}

// ---------------------------------------------------------------------------
// Fund requests (government / municipal fund application workflow)
// ---------------------------------------------------------------------------

export async function createFundRequest(params: {
  adminId: string;
  title: string;
  description: string;
  department: string;
  requestedAmount: number;
  reportIds: string[];
}): Promise<FundRequest> {
  return withTransaction(async (client) => {
    const res = await client.query<FundRequest>(
      `INSERT INTO fund_requests (admin_id, title, description, department, requested_amount, status)
       VALUES ($1,$2,$3,$4,$5,'DRAFT') RETURNING *`,
      [params.adminId, params.title, params.description, params.department, params.requestedAmount]
    );
    const fundRequest = res.rows[0];

    for (const reportId of params.reportIds) {
      const exists = await client.query(`SELECT 1 FROM pothole_reports WHERE id = $1::uuid`, [reportId]);
      if (!exists.rows[0]) throw new NotFoundError(`Report ${reportId} not found`);
      await client.query(
        `INSERT INTO fund_request_reports (fund_request_id, report_id) VALUES ($1,$2::uuid)
         ON CONFLICT DO NOTHING`,
        [fundRequest.id, reportId]
      );
    }

    await recordAuditLog({
      campaignId: null,
      actorId: params.adminId,
      action: 'HISAAB_FUND_REQUEST_CREATED',
      entityType: 'fund_request',
      entityId: fundRequest.id,
      metadata: { requested_amount: params.requestedAmount, department: params.department, reports: params.reportIds.length },
      client,
    });

    return { ...fundRequest, report_ids: params.reportIds };
  });
}

export async function listFundRequests(status?: string): Promise<FundRequest[]> {
  const res = await query<FundRequest & { admin_name: string; report_ids: string[] | null }>(
    `SELECT f.*, u.name AS admin_name,
            (SELECT ARRAY_AGG(r.report_id::text) FROM fund_request_reports r WHERE r.fund_request_id = f.id) AS report_ids
     FROM fund_requests f JOIN users u ON u.id = f.admin_id
     WHERE ($1::text IS NULL OR f.status = $1)
     ORDER BY f.created_at DESC
     LIMIT 200`,
    [status ?? null]
  );
  return res.rows.map((r) => ({ ...r, report_ids: r.report_ids ?? [], reports_count: r.report_ids?.length ?? 0 }));
}

export async function getFundRequestById(id: string): Promise<FundRequest | null> {
  const res = await query<FundRequest & { admin_name: string; report_ids: string[] | null }>(
    `SELECT f.*, u.name AS admin_name,
            (SELECT ARRAY_AGG(r.report_id::text) FROM fund_request_reports r WHERE r.fund_request_id = f.id) AS report_ids
     FROM fund_requests f JOIN users u ON u.id = f.admin_id
     WHERE f.id = $1::uuid`,
    [id]
  );
  if (!res.rows[0]) return null;
  return { ...res.rows[0], report_ids: res.rows[0].report_ids ?? [] };
}

export async function updateFundRequestStatus(params: {
  id: string;
  status: 'SUBMITTED' | 'APPROVED' | 'SANCTIONED' | 'REJECTED';
  sanctionedAmount?: number | null;
  govReferenceNo?: string | null;
  note?: string | null;
}): Promise<FundRequest> {
  return withTransaction(async (client) => {
    const cur = await client.query<FundRequest>(`SELECT * FROM fund_requests WHERE id = $1::uuid FOR UPDATE`, [params.id]);
    if (!cur.rows[0]) throw new NotFoundError('Fund request not found');
    const current = cur.rows[0];

    const allowed: Record<string, string[]> = {
      DRAFT: ['SUBMITTED', 'REJECTED'],
      SUBMITTED: ['APPROVED', 'REJECTED'],
      APPROVED: ['SANCTIONED', 'REJECTED'],
      SANCTIONED: [],
      REJECTED: [],
    };
    if (!allowed[current.status]?.includes(params.status)) {
      throw new AppError(`Cannot move fund request from ${current.status} to ${params.status}`, 400);
    }
    if (params.status === 'SANCTIONED' && !params.sanctionedAmount) {
      throw new AppError('sanctioned_amount is required to mark a fund request SANCTIONED', 400);
    }

    const res = await client.query<FundRequest>(
      `UPDATE fund_requests
       SET status = $2,
           sanctioned_amount = COALESCE($3, sanctioned_amount),
           gov_reference_no = COALESCE($4, gov_reference_no),
           note = COALESCE($5, note),
           updated_at = NOW()
       WHERE id = $1::uuid RETURNING *`,
      [params.id, params.status, params.sanctionedAmount ?? null, params.govReferenceNo ?? null, params.note ?? null]
    );

    await recordAuditLog({
      campaignId: null,
      actorId: null,
      action: 'HISAAB_FUND_REQUEST_STATUS',
      entityType: 'fund_request',
      entityId: params.id,
      metadata: { from: current.status, to: params.status, sanctioned_amount: params.sanctionedAmount ?? null },
      client,
    });

    return res.rows[0];
  });
}

// ---------------------------------------------------------------------------
// Contractor directory + assignments
// ---------------------------------------------------------------------------

export async function listContractors(opts: { status?: string } = {}) {
  const res = await query(
    `SELECT id, name, email, service_area, contractor_status, solana_pubkey, wallet_address, created_at
     FROM users
     WHERE role = 'CONTRACTOR' AND ($1::text IS NULL OR contractor_status = $1)
     ORDER BY created_at DESC
     LIMIT 200`,
    [opts.status ?? null]
  );
  return res.rows;
}

export async function setContractorStatus(contractorId: string, status: 'APPROVED' | 'SUSPENDED' | 'PENDING') {
  const res = await query(
    `UPDATE users SET contractor_status = $2, updated_at = NOW()
     WHERE id = $1::uuid AND role = 'CONTRACTOR' RETURNING id, contractor_status`,
    [contractorId, status]
  );
  if (!res.rows[0]) throw new NotFoundError('Contractor not found');
  return res.rows[0];
}

export async function createAssignment(params: {
  reportId: string;
  contractorId: string;
  assignedBy: string;
  note?: string | null;
}): Promise<ContractorAssignment> {
  return withTransaction(async (client) => {
    const reportRes = await client.query<{ status: string }>(
      `SELECT status FROM pothole_reports WHERE id = $1::uuid FOR UPDATE`,
      [params.reportId]
    );
    if (!reportRes.rows[0]) throw new NotFoundError('Report not found');

    const contractorRes = await client.query<{ id: string; contractor_status: string; role: string }>(
      `SELECT id, contractor_status, role FROM users WHERE id = $1::uuid FOR UPDATE`,
      [params.contractorId]
    );
    const contractor = contractorRes.rows[0];
    if (!contractor || contractor.role !== 'CONTRACTOR') throw new NotFoundError('Contractor not found');
    if (contractor.contractor_status !== 'APPROVED') {
      throw new AppError('Contractor is not approved yet', 400);
    }

    const existingEscrow = await client.query(`SELECT 1 FROM hisaab_escrows WHERE report_id = $1::uuid`, [params.reportId]);
    if (existingEscrow.rows[0]) {
      throw new AppError('Escrow already funded for this report', 409);
    }

    const res = await client.query<ContractorAssignment>(
      `INSERT INTO contractor_assignments (report_id, contractor_id, assigned_by, status, note)
       VALUES ($1::uuid, $2::uuid, $3::uuid, 'OFFERED', $4)
       ON CONFLICT (report_id, contractor_id) DO UPDATE
         SET status = 'OFFERED', assigned_by = $3::uuid, note = $4, offered_at = NOW(), responded_at = NULL
       RETURNING *`,
      [params.reportId, params.contractorId, params.assignedBy, params.note ?? null]
    );

    await recordAuditLog({
      campaignId: null,
      actorId: params.assignedBy,
      action: 'HISAAB_CONTRACTOR_ASSIGNED',
      entityType: 'contractor_assignment',
      entityId: res.rows[0].id,
      metadata: { report_id: params.reportId, contractor_id: params.contractorId },
      client,
    });

    return res.rows[0];
  });
}

export async function listAssignments(opts: { contractorId?: string; status?: string } = {}) {
  const res = await query<ContractorAssignment>(
    `SELECT a.*,
            c.name AS contractor_name, c.contractor_status, c.solana_pubkey AS contractor_pubkey,
            r.address_label AS report_address_label, r.status AS report_status,
            admin.name AS assigned_by_name,
            (SELECT e.id::text FROM hisaab_escrows e WHERE e.report_id = a.report_id LIMIT 1) AS escrow_id
     FROM contractor_assignments a
     JOIN users c ON c.id = a.contractor_id
     JOIN pothole_reports r ON r.id = a.report_id
     JOIN users admin ON admin.id = a.assigned_by
     WHERE ($1::uuid IS NULL OR a.contractor_id = $1::uuid)
       AND ($2::text IS NULL OR a.status = $2)
     ORDER BY a.offered_at DESC
     LIMIT 200`,
    [opts.contractorId ?? null, opts.status ?? null]
  );
  return res.rows;
}

export async function getAssignmentById(id: string): Promise<ContractorAssignment | null> {
  const res = await query<ContractorAssignment>(
    `SELECT a.*,
            c.name AS contractor_name, c.contractor_status, c.solana_pubkey AS contractor_pubkey,
            r.address_label AS report_address_label, r.status AS report_status,
            admin.name AS assigned_by_name
     FROM contractor_assignments a
     JOIN users c ON c.id = a.contractor_id
     JOIN pothole_reports r ON r.id = a.report_id
     JOIN users admin ON admin.id = a.assigned_by
     WHERE a.id = $1::uuid`,
    [id]
  );
  return res.rows[0] ?? null;
}

export async function respondToAssignment(
  id: string,
  contractorId: string,
  decision: 'ACCEPTED' | 'DECLINED'
): Promise<ContractorAssignment> {
  return withTransaction(async (client) => {
    const cur = await client.query<ContractorAssignment>(
      `SELECT * FROM contractor_assignments WHERE id = $1::uuid FOR UPDATE`,
      [id]
    );
    if (!cur.rows[0]) throw new NotFoundError('Assignment not found');
    if (cur.rows[0].contractor_id !== contractorId) {
      throw new AppError('This assignment belongs to another contractor', 403);
    }
    if (cur.rows[0].status !== 'OFFERED') {
      throw new AppError(`Assignment already ${cur.rows[0].status}`, 400);
    }
    const res = await client.query<ContractorAssignment>(
      `UPDATE contractor_assignments SET status = $2, responded_at = NOW()
       WHERE id = $1::uuid RETURNING *`,
      [id, decision]
    );
    await recordAuditLog({
      campaignId: null,
      actorId: contractorId,
      action: decision === 'ACCEPTED' ? 'HISAAB_ASSIGNMENT_ACCEPTED' : 'HISAAB_ASSIGNMENT_DECLINED',
      entityType: 'contractor_assignment',
      entityId: id,
      metadata: { report_id: cur.rows[0].report_id },
      client,
    });
    return res.rows[0];
  });
}

export async function getAcceptedAssignmentForReport(reportId: string, contractorId: string) {
  const res = await query(
    `SELECT id FROM contractor_assignments
     WHERE report_id = $1::uuid AND contractor_id = $2::uuid AND status = 'ACCEPTED'
     LIMIT 1`,
    [reportId, contractorId]
  );
  return res.rows[0] ?? null;
}
