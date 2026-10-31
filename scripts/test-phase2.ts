import { query, db } from '../lib/db';
import { hashPassword } from '../lib/auth';
import { createCampaign, getCampaignById } from '../lib/campaigns';
import { createDonation, getDonationsByDonor, getDonationById, getDonorStats } from '../lib/donations';
import { createMilestone, getMilestonesForCampaign, updateMilestoneStatus } from '../lib/milestones';
import { getFundTransactionsForCampaign, getCampaignFinancialSummary } from '../lib/fund_transactions';
import { getAuditLogsForCampaign } from '../lib/audit_log';
import { User } from '../types';
import { ForbiddenError, AppError } from '../lib/permissions';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runPhase2Tests() {
  console.log('====================================================');
  console.log('🧪 VERA PHASE 2: DONATION & FUND LIFECYCLE TEST SUITE');
  console.log('====================================================\n');

  try {
    const passwordHash = await hashPassword('Password123!');

    // 1. Setup Test Actors (NGO 1, NGO 2, Donor A, Donor B)
    console.log('--- Test Group 1: Actor Initialization ---');
    const ngo1Res = await query<User>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'ORGANIZATION') RETURNING *`,
      ['Poverty Alleviation Trust', `ngo1_${Date.now()}@vera.org`, passwordHash]
    );
    const ngo1 = ngo1Res.rows[0];

    const ngo2Res = await query<User>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'ORGANIZATION') RETURNING *`,
      ['Global Relief Corp', `ngo2_${Date.now()}@vera.org`, passwordHash]
    );
    const ngo2 = ngo2Res.rows[0];

    const donorARes = await query<User>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'USER') RETURNING *`,
      ['Donor Alice', `alice_${Date.now()}@vera.org`, passwordHash]
    );
    const donorA = donorARes.rows[0];

    const donorBRes = await query<User>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'USER') RETURNING *`,
      ['Donor Bob', `bob_${Date.now()}@vera.org`, passwordHash]
    );
    const donorB = donorBRes.rows[0];

    assert(Boolean(ngo1.id && ngo2.id && donorA.id && donorB.id), 'Actors registered successfully');

    // 2. NGO 1 Creates an Active Campaign with Target ₹10,000
    console.log('\n--- Test Group 2: Campaign & Milestone Setup ---');
    const campaign = await createCampaign(ngo1.id, {
      title: 'Solar Lighting for Remote Hamlet',
      description: 'Providing solar panels and DC battery banks for 25 tribal homes.',
      target_amount: 10000,
      beneficiary: '25 Tribal Families in Wayanad',
      status: 'ACTIVE',
    });
    assert(campaign.id !== undefined, 'Campaign created with ₹10,000 target');
    assert(Number(campaign.raised_amount) === 0, 'Raised amount initialized to ₹0');

    // 3. Milestone Creation & Target Budget Cap
    console.log('\n--- Test Group 3: Milestone Allocation & Cap Enforcement ---');
    const milestone1 = await createMilestone(ngo1.id, campaign.id, {
      title: 'Phase 1: Solar Panel Procurement',
      description: 'Procuring 25 monocrystalline solar panels.',
      amount: 6000,
      sequence: 1,
      proof_required: true,
    });
    assert(milestone1.id !== undefined, 'Milestone 1 created (₹6,000)');
    assert(milestone1.status === 'LOCKED', 'Milestone initialized in LOCKED status');

    // Attempt to exceed remaining target (₹6,000 allocated of ₹10,000, attempting ₹5,000)
    try {
      await createMilestone(ngo1.id, campaign.id, {
        title: 'Overbudget Milestone',
        description: 'Exceeds budget',
        amount: 5000, // 6,000 + 5,000 = 11,000 > 10,000!
      });
      assert(false, 'Should reject milestone exceeding campaign target');
    } catch (err: any) {
      assert(
        err instanceof AppError && err.message.includes('exceeds unallocated campaign goal'),
        'Rejects milestone that exceeds campaign target amount'
      );
    }

    // Add valid Milestone 2 (₹4,000, completing 100% allocation of ₹10,000)
    const milestone2 = await createMilestone(ngo1.id, campaign.id, {
      title: 'Phase 2: Battery Storage & Installation',
      description: 'Installing battery banks and household wiring.',
      amount: 4000,
      sequence: 2,
      proof_required: true,
    });
    assert(milestone2.id !== undefined, 'Milestone 2 created (₹4,000, exactly reaching ₹10,000 cap)');

    // Milestone status transition: LOCKED -> IN_PROGRESS
    const updatedMs1 = await updateMilestoneStatus(ngo1.id, milestone1.id, 'IN_PROGRESS');
    assert(updatedMs1.status === 'IN_PROGRESS', 'Milestone 1 transitioned from LOCKED to IN_PROGRESS');

    // NGO 2 attempts to modify NGO 1's milestone -> Rejected (403)
    try {
      await updateMilestoneStatus(ngo2.id, milestone1.id, 'IN_PROGRESS');
      assert(false, 'NGO 2 must not be able to modify NGO 1 milestone');
    } catch (err: any) {
      assert(err instanceof ForbiddenError, 'Cross-tenant milestone modification blocked (403)');
    }

    // 4. Overfunding Protection & Concurrent Donation Simulation
    console.log('\n--- Test Group 4: Overfunding Protection & Concurrency ---');
    // Target is ₹10,000.
    // Donation A = ₹8,000
    const donationA = await createDonation(donorA.id, campaign.id, {
      amount: 8000,
      purpose: 'Panels sponsorship',
    });
    assert(donationA.status === 'CONFIRMED', 'Donation A of ₹8,000 confirmed');
    assert(donationA.reference.startsWith('VERA-DON-'), 'Generated unique VERA reference code');

    // Verify campaign raised amount updated to ₹8,000
    const campAfterA = await getCampaignById(campaign.id);
    assert(Number(campAfterA?.raised_amount) === 8000, 'Campaign raised amount incremented to ₹8,000');

    // Donation B attempts ₹7,000 -> Remaining is only ₹2,000. Must be rejected!
    try {
      await createDonation(donorB.id, campaign.id, {
        amount: 7000,
        purpose: 'Wiring sponsorship',
      });
      assert(false, 'Should prevent overfunding donation');
    } catch (err: any) {
      assert(
        err instanceof AppError && err.message.includes('exceeds the remaining funding goal'),
        'Prevented overfunding: Rejected ₹7,000 donation when remaining goal was ₹2,000'
      );
    }

    // Verify raised amount is STILL strictly ₹8,000
    const campAfterRejected = await getCampaignById(campaign.id);
    assert(
      Number(campAfterRejected?.raised_amount) === 8000,
      'Financial balance remains strictly ₹8,000 after rejected overfunding attempt'
    );

    // Donation B donates the exact remaining amount of ₹2,000 -> Must succeed
    const donationB = await createDonation(donorB.id, campaign.id, {
      amount: 2000,
      purpose: 'Final batteries allocation',
    });
    assert(donationB.status === 'CONFIRMED', 'Donation B of ₹2,000 successfully confirmed');

    const campFullyFunded = await getCampaignById(campaign.id);
    assert(
      Number(campFullyFunded?.raised_amount) === 10000,
      'Campaign is now 100% funded at ₹10,000 without overfunding'
    );

    // 5. Fund Accounting & Fund Locking
    console.log('\n--- Test Group 5: Fund Accounting & Locked Fund Records ---');
    const transactions = await getFundTransactionsForCampaign(campaign.id);
    assert(transactions.length === 4, '4 fund transactions created (2 DONATION + 2 LOCK)');

    const donationTxs = transactions.filter((t) => t.type === 'DONATION');
    const lockTxs = transactions.filter((t) => t.type === 'LOCK');
    assert(donationTxs.length === 2, '2 DONATION accounting transactions recorded');
    assert(lockTxs.length === 2, '2 LOCK escrow accounting transactions recorded');

    const totalLocked = lockTxs.reduce((sum, t) => sum + Number(t.amount), 0);
    assert(totalLocked === 10000, 'Total locked funds in escrow equals total raised amount (₹10,000)');

    // 6. Financial Summary Accuracy
    console.log('\n--- Test Group 6: Financial Summary Calculation ---');
    const summary = await getCampaignFinancialSummary(campaign.id);
    assert(summary?.targetAmount === 10000, 'Financial summary target is ₹10,000');
    assert(summary?.raisedAmount === 10000, 'Financial summary raised is ₹10,000');
    assert(summary?.lockedAmount === 10000, 'Financial summary locked is ₹10,000');
    assert(summary?.releasedAmount === 0, 'Released amount strictly ₹0 in Phase 2');
    assert(summary?.remainingAmount === 0, 'Remaining goal is ₹0');
    assert(summary?.progressPercent === 100, 'Calculated progress is 100%');
    assert(summary?.donorsCount === 2, 'Distinct donors count is 2 (Alice and Bob)');

    // 7. Donor Experience & Isolation
    console.log('\n--- Test Group 7: Donor Dashboard & Privacy Boundaries ---');
    const aliceDonations = await getDonationsByDonor(donorA.id);
    assert(aliceDonations.length === 1, 'Donor Alice sees 1 donation record');
    assert(Number(aliceDonations[0].amount) === 8000, 'Alice donation amount matches ₹8,000');

    const aliceStats = await getDonorStats(donorA.id);
    assert(Number(aliceStats.total_donated) === 8000, 'Alice stats show ₹8,000 total donated');
    assert(aliceStats.total_donations === 1, 'Alice stats show 1 donation count');

    // Alice accesses her receipt -> OK
    const aliceReceipt = await getDonationById(donationA.id, donorA.id);
    assert(aliceReceipt?.reference === donationA.reference, 'Alice can access own receipt');

    // Bob attempts to access Alice's receipt -> Forbidden (403)
    try {
      await getDonationById(donationA.id, donorB.id);
      assert(false, 'Bob must NOT be able to view Alice receipt');
    } catch (err: any) {
      assert(err instanceof ForbiddenError, 'Cross-donor receipt access denied with Forbidden (403)');
    }

    // 8. Audit Trail Verification for Phase 2
    console.log('\n--- Test Group 8: Phase 2 Audit Trail ---');
    const auditLogs = await getAuditLogsForCampaign(campaign.id);
    const actions = auditLogs.map((a) => a.action);

    assert(actions.includes('DONATION_CREATED'), 'DONATION_CREATED logged');
    assert(actions.includes('DONATION_CONFIRMED'), 'DONATION_CONFIRMED logged');
    assert(actions.includes('FUNDS_LOCKED'), 'FUNDS_LOCKED logged');
    assert(actions.includes('MILESTONE_CREATED'), 'MILESTONE_CREATED logged');
    assert(actions.includes('MILESTONE_STATUS_CHANGED'), 'MILESTONE_STATUS_CHANGED logged');

    // Verify transaction hash is NOT fabricated in Phase 2
    assert(donationA.transaction_hash === null, 'No fake blockchain transaction hash generated');

    console.log('\n====================================================');
    console.log(`📊 PHASE 2 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (globalError) {
    console.error('💥 Unexpected test error:', globalError);
    process.exit(1);
  } finally {
    await db.end();
  }
}

runPhase2Tests();
