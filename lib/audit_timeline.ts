import { query } from './db';
import { getExplorerTxUrl } from './blockchain';

export interface AuditTimelineEvent {
  id: string;
  timestamp: string;
  type:
    | 'CAMPAIGN_CREATED'
    | 'DONATION_RECEIVED'
    | 'FUNDS_LOCKED'
    | 'MILESTONE_CREATED'
    | 'PROOF_SUBMITTED'
    | 'AI_VERIFICATION_COMPLETED'
    | 'PROOF_APPROVED'
    | 'PROOF_APPROVED_OVERRIDE'
    | 'PROOF_REJECTED'
    | 'RELEASE_REQUESTED'
    | 'MULTISIG_APPROVAL'
    | 'FUNDS_RELEASED'
    | 'REFUND_ISSUED'
    | 'STATUS_CHANGED'
    | 'GENERIC_AUDIT';
  title: string;
  description: string;
  amount?: number;
  actorRole: string;
  actorLabel: string;
  milestoneTitle?: string;
  statusBadge?: string;
  txHash?: string;
  explorerUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Normalizes internal audit logs, fund transactions, and multisig approvals
 * into a clean, chronological, public-safe audit timeline.
 */
export async function getCampaignAuditTimeline(
  campaignId: string
): Promise<AuditTimelineEvent[]> {
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || 31337;

  // 1. Fetch audit logs for this campaign
  const logsRes = await query<{
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    metadata: any;
    created_at: string;
    actor_id: string;
    actor_name: string;
    actor_role: string;
  }>(
    `SELECT 
       a.id,
       a.action,
       a.entity_type,
       a.entity_id,
       a.metadata,
       a.created_at,
       a.actor_id,
       COALESCE(u.name, 'System') as actor_name,
       COALESCE(u.role, 'SYSTEM') as actor_role
     FROM audit_logs a
     LEFT JOIN users u ON a.actor_id = u.id
     WHERE a.campaign_id = $1
     ORDER BY a.created_at ASC`,
    [campaignId]
  );

  // 2. Fetch milestone titles mapping
  const milestonesRes = await query<{ id: string; title: string; sequence: number }>(
    `SELECT id, title, sequence FROM milestones WHERE campaign_id = $1`,
    [campaignId]
  );
  const milestoneMap = new Map<string, string>();
  for (const m of milestonesRes.rows) {
    milestoneMap.set(m.id, `M${m.sequence}: ${m.title}`);
  }

  // 3. Normalize audit entries
  const events: AuditTimelineEvent[] = [];

  for (const log of logsRes.rows) {
    const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : (log.metadata || {});
    const txHash = meta.tx_hash || meta.transaction_hash || meta.blockchain_tx_hash;
    const explorerUrl = txHash ? getExplorerTxUrl(chainId, txHash) : undefined;

    let actorLabel = 'System Ledger';
    if (log.actor_role === 'ORGANIZATION') {
      actorLabel = 'Campaign Lead (NGO)';
    } else if (log.actor_role === 'AUDITOR') {
      actorLabel = `Auditor (${log.actor_name})`;
    } else if (log.actor_role === 'USER') {
      actorLabel = 'Verified Donor';
    } else if (log.actor_role === 'ADMIN') {
      actorLabel = 'Platform Administrator';
    }

    const milestoneId = meta.milestone_id || (log.entity_type === 'MILESTONE' ? log.entity_id : undefined);
    const milestoneTitle = milestoneId ? milestoneMap.get(milestoneId) || meta.milestone_title : meta.milestone_title;

    switch (log.action) {
      case 'CREATE_CAMPAIGN':
        events.push({
          id: log.id,
          timestamp: log.created_at,
          type: 'CAMPAIGN_CREATED',
          title: 'Campaign Created',
          description: `Campaign launched with target goal of ₹${Number(meta.target_amount || 0).toLocaleString('en-IN')}.`,
          amount: meta.target_amount ? Number(meta.target_amount) : undefined,
          actorRole: log.actor_role,
          actorLabel,
          statusBadge: 'Active',
          txHash,
          explorerUrl,
        });
        break;

      case 'DONATION_CREATED':
      case 'DONATION_CONFIRMED':
        events.push({
          id: log.id,
          timestamp: log.created_at,
          type: 'DONATION_RECEIVED',
          title: 'Donation Received',
          description: `Contribution of ₹${Number(meta.amount || 0).toLocaleString('en-IN')} received and registered in escrow.`,
          amount: meta.amount ? Number(meta.amount) : undefined,
          actorRole: log.actor_role,
          actorLabel,
          statusBadge: 'Confirmed',
          txHash,
          explorerUrl,
        });
        break;

      case 'FUNDS_LOCKED':
        events.push({
          id: log.id,
          timestamp: log.created_at,
          type: 'FUNDS_LOCKED',
          title: 'Funds Locked in Escrow',
          description: `₹${Number(meta.amount_locked || meta.amount || 0).toLocaleString('en-IN')} locked into accounting escrow. Cannot be disbursed without verified milestone proof.`,
          amount: meta.amount_locked || meta.amount ? Number(meta.amount_locked || meta.amount) : undefined,
          actorRole: 'SYSTEM',
          actorLabel: 'Escrow State Machine',
          statusBadge: 'Locked',
        });
        break;

      case 'CREATE_MILESTONE':
      case 'MILESTONE_CREATED':
        events.push({
          id: log.id,
          timestamp: log.created_at,
          type: 'MILESTONE_CREATED',
          title: 'Milestone Defined',
          description: `Milestone "${meta.title || milestoneTitle || 'Milestone'}" allocated ₹${Number(meta.amount || 0).toLocaleString('en-IN')}.`,
          amount: meta.amount ? Number(meta.amount) : undefined,
          actorRole: log.actor_role,
          actorLabel,
          milestoneTitle,
          statusBadge: 'Scheduled',
          txHash,
          explorerUrl,
        });
        break;

      case 'PROOF_CREATED':
      case 'PROOF_SUBMITTED_FOR_REVIEW':
        events.push({
          id: log.id,
          timestamp: log.created_at,
          type: 'PROOF_SUBMITTED',
          title: 'Evidence Proof Submitted',
          description: `NGO submitted invoices, receipts, and photographic evidence claiming ₹${Number(meta.claimed_amount || 0).toLocaleString('en-IN')}.`,
          amount: meta.claimed_amount ? Number(meta.claimed_amount) : undefined,
          actorRole: log.actor_role,
          actorLabel,
          milestoneTitle,
          statusBadge: 'Under Review',
        });
        break;

      case 'PROOF_ANALYSIS_COMPLETED':
        const disc = Number(meta.discrepancy_amount || 0);
        events.push({
          id: log.id,
          timestamp: log.created_at,
          type: 'AI_VERIFICATION_COMPLETED',
          title: 'Automated Verification Completed',
          description:
            disc > 0
              ? `AI/OCR document scan flagged a ₹${disc.toLocaleString('en-IN')} discrepancy between invoice total (₹${Number(meta.detected_amount || 0).toLocaleString('en-IN')}) and claimed amount.`
              : 'Automated checks passed with zero discrepancy between submitted vendor receipts and claimed amount.',
          actorRole: 'AI_ENGINE',
          actorLabel: 'AI Integrity Verification Engine',
          milestoneTitle,
          statusBadge: disc > 0 ? 'Discrepancy Flagged' : 'Verified',
        });
        break;

      case 'PROOF_APPROVED':
      case 'PROOF_APPROVED_OVERRIDE':
        events.push({
          id: log.id,
          timestamp: log.created_at,
          type: 'PROOF_APPROVED',
           title: log.action === 'PROOF_APPROVED_OVERRIDE'
             ? 'Flagged Evidence Approved by Auditor Override'
             : 'Evidence Approved by Auditor',
           description: log.action === 'PROOF_APPROVED_OVERRIDE'
             ? `Certified human auditor recorded an authorized override for ${meta.overridden_ai_status || 'flagged'} evidence. Milestone eligible for release authorization.`
             : `Certified human auditor approved milestone evidence. Milestone eligible for release authorization.`,
          actorRole: log.actor_role,
          actorLabel,
          milestoneTitle,
           statusBadge: log.action === 'PROOF_APPROVED_OVERRIDE' ? 'Approved Override' : 'Approved',
        });
        break;

      case 'PROOF_REJECTED':
        events.push({
          id: log.id,
          timestamp: log.created_at,
          type: 'PROOF_REJECTED',
          title: 'Evidence Rejected by Auditor',
          description: `Auditor rejected submission. Reason: ${meta.reason || 'Insufficient documentation'}.`,
          actorRole: log.actor_role,
          actorLabel,
          milestoneTitle,
          statusBadge: 'Rejected',
        });
        break;

      case 'RELEASE_REQUEST_CREATED':
        events.push({
          id: log.id,
          timestamp: log.created_at,
          type: 'RELEASE_REQUESTED',
          title: 'Release Authorization Initiated',
          description: `Disbursement request for ₹${Number(meta.amount || meta.requested_amount || 0).toLocaleString('en-IN')} initiated. Requires 2-of-3 multisig approval.`,
          amount: meta.amount ? Number(meta.amount) : undefined,
          actorRole: log.actor_role,
          actorLabel,
          milestoneTitle,
          statusBadge: 'Awaiting Multisig',
          txHash,
          explorerUrl,
        });
        break;

      case 'MULTISIG_APPROVAL_SUBMITTED':
      case 'MULTISIG_APPROVAL':
        events.push({
          id: log.id,
          timestamp: log.created_at,
          type: 'MULTISIG_APPROVAL',
          title: 'Multisig Signer Authorized',
          description: `Authorized signer (${meta.signer_role || log.actor_role}) confirmed approval (${meta.current_approvals || 1}/2 threshold met).`,
          actorRole: log.actor_role,
          actorLabel,
          milestoneTitle,
          statusBadge: 'Signed',
          txHash,
          explorerUrl,
        });
        break;

      case 'FUNDS_RELEASED':
        events.push({
          id: log.id,
          timestamp: log.created_at,
          type: 'FUNDS_RELEASED',
          title: 'Funds Released to Beneficiary',
          description: `₹${Number(meta.amount || 0).toLocaleString('en-IN')} successfully released and anchored on smart contract.`,
          amount: meta.amount ? Number(meta.amount) : undefined,
          actorRole: 'SMART_CONTRACT',
          actorLabel: 'Smart Contract Escrow',
          milestoneTitle,
          statusBadge: 'Released & Confirmed',
          txHash,
          explorerUrl,
        });
        break;

      case 'REFUND_ISSUED':
        events.push({
          id: log.id,
          timestamp: log.created_at,
          type: 'REFUND_ISSUED',
          title: 'Refund Disbursed to Donor',
          description: `₹${Number(meta.amount || 0).toLocaleString('en-IN')} returned to donor due to milestone failure.`,
          amount: meta.amount ? Number(meta.amount) : undefined,
          actorRole: 'SMART_CONTRACT',
          actorLabel: 'Escrow Refund Engine',
          milestoneTitle,
          statusBadge: 'Refunded',
          txHash,
          explorerUrl,
        });
        break;

      case 'CHANGE_CAMPAIGN_STATUS':
        events.push({
          id: log.id,
          timestamp: log.created_at,
          type: 'STATUS_CHANGED',
          title: `Campaign Status Updated to ${meta.new_status || 'Updated'}`,
          description: `Status changed from ${meta.old_status || 'Unknown'} to ${meta.new_status}.`,
          actorRole: log.actor_role,
          actorLabel,
          statusBadge: meta.new_status,
        });
        break;

      default:
        events.push({
          id: log.id,
          timestamp: log.created_at,
          type: 'GENERIC_AUDIT',
          title: log.action.replace(/_/g, ' '),
          description: `Action recorded on ${log.entity_type}.`,
          actorRole: log.actor_role,
          actorLabel,
          txHash,
          explorerUrl,
        });
    }
  }

  // Also verify if there are any fund_transactions with blockchain_tx_hash not captured
  // to ensure 100% blockchain visibility
  const txRes = await query<{
    id: string;
    type: string;
    amount: number;
    transaction_hash: string;
    blockchain_tx_hash: string;
    created_at: string;
    milestone_id: string;
  }>(
    `SELECT id, type, amount::numeric, transaction_hash, blockchain_tx_hash, created_at, milestone_id
     FROM fund_transactions
     WHERE campaign_id = $1 AND (transaction_hash IS NOT NULL OR blockchain_tx_hash IS NOT NULL)
     ORDER BY created_at ASC`,
    [campaignId]
  );

  const existingTxHashes = new Set(events.map((e) => e.txHash).filter(Boolean));

  for (const ft of txRes.rows) {
    const hash = ft.blockchain_tx_hash || ft.transaction_hash;
    if (hash && !existingTxHashes.has(hash)) {
      existingTxHashes.add(hash);
      const milestoneTitle = ft.milestone_id ? milestoneMap.get(ft.milestone_id) : undefined;
      events.push({
        id: ft.id,
        timestamp: ft.created_at,
        type: ft.type === 'RELEASE' ? 'FUNDS_RELEASED' : ft.type === 'REFUND' ? 'REFUND_ISSUED' : 'GENERIC_AUDIT',
        title: `Blockchain Settlement (${ft.type})`,
        description: `On-chain confirmation of ₹${Number(ft.amount).toLocaleString('en-IN')} (${ft.type}).`,
        amount: Number(ft.amount),
        actorRole: 'BLOCKCHAIN',
        actorLabel: 'Smart Contract',
        milestoneTitle,
        statusBadge: 'Confirmed On-Chain',
        txHash: hash,
        explorerUrl: getExplorerTxUrl(chainId, hash),
      });
    }
  }

  // Sort chronologically ascending
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return events;
}

/**
 * Returns the transparent journey of a specific donation
 * from contribution to milestone allocation, verification, and on-chain release.
 */
export async function getDonationJourney(donationId: string, donorId: string) {
  const donationRes = await query<{
    id: string;
    campaign_id: string;
    amount: number;
    status: string;
    reference: string;
    transaction_hash: string;
    blockchain_tx_hash: string;
    blockchain_status: string;
    created_at: string;
    campaign_title: string;
    beneficiary: string;
    target_amount: number;
    raised_amount: number;
    released_amount: number;
  }>(
    `SELECT 
       d.id,
       d.campaign_id,
       d.amount::numeric as amount,
       d.status,
       d.reference,
       d.transaction_hash,
       d.blockchain_tx_hash,
       d.blockchain_status,
       d.created_at,
       c.title as campaign_title,
       c.beneficiary,
       c.target_amount::numeric as target_amount,
       c.raised_amount::numeric as raised_amount,
       c.released_amount::numeric as released_amount
     FROM donations d
     JOIN campaigns c ON d.campaign_id = c.id
     WHERE d.id = $1 AND d.donor_id = $2`,
    [donationId, donorId]
  );

  if (donationRes.rowCount === 0) {
    return null;
  }

  const donation = donationRes.rows[0];

  // Fetch campaign milestones to show allocation path
  const milestonesRes = await query<{
    id: string;
    title: string;
    description: string;
    amount: number;
    sequence: number;
    status: string;
    released_amount: number;
    blockchain_status: string;
  }>(
    `SELECT 
       id, title, description, amount::numeric as amount, sequence, status, 
       COALESCE(released_amount, 0)::numeric as released_amount, blockchain_status
     FROM milestones
     WHERE campaign_id = $1
     ORDER BY sequence ASC`,
    [donation.campaign_id]
  );

  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || 31337;
  const donationTxHash = donation.blockchain_tx_hash || donation.transaction_hash;

  // Build step-by-step transparent journey
  const stages = [
    {
      step: 1,
      title: 'Donation Received & Confirmed',
      description: `₹${Number(donation.amount).toLocaleString('en-IN')} contribution validated and received via reference ${donation.reference}.`,
      status: 'COMPLETED' as const,
      timestamp: donation.created_at,
      txHash: donationTxHash,
      explorerUrl: donationTxHash ? getExplorerTxUrl(chainId, donationTxHash) : undefined,
    },
    {
      step: 2,
      title: 'Earmarked to Campaign Escrow',
      description: `Funds bound exclusively to "${donation.campaign_title}". Locked in PostgreSQL accounting escrow.`,
      status: 'COMPLETED' as const,
      timestamp: donation.created_at,
    },
    {
      step: 3,
      title: 'Assigned to Milestone Allocation',
      description: `Allocated programmatically across campaign milestones for "${donation.beneficiary}".`,
      status: milestonesRes.rows.length > 0 ? ('COMPLETED' as const) : ('PENDING' as const),
    },
    {
      step: 4,
      title: 'Evidence Proof Submitted',
      description: 'NGO uploads vendor invoices, material receipts, and geotagged execution photos.',
      status: milestonesRes.rows.some((m) =>
        ['PROOF_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'RELEASED'].includes(m.status)
      )
        ? ('COMPLETED' as const)
        : ('PENDING' as const),
    },
    {
      step: 5,
      title: 'AI Verification & Human Auditor Review',
      description: 'OCR analyzes line items; certified auditor verifies and authorizes evidence.',
      status: milestonesRes.rows.some((m) => ['APPROVED', 'RELEASED'].includes(m.status))
        ? ('COMPLETED' as const)
        : ('PENDING' as const),
    },
    {
      step: 6,
      title: '2-of-3 Multi-Signature Authorization',
      description: 'Release request cryptographically approved by designated multisig signers.',
      status: milestonesRes.rows.some((m) => m.status === 'RELEASED')
        ? ('COMPLETED' as const)
        : ('PENDING' as const),
    },
    {
      step: 7,
      title: 'On-Chain Smart Contract Fund Release',
      description: 'Capital disbursed to vendor/beneficiary and anchored immutably on blockchain.',
      status: Number(donation.released_amount) > 0 ? ('COMPLETED' as const) : ('AWAITING_RELEASE' as const),
    },
  ];

  return {
    donation: {
      ...donation,
      amount: Number(donation.amount),
      target_amount: Number(donation.target_amount),
      raised_amount: Number(donation.raised_amount),
      released_amount: Number(donation.released_amount),
    },
    stages,
    milestones: milestonesRes.rows.map((m) => ({
      ...m,
      amount: Number(m.amount),
      released_amount: Number(m.released_amount),
    })),
  };
}
