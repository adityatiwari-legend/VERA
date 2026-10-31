import { query } from './db';

export interface ReputationFactor {
  name: string;
  impact: number;
  type: 'BASE' | 'BONUS' | 'PENALTY';
  description: string;
}

export interface NgoReputation {
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  badge: string;
  summary: string;
  factors: ReputationFactor[];
  stats: {
    totalCampaigns: number;
    activeCampaigns: number;
    completedCampaigns: number;
    totalRaised: number;
    totalReleased: number;
    milestonesTotal: number;
    milestonesCompleted: number;
    milestonesFailed: number;
    proofsSubmitted: number;
    proofsApproved: number;
    proofsRejected: number;
    discrepanciesCount: number;
    refundsCount: number;
    approvalRatePercent: number;
    utilizationRatePercent: number;
  };
}

export interface PublicNgoProfile {
  id: string;
  name: string;
  role: string;
  createdAt: string;
  reputation: NgoReputation;
  campaigns: Array<{
    id: string;
    title: string;
    description: string;
    targetAmount: number;
    raisedAmount: number;
    releasedAmount: number;
    status: string;
    beneficiary: string;
    createdAt: string;
    milestonesCount: number;
  }>;
}

/**
 * Calculates a 100% deterministic NGO reputation score (0–100)
 * based on verified campaign, milestone, proof, verification, and refund records.
 *
 * FORMULA:
 * Base Score: 100
 * Penalties:
 *  - Failed Milestone: -15 pts each
 *  - Rejected Proof: -10 pts each
 *  - Discrepancy Flag: -5 pts each
 *  - Refund Event: -10 pts each
 * Bonuses:
 *  - Completed/Released Milestone: +10 pts each (up to +30 max)
 *  - High Proof Approval (100% with >= 1 proof): +5 pts
 *  - High Fund Utilization (>= 70% released/raised with zero discrepancies): +5 pts
 * Normalization:
 *  - Clamped strictly between 0 and 100.
 */
export async function getNgoReputationScore(ngoId: string): Promise<NgoReputation> {
  // 1. Gather all NGO campaign IDs
  const campaignsRes = await query<{
    id: string;
    status: string;
    target_amount: number;
    raised_amount: number;
    released_amount: number;
  }>(
    `SELECT id, status, target_amount::numeric, raised_amount::numeric, released_amount::numeric
     FROM campaigns
     WHERE ngo_id = $1`,
    [ngoId]
  );

  const campaignIds = campaignsRes.rows.map((c) => c.id);
  const totalCampaigns = campaignsRes.rows.length;
  const activeCampaigns = campaignsRes.rows.filter((c) => c.status === 'ACTIVE').length;
  const completedCampaigns = campaignsRes.rows.filter((c) => c.status === 'COMPLETED').length;

  const totalRaised = campaignsRes.rows.reduce((sum, c) => sum + Number(c.raised_amount), 0);
  const totalReleased = campaignsRes.rows.reduce((sum, c) => sum + Number(c.released_amount), 0);

  if (campaignIds.length === 0) {
    return {
      score: 100,
      grade: 'A',
      badge: 'New Organization',
      summary: 'New organization with no historical penalties or violations.',
      factors: [
        {
          name: 'Base Neutral Score',
          impact: 100,
          type: 'BASE',
          description: 'Default baseline rating for newly onboarded organizations.',
        },
      ],
      stats: {
        totalCampaigns: 0,
        activeCampaigns: 0,
        completedCampaigns: 0,
        totalRaised: 0,
        totalReleased: 0,
        milestonesTotal: 0,
        milestonesCompleted: 0,
        milestonesFailed: 0,
        proofsSubmitted: 0,
        proofsApproved: 0,
        proofsRejected: 0,
        discrepanciesCount: 0,
        refundsCount: 0,
        approvalRatePercent: 100,
        utilizationRatePercent: 0,
      },
    };
  }

  // 2. Gather Milestones data
  const milestonesRes = await query<{
    id: string;
    status: string;
  }>(
    `SELECT id, status
     FROM milestones
     WHERE campaign_id = ANY($1::uuid[])`,
    [campaignIds]
  );

  const milestonesTotal = milestonesRes.rows.length;
  const milestonesCompleted = milestonesRes.rows.filter(
    (m) => m.status === 'APPROVED' || m.status === 'RELEASED'
  ).length;
  const milestonesFailed = milestonesRes.rows.filter((m) => m.status === 'FAILED').length;

  // 3. Gather Proofs and Verification data
  const milestoneIds = milestonesRes.rows.map((m) => m.id);
  let proofsSubmitted = 0;
  let proofsApproved = 0;
  let proofsRejected = 0;
  let discrepanciesCount = 0;

  if (milestoneIds.length > 0) {
    const proofsRes = await query<{
      id: string;
      status: string;
    }>(
      `SELECT id, status
       FROM proofs
       WHERE milestone_id = ANY($1::uuid[])`,
      [milestoneIds]
    );

    proofsSubmitted = proofsRes.rows.length;
    proofsApproved = proofsRes.rows.filter((p) => p.status === 'APPROVED').length;
    proofsRejected = proofsRes.rows.filter((p) => p.status === 'REJECTED').length;

    const proofIds = proofsRes.rows.map((p) => p.id);
    if (proofIds.length > 0) {
      const verifRes = await query<{ discrepancy_count: number }>(
        `SELECT COUNT(*)::int as discrepancy_count
         FROM verification_results
         WHERE proof_id = ANY($1::uuid[]) AND (ai_status = 'FLAG' OR discrepancy_amount > 0)`,
        [proofIds]
      );
      discrepanciesCount = verifRes.rows[0]?.discrepancy_count || 0;
    }
  }

  // 4. Gather Refund counts from fund_transactions
  const refundsRes = await query<{ refunds_count: number }>(
    `SELECT COUNT(*)::int as refunds_count
     FROM fund_transactions
     WHERE campaign_id = ANY($1::uuid[]) AND type = 'REFUND'`,
    [campaignIds]
  );
  const refundsCount = refundsRes.rows[0]?.refunds_count || 0;

  // 5. Calculate Score & Factors
  const factors: ReputationFactor[] = [
    {
      name: 'Baseline Trust Index',
      impact: 100,
      type: 'BASE',
      description: 'Starting baseline index for verified organizations.',
    },
  ];

  let calculatedScore = 100;

  // Penalties
  if (milestonesFailed > 0) {
    const penalty = milestonesFailed * 15;
    calculatedScore -= penalty;
    factors.push({
      name: 'Failed Milestones Penalty',
      impact: -penalty,
      type: 'PENALTY',
      description: `${milestonesFailed} milestone(s) failed or cancelled (-15 pts each).`,
    });
  }

  if (proofsRejected > 0) {
    const penalty = proofsRejected * 10;
    calculatedScore -= penalty;
    factors.push({
      name: 'Rejected Proofs Penalty',
      impact: -penalty,
      type: 'PENALTY',
      description: `${proofsRejected} proof submission(s) rejected by auditor (-10 pts each).`,
    });
  }

  if (discrepanciesCount > 0) {
    const penalty = discrepanciesCount * 5;
    calculatedScore -= penalty;
    factors.push({
      name: 'AI Discrepancy Flags',
      impact: -penalty,
      type: 'PENALTY',
      description: `${discrepanciesCount} discrepancy flag(s) identified during evidence audit (-5 pts each).`,
    });
  }

  if (refundsCount > 0) {
    const penalty = refundsCount * 10;
    calculatedScore -= penalty;
    factors.push({
      name: 'Donor Refund Invocations',
      impact: -penalty,
      type: 'PENALTY',
      description: `${refundsCount} refund transaction(s) triggered for unfulfilled initiatives (-10 pts each).`,
    });
  }

  // Positive Factors
  if (milestonesCompleted > 0) {
    const bonus = Math.min(30, milestonesCompleted * 10);
    calculatedScore += bonus;
    factors.push({
      name: 'Completed Milestones Bonus',
      impact: bonus,
      type: 'BONUS',
      description: `${milestonesCompleted} milestone(s) successfully verified and released (+10 pts each, capped at +30).`,
    });
  }

  const approvalRatePercent =
    proofsSubmitted > 0 ? Math.round((proofsApproved / proofsSubmitted) * 100) : 100;

  if (proofsSubmitted >= 1 && approvalRatePercent === 100) {
    calculatedScore += 5;
    factors.push({
      name: 'Flawless Evidence Verification',
      impact: 5,
      type: 'BONUS',
      description: '100% proof approval rate with zero auditor rejections (+5 pts).',
    });
  }

  const utilizationRatePercent =
    totalRaised > 0 ? Math.min(100, Math.round((totalReleased / totalRaised) * 100)) : 0;

  if (utilizationRatePercent >= 70 && discrepanciesCount === 0) {
    calculatedScore += 5;
    factors.push({
      name: 'Clean High Fund Utilization',
      impact: 5,
      type: 'BONUS',
      description: 'Over 70% of raised capital released to beneficiaries without discrepancy flags (+5 pts).',
    });
  }

  // Normalize bounded 0–100
  const normalizedScore = Math.max(0, Math.min(100, Math.round(calculatedScore)));

  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'D';
  let badge = 'Needs Improvement';
  let summary = 'Requires enhanced milestone delivery and documentation compliance.';

  if (normalizedScore >= 95) {
    grade = 'A+';
    badge = 'Exemplary Transparency';
    summary = 'Outstanding verifiable track record with consistent milestone completion and verified evidence.';
  } else if (normalizedScore >= 85) {
    grade = 'A';
    badge = 'High Integrity';
    summary = 'Strong record of accountability and transparent evidence submissions.';
  } else if (normalizedScore >= 70) {
    grade = 'B';
    badge = 'Reliable Partner';
    summary = 'Consistent milestone progress with standard audit compliance.';
  } else if (normalizedScore >= 55) {
    grade = 'C';
    badge = 'Moderate Standing';
    summary = 'Moderate compliance with some proof or milestone delays.';
  }

  return {
    score: normalizedScore,
    grade,
    badge,
    summary,
    factors,
    stats: {
      totalCampaigns,
      activeCampaigns,
      completedCampaigns,
      totalRaised,
      totalReleased,
      milestonesTotal,
      milestonesCompleted,
      milestonesFailed,
      proofsSubmitted,
      proofsApproved,
      proofsRejected,
      discrepanciesCount,
      refundsCount,
      approvalRatePercent,
      utilizationRatePercent,
    },
  };
}

/**
 * Returns public-safe NGO profile without sensitive credentials,
 * internal comments, or private contact information.
 */
export async function getNgoPublicProfile(ngoId: string): Promise<PublicNgoProfile | null> {
  const userRes = await query<{
    id: string;
    name: string;
    role: string;
    created_at: string;
  }>(
    `SELECT id, name, role, created_at
     FROM users
     WHERE id = $1 AND role = 'ORGANIZATION'`,
    [ngoId]
  );

  if (userRes.rowCount === 0) {
    return null;
  }

  const user = userRes.rows[0];
  const reputation = await getNgoReputationScore(ngoId);

  // Fetch public campaigns (ACTIVE, COMPLETED, PAUSED)
  const campaignsRes = await query<{
    id: string;
    title: string;
    description: string;
    target_amount: number;
    raised_amount: number;
    released_amount: number;
    status: string;
    beneficiary: string;
    created_at: string;
    milestones_count: number;
  }>(
    `SELECT 
       c.id,
       c.title,
       c.description,
       c.target_amount::numeric as target_amount,
       c.raised_amount::numeric as raised_amount,
       c.released_amount::numeric as released_amount,
       c.status,
       c.beneficiary,
       c.created_at,
       COUNT(m.id)::int as milestones_count
     FROM campaigns c
     LEFT JOIN milestones m ON c.id = m.campaign_id
     WHERE c.ngo_id = $1 AND c.status IN ('ACTIVE', 'COMPLETED', 'PAUSED')
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
    [ngoId]
  );

  return {
    id: user.id,
    name: user.name,
    role: user.role,
    createdAt: user.created_at,
    reputation,
    campaigns: campaignsRes.rows.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      targetAmount: Number(c.target_amount),
      raisedAmount: Number(c.raised_amount),
      releasedAmount: Number(c.released_amount),
      status: c.status,
      beneficiary: c.beneficiary,
      createdAt: c.created_at,
      milestonesCount: c.milestones_count,
    })),
  };
}
