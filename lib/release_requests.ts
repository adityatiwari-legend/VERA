import { query, withTransaction } from './db';
import {
  ReleaseRequest,
  MultisigApproval,
  ReleaseRequestStatus,
  BlockchainStatus,
  Campaign,
  Milestone,
  FundTransaction
} from '@/types';
import { recordAuditLog } from './audit_log';
import { AppError, NotFoundError, ForbiddenError } from './permissions';
import {
  onChainRequestRelease,
  onChainApproveRelease,
  onChainReleaseFunds,
  isBlockchainConfigured
} from './blockchain';

/**
 * Initiate a release request for an approved milestone
 */
export async function createReleaseRequest(
  userId: string,
  input: {
    milestoneId: string;
    amount?: number;
    notes?: string;
  }
): Promise<ReleaseRequest> {
  return withTransaction(async (client) => {
    // 1. Fetch milestone and campaign details
    const msRes = await client.query<Milestone & {
      campaign_ngo_id: string;
      campaign_status: string;
      campaign_raised: string;
      campaign_released: string;
      campaign_title: string;
    }>(
      `SELECT 
         m.*,
         c.ngo_id as campaign_ngo_id,
         c.status as campaign_status,
         c.raised_amount::text as campaign_raised,
         c.released_amount::text as campaign_released,
         c.title as campaign_title
       FROM milestones m
       JOIN campaigns c ON m.campaign_id = c.id
       WHERE m.id = $1
       FOR UPDATE`,
      [input.milestoneId]
    );

    if (msRes.rowCount === 0) {
      throw new NotFoundError('Milestone not found');
    }

    const milestone = msRes.rows[0];

    // Check permissions: NGO owner or platform ADMIN
    const userRes = await client.query(`SELECT id, role, name FROM users WHERE id = $1`, [userId]);
    if (userRes.rowCount === 0) {
      throw new NotFoundError('User not found');
    }
    const user = userRes.rows[0];

    if (user.role !== 'ADMIN' && milestone.campaign_ngo_id !== userId) {
      throw new ForbiddenError('Only the campaign NGO or platform admin can request fund releases.');
    }

    if (milestone.status === 'RELEASED') {
      throw new AppError('Milestone has already been released.', 400);
    }

    if (milestone.status !== 'APPROVED') {
      throw new AppError(
        `Cannot request release for milestone in "${milestone.status}" status. Milestone proof must be approved first.`,
        400
      );
    }

    // Check if an active release request already exists
    const existingReq = await client.query<ReleaseRequest>(
      `SELECT * FROM release_requests 
       WHERE milestone_id = $1 AND status IN ('AWAITING_MULTISIG', 'READY_TO_RELEASE', 'RELEASED')`,
      [input.milestoneId]
    );

    if (existingReq.rowCount! > 0) {
      const existing = existingReq.rows[0];
      if (existing.status === 'RELEASED') {
        throw new AppError('Funds have already been released for this milestone.', 400);
      }
      return existing;
    }

    const reqAmount = input.amount !== undefined ? input.amount : Number(milestone.amount);
    if (reqAmount <= 0) {
      throw new AppError('Requested release amount must be greater than 0.', 400);
    }

    if (reqAmount > Number(milestone.amount)) {
      throw new AppError(
        `Requested release amount (₹${reqAmount}) exceeds milestone allocation (₹${milestone.amount}).`,
        400
      );
    }

    const availableCampaignFunds = Number(milestone.campaign_raised) - Number(milestone.campaign_released);
    if (reqAmount > availableCampaignFunds) {
      throw new AppError(
        `Requested amount (₹${reqAmount}) exceeds available campaign balance (₹${availableCampaignFunds}).`,
        400
      );
    }

    // Find active approved proof
    const proofRes = await client.query<{ id: string }>(
      `SELECT id FROM proofs WHERE milestone_id = $1 AND status = 'APPROVED' ORDER BY submitted_at DESC LIMIT 1`,
      [input.milestoneId]
    );
    const proofId = proofRes.rows[0]?.id || null;

    // Insert release request record
    const insertRes = await client.query<ReleaseRequest>(
      `INSERT INTO release_requests (
         campaign_id,
         milestone_id,
         proof_id,
         amount,
         requested_amount,
         requested_by,
         status,
         required_approvals,
         current_approvals,
         blockchain_status,
         notes
       )
       VALUES ($1, $2, $3, $4, $4, $5, 'AWAITING_MULTISIG', 2, 0, 'PENDING', $6)
       RETURNING *`,
      [
        milestone.campaign_id,
        milestone.id,
        proofId,
        reqAmount,
        userId,
        input.notes || `Release request initiated for ${milestone.title}`
      ]
    );

    const releaseRequest = insertRes.rows[0];

    // Update milestone state
    await client.query(
      `UPDATE milestones SET status = 'UNDER_REVIEW', updated_at = NOW() WHERE id = $1`,
      [input.milestoneId]
    );

    // Record audit log
    await recordAuditLog({
      campaignId: milestone.campaign_id,
      actorId: userId,
      action: 'RELEASE_REQUEST_CREATED',
      entityType: 'RELEASE_REQUEST',
      entityId: releaseRequest.id,
      metadata: {
        milestone_id: milestone.id,
        milestone_title: milestone.title,
        requested_amount: reqAmount,
        required_approvals: 2
      },
      client
    });

    // Execute on-chain requestRelease if blockchain configured
    if (isBlockchainConfigured()) {
      try {
        const onChainRes = await onChainRequestRelease({
          campaignId: milestone.campaign_id,
          milestoneId: milestone.id,
          amount: reqAmount
        });

        if (onChainRes.success) {
          await client.query(
            `UPDATE release_requests 
             SET blockchain_status = 'CONFIRMED', blockchain_tx_hash = $1, updated_at = NOW() 
             WHERE id = $2`,
            [onChainRes.txHash, releaseRequest.id]
          );
          releaseRequest.blockchain_status = 'CONFIRMED';
          releaseRequest.blockchain_tx_hash = onChainRes.txHash || null;
        } else {
          await client.query(
            `UPDATE release_requests 
             SET blockchain_status = 'FAILED', updated_at = NOW() 
             WHERE id = $1`,
            [releaseRequest.id]
          );
          releaseRequest.blockchain_status = 'FAILED';
        }
      } catch (bcErr: any) {
        console.error('[createReleaseRequest] Blockchain request error:', bcErr.message);
        await client.query(
          `UPDATE release_requests SET blockchain_status = 'FAILED', updated_at = NOW() WHERE id = $1`,
          [releaseRequest.id]
        );
        releaseRequest.blockchain_status = 'FAILED';
      }
    }

    return releaseRequest;
  });
}

/**
 * Submit a 2-of-3 multisig approval signature
 */
export async function signReleaseRequest(
  userId: string,
  releaseRequestId: string,
  input?: {
    comment?: string;
    status?: 'APPROVED' | 'REJECTED';
  }
): Promise<{ releaseRequest: ReleaseRequest; approval: MultisigApproval }> {
  return withTransaction(async (client) => {
    // 1. Lock release request
    const reqRes = await client.query<ReleaseRequest & {
      campaign_ngo_id: string;
      campaign_title: string;
      milestone_title: string;
    }>(
      `SELECT 
         r.*,
         c.ngo_id as campaign_ngo_id,
         c.title as campaign_title,
         m.title as milestone_title
       FROM release_requests r
       JOIN campaigns c ON r.campaign_id = c.id
       JOIN milestones m ON r.milestone_id = m.id
       WHERE r.id = $1
       FOR UPDATE`,
      [releaseRequestId]
    );

    if (reqRes.rowCount === 0) {
      throw new NotFoundError('Release request not found');
    }

    const relReq = reqRes.rows[0];

    if (relReq.status === 'RELEASED') {
      throw new AppError('Funds have already been released for this request.', 400);
    }

    if (relReq.status === 'REJECTED' || relReq.status === 'FAILED') {
      throw new AppError(`Cannot sign a ${relReq.status} release request.`, 400);
    }

    // 2. Lookup signer identity and role
    const userRes = await client.query<{
      id: string;
      role: string;
      name: string;
      wallet_address: string | null;
    }>(
      `SELECT id, role, name, wallet_address FROM users WHERE id = $1`,
      [userId]
    );

    if (userRes.rowCount === 0) {
      throw new NotFoundError('User not found');
    }

    const user = userRes.rows[0];

    // Verify authorized multisig role: NGO Admin, Campaign Owner, Certified Auditor, or Platform Admin
    let approverRole = user.role;
    if (user.role === 'USER') {
      throw new ForbiddenError('Donors cannot sign release requests. Only authorized multisig signers can sign.');
    }

    if (user.role === 'ORGANIZATION' && user.id !== relReq.campaign_ngo_id) {
      throw new ForbiddenError('Only the assigned NGO or campaign owner can sign as NGO signer.');
    }

    // 3. Enforce Rule: One signer cannot approve twice
    const existingApproval = await client.query(
      `SELECT id FROM multisig_approvals WHERE release_request_id = $1 AND approver_id = $2`,
      [releaseRequestId, userId]
    );

    if (existingApproval.rowCount! > 0) {
      throw new AppError('You have already submitted a signature for this release request.', 400);
    }

    const approvalStatus = input?.status || 'APPROVED';
    let txHash: string | null = null;

    // 4. If approving, submit on-chain approval if blockchain configured
    if (approvalStatus === 'APPROVED' && isBlockchainConfigured()) {
      if (!user.wallet_address) {
        console.warn(
          `[signReleaseRequest] Skipping on-chain approval for ${userId}: users.wallet_address is empty`
        );
      } else {
        try {
        const onChainRes = await onChainApproveRelease({
          campaignId: relReq.campaign_id,
          milestoneId: relReq.milestone_id,
          approverAddress: user.wallet_address,
        });

        if (onChainRes.success) {
          txHash = onChainRes.txHash || null;
        }
        } catch (bcErr: any) {
          console.error('[signReleaseRequest] On-chain approveRelease warning:', bcErr.message);
        }
      }
    }

    // 5. Insert multisig approval
    const appRes = await client.query<MultisigApproval>(
      `INSERT INTO multisig_approvals (
         release_request_id,
         milestone_id,
         signer_id,
         signer_role,
         approver_id,
         approver_role,
         approval_type,
         status,
         comment,
         blockchain_tx_hash
       )
       VALUES ($1, $2, $3, $4, $3, $4, '2_OF_3_MULTISIG', $5, $6, $7)
       RETURNING *`,
      [
        releaseRequestId,
        relReq.milestone_id,
        userId,
        approverRole,
        approvalStatus,
        input?.comment || `Approved by ${user.name} (${approverRole})`,
        txHash
      ]
    );

    const approval = appRes.rows[0];

    // 6. Recalculate approvals count
    const countRes = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text as count 
       FROM multisig_approvals 
       WHERE release_request_id = $1 AND status = 'APPROVED'`,
      [releaseRequestId]
    );

    const currentApprovals = parseInt(countRes.rows[0].count || '0', 10);
    let newStatus: ReleaseRequestStatus = relReq.status;

    if (currentApprovals >= relReq.required_approvals) {
      newStatus = 'READY_TO_RELEASE';
    }

    const updatedReqRes = await client.query<ReleaseRequest>(
      `UPDATE release_requests 
       SET current_approvals = $1, status = $2, updated_at = NOW() 
       WHERE id = $3
       RETURNING *`,
      [currentApprovals, newStatus, releaseRequestId]
    );

    const updatedReleaseRequest = updatedReqRes.rows[0];

    // Record audit log
    await recordAuditLog({
      campaignId: relReq.campaign_id,
      actorId: userId,
      action: 'RELEASE_APPROVAL_SIGNED',
      entityType: 'MULTISIG_APPROVAL',
      entityId: approval.id,
      metadata: {
        release_request_id: releaseRequestId,
        milestone_id: relReq.milestone_id,
        approver_role: approverRole,
        status: approvalStatus,
        current_approvals: currentApprovals,
        threshold_met: currentApprovals >= relReq.required_approvals,
        tx_hash: txHash
      },
      client
    });

    return {
      releaseRequest: updatedReleaseRequest,
      approval
    };
  });
}

/**
 * Execute on-chain fund release once 2-of-3 threshold is verified
 */
export async function executeRelease(
  userId: string,
  releaseRequestId: string,
  recipientAddress?: string | null
): Promise<{
  releaseRequest: ReleaseRequest;
  fundTransaction: FundTransaction;
}> {
  // 1. Fetch and validate state before submitting to blockchain
  const checkRes = await query<ReleaseRequest & {
    campaign_ngo_id: string;
    campaign_raised: string;
    campaign_released: string;
    campaign_status: string;
    milestone_status: string;
    milestone_amount: string;
  }>(
    `SELECT 
       r.*,
       c.ngo_id as campaign_ngo_id,
       c.raised_amount::text as campaign_raised,
       c.released_amount::text as campaign_released,
       c.status as campaign_status,
       m.status as milestone_status,
       m.amount::text as milestone_amount
     FROM release_requests r
     JOIN campaigns c ON r.campaign_id = c.id
     JOIN milestones m ON r.milestone_id = m.id
     WHERE r.id = $1`,
    [releaseRequestId]
  );

  if (checkRes.rowCount === 0) {
    throw new NotFoundError('Release request not found');
  }

  const relReq = checkRes.rows[0];

  if (relReq.status === 'RELEASED') {
    throw new AppError('Funds have already been released for this milestone.', 400);
  }

  if (relReq.current_approvals < relReq.required_approvals) {
    throw new AppError(
      `Cannot execute release: 2-of-3 multisig threshold not met (${relReq.current_approvals}/${relReq.required_approvals} approvals).`,
      400
    );
  }

  const availableBalance = Number(relReq.campaign_raised) - Number(relReq.campaign_released);
  if (Number(relReq.requested_amount) > availableBalance) {
    throw new AppError(
      `Release amount (₹${relReq.requested_amount}) exceeds available campaign balance (₹${availableBalance}).`,
      400
    );
  }

  // 2. Mark release submitted
  await query(
    `UPDATE release_requests 
     SET status = 'RELEASE_SUBMITTED', blockchain_status = 'SUBMITTED', updated_at = NOW() 
     WHERE id = $1`,
    [releaseRequestId]
  );

  // 3. Execute Smart Contract onChainReleaseFunds
  let blockchainTxHash: string | null = null;
  let blockNumber: number | null = null;
  let executedRecipient: string | null = recipientAddress || null;

  if (isBlockchainConfigured()) {
    const onChainRes = await onChainReleaseFunds({
      campaignId: relReq.campaign_id,
      milestoneId: relReq.milestone_id,
      recipientAddress
    });

    if (!onChainRes.success) {
      await query(
        `UPDATE release_requests 
         SET status = 'FAILED', blockchain_status = 'FAILED', updated_at = NOW() 
         WHERE id = $1`,
        [releaseRequestId]
      );
      throw new AppError(`Blockchain fund release failed: ${onChainRes.error}`, 500);
    }

    blockchainTxHash = onChainRes.txHash || null;
    blockNumber = onChainRes.blockNumber || null;
    executedRecipient = onChainRes.data?.recipient || executedRecipient;
  }

  // 4. Update database state. blockchain_status reflects REALITY:
  // CONFIRMED only when an on-chain tx actually executed; otherwise the
  // release is a ledger-only event explicitly marked NOT_SUBMITTED.
  const chainConfirmed = blockchainTxHash !== null;
  return withTransaction(async (client) => {
    // Update release request to RELEASED
    const updatedReqRes = await client.query<ReleaseRequest>(
      `UPDATE release_requests 
       SET status = 'RELEASED',
           blockchain_status = $3,
           blockchain_tx_hash = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [blockchainTxHash, releaseRequestId, chainConfirmed ? 'CONFIRMED' : 'NOT_SUBMITTED']
    );
    const updatedReleaseRequest = updatedReqRes.rows[0];

    // Update milestone status to RELEASED
    await client.query(
      `UPDATE milestones 
       SET status = 'RELEASED',
           blockchain_status = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [relReq.milestone_id, chainConfirmed ? 'CONFIRMED' : 'NOT_SUBMITTED']
    );

    // Update campaign released_amount
    await client.query(
      `UPDATE campaigns 
       SET released_amount = released_amount + $1,
           updated_at = NOW()
       WHERE id = $2`,
      [relReq.requested_amount, relReq.campaign_id]
    );

    // Insert fund_transactions record
    const ref = `REL-${relReq.id.substring(0, 8).toUpperCase()}`;
    const fundTxRes = await client.query<FundTransaction>(
      `INSERT INTO fund_transactions (
         campaign_id,
         milestone_id,
         type,
         amount,
         reference,
         transaction_hash,
         blockchain_tx_hash,
         blockchain_block_number,
         blockchain_status,
         recipient_address
       )
       VALUES ($1, $2, 'RELEASE', $3, $4, $5, $5, $6, $8, $7)
       RETURNING *`,
      [
        relReq.campaign_id,
        relReq.milestone_id,
        relReq.requested_amount,
        ref,
        blockchainTxHash,
         blockNumber,
         executedRecipient,
         chainConfirmed ? 'CONFIRMED' : 'NOT_SUBMITTED'
      ]
    );
    const fundTransaction = fundTxRes.rows[0];

    // Record audit log
    await recordAuditLog({
      campaignId: relReq.campaign_id,
      actorId: userId,
      action: 'FUNDS_RELEASED',
      entityType: 'FUND_TRANSACTION',
      entityId: fundTransaction.id,
      metadata: {
        milestone_id: relReq.milestone_id,
        release_request_id: releaseRequestId,
        amount: relReq.requested_amount,
         tx_hash: blockchainTxHash,
         block_number: blockNumber,
         recipient: executedRecipient
      },
      client
    });

    return {
      releaseRequest: updatedReleaseRequest,
      fundTransaction
    };
  });
}

/**
 * Fetch a release request by ID with all multisig approvals
 */
export async function getReleaseRequestById(id: string): Promise<ReleaseRequest | null> {
  const reqRes = await query<ReleaseRequest & {
    milestone_title: string;
    campaign_title: string;
    requested_by_name: string;
  }>(
    `SELECT 
       r.*,
       m.title as milestone_title,
       c.title as campaign_title,
       u.name as requested_by_name
     FROM release_requests r
     JOIN milestones m ON r.milestone_id = m.id
     JOIN campaigns c ON r.campaign_id = c.id
     JOIN users u ON r.requested_by = u.id
     WHERE r.id = $1`,
    [id]
  );

  if (reqRes.rowCount === 0) {
    return null;
  }

  const relReq = reqRes.rows[0];

  const appRes = await query<MultisigApproval & {
    approver_name: string;
    approver_email: string;
  }>(
    `SELECT 
       a.*,
       u.name as approver_name,
       u.email as approver_email
     FROM multisig_approvals a
     JOIN users u ON a.approver_id = u.id
     WHERE a.release_request_id = $1
     ORDER BY a.created_at ASC`,
    [id]
  );

  relReq.approvals = appRes.rows;
  return relReq;
}

/**
 * Fetch latest release request for a milestone
 */
export async function getReleaseRequestForMilestone(milestoneId: string): Promise<ReleaseRequest | null> {
  const reqRes = await query<ReleaseRequest & {
    milestone_title: string;
    campaign_title: string;
    requested_by_name: string;
  }>(
    `SELECT 
       r.*,
       m.title as milestone_title,
       c.title as campaign_title,
       u.name as requested_by_name
     FROM release_requests r
     JOIN milestones m ON r.milestone_id = m.id
     JOIN campaigns c ON r.campaign_id = c.id
     JOIN users u ON r.requested_by = u.id
     WHERE r.milestone_id = $1
     ORDER BY r.created_at DESC
     LIMIT 1`,
    [milestoneId]
  );

  if (reqRes.rowCount === 0) {
    return null;
  }

  const relReq = reqRes.rows[0];

  const appRes = await query<MultisigApproval & {
    approver_name: string;
    approver_email: string;
  }>(
    `SELECT 
       a.*,
       u.name as approver_name,
       u.email as approver_email
     FROM multisig_approvals a
     JOIN users u ON a.approver_id = u.id
     WHERE a.release_request_id = $1
     ORDER BY a.created_at ASC`,
    [relReq.id]
  );

  relReq.approvals = appRes.rows;
  return relReq;
}
