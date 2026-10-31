import { query } from './db';
import { FundTransaction } from '../types';

/**
 * Retrieve fund transactions history for a campaign
 */
export async function getFundTransactionsForCampaign(
  campaignId: string
): Promise<FundTransaction[]> {
  const sql = `
    SELECT 
      ft.id,
      ft.campaign_id,
      ft.milestone_id,
      ft.donation_id,
      ft.type,
      ft.amount::numeric as amount,
      ft.reference,
      ft.transaction_hash,
      ft.blockchain_tx_hash,
      ft.blockchain_block_number,
      ft.blockchain_status,
      ft.recipient_address,
      ft.created_at,
      m.title as milestone_title
    FROM fund_transactions ft
    LEFT JOIN milestones m ON ft.milestone_id = m.id
    WHERE ft.campaign_id = $1
    ORDER BY ft.created_at DESC
  `;

  const res = await query<FundTransaction>(sql, [campaignId]);
  return res.rows;
}

/**
 * Calculate campaign financial breakdown accurately from PostgreSQL
 */
export async function getCampaignFinancialSummary(campaignId: string) {
  const sql = `
    SELECT 
      c.id,
      c.target_amount::numeric as target_amount,
      c.raised_amount::numeric as raised_amount,
      c.released_amount::numeric as released_amount,
      COALESCE(SUM(m.amount), 0)::numeric as milestones_total,
      COUNT(DISTINCT m.id)::int as milestones_count,
      COUNT(DISTINCT d.donor_id)::int as donors_count,
      COUNT(DISTINCT d.id)::int as donations_count
    FROM campaigns c
    LEFT JOIN milestones m ON c.id = m.campaign_id
    LEFT JOIN donations d ON c.id = d.campaign_id AND d.status = 'CONFIRMED'
    WHERE c.id = $1
    GROUP BY c.id, c.target_amount, c.raised_amount, c.released_amount
  `;

  const res = await query<{
    id: string;
    target_amount: number;
    raised_amount: number;
    released_amount: number;
    milestones_total: number;
    milestones_count: number;
    donors_count: number;
    donations_count: number;
  }>(sql, [campaignId]);

  if (res.rowCount === 0) {
    return null;
  }

  // Query total refunded amount for this campaign
  const refundRes = await query<{ refunded_amount: number }>(
    `SELECT COALESCE(SUM(amount), 0)::numeric as refunded_amount 
     FROM fund_transactions 
     WHERE campaign_id = $1 AND type = 'REFUND'`,
    [campaignId]
  );
  const refunded = Number(refundRes.rows[0]?.refunded_amount || 0);

  const row = res.rows[0];
  const target = Number(row.target_amount);
  const raised = Number(row.raised_amount);
  const released = Number(row.released_amount);
  // Escrow balance = raised minus disbursed/released and refunded
  const locked = Math.max(0, raised - released - refunded);
  const remaining = Math.max(0, target - raised);
  const progressPercent = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;

  return {
    targetAmount: target,
    raisedAmount: raised,
    lockedAmount: locked,
    releasedAmount: released,
    refundedAmount: refunded,
    remainingAmount: remaining,
    remainingBalance: locked,
    progressPercent,
    milestonesTotal: Number(row.milestones_total),
    milestonesCount: row.milestones_count,
    donorsCount: row.donors_count,
    donationsCount: row.donations_count,
  };
}
