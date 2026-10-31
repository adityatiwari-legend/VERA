import { query } from './db';

export interface AuditReportRow {
  donation: Record<string, unknown>;
  escrowLocks: Record<string, unknown>[];
  allocations: Record<string, unknown>[];
  releaseRequests: Record<string, unknown>[];
  evidenceDigests: Record<string, unknown>[];
  verificationOutcomes: Record<string, unknown>[];
  discrepancyRecords: Record<string, unknown>[];
  approvals: Record<string, unknown>[];
  executedReleases: Record<string, unknown>[];
  refunds: Record<string, unknown>[];
}

export async function getAuditReportRows(campaignId?: string): Promise<AuditReportRow[]> {
  const donations = await query<Record<string, any>>(
    `SELECT d.id, d.campaign_id, d.donor_id, d.amount::numeric as amount,
            d.purpose, d.status, d.reference, d.transaction_hash,
            d.blockchain_tx_hash, d.blockchain_status, d.created_at,
            c.title as campaign_title, c.beneficiary,
            donor.name as donor_name, donor.email as donor_email
     FROM donations d
     JOIN campaigns c ON d.campaign_id = c.id
     JOIN users donor ON d.donor_id = donor.id
     WHERE ($1::uuid IS NULL OR d.campaign_id = $1)
     ORDER BY d.created_at ASC`,
    [campaignId || null]
  );

  const rows: AuditReportRow[] = [];
  for (const donation of donations.rows) {
    const [locks, allocations, requests, evidence, verifications, discrepancies, releases, refunds] = await Promise.all([
      query<Record<string, any>>(
        `SELECT id, type, amount::numeric as amount, reference, transaction_hash,
                blockchain_tx_hash, blockchain_status, recipient_address, created_at
         FROM fund_transactions
         WHERE donation_id = $1 AND type = 'LOCK'
         ORDER BY created_at ASC`,
        [donation.id]
      ),
      query<Record<string, any>>(
        `SELECT id as milestone_id, campaign_id, title, sequence,
                amount::numeric as allocated_amount, status, released_amount::numeric as released_amount,
                blockchain_milestone_id, blockchain_status
         FROM milestones WHERE campaign_id = $1 ORDER BY sequence ASC`,
        [donation.campaign_id]
      ),
      query<Record<string, any>>(
        `SELECT rr.id, rr.milestone_id, m.title as milestone_title,
                rr.proof_id, rr.amount::numeric as amount,
                rr.requested_amount::numeric as requested_amount,
                rr.status, rr.required_approvals, rr.current_approvals,
                rr.blockchain_tx_hash, rr.blockchain_status, rr.created_at, rr.updated_at
         FROM release_requests rr
         JOIN milestones m ON rr.milestone_id = m.id
         WHERE rr.campaign_id = $1
         ORDER BY rr.created_at ASC`,
        [donation.campaign_id]
      ),
      query<Record<string, any>>(
        `SELECT p.id as proof_id, p.milestone_id, m.title as milestone_title,
                pf.id as proof_file_id, pf.file_name, pf.sha256_hash,
                pf.file_size, pf.mime_type, pf.uploaded_at
         FROM proofs p
         JOIN milestones m ON p.milestone_id = m.id
         JOIN proof_files pf ON pf.proof_id = p.id
         WHERE m.campaign_id = $1
         ORDER BY pf.uploaded_at ASC`,
        [donation.campaign_id]
      ),
      query<Record<string, any>>(
        `SELECT vr.id, vr.proof_id, vr.ai_status, vr.confidence,
                vr.extracted_amount::numeric as extracted_amount,
                vr.extracted_date, vr.extracted_vendor, vr.extracted_invoice_number,
                vr.duplicate_detected, vr.discrepancy_amount::numeric as discrepancy_amount,
                vr.notes, vr.created_at, vr.updated_at
         FROM verification_results vr
         JOIN proofs p ON vr.proof_id = p.id
         JOIN milestones m ON p.milestone_id = m.id
         WHERE m.campaign_id = $1
         ORDER BY vr.created_at ASC`,
        [donation.campaign_id]
      ),
      query<Record<string, any>>(
        `SELECT vr.id as verification_id, vr.proof_id,
                vr.discrepancy_amount::numeric as discrepancy_amount,
                vr.notes, vr.created_at
         FROM verification_results vr
         JOIN proofs p ON vr.proof_id = p.id
         JOIN milestones m ON p.milestone_id = m.id
         WHERE m.campaign_id = $1 AND vr.discrepancy_amount > 0
         ORDER BY vr.created_at ASC`,
        [donation.campaign_id]
      ),
      query<Record<string, any>>(
        `SELECT ft.id, ft.milestone_id, m.title as milestone_title,
                ft.amount::numeric as amount, ft.reference, ft.transaction_hash,
                ft.blockchain_tx_hash, ft.blockchain_status, ft.recipient_address, ft.created_at
         FROM fund_transactions ft
         LEFT JOIN milestones m ON ft.milestone_id = m.id
         WHERE ft.campaign_id = $1 AND ft.type = 'RELEASE'
         ORDER BY ft.created_at ASC`,
        [donation.campaign_id]
      ),
      query<Record<string, any>>(
        `SELECT ft.id, ft.milestone_id, m.title as milestone_title,
                ft.amount::numeric as amount, ft.reference, ft.transaction_hash,
                ft.blockchain_tx_hash, ft.blockchain_status, ft.recipient_address, ft.created_at
         FROM fund_transactions ft
         LEFT JOIN milestones m ON ft.milestone_id = m.id
         WHERE ft.campaign_id = $1 AND ft.type = 'REFUND'
         ORDER BY ft.created_at ASC`,
        [donation.campaign_id]
      ),
    ]);

    const requestRows = requests.rows;
    const approvals = await query<Record<string, any>>(
      `SELECT a.id, a.release_request_id, a.approver_id,
              COALESCE(a.approver_role, a.signer_role) as approver_role,
              a.approval_type, a.status, a.comment, a.blockchain_tx_hash,
              a.created_at, u.name as approver_name, u.email as approver_email,
              rr.required_approvals as threshold
       FROM multisig_approvals a
       JOIN release_requests rr ON rr.id = a.release_request_id
       JOIN users u ON u.id = COALESCE(a.approver_id, a.signer_id)
       WHERE rr.campaign_id = $1
       ORDER BY a.created_at ASC`,
      [donation.campaign_id]
    );

    rows.push({
      donation: {
        id: donation.id,
        campaignId: donation.campaign_id,
        campaignTitle: donation.campaign_title,
        beneficiary: donation.beneficiary,
        donorId: donation.donor_id,
        donorName: donation.donor_name,
        donorEmail: donation.donor_email,
        amount: Number(donation.amount),
        purpose: donation.purpose,
        status: donation.status,
        reference: donation.reference,
        transactionHash: donation.transaction_hash,
        blockchainTxHash: donation.blockchain_tx_hash,
        blockchainStatus: donation.blockchain_status,
        createdAt: donation.created_at,
      },
      escrowLocks: locks.rows,
      allocations: allocations.rows,
      releaseRequests: requestRows,
      evidenceDigests: evidence.rows,
      verificationOutcomes: verifications.rows,
      discrepancyRecords: discrepancies.rows,
      approvals: approvals.rows,
      executedReleases: releases.rows,
      refunds: refunds.rows,
    });
  }

  return rows;
}

function csvCell(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export function auditRowsToCsv(rows: AuditReportRow[]): string {
  const columns = [
    'donation',
    'escrow_locks',
    'allocations',
    'release_requests',
    'evidence_digests',
    'verification_outcomes',
    'discrepancy_records',
    'approvals',
    'executed_releases',
    'refunds',
  ] as const;
  const header = columns.join(',');
  const body = rows.map((row) => [
    row.donation,
    row.escrowLocks,
    row.allocations,
    row.releaseRequests,
    row.evidenceDigests,
    row.verificationOutcomes,
    row.discrepancyRecords,
    row.approvals,
    row.executedReleases,
    row.refunds,
  ].map(csvCell).join(','));
  return [header, ...body].join('\n');
}
