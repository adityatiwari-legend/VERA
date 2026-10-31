import { ethers } from 'ethers';
import { query } from './db';
import {
  getContract,
  getProvider,
  idToBytes32,
  isBlockchainReadConfigured,
  onChainGetCampaign,
  onChainGetMilestone,
} from './blockchain';

export type IntegrityStatus = 'PASS' | 'FAIL' | 'SKIPPED';

export interface IntegrityAlert {
  check: string;
  entity: string;
  expected: unknown;
  actual: unknown;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface IntegrityCheck {
  check: string;
  status: IntegrityStatus;
  entity: string;
  details?: string;
}

export interface IntegrityReport {
  valid: boolean;
  checks: IntegrityCheck[];
  alerts: IntegrityAlert[];
  checkedAt: string;
}

function addCheck(
  checks: IntegrityCheck[],
  check: string,
  status: IntegrityStatus,
  entity: string,
  details?: string
) {
  checks.push({ check, status, entity, ...(details ? { details } : {}) });
}

function addAlert(
  checks: IntegrityCheck[],
  alerts: IntegrityAlert[],
  alert: IntegrityAlert
) {
  alerts.push(alert);
  addCheck(checks, alert.check, 'FAIL', alert.entity);
}

function amountEquals(left: unknown, right: unknown): boolean {
  return Math.abs(Number(left) - Number(right)) < 0.000001;
}

function normalizeAddress(value: unknown): string | null {
  if (typeof value !== 'string' || !ethers.isAddress(value)) return null;
  return value.toLowerCase();
}

async function verifyFundTransactionHashes(
  campaignId: string | undefined,
  checks: IntegrityCheck[],
  alerts: IntegrityAlert[]
) {
  const result = await query<{
    id: string;
    campaign_id: string;
    milestone_id: string | null;
    type: string;
    amount: string;
    blockchain_tx_hash: string;
    recipient_address: string | null;
    donor_wallet: string | null;
  }>(
    `SELECT ft.id, ft.campaign_id, ft.milestone_id, ft.type,
            ft.amount::text as amount, ft.blockchain_tx_hash,
            ft.recipient_address, donor.wallet_address as donor_wallet
     FROM fund_transactions ft
     LEFT JOIN donations d ON ft.donation_id = d.id
     LEFT JOIN users donor ON d.donor_id = donor.id
     WHERE ft.blockchain_tx_hash IS NOT NULL
       AND ($1::uuid IS NULL OR ft.campaign_id = $1)
     ORDER BY ft.created_at ASC`,
    [campaignId || null]
  );

  if (result.rows.length === 0) {
    addCheck(checks, 'fund-transaction-hashes', 'PASS', campaignId || 'all', 'No DB transaction hashes to verify');
    return;
  }

  if (!isBlockchainReadConfigured()) {
    addCheck(checks, 'fund-transaction-hashes', 'SKIPPED', campaignId || 'all', 'Blockchain read configuration is unavailable');
    return;
  }

  const provider = getProvider();
  const contract = getContract(provider);
  const expectedEventByType: Record<string, string> = {
    DONATION: 'DonationReceived',
    LOCK: 'DonationReceived',
    RELEASE: 'FundsReleased',
    REFUND: 'RefundIssued',
  };

  for (const row of result.rows) {
    const check = 'fund-transaction-on-chain';
    const entity = row.id;
    let receipt;
    try {
      receipt = await provider.getTransactionReceipt(row.blockchain_tx_hash);
    } catch (error: any) {
      addAlert(checks, alerts, {
        check,
        entity,
        expected: { transaction: 'confirmed', hash: row.blockchain_tx_hash },
        actual: { error: error.message || 'RPC lookup failed' },
        severity: 'CRITICAL',
      });
      continue;
    }

    if (!receipt) {
      addAlert(checks, alerts, {
        check: 'fund-transaction-hash-exists',
        entity,
        expected: { transaction: 'present', hash: row.blockchain_tx_hash },
        actual: null,
        severity: 'CRITICAL',
      });
      continue;
    }

    if (receipt.status !== 1) {
      addAlert(checks, alerts, {
        check: 'fund-transaction-status',
        entity,
        expected: 'success',
        actual: receipt.status,
        severity: 'HIGH',
      });
      continue;
    }

    const contractAddress = typeof contract.target === 'string' ? contract.target.toLowerCase() : null;
    if (!receipt.to || !contractAddress || receipt.to.toLowerCase() !== contractAddress) {
      addAlert(checks, alerts, {
        check: 'fund-transaction-contract',
        entity,
        expected: contractAddress,
        actual: receipt.to,
        severity: 'CRITICAL',
      });
      continue;
    }

    const eventName = expectedEventByType[row.type];
    const event = receipt.logs
      .map((log) => {
        try {
          return contract.interface.parseLog({ topics: log.topics as string[], data: log.data });
        } catch {
          return null;
        }
      })
      .find((parsed) => parsed?.name === eventName);

    if (!event) {
      addAlert(checks, alerts, {
        check: 'fund-transaction-event',
        entity,
        expected: eventName,
        actual: receipt.logs.length ? 'different event or contract' : 'no event',
        severity: 'CRITICAL',
      });
      continue;
    }

    const args = event.args;
    const eventCampaign = args?.[0] as string;
    const eventAmount = args?.[eventName === 'RefundIssued' ? 2 : eventName === 'FundsReleased' ? 3 : 2];
    const expectedCampaign = idToBytes32(row.campaign_id);
    if (eventCampaign.toLowerCase() !== expectedCampaign.toLowerCase()) {
      addAlert(checks, alerts, {
        check: 'fund-transaction-campaign',
        entity,
        expected: expectedCampaign,
        actual: eventCampaign,
        severity: 'HIGH',
      });
    }

    if (row.milestone_id && (eventName === 'FundsReleased' || eventName === 'ReleaseRequested')) {
      const eventMilestone = args?.[1] as string;
      const expectedMilestone = idToBytes32(row.milestone_id);
      if (eventMilestone.toLowerCase() !== expectedMilestone.toLowerCase()) {
        addAlert(checks, alerts, {
          check: 'fund-transaction-milestone',
          entity,
          expected: expectedMilestone,
          actual: eventMilestone,
          severity: 'HIGH',
        });
      }
    }

    if (!amountEquals(eventAmount, row.amount)) {
      addAlert(checks, alerts, {
        check: 'fund-transaction-amount',
        entity,
        expected: Number(row.amount),
        actual: Number(eventAmount),
        severity: 'CRITICAL',
      });
    }

    const eventRecipient = eventName === 'FundsReleased'
      ? args?.[2]
      : eventName === 'RefundIssued'
        ? args?.[1]
        : eventName === 'DonationReceived'
          ? args?.[1]
          : null;
    const expectedRecipient = normalizeAddress(row.recipient_address || row.donor_wallet);
    if (expectedRecipient && normalizeAddress(eventRecipient) !== expectedRecipient) {
      addAlert(checks, alerts, {
        check: 'fund-transaction-recipient',
        entity,
        expected: expectedRecipient,
        actual: eventRecipient,
        severity: 'HIGH',
      });
    }

    if (!alerts.some((alert) => alert.entity === entity)) {
      addCheck(checks, check, 'PASS', entity);
    }
  }
}

async function verifyCampaignState(
  campaignId: string | undefined,
  checks: IntegrityCheck[],
  alerts: IntegrityAlert[]
) {
  const result = await query<{
    id: string;
    raised_amount: string;
    released_amount: string;
    target_amount: string;
  }>(
    `SELECT id, raised_amount::text, released_amount::text, target_amount::text
     FROM campaigns
     WHERE ($1::uuid IS NULL OR id = $1)`,
    [campaignId || null]
  );

  if (!isBlockchainReadConfigured()) {
    addCheck(checks, 'campaign-financial-state', 'SKIPPED', campaignId || 'all', 'Blockchain read configuration is unavailable');
    return;
  }

  for (const row of result.rows) {
    const chain = await onChainGetCampaign(row.id);
    if (!chain) {
      addCheck(checks, 'campaign-financial-state', 'SKIPPED', row.id, 'Campaign is not available on the configured contract');
      continue;
    }

    const expected = {
      targetAmount: Number(row.target_amount),
      totalDonated: Number(row.raised_amount),
      totalReleased: Number(row.released_amount),
    };
    const actual = {
      targetAmount: chain.targetAmount,
      totalDonated: chain.totalDonated,
      totalReleased: chain.totalReleased,
    };
    if (
      !amountEquals(expected.targetAmount, actual.targetAmount) ||
      !amountEquals(expected.totalDonated, actual.totalDonated) ||
      !amountEquals(expected.totalReleased, actual.totalReleased)
    ) {
      addAlert(checks, alerts, {
        check: 'campaign-financial-state',
        entity: row.id,
        expected,
        actual,
        severity: 'CRITICAL',
      });
    } else {
      addCheck(checks, 'campaign-financial-state', 'PASS', row.id);
    }
  }
}

async function verifyReleaseState(
  campaignId: string | undefined,
  checks: IntegrityCheck[],
  alerts: IntegrityAlert[]
) {
  const result = await query<{
    milestone_id: string;
    campaign_id: string;
    milestone_amount: string;
    milestone_status: string;
    blockchain_status: string | null;
    release_status: string | null;
    requested_amount: string | null;
    required_approvals: number | null;
    current_approvals: number | null;
    release_count: string;
  }>(
    `SELECT m.id as milestone_id, m.campaign_id, m.amount::text as milestone_amount,
            m.status as milestone_status, m.blockchain_status,
            rr.status as release_status, rr.requested_amount::text,
            rr.required_approvals, rr.current_approvals,
            COUNT(ft.id) FILTER (WHERE ft.type = 'RELEASE')::text as release_count
     FROM milestones m
     LEFT JOIN LATERAL (
       SELECT status, requested_amount, required_approvals, current_approvals
       FROM release_requests
       WHERE milestone_id = m.id
       ORDER BY created_at DESC
       LIMIT 1
     ) rr ON true
     LEFT JOIN fund_transactions ft ON ft.milestone_id = m.id
     WHERE ($1::uuid IS NULL OR m.campaign_id = $1)
     GROUP BY m.id, rr.status, rr.requested_amount, rr.required_approvals, rr.current_approvals`,
    [campaignId || null]
  );

  if (!isBlockchainReadConfigured()) {
    addCheck(checks, 'release-state', 'SKIPPED', campaignId || 'all', 'Blockchain read configuration is unavailable');
    return;
  }

  for (const row of result.rows) {
    const shouldCheck = row.blockchain_status === 'CONFIRMED' ||
      row.release_status !== null ||
      row.milestone_status === 'RELEASED';
    if (!shouldCheck) continue;

    const chain = await onChainGetMilestone(row.campaign_id, row.milestone_id);
    if (!chain) {
      addAlert(checks, alerts, {
        check: 'release-state-availability',
        entity: row.milestone_id,
        expected: 'milestone state available on contract',
        actual: null,
        severity: 'HIGH',
      });
      continue;
    }

    const dbReleased = row.milestone_status === 'RELEASED' || row.release_status === 'RELEASED';
    const dbReleaseRequested = row.release_status !== null;
    const expected = {
      releaseRequested: dbReleaseRequested,
      requestedReleaseAmount: row.requested_amount ? Number(row.requested_amount) : 0,
      released: dbReleased,
      releasedAmount: dbReleased ? Number(row.requested_amount || row.milestone_amount) : 0,
      approvals: Number(row.current_approvals || 0),
    };
    const actual = {
      releaseRequested: chain.releaseRequested,
      requestedReleaseAmount: chain.requestedReleaseAmount,
      released: chain.released,
      releasedAmount: chain.releasedAmount,
      approvals: chain.currentApprovals,
    };

    if (row.release_count && Number(row.release_count) > 1) {
      addAlert(checks, alerts, {
        check: 'release-double-execution',
        entity: row.milestone_id,
        expected: 1,
        actual: Number(row.release_count),
        severity: 'CRITICAL',
      });
    }
    if (
      dbReleaseRequested !== chain.releaseRequested ||
      (dbReleaseRequested && !amountEquals(expected.requestedReleaseAmount, actual.requestedReleaseAmount))
    ) {
      addAlert(checks, alerts, {
        check: 'release-request-state',
        entity: row.milestone_id,
        expected,
        actual,
        severity: 'CRITICAL',
      });
    } else if (dbReleased !== chain.released || (dbReleased && !amountEquals(expected.releasedAmount, actual.releasedAmount))) {
      addAlert(checks, alerts, {
        check: 'release-state',
        entity: row.milestone_id,
        expected,
        actual,
        severity: 'CRITICAL',
      });
    } else if (Number(row.current_approvals || 0) !== chain.currentApprovals) {
      addAlert(checks, alerts, {
        check: 'release-approval-state',
        entity: row.milestone_id,
        expected: Number(row.current_approvals || 0),
        actual: chain.currentApprovals,
        severity: 'HIGH',
      });
    } else {
      addCheck(checks, 'release-state', 'PASS', row.milestone_id);
    }
  }
}

export async function runIntegrityChecks(campaignId?: string): Promise<IntegrityReport> {
  const checks: IntegrityCheck[] = [];
  const alerts: IntegrityAlert[] = [];

  try {
    await verifyFundTransactionHashes(campaignId, checks, alerts);
    await verifyCampaignState(campaignId, checks, alerts);
    await verifyReleaseState(campaignId, checks, alerts);
  } catch (error: any) {
    addAlert(checks, alerts, {
      check: 'integrity-monitor',
      entity: campaignId || 'all',
      expected: 'all integrity checks completed',
      actual: error.message || 'integrity check failed',
      severity: 'HIGH',
    });
  }

  return {
    valid: alerts.length === 0,
    checks,
    alerts,
    checkedAt: new Date().toISOString(),
  };
}
