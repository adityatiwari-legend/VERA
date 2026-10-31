import { query, withTransaction } from './db';
import { FundTransaction } from '@/types';
import { recordAuditLog } from './audit_log';
import { AppError, NotFoundError, ForbiddenError } from './permissions';
import { onChainRefund, isBlockchainConfigured } from './blockchain';

export interface ProcessRefundInput {
  userId: string;
  campaignId: string;
  milestoneId?: string | null;
  amount: number;
  recipientAddress?: string | null;
  reason: string;
}

export async function processRefund(input: ProcessRefundInput): Promise<{
  success: boolean;
  fundTransaction: FundTransaction;
  txHash: string | null;
}> {
  if (!input.reason || input.reason.trim().length === 0) {
    throw new AppError('A valid refund justification reason must be provided.', 400);
  }

  if (input.amount <= 0) {
    throw new AppError('Refund amount must be greater than 0.', 400);
  }

  // 1. Fetch campaign and user details
  const userRes = await query<{ id: string; role: string }>(
    `SELECT id, role FROM users WHERE id = $1`,
    [input.userId]
  );
  if (userRes.rowCount === 0) throw new NotFoundError('User not found');
  const user = userRes.rows[0];

  const campRes = await query<{
    id: string;
    ngo_id: string;
    raised_amount: string;
    released_amount: string;
    status: string;
  }>(
    `SELECT id, ngo_id, raised_amount::text, released_amount::text, status FROM campaigns WHERE id = $1`,
    [input.campaignId]
  );
  if (campRes.rowCount === 0) throw new NotFoundError('Campaign not found');
  const campaign = campRes.rows[0];

  // Permissions: NGO owner, platform Admin, or Auditor
  if (user.role !== 'ADMIN' && user.role !== 'AUDITOR' && campaign.ngo_id !== user.id) {
    throw new ForbiddenError('Unauthorized: Only the campaign NGO, assigned Auditor, or Admin can issue refunds.');
  }

  const availableBalance = Number(campaign.raised_amount) - Number(campaign.released_amount);
  if (input.amount > availableBalance) {
    throw new AppError(
      `Refund amount (₹${input.amount}) exceeds available campaign balance (₹${availableBalance}).`,
      400
    );
  }

  // If milestone is specified, verify eligibility
  if (input.milestoneId) {
    const msRes = await query<{ id: string; status: string; amount: string }>(
      `SELECT id, status, amount::text FROM milestones WHERE id = $1 AND campaign_id = $2`,
      [input.milestoneId, input.campaignId]
    );
    if (msRes.rowCount === 0) throw new NotFoundError('Milestone not found');
    const milestone = msRes.rows[0];

    if (milestone.status === 'RELEASED') {
      throw new AppError('Cannot refund an already released milestone.', 400);
    }
  }

  // 2. Execute Smart Contract onChainRefund
  let txHash: string | null = null;
  let blockNumber: number | null = null;
  let executedRecipient: string | null = input.recipientAddress || null;

  if (isBlockchainConfigured()) {
    const onChainRes = await onChainRefund({
      campaignId: input.campaignId,
      recipientAddress: input.recipientAddress,
      amount: input.amount,
      reason: input.reason
    });

    if (!onChainRes.success) {
      throw new AppError(`Blockchain refund execution failed: ${onChainRes.error}`, 500);
    }

    txHash = onChainRes.txHash || null;
    blockNumber = onChainRes.blockNumber || null;
    executedRecipient = onChainRes.data?.recipient || executedRecipient;
  }

  // 3. Persist refund transaction in database
  return withTransaction(async (client) => {
    // If milestone was specified, update to FAILED
    if (input.milestoneId) {
      await client.query(
        `UPDATE milestones SET status = 'FAILED', blockchain_status = $2, updated_at = NOW() WHERE id = $1`,
        [input.milestoneId, txHash ? 'CONFIRMED' : 'NOT_SUBMITTED']
      );
    }

    // Update campaign balance accounting
    await client.query(
      `UPDATE campaigns SET released_amount = released_amount + $1, updated_at = NOW() WHERE id = $2`,
      [input.amount, input.campaignId]
    );

    // Insert fund_transactions record
    const ref = `REF-${Date.now().toString(36).toUpperCase()}`;
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
       VALUES ($1, $2, 'REFUND', $3, $4, $5, $5, $6, $8, $7)
       RETURNING *`,
      [
        input.campaignId,
        input.milestoneId || null,
        input.amount,
        ref,
        txHash,
         blockNumber,
         executedRecipient,
         txHash ? 'CONFIRMED' : 'NOT_SUBMITTED'
      ]
    );

    const fundTransaction = fundTxRes.rows[0];

    // Audit log
    await recordAuditLog({
      campaignId: input.campaignId,
      actorId: input.userId,
      action: 'FUNDS_REFUNDED',
      entityType: 'FUND_TRANSACTION',
      entityId: fundTransaction.id,
      metadata: {
        amount: input.amount,
        reason: input.reason,
        milestone_id: input.milestoneId,
        tx_hash: txHash,
        recipient: input.recipientAddress
      },
      client
    });

    return {
      success: true,
      fundTransaction,
      txHash
    };
  });
}
