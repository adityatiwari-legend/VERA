import { query, withTransaction } from './db';
import { Milestone, MilestoneStatus, Campaign } from '../types';
import { CreateMilestoneInput, UpdateMilestoneInput } from './validation';
import { recordAuditLog } from './audit_log';
import { AppError, NotFoundError, ForbiddenError } from './permissions';

/**
 * Create a new milestone under a campaign
 * Enforces:
 * 1. NGO ownership of campaign
 * 2. Total milestone allocation cannot exceed campaign target_amount
 * 3. Unique sequence ordering
 */
import {
  isBlockchainConfigured,
  onChainCreateMilestone,
  idToBytes32,
} from './blockchain';
import { getReleaseRequestForMilestone } from './release_requests';

/**
 * Create a new milestone under a campaign
 * Enforces:
 * 1. NGO ownership of campaign
 * 2. Total milestone allocation cannot exceed campaign target_amount
 * 3. Unique sequence ordering
 * 4. Blockchain registration if configured
 */
export async function createMilestone(
  ngoId: string,
  campaignId: string,
  input: CreateMilestoneInput,
  isAdmin = false
): Promise<Milestone> {
  const milestone = await withTransaction(async (client) => {
    // 1. Lock campaign and check ownership
    const campRes = await client.query<Campaign>(
      `SELECT * FROM campaigns WHERE id = $1 FOR UPDATE`,
      [campaignId]
    );

    if (campRes.rowCount === 0) {
      throw new NotFoundError('Campaign not found');
    }

    const campaign = campRes.rows[0];

    if (campaign.ngo_id !== ngoId && !isAdmin) {
      throw new ForbiddenError('You can only create milestones for your own campaigns');
    }

    if (campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED') {
      throw new AppError(`Cannot add milestones to a ${campaign.status} campaign`, 400);
    }

    // 2. Check total allocated milestones against campaign target
    const aggRes = await client.query<{
      total_allocated: string;
      max_seq: number | null;
    }>(
      `SELECT 
         COALESCE(SUM(amount), 0)::text as total_allocated,
         MAX(sequence)::int as max_seq
       FROM milestones 
       WHERE campaign_id = $1`,
      [campaignId]
    );

    const currentAllocated = parseFloat(aggRes.rows[0].total_allocated || '0');
    const targetAmount = parseFloat(campaign.target_amount.toString());
    const newTotal = currentAllocated + input.amount;

    if (newTotal > targetAmount) {
      const remainingUnallocated = targetAmount - currentAllocated;
      throw new AppError(
        `Milestone amount (₹${input.amount.toLocaleString('en-IN')}) exceeds unallocated campaign goal (₹${remainingUnallocated.toLocaleString('en-IN')} remaining of ₹${targetAmount.toLocaleString('en-IN')} target)`,
        400
      );
    }

    const sequence = input.sequence ?? ((aggRes.rows[0].max_seq || 0) + 1);

    // 3. Insert Milestone
    const insertSql = `
      INSERT INTO milestones (
        campaign_id,
        title,
        description,
        amount,
        sequence,
        status,
        proof_required,
        blockchain_status
      )
      VALUES ($1, $2, $3, $4, $5, 'LOCKED', $6, 'PENDING')
      RETURNING *
    `;

    const msRes = await client.query<Milestone>(insertSql, [
      campaignId,
      input.title,
      input.description,
      input.amount,
      sequence,
      input.proof_required ?? true,
    ]);

    const createdMilestone = msRes.rows[0];

    // 4. Record Audit Log
    await recordAuditLog({
      campaignId,
      actorId: ngoId,
      action: 'MILESTONE_CREATED',
      entityType: 'MILESTONE',
      entityId: createdMilestone.id,
      metadata: {
        title: createdMilestone.title,
        amount: input.amount,
        sequence: createdMilestone.sequence,
        status: createdMilestone.status,
      },
      client,
    });

    return createdMilestone;
  });

  // 5. On-chain milestone creation if configured
  if (isBlockchainConfigured()) {
    try {
      const onChainRes = await onChainCreateMilestone({
        campaignId,
        milestoneId: milestone.id,
        amount: input.amount,
      });

      if (onChainRes.success) {
        const b32Id = idToBytes32(milestone.id);
        await query(
          `UPDATE milestones 
           SET blockchain_milestone_id = $1, blockchain_status = 'CONFIRMED', updated_at = NOW() 
           WHERE id = $2`,
          [b32Id, milestone.id]
        );
        milestone.blockchain_milestone_id = b32Id;
        milestone.blockchain_status = 'CONFIRMED';
      } else {
        await query(
          `UPDATE milestones SET blockchain_status = 'FAILED', updated_at = NOW() WHERE id = $1`,
          [milestone.id]
        );
        milestone.blockchain_status = 'FAILED';
      }
    } catch (bcErr) {
      console.error('[createMilestone] On-chain registration error:', bcErr);
      await query(
        `UPDATE milestones SET blockchain_status = 'FAILED', updated_at = NOW() WHERE id = $1`,
        [milestone.id]
      );
      milestone.blockchain_status = 'FAILED';
    }
  }

  return milestone;
}

/**
 * List all milestones for a campaign ordered by sequence
 */
export async function getMilestonesForCampaign(campaignId: string): Promise<Milestone[]> {
  const sql = `
    SELECT 
      id,
      campaign_id,
      title,
      description,
      amount::numeric as amount,
      sequence,
      status,
      proof_required,
      blockchain_milestone_id,
      blockchain_status,
      created_at,
      updated_at
    FROM milestones
    WHERE campaign_id = $1
    ORDER BY sequence ASC
  `;

  const res = await query<Milestone>(sql, [campaignId]);
  const milestones = res.rows;

  // Attach the live proof status so public pages can render real progress.
  const proofRes = await query<any>(
    `SELECT DISTINCT ON (p.milestone_id)
            p.milestone_id, p.id AS active_proof_id, p.status AS active_proof_status
     FROM proofs p
     WHERE p.milestone_id = ANY($1::uuid[])
     ORDER BY p.milestone_id, p.submitted_at DESC`,
    [milestones.map((m) => m.id)]
  );
  const proofByMs = new Map(proofRes.rows.map((r) => [r.milestone_id, r]));
  for (const ms of milestones) {
    const p = proofByMs.get(ms.id);
    if (p) {
      ms.active_proof_id = p.active_proof_id;
      ms.active_proof_status = p.active_proof_status;
    }
  }

  for (const ms of milestones) {
    try {
      ms.release_request = await getReleaseRequestForMilestone(ms.id);
    } catch {
      ms.release_request = null;
    }
  }

  return milestones;
}

/**
 * Get single milestone by ID with active release request
 */
export async function getMilestoneById(milestoneId: string): Promise<Milestone | null> {
  const sql = `
    SELECT 
      id,
      campaign_id,
      title,
      description,
      amount::numeric as amount,
      sequence,
      status,
      proof_required,
      blockchain_milestone_id,
      blockchain_status,
      created_at,
      updated_at
    FROM milestones
    WHERE id = $1
  `;

  const res = await query<Milestone>(sql, [milestoneId]);
  if (res.rowCount === 0) return null;
  const milestone = res.rows[0];

  try {
    milestone.release_request = await getReleaseRequestForMilestone(milestone.id);
  } catch {
    milestone.release_request = null;
  }

  return milestone;
}

/**
 * Update milestone details (only when in LOCKED status)
 */
export async function updateMilestone(
  ngoId: string,
  milestoneId: string,
  updates: UpdateMilestoneInput,
  isAdmin = false
): Promise<Milestone> {
  return withTransaction(async (client) => {
    const msRes = await client.query<Milestone & { ngo_id: string; target_amount: string }>(
      `SELECT m.*, c.ngo_id, c.target_amount::text as target_amount
       FROM milestones m
       JOIN campaigns c ON m.campaign_id = c.id
       WHERE m.id = $1
       FOR UPDATE`,
      [milestoneId]
    );

    if (msRes.rowCount === 0) {
      throw new NotFoundError('Milestone not found');
    }

    const existing = msRes.rows[0];

    if (existing.ngo_id !== ngoId && !isAdmin) {
      throw new ForbiddenError('You can only edit milestones for your own campaigns');
    }

    if (existing.status !== 'LOCKED') {
      throw new AppError('Only LOCKED milestones can be edited', 400);
    }

    // Check budget cap if amount is changing
    if (updates.amount !== undefined && updates.amount !== Number(existing.amount)) {
      const sumRes = await client.query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0)::text as total 
         FROM milestones 
         WHERE campaign_id = $1 AND id != $2`,
        [existing.campaign_id, milestoneId]
      );
      const otherTotal = parseFloat(sumRes.rows[0].total);
      const target = parseFloat(existing.target_amount);

      if (otherTotal + updates.amount > target) {
        throw new AppError(
          `Updated amount exceeds remaining campaign target (max allowed: ₹${(target - otherTotal).toLocaleString('en-IN')})`,
          400
        );
      }
    }

    const title = updates.title ?? existing.title;
    const description = updates.description ?? existing.description;
    const amount = updates.amount ?? existing.amount;
    const sequence = updates.sequence ?? existing.sequence;
    const proof_required = updates.proof_required ?? existing.proof_required;

    const updateSql = `
      UPDATE milestones
      SET 
        title = $1,
        description = $2,
        amount = $3,
        sequence = $4,
        proof_required = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;

    const updatedRes = await client.query<Milestone>(updateSql, [
      title,
      description,
      amount,
      sequence,
      proof_required,
      milestoneId,
    ]);

    const updated = updatedRes.rows[0];

    await recordAuditLog({
      campaignId: existing.campaign_id,
      actorId: ngoId,
      action: 'MILESTONE_UPDATED',
      entityType: 'MILESTONE',
      entityId: milestoneId,
      metadata: {
        previous: {
          title: existing.title,
          amount: existing.amount,
        },
        current: {
          title: updated.title,
          amount: updated.amount,
        },
      },
      client,
    });

    return updated;
  });
}

/**
 * Transition milestone status (Phase 2 allows moving LOCKED to IN_PROGRESS)
 */
export async function updateMilestoneStatus(
  ngoId: string,
  milestoneId: string,
  newStatus: MilestoneStatus,
  isAdmin = false
): Promise<Milestone> {
  return withTransaction(async (client) => {
    const msRes = await client.query<Milestone & { ngo_id: string }>(
      `SELECT m.*, c.ngo_id
       FROM milestones m
       JOIN campaigns c ON m.campaign_id = c.id
       WHERE m.id = $1
       FOR UPDATE`,
      [milestoneId]
    );

    if (msRes.rowCount === 0) {
      throw new NotFoundError('Milestone not found');
    }

    const existing = msRes.rows[0];

    if (existing.ngo_id !== ngoId && !isAdmin) {
      throw new ForbiddenError('You can only modify milestones for your own campaigns');
    }

    if (existing.status === newStatus) {
      return existing;
    }

    // Valid transitions for NGO direct status update:
    // LOCKED -> IN_PROGRESS (commence milestone execution)
    // Note: PROOF_SUBMITTED, APPROVED, and REJECTED are handled via proof submission and auditor review
    if (existing.status === 'LOCKED' && newStatus === 'IN_PROGRESS') {
      // Valid transition
    } else {
      throw new AppError(
        `Invalid status transition: milestone cannot directly transition from ${existing.status} to ${newStatus}. Proof submission or auditor review must be used for verification lifecycle states.`,
        400
      );
    }

    const updateSql = `
      UPDATE milestones
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const updatedRes = await client.query<Milestone>(updateSql, [newStatus, milestoneId]);
    const updated = updatedRes.rows[0];

    await recordAuditLog({
      campaignId: existing.campaign_id,
      actorId: ngoId,
      action: 'MILESTONE_STATUS_CHANGED',
      entityType: 'MILESTONE',
      entityId: milestoneId,
      metadata: {
        previous_status: existing.status,
        new_status: newStatus,
      },
      client,
    });

    return updated;
  });
}
