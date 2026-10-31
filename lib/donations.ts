import { query, withTransaction } from './db';
import { Donation, Campaign } from '../types';
import { CreateDonationInput } from './validation';
import { recordAuditLog } from './audit_log';
import { AppError, NotFoundError, ForbiddenError } from './permissions';

import { isBlockchainConfigured, onChainDonate } from './blockchain';
import { BlockchainStatus } from '../types';

/**
 * Generate a clean, unique donation reference code
 * Example: VERA-DON-L7K2X-9F2B
 */
function generateDonationReference(): string {
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VERA-DON-${timePart}-${randomPart}`;
}

/**
 * Process a simulated donation atomically
 * 1. Lock campaign row FOR UPDATE to prevent race conditions
 * 2. Validate campaign is ACTIVE and prevent overfunding
 * 3. Submit on-chain testnet transaction if configured
 * 4. Insert donation record with blockchain metadata
 * 5. Increment campaign raised_amount
 * 6. Create DONATION and LOCK records in fund_transactions
 * 7. Record audit trail entries (DONATION_CREATED, DONATION_CONFIRMED, FUNDS_LOCKED)
 */
export async function createDonation(
  donorId: string,
  campaignId: string,
  input: CreateDonationInput,
  opts?: { isDemo?: boolean; evmTxHash?: string | null; evmBlockNumber?: number | null }
): Promise<Donation> {
  // Money model (locked decision): demo-labeled ledger + optional user-signed
  // on-chain donations. The platform never moves donation value itself.
  const isWalletDonation = Boolean(opts?.evmTxHash);
  let blockchainTxHash: string | null = isWalletDonation ? opts!.evmTxHash! : null;
  let blockchainStatus: BlockchainStatus = isWalletDonation ? 'CONFIRMED' : 'NOT_SUBMITTED';
  const isDemo = isWalletDonation ? false : opts?.isDemo !== false;

  const donationAmount = Number(input.amount ?? 0);
  if (!donationAmount || donationAmount <= 0) {
    throw new AppError('Donation amount is required');
  }

  return withTransaction(async (client) => {
    // 1. Lock campaign row for update
    const campRes = await client.query<Campaign>(
      `SELECT * FROM campaigns WHERE id = $1 FOR UPDATE`,
      [campaignId]
    );

    if (campRes.rowCount === 0) {
      throw new NotFoundError('Campaign not found');
    }

    const campaign = campRes.rows[0];

    if (campaign.status !== 'ACTIVE') {
      throw new AppError(
        `Donations are only accepted for ACTIVE campaigns (current status: ${campaign.status})`,
        400
      );
    }

    const targetAmount = Number(campaign.target_amount);
    const currentRaised = Number(campaign.raised_amount);
    const remainingGoal = targetAmount - currentRaised;

    // Overfunding protection (Section 10 & 25)
    if (donationAmount > remainingGoal) {
      throw new AppError(
        `Donation amount (₹${donationAmount.toLocaleString('en-IN')}) exceeds the remaining funding goal of ₹${remainingGoal.toLocaleString('en-IN')}`,
        400
      );
    }

    const reference = generateDonationReference();

    // 2. Create the donation (demo = ledger-only and labeled; wallet = real tx)
    const insertDonationSql = `
      INSERT INTO donations (
        campaign_id,
        donor_id,
        amount,
        purpose,
        status,
        reference,
        transaction_hash,
        blockchain_tx_hash,
        blockchain_status,
        is_demo
      )
      VALUES ($1, $2, $3, $4, 'CONFIRMED', $5, NULL, $6, $7, $8)
      RETURNING *
    `;

    const donRes = await client.query<Donation>(insertDonationSql, [
      campaignId,
      donorId,
      donationAmount,
      input.purpose || null,
      reference,
      blockchainTxHash,
      blockchainStatus,
      isDemo,
    ]);
    const donation = donRes.rows[0];

    // 3. Update campaign raised_amount
    await client.query(
      `UPDATE campaigns
       SET raised_amount = raised_amount + $1, updated_at = NOW()
       WHERE id = $2`,
      [input.amount, campaignId]
    );

    // 4. Create fund_transactions: DONATION and LOCK
    const txSql = `
      INSERT INTO fund_transactions (
        campaign_id,
        donation_id,
        type,
        amount,
        reference,
        transaction_hash,
        blockchain_tx_hash,
        blockchain_status
      )
      VALUES ($1, $2, $3, $4, $5, NULL, $6, $7)
    `;

    // Transaction 1: Earmarked Donation Received
    await client.query(txSql, [
      campaignId,
      donation.id,
      'DONATION',
      input.amount,
      `DON-${reference}`,
      blockchainTxHash,
      blockchainStatus,
    ]);

    // Transaction 2: Accounting Lock to Campaign Escrow
    await client.query(txSql, [
      campaignId,
      donation.id,
      'LOCK',
      input.amount,
      `LOCK-${reference}`,
      blockchainTxHash,
      blockchainStatus,
    ]);

    // 5. Record Audit Logs
    await recordAuditLog({
      campaignId,
      actorId: donorId,
      action: 'DONATION_CREATED',
      entityType: 'DONATION',
      entityId: donation.id,
      metadata: {
        reference: donation.reference,
        amount: input.amount,
        purpose: input.purpose,
        simulated: true,
        blockchain_tx_hash: blockchainTxHash,
        blockchain_status: blockchainStatus,
      },
      client,
    });

    await recordAuditLog({
      campaignId,
      actorId: donorId,
      action: 'DONATION_CONFIRMED',
      entityType: 'DONATION',
      entityId: donation.id,
      metadata: {
        reference: donation.reference,
        status: 'CONFIRMED',
      },
      client,
    });

    await recordAuditLog({
      campaignId,
      actorId: donorId,
      action: 'FUNDS_LOCKED',
      entityType: 'CAMPAIGN',
      entityId: campaignId,
      metadata: {
        amount_locked: input.amount,
        campaign_title: campaign.title,
        accounting_state: 'LOCKED_IN_ESCROW',
      },
      client,
    });

    return donation;
  });
}

/**
 * Retrieve donations made by a specific donor
 */
export async function getDonationsByDonor(donorId: string): Promise<Donation[]> {
  const sql = `
    SELECT 
      d.id,
      d.campaign_id,
      d.donor_id,
      d.amount::numeric as amount,
      d.purpose,
      d.status,
      d.reference,
      d.transaction_hash,
      d.blockchain_tx_hash,
      d.blockchain_status,
      d.created_at,
      d.updated_at,
      c.title as campaign_title,
      c.beneficiary
    FROM donations d
    JOIN campaigns c ON d.campaign_id = c.id
    WHERE d.donor_id = $1
    ORDER BY d.created_at DESC
  `;

  const res = await query<Donation>(sql, [donorId]);
  return res.rows;
}

/**
 * Retrieve a specific donation with campaign and donor details
 */
export async function getDonationById(
  donationId: string,
  requestingUserId?: string
): Promise<Donation | null> {
  const sql = `
    SELECT 
      d.id,
      d.campaign_id,
      d.donor_id,
      d.amount::numeric as amount,
      d.purpose,
      d.status,
      d.reference,
      d.transaction_hash,
      d.blockchain_tx_hash,
      d.blockchain_status,
      d.created_at,
      d.updated_at,
      c.title as campaign_title,
      c.beneficiary,
      u.name as donor_name
    FROM donations d
    JOIN campaigns c ON d.campaign_id = c.id
    JOIN users u ON d.donor_id = u.id
    WHERE d.id = $1
  `;

  const res = await query<Donation>(sql, [donationId]);
  if (res.rowCount === 0) {
    return null;
  }

  const donation = res.rows[0];

  // If requestingUserId is provided, enforce donor boundary
  if (requestingUserId && donation.donor_id !== requestingUserId) {
    // Check if requesting user is the owning NGO
    const campRes = await query<{ ngo_id: string }>(
      'SELECT ngo_id FROM campaigns WHERE id = $1',
      [donation.campaign_id]
    );
    if (campRes.rowCount === 0 || campRes.rows[0].ngo_id !== requestingUserId) {
      throw new ForbiddenError('Access denied: You can only view your own donation receipts');
    }
  }

  return donation;
}

/**
 * Get all donations for a campaign (for NGO view)
 */
export async function getDonationsForCampaign(campaignId: string): Promise<Donation[]> {
  const sql = `
    SELECT 
      d.id,
      d.campaign_id,
      d.donor_id,
      d.amount::numeric as amount,
      d.purpose,
      d.status,
      d.reference,
      d.blockchain_tx_hash,
      d.blockchain_status,
      d.created_at,
      u.name as donor_name
    FROM donations d
    JOIN users u ON d.donor_id = u.id
    WHERE d.campaign_id = $1
    ORDER BY d.created_at DESC
  `;

  const res = await query<Donation>(sql, [campaignId]);
  return res.rows;
}

/**
 * Aggregated donor summary metrics for donor dashboard
 */
export async function getDonorStats(donorId: string) {
  const sql = `
    SELECT 
      COALESCE(SUM(amount), 0)::numeric as total_donated,
      COUNT(*)::int as total_donations,
      COUNT(DISTINCT campaign_id)::int as campaigns_supported
    FROM donations
    WHERE donor_id = $1 AND status = 'CONFIRMED'
  `;

  const res = await query<{
    total_donated: number;
    total_donations: number;
    campaigns_supported: number;
  }>(sql, [donorId]);

  return res.rows[0];
}
