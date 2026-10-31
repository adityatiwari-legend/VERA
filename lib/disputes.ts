import { PoolClient } from 'pg';
import { query, withTransaction } from './db';
import { AppError, NotFoundError } from './permissions';
import { recordAuditLog } from './audit_log';

/**
 * Milestone disputes. An OPEN dispute blocks creating release requests and
 * APPROVED multisig signatures for that milestone until an AUDITOR/ADMIN
 * resolves it (REJECTED signatures stay allowed — that is how the mobile
 * dispute flow rejects an in-flight release request).
 */

export interface MilestoneDispute {
  id: string;
  milestone_id: string;
  raised_by: string;
  reason: string;
  status: 'OPEN' | 'RESOLVED';
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/** Throws 409 if the milestone has an OPEN dispute. Pass a tx client inside transactions. */
export async function assertNoOpenDispute(
  milestoneId: string,
  client?: PoolClient
): Promise<void> {
  const res = client
    ? await client.query(
        `SELECT id FROM milestone_disputes WHERE milestone_id = $1::uuid AND status = 'OPEN' LIMIT 1`,
        [milestoneId]
      )
    : await query(
        `SELECT id FROM milestone_disputes WHERE milestone_id = $1::uuid AND status = 'OPEN' LIMIT 1`,
        [milestoneId]
      );
  if (res.rowCount && res.rowCount > 0) {
    throw new AppError(
      'This milestone has an open dispute. Funds are frozen until an auditor or admin resolves it.',
      409
    );
  }
}

export async function raiseMilestoneDispute(
  userId: string,
  milestoneId: string,
  reason: string
): Promise<MilestoneDispute> {
  const msRes = await query<{ id: string; campaign_id: string; title: string }>(
    `SELECT id, campaign_id, title FROM milestones WHERE id = $1::uuid`,
    [milestoneId]
  );
  if (msRes.rowCount === 0) {
    throw new NotFoundError('Milestone not found');
  }
  const milestone = msRes.rows[0];

  return withTransaction(async (client) => {
    // Re-check inside the transaction so concurrent disputes hit the 409 here
    // instead of a raw unique-index violation.
    await assertNoOpenDispute(milestoneId, client);

    const insertRes = await client.query<MilestoneDispute>(
      `INSERT INTO milestone_disputes (milestone_id, raised_by, reason, status)
       VALUES ($1::uuid, $2::uuid, $3, 'OPEN')
       RETURNING *`,
      [milestoneId, userId, reason]
    );
    const dispute = insertRes.rows[0];

    await recordAuditLog({
      campaignId: milestone.campaign_id,
      actorId: userId,
      action: 'MILESTONE_DISPUTE_RAISED',
      entityType: 'MILESTONE_DISPUTE',
      entityId: dispute.id,
      metadata: {
        milestone_id: milestoneId,
        milestone_title: milestone.title,
        reason,
      },
      client,
    });

    return dispute;
  });
}

export async function resolveMilestoneDispute(
  userId: string,
  milestoneId: string,
  resolutionNotes: string
): Promise<MilestoneDispute> {
  return withTransaction(async (client) => {
    const openRes = await client.query<MilestoneDispute>(
      `SELECT * FROM milestone_disputes
       WHERE milestone_id = $1::uuid AND status = 'OPEN'
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [milestoneId]
    );
    if (openRes.rowCount === 0) {
      throw new NotFoundError('No open dispute for this milestone');
    }

    const updateRes = await client.query<MilestoneDispute>(
      `UPDATE milestone_disputes
       SET status = 'RESOLVED', resolution_notes = $2, resolved_by = $3::uuid, resolved_at = NOW(), updated_at = NOW()
       WHERE id = $1::uuid
       RETURNING *`,
      [openRes.rows[0].id, resolutionNotes, userId]
    );
    const dispute = updateRes.rows[0];

    const msRes = await client.query<{ campaign_id: string }>(
      `SELECT campaign_id FROM milestones WHERE id = $1::uuid`,
      [milestoneId]
    );

    await recordAuditLog({
      campaignId: msRes.rows[0]?.campaign_id ?? null,
      actorId: userId,
      action: 'MILESTONE_DISPUTE_RESOLVED',
      entityType: 'MILESTONE_DISPUTE',
      entityId: dispute.id,
      metadata: {
        milestone_id: milestoneId,
        resolution_notes: resolutionNotes,
      },
      client,
    });

    return dispute;
  });
}
