import { query, withTransaction } from './db';
import { Campaign, CampaignStatus } from '../types';
import { CreateCampaignInput, UpdateCampaignInput } from './validation';
import { recordAuditLog } from './audit_log';
import { ForbiddenError, NotFoundError, AppError } from './permissions';

/**
 * Valid state transitions for campaigns
 */
const VALID_STATUS_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['PAUSED', 'COMPLETED', 'CANCELLED'],
  PAUSED: ['ACTIVE', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

import {
  isBlockchainConfigured,
  onChainCreateCampaign,
  idToBytes32,
  getExplorerTxUrl,
  getNetworkName,
} from './blockchain';
import { getCampaignFinancialSummary } from './fund_transactions';

/**
 * Register a campaign on-chain if not already registered (supports retries)
 */
export async function registerCampaignOnChain(campaignId: string): Promise<{
  success: boolean;
  txHash?: string;
  blockchainCampaignId?: string;
  error?: string;
}> {
  if (!isBlockchainConfigured()) {
    return { success: false, error: 'Blockchain is not configured' };
  }

  const campRes = await query<Campaign & {
    ngo_wallet_address: string | null;
    auditor_wallet_address: string | null;
  }>(
    `SELECT c.*,
            ngo.wallet_address as ngo_wallet_address,
            auditor.wallet_address as auditor_wallet_address
     FROM campaigns c
     JOIN users ngo ON ngo.id = c.ngo_id
     LEFT JOIN LATERAL (
       SELECT wallet_address
       FROM users
       WHERE role = 'AUDITOR' AND wallet_address IS NOT NULL
       ORDER BY created_at ASC
       LIMIT 1
     ) auditor ON TRUE
     WHERE c.id = $1`,
    [campaignId]
  );
  if (campRes.rowCount === 0) return { success: false, error: 'Campaign not found' };
  const campaign = campRes.rows[0];

  if (!campaign.ngo_wallet_address || !campaign.auditor_wallet_address) {
    const error = 'Campaign NGO and auditor wallets are required for on-chain signer registration';
    console.warn(`[registerCampaignOnChain] ${error}`);
    await query(
      `UPDATE campaigns SET blockchain_status = 'FAILED', updated_at = NOW() WHERE id = $1`,
      [campaign.id]
    );
    return { success: false, error };
  }

  const onChainRes = await onChainCreateCampaign({
    campaignId: campaign.id,
    targetAmount: Number(campaign.target_amount),
    ownerAddress: campaign.ngo_wallet_address,
    ngoAdminAddress: campaign.ngo_wallet_address,
    campaignOwnerAddress: campaign.ngo_wallet_address,
    auditorAddress: campaign.auditor_wallet_address,
  });

  const b32Id = idToBytes32(campaign.id);
  const network = process.env.BLOCKCHAIN_NETWORK || 'Hardhat Local / Sepolia Testnet';
  const contractAddr = process.env.CONTRACT_ADDRESS || null;

  if (onChainRes.success) {
    await query(
      `UPDATE campaigns 
       SET blockchain_campaign_id = $1, 
           blockchain_network = $2, 
           blockchain_contract_address = $3, 
           blockchain_status = 'CONFIRMED', 
           updated_at = NOW() 
       WHERE id = $4`,
      [b32Id, network, contractAddr, campaign.id]
    );
    return { success: true, txHash: onChainRes.txHash, blockchainCampaignId: b32Id };
  } else {
    await query(
      `UPDATE campaigns SET blockchain_status = 'FAILED', updated_at = NOW() WHERE id = $1`,
      [campaign.id]
    );
    return { success: false, error: onChainRes.error };
  }
}

/**
 * Create a new campaign under the authenticated NGO
 */
export async function createCampaign(
  ngoId: string,
  input: CreateCampaignInput,
  orgStatus?: string | null
): Promise<Campaign> {
  if (orgStatus && orgStatus !== 'VERIFIED') {
    throw new ForbiddenError(
      'Your organization must be verified by the platform before creating campaigns'
    );
  }
  const campaign = await withTransaction(async (client) => {
    const insertSql = `
      INSERT INTO campaigns (
        ngo_id,
        title,
        description,
        target_amount,
        raised_amount,
        released_amount,
        beneficiary,
        status,
        blockchain_status
      )
      VALUES ($1, $2, $3, $4, 0.00, 0.00, $5, $6, 'PENDING')
      RETURNING *
    `;

    const initialStatus = input.status || 'DRAFT';
    const res = await client.query<Campaign>(insertSql, [
      ngoId,
      input.title,
      input.description,
      input.target_amount,
      input.beneficiary,
      initialStatus,
    ]);

    const camp = res.rows[0];

    // Record audit log
    await recordAuditLog({
      campaignId: camp.id,
      actorId: ngoId,
      action: 'CREATE_CAMPAIGN',
      entityType: 'CAMPAIGN',
      entityId: camp.id,
      metadata: {
        title: camp.title,
        target_amount: camp.target_amount,
        beneficiary: camp.beneficiary,
        status: camp.status,
      },
      client,
    });

    return camp;
  });

  // Attempt on-chain creation if configured
  if (isBlockchainConfigured()) {
    try {
      await registerCampaignOnChain(campaign.id);
      const refreshed = await getCampaignById(campaign.id);
      if (refreshed) return refreshed;
    } catch (bcErr) {
      console.error('[createCampaign] On-chain registration failed:', bcErr);
    }
  }

  return campaign;
}

/**
 * List all campaigns belonging to a specific NGO
 */
export async function getCampaignsForNgo(ngoId: string): Promise<Campaign[]> {
  const sql = `
    SELECT 
      id,
      ngo_id,
      title,
      description,
      target_amount::numeric as target_amount,
      raised_amount::numeric as raised_amount,
      released_amount::numeric as released_amount,
      beneficiary,
      status,
      blockchain_campaign_id,
      blockchain_network,
      blockchain_contract_address,
      blockchain_status,
      created_at,
      updated_at
    FROM campaigns
    WHERE ngo_id = $1
    ORDER BY created_at DESC
  `;

  const res = await query<Campaign>(sql, [ngoId]);
  return res.rows;
}

/**
 * Get single campaign by ID with NGO details
 */
export async function getCampaignById(id: string): Promise<Campaign | null> {
  const sql = `
    SELECT 
      c.id,
      c.ngo_id,
      c.title,
      c.description,
      c.target_amount::numeric as target_amount,
      c.raised_amount::numeric as raised_amount,
      c.released_amount::numeric as released_amount,
      c.beneficiary,
      c.status,
      c.blockchain_campaign_id,
      c.blockchain_network,
      c.blockchain_contract_address,
      c.blockchain_status,
      c.created_at,
      c.updated_at,
      u.name as ngo_name,
      u.email as ngo_email
    FROM campaigns c
    JOIN users u ON c.ngo_id = u.id
    WHERE c.id = $1
  `;

  const res = await query<Campaign>(sql, [id]);
  return res.rows[0] || null;
}

/**
 * Update an existing campaign's mutable details
 */
export async function updateCampaign(
  campaignId: string,
  ngoId: string,
  updates: UpdateCampaignInput,
  isAdmin = false
): Promise<Campaign> {
  return withTransaction(async (client) => {
    // 1. Lock and check existing record
    const existingRes = await client.query<Campaign>(
      `SELECT * FROM campaigns WHERE id = $1 FOR UPDATE`,
      [campaignId]
    );

    if (existingRes.rowCount === 0) {
      throw new NotFoundError('Campaign not found');
    }

    const existing = existingRes.rows[0];

    // Enforce ownership (ADMIN manages any campaign)
    if (existing.ngo_id !== ngoId && !isAdmin) {
      throw new ForbiddenError('You do not have permission to modify this campaign');
    }

    // Disallow updates on completed or cancelled campaigns
    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw new AppError(`Cannot modify a campaign in '${existing.status}' status`, 400);
    }

    const title = updates.title ?? existing.title;
    const description = updates.description ?? existing.description;
    const target_amount = updates.target_amount ?? existing.target_amount;
    const beneficiary = updates.beneficiary ?? existing.beneficiary;

    const updateSql = `
      UPDATE campaigns
      SET 
        title = $1,
        description = $2,
        target_amount = $3,
        beneficiary = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;

    const updatedRes = await client.query<Campaign>(updateSql, [
      title,
      description,
      target_amount,
      beneficiary,
      campaignId,
    ]);

    const updated = updatedRes.rows[0];

    // Record audit log
    await recordAuditLog({
      campaignId,
      actorId: ngoId,
      action: 'UPDATE_CAMPAIGN',
      entityType: 'CAMPAIGN',
      entityId: campaignId,
      metadata: {
        previous: {
          title: existing.title,
          target_amount: existing.target_amount,
          beneficiary: existing.beneficiary,
        },
        current: {
          title: updated.title,
          target_amount: updated.target_amount,
          beneficiary: updated.beneficiary,
        },
      },
      client,
    });

    return updated;
  });
}

/**
 * Change campaign status with strict transition rules
 */
export async function updateCampaignStatus(
  campaignId: string,
  ngoId: string,
  newStatus: CampaignStatus,
  isAdmin = false
): Promise<Campaign> {
  return withTransaction(async (client) => {
    const existingRes = await client.query<Campaign>(
      `SELECT * FROM campaigns WHERE id = $1 FOR UPDATE`,
      [campaignId]
    );

    if (existingRes.rowCount === 0) {
      throw new NotFoundError('Campaign not found');
    }

    const existing = existingRes.rows[0];

    if (existing.ngo_id !== ngoId && !isAdmin) {
      throw new ForbiddenError('You do not have permission to modify this campaign');
    }

    if (existing.status === newStatus) {
      return existing;
    }

    const allowedNext = VALID_STATUS_TRANSITIONS[existing.status] || [];
    if (!allowedNext.includes(newStatus)) {
      throw new AppError(
        `Invalid status transition: Cannot change status from '${existing.status}' to '${newStatus}'`,
        400
      );
    }

    const updateSql = `
      UPDATE campaigns
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const updatedRes = await client.query<Campaign>(updateSql, [newStatus, campaignId]);
    const updated = updatedRes.rows[0];

    // Record audit log
    await recordAuditLog({
      campaignId,
      actorId: ngoId,
      action: 'CHANGE_CAMPAIGN_STATUS',
      entityType: 'CAMPAIGN',
      entityId: campaignId,
      metadata: {
        previous_status: existing.status,
        new_status: newStatus,
      },
      client,
    });

    return updated;
  });
}

/**
 * Soft delete / cancel a campaign
 */
export async function cancelCampaign(campaignId: string, ngoId: string): Promise<Campaign> {
  return updateCampaignStatus(campaignId, ngoId, 'CANCELLED');
}

/**
 * Get aggregate campaign stats for an NGO dashboard
 */
export async function getNgoCampaignStats(ngoId: string) {
  const sql = `
    SELECT 
      COUNT(*)::int as total_campaigns,
      COUNT(*) FILTER (WHERE status = 'ACTIVE')::int as active_campaigns,
      COUNT(*) FILTER (WHERE status = 'DRAFT')::int as draft_campaigns,
      COUNT(*) FILTER (WHERE status = 'COMPLETED')::int as completed_campaigns,
      COALESCE(SUM(target_amount), 0)::numeric as total_target_amount
    FROM campaigns
    WHERE ngo_id = $1
  `;

  const res = await query<{
    total_campaigns: number;
    active_campaigns: number;
    draft_campaigns: number;
    completed_campaigns: number;
    total_target_amount: number;
  }>(sql, [ngoId]);

  return res.rows[0];
}

export interface CampaignAuditMilestone {
  id: string;
  sequence: number;
  title: string;
  description: string;
  allocatedAmount: number;
  releasedAmount: number;
  status: string;
  proofStatus: string;
  proofCount: number;
  verificationStatus: string;
  claimedAmount?: number;
  detectedAmount?: number;
  discrepancyAmount?: number;
  approvalStatus: string;
  releaseStatus: string;
  blockchainTxHash?: string;
  blockchainStatus?: string;
}

export interface CampaignAuditDetails {
  campaign: Campaign & { ngo_name: string };
  ngo: { id: string; name: string };
  financialSummary: {
    targetAmount: number;
    raisedAmount: number;
    lockedAmount: number;
    releasedAmount: number;
    refundedAmount: number;
    remainingAmount: number;
    remainingBalance: number;
    progressPercent: number;
    milestonesTotal: number;
    milestonesCount: number;
    donorsCount: number;
    donationsCount: number;
  };
  milestones: CampaignAuditMilestone[];
  blockchain: {
    contractAddress: string | null;
    network: string;
    chainId: number | string;
    campaignOnChainId?: string | null;
    transactions: Array<{
      type: string;
      label: string;
      txHash: string;
      explorerUrl: string;
      amount?: number;
      timestamp: string;
    }>;
  };
  trustIndicators: {
    fundsEarmarked: boolean;
    milestonesDefined: boolean;
    proofSubmitted: boolean;
    evidenceVerified: boolean;
    blockchainRecorded: boolean;
    multisigEnabled: boolean;
    score: number;
  };
}

/**
 * Get comprehensive public audit details for a campaign without exposing private files or credentials
 */
export async function getCampaignAuditDetails(
  campaignId: string
): Promise<CampaignAuditDetails | null> {
  const campSql = `
    SELECT c.*, u.name as ngo_name, u.id as ngo_id
    FROM campaigns c
    JOIN users u ON c.ngo_id = u.id
    WHERE c.id = $1
  `;
  const campRes = await query<Campaign & { ngo_name: string; ngo_id: string }>(campSql, [campaignId]);
  if (campRes.rowCount === 0) return null;
  const campaign = campRes.rows[0];

  const financialSummary = await getCampaignFinancialSummary(campaignId);
  if (!financialSummary) return null;

  // Query milestones with proof and verification summary
  const msSql = `
    SELECT 
      m.id,
      m.sequence,
      m.title,
      m.description,
      m.amount::numeric as allocated_amount,
      COALESCE(m.released_amount, 0)::numeric as released_amount,
      m.status,
      m.blockchain_status,
      p.id as proof_id,
      COALESCE(p.status, 'AWAITING_PROOF') as proof_status,
      p.claimed_amount::numeric as claimed_amount,
      COUNT(pf.id)::int as proof_files_count,
      COALESCE(v.ai_status, 'NOT_VERIFIED') as verification_status,
      v.extracted_amount::numeric as detected_amount,
      COALESCE(v.discrepancy_amount, 0)::numeric as discrepancy_amount,
      COALESCE(rr.status, 'AWAITING_REQUEST') as release_status,
      rr.blockchain_tx_hash as release_tx_hash
    FROM milestones m
    LEFT JOIN LATERAL (
      SELECT id, status, claimed_amount 
      FROM proofs 
      WHERE milestone_id = m.id 
      ORDER BY submitted_at DESC 
      LIMIT 1
    ) p ON true
    LEFT JOIN proof_files pf ON p.id = pf.proof_id
    LEFT JOIN verification_results v ON p.id = v.proof_id
    LEFT JOIN LATERAL (
      SELECT status, blockchain_tx_hash 
      FROM release_requests 
      WHERE milestone_id = m.id 
      ORDER BY created_at DESC 
      LIMIT 1
    ) rr ON true
    WHERE m.campaign_id = $1
    GROUP BY m.id, p.id, p.status, p.claimed_amount, v.ai_status, v.extracted_amount, v.discrepancy_amount, rr.status, rr.blockchain_tx_hash
    ORDER BY m.sequence ASC
  `;
  const msRes = await query<any>(msSql, [campaignId]);

  const milestones: CampaignAuditMilestone[] = msRes.rows.map((row) => ({
    id: row.id,
    sequence: row.sequence,
    title: row.title,
    description: row.description,
    allocatedAmount: Number(row.allocated_amount),
    releasedAmount: Number(row.released_amount),
    status: row.status,
    proofStatus: row.proof_status,
    proofCount: row.proof_files_count || 0,
    verificationStatus: row.verification_status,
    claimedAmount: row.claimed_amount ? Number(row.claimed_amount) : undefined,
    detectedAmount: row.detected_amount ? Number(row.detected_amount) : undefined,
    discrepancyAmount: row.discrepancy_amount ? Number(row.discrepancy_amount) : 0,
    approvalStatus: row.status === 'APPROVED' || row.status === 'RELEASED' ? 'APPROVED' : row.status === 'REJECTED' ? 'REJECTED' : 'PENDING',
    releaseStatus: row.release_status,
    blockchainTxHash: row.release_tx_hash,
    blockchainStatus: row.blockchain_status,
  }));

  // Fetch verified on-chain transactions
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || 31337;
  const txSql = `
    SELECT 
      type, 
      reference, 
      amount::numeric as amount, 
      COALESCE(blockchain_tx_hash, transaction_hash) as tx_hash, 
      created_at 
    FROM fund_transactions 
    WHERE campaign_id = $1 AND (blockchain_tx_hash IS NOT NULL OR transaction_hash IS NOT NULL)
    ORDER BY created_at ASC
  `;
  const txRes = await query<any>(txSql, [campaignId]);

  const transactions = txRes.rows
    .filter((r) => Boolean(r.tx_hash))
    .map((r) => ({
      type: r.type,
      label: r.type === 'DONATION' ? 'Donation Confirmed' : r.type === 'RELEASE' ? 'Fund Release' : r.type === 'REFUND' ? 'Donor Refund' : 'Escrow Action',
      txHash: r.tx_hash,
      explorerUrl: getExplorerTxUrl(chainId, r.tx_hash),
      amount: Number(r.amount),
      timestamp: r.created_at,
    }));

  // Trust Indicators
  const fundsEarmarked = financialSummary.raisedAmount > 0;
  const milestonesDefined = milestones.length > 0;
  const proofSubmitted = milestones.some((m) => m.proofStatus !== 'AWAITING_PROOF');
  const evidenceVerified = milestones.some((m) => m.approvalStatus === 'APPROVED');
  const blockchainRecorded = transactions.length > 0 || Boolean(campaign.blockchain_campaign_id);
  const multisigEnabled = true;

  const trustScore = [
    fundsEarmarked,
    milestonesDefined,
    proofSubmitted,
    evidenceVerified,
    blockchainRecorded,
    multisigEnabled,
  ].filter(Boolean).length;

  return {
    campaign,
    ngo: { id: campaign.ngo_id, name: campaign.ngo_name },
    financialSummary,
    milestones,
    blockchain: {
      contractAddress: process.env.CONTRACT_ADDRESS || null,
      network: getNetworkName(chainId),
      chainId,
      campaignOnChainId: campaign.blockchain_campaign_id,
      transactions,
    },
    trustIndicators: {
      fundsEarmarked,
      milestonesDefined,
      proofSubmitted,
      evidenceVerified,
      blockchainRecorded,
      multisigEnabled,
      score: trustScore,
    },
  };
}
