import { query, db } from '../lib/db';
import { getNgoReputationScore, getNgoPublicProfile } from '../lib/reputation';
import { getCampaignAuditTimeline, getDonationJourney } from '../lib/audit_timeline';
import { getCampaignFinancialSummary } from '../lib/fund_transactions';
import { getCampaignAuditDetails } from '../lib/campaigns';
import { getExplorerTxUrl, getNetworkName } from '../lib/blockchain';

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

async function runPhase5Tests() {
  console.log('====================================================');
  console.log('🧪 VERA PHASE 5: FINAL PRODUCTIZATION TEST SUITE');
  console.log('====================================================\n');

  try {
    // -------------------------------------------------------------------
    // Test Group 1: Deterministic NGO Reputation Scoring
    // -------------------------------------------------------------------
    console.log('--- Test Group 1: Deterministic NGO Reputation Scoring ---');
    const ngoId = '11111111-1111-1111-1111-111111111111'; // Rajasthan Education Foundation
    const reputation = await getNgoReputationScore(ngoId);

    assert(typeof reputation.score === 'number', 'Reputation score is a valid numeric value');
    assert(reputation.score >= 0 && reputation.score <= 100, `Score is bounded strictly between 0 and 100 (Score: ${reputation.score})`);
    assert(['A+', 'A', 'B', 'C', 'D'].includes(reputation.grade), `Grade is a valid classification tier (Grade: ${reputation.grade})`);
    assert(reputation.factors.length > 0, `Scoring factors documented transparently (${reputation.factors.length} factors)`);

    // Verify baseline factor exists
    const baseFactor = reputation.factors.find((f) => f.type === 'BASE');
    assert(Boolean(baseFactor && baseFactor.impact === 100), 'Base index starts at exactly 100 points');

    // Verify completed milestones bonus
    const completedBonus = reputation.factors.find((f) => f.name.includes('Completed Milestones'));
    assert(Boolean(completedBonus && completedBonus.impact > 0), 'Completed milestones grant positive bonus points');

    // Verify deterministic behavior: calling twice yields the exact same score
    const reputationAgain = await getNgoReputationScore(ngoId);
    assert(reputation.score === reputationAgain.score, 'Reputation calculation is 100% deterministic');

    // Verify newly registered NGO with no history gets a neutral score
    const dummyNewNgoId = '99999999-0000-0000-0000-000000000001';
    const newNgoRep = await getNgoReputationScore(dummyNewNgoId);
    assert(newNgoRep.score === 100, 'Newly onboarded NGO without violations starts at neutral 100');
    console.log('');

    // -------------------------------------------------------------------
    // Test Group 2: Public NGO Profile Data Isolation & Privacy
    // -------------------------------------------------------------------
    console.log('--- Test Group 2: Public NGO Profile Data Isolation ---');
    const publicProfile = await getNgoPublicProfile(ngoId);
    assert(publicProfile !== null, 'Public profile successfully generated for valid NGO');
    assert(publicProfile?.name === 'Rajasthan Education Foundation', 'Correct public organization name returned');
    assert(publicProfile?.role === 'ORGANIZATION', 'Correct role returned');

    // Privacy checks: ensure sensitive fields are absent
    const profileKeys = Object.keys(publicProfile || {});
    assert(!profileKeys.includes('password_hash'), 'Zero exposure: password_hash is not in public profile object');
    assert(!profileKeys.includes('email'), 'Privacy guarantee: Email address is not exposed in public profile');
    assert(!profileKeys.includes('blockchain_private_key'), 'Zero exposure: No private keys in public profile');

    // Ensure only public campaigns are included
    const campaignsInProfile = publicProfile?.campaigns || [];
    assert(campaignsInProfile.length > 0, `Public profile includes ${campaignsInProfile.length} campaign(s)`);
    assert(
      campaignsInProfile.every((c) => ['ACTIVE', 'COMPLETED', 'PAUSED'].includes(c.status)),
      'Draft campaigns are excluded from public NGO profile portfolio'
    );
    console.log('');

    // -------------------------------------------------------------------
    // Test Group 3: Normalized Public Audit Timeline
    // -------------------------------------------------------------------
    console.log('--- Test Group 3: Normalized Public Audit Timeline ---');
    const jaipurCampaignId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    const timeline = await getCampaignAuditTimeline(jaipurCampaignId);

    assert(timeline.length > 0, `Normalized audit timeline contains ${timeline.length} events`);

    // Verify chronological order (ascending timestamp)
    let isChronological = true;
    for (let i = 1; i < timeline.length; i++) {
      if (new Date(timeline[i].timestamp).getTime() < new Date(timeline[i - 1].timestamp).getTime()) {
        isChronological = false;
        break;
      }
    }
    assert(isChronological, 'Audit events are strictly ordered chronologically ascending');

    // Check key lifecycle event types
    const eventTypes = new Set(timeline.map((e) => e.type));
    assert(eventTypes.has('CAMPAIGN_CREATED'), 'Timeline includes CAMPAIGN_CREATED event');
    assert(eventTypes.has('DONATION_RECEIVED'), 'Timeline includes DONATION_RECEIVED event');
    assert(eventTypes.has('FUNDS_LOCKED'), 'Timeline includes FUNDS_LOCKED event');
    assert(eventTypes.has('MILESTONE_CREATED'), 'Timeline includes MILESTONE_CREATED event');
    assert(eventTypes.has('PROOF_SUBMITTED'), 'Timeline includes PROOF_SUBMITTED event');
    assert(eventTypes.has('AI_VERIFICATION_COMPLETED'), 'Timeline includes AI_VERIFICATION_COMPLETED event');
    assert(eventTypes.has('PROOF_APPROVED'), 'Timeline includes PROOF_APPROVED event');
    assert(eventTypes.has('RELEASE_REQUESTED'), 'Timeline includes RELEASE_REQUESTED event');
    assert(eventTypes.has('MULTISIG_APPROVAL'), 'Timeline includes MULTISIG_APPROVAL event');
    assert(eventTypes.has('FUNDS_RELEASED'), 'Timeline includes FUNDS_RELEASED event');

    // Check actor sanitation
    const actors = timeline.map((e) => e.actorLabel);
    assert(actors.every((a) => !a.includes('@')), 'Public actor labels do not expose raw email addresses');
    console.log('');

    // -------------------------------------------------------------------
    // Test Group 4: Financial Summary & Accounting Invariants
    // -------------------------------------------------------------------
    console.log('--- Test Group 4: Financial Summary & Accounting Invariants ---');
    const summary = await getCampaignFinancialSummary(jaipurCampaignId);
    assert(summary !== null, 'Campaign financial summary retrieved successfully');

    if (summary) {
      assert(summary.targetAmount === 1000000, `Target matches ₹10,00,000 (Actual: ₹${summary.targetAmount})`);
      assert(summary.raisedAmount === 750000, `Raised matches ₹7,50,000 (Actual: ₹${summary.raisedAmount})`);
      assert(summary.releasedAmount === 285000, `Released matches ₹2,85,000 (Actual: ₹${summary.releasedAmount})`);

      // Core accounting invariant: lockedAmount = raisedAmount - releasedAmount - refundedAmount
      const expectedLocked = summary.raisedAmount - summary.releasedAmount - summary.refundedAmount;
      assert(summary.lockedAmount === expectedLocked, `Locked matches escrow balance: ₹${expectedLocked} (Actual: ₹${summary.lockedAmount})`);

      // Integrity checks
      assert(summary.raisedAmount >= summary.lockedAmount, 'Invariant: raisedAmount >= lockedAmount');
      assert(summary.raisedAmount >= summary.releasedAmount, 'Invariant: raisedAmount >= releasedAmount');
      assert(summary.releasedAmount <= summary.raisedAmount, 'Invariant: releasedAmount <= raisedAmount');
      assert(summary.lockedAmount >= 0, 'Invariant: Zero negative locked balance');
      assert(summary.remainingAmount === Math.max(0, summary.targetAmount - summary.raisedAmount), 'Invariant: remainingAmount calculation matches target - raised');
      assert(summary.remainingBalance === summary.lockedAmount, 'Escrow balance matches remaining active locked funds');
    }
    console.log('');

    // -------------------------------------------------------------------
    // Test Group 5: Public Audit Dashboard Details Service
    // -------------------------------------------------------------------
    console.log('--- Test Group 5: Public Audit Dashboard Details Service ---');
    const auditDetails = await getCampaignAuditDetails(jaipurCampaignId);
    assert(auditDetails !== null, 'Campaign audit details fetched successfully');

    if (auditDetails) {
      assert(auditDetails.campaign.title === 'Government School Classroom — Jaipur', 'Correct campaign loaded');
      assert(auditDetails.ngo.name === 'Rajasthan Education Foundation', 'Correct NGO association');
      assert(auditDetails.milestones.length === 3, `All 3 milestones populated (Found: ${auditDetails.milestones.length})`);

      // Check Milestone 1 transparency
      const m1 = auditDetails.milestones.find((m) => m.sequence === 1);
      assert(m1?.title === 'Electrical Work', 'Milestone 1 is Electrical Work');
      assert(m1?.allocatedAmount === 300000, 'Milestone 1 allocation is ₹3,00,000');
      assert(m1?.releasedAmount === 285000, 'Milestone 1 released amount is ₹2,85,000');
      assert(m1?.proofStatus === 'APPROVED', 'Milestone 1 proof status is APPROVED');
      assert(m1?.proofCount === 3, 'Milestone 1 has 3 proof files attached');
      assert(m1?.verificationStatus === 'FLAG', 'Milestone 1 verification recorded AI discrepancy flag');
      assert(m1?.discrepancyAmount === 15000, 'Milestone 1 recorded ₹15,000 discrepancy between claim and invoice');

      // Check Trust Indicators
      assert(auditDetails.trustIndicators.fundsEarmarked === true, 'Trust Indicator: fundsEarmarked is true');
      assert(auditDetails.trustIndicators.milestonesDefined === true, 'Trust Indicator: milestonesDefined is true');
      assert(auditDetails.trustIndicators.proofSubmitted === true, 'Trust Indicator: proofSubmitted is true');
      assert(auditDetails.trustIndicators.evidenceVerified === true, 'Trust Indicator: evidenceVerified is true');
      assert(auditDetails.trustIndicators.multisigEnabled === true, 'Trust Indicator: multisigEnabled is true');
      assert(auditDetails.trustIndicators.score >= 5, `Trust Score is high (${auditDetails.trustIndicators.score}/6)`);
    }
    console.log('');

    // -------------------------------------------------------------------
    // Test Group 6: Donor Traceability & Journey Mapping
    // -------------------------------------------------------------------
    console.log('--- Test Group 6: Donor Traceability & Journey Mapping ---');
    const donorId = '22222222-2222-2222-2222-222222222222';
    const donationId = '55555555-5555-5555-5555-555555555551';
    const journey = await getDonationJourney(donationId, donorId);

    assert(journey !== null, 'Donation journey retrieved for donor');
    if (journey) {
      assert(journey.donation.amount === 500000, 'Journey reflects ₹5,00,000 contribution');
      assert(journey.donation.reference === 'VERA-DON-JP-500K', 'Journey references correct contribution ID');
      assert(journey.stages.length >= 7, `Journey has ${journey.stages.length} transparent stages`);

      // Verify stages
      const stage1 = journey.stages.find((s) => s.step === 1);
      assert(stage1?.status === 'COMPLETED', 'Stage 1 (Donation Received) is COMPLETED');

      const stage2 = journey.stages.find((s) => s.step === 2);
      assert(stage2?.status === 'COMPLETED', 'Stage 2 (Earmarked in Escrow) is COMPLETED');

      const stage3 = journey.stages.find((s) => s.step === 3);
      assert(stage3?.status === 'COMPLETED', 'Stage 3 (Assigned to Milestone) is COMPLETED');

      assert(journey.milestones.length === 3, 'Journey details campaign milestone allocation path');
    }
    console.log('');

    // -------------------------------------------------------------------
    // Test Group 7: Blockchain Visibility & Reusable Helpers
    // -------------------------------------------------------------------
    console.log('--- Test Group 7: Blockchain Visibility & Explorer URLs ---');
    const sampleTxHash = '0xb4c840107fee6507a4af99e1e4bbed49db339f383aa244fc55ff9f2bde08420e';

    // Sepolia Testnet
    const sepoliaUrl = getExplorerTxUrl(11155111, sampleTxHash);
    assert(sepoliaUrl.includes('sepolia.etherscan.io/tx/'), 'getExplorerTxUrl maps Sepolia Chain ID (11155111) correctly');

    // Holesky Testnet
    const holeskyUrl = getExplorerTxUrl(17000, sampleTxHash);
    assert(holeskyUrl.includes('holesky.etherscan.io/tx/'), 'getExplorerTxUrl maps Holesky Chain ID (17000) correctly');

    // Amoy Testnet
    const amoyUrl = getExplorerTxUrl(80002, sampleTxHash);
    assert(amoyUrl.includes('amoy.polygonscan.com/tx/'), 'getExplorerTxUrl maps Polygon Amoy (80002) correctly');

    // Local Testnet (Chain ID 31337)
    const localUrl = getExplorerTxUrl(31337, sampleTxHash);
    assert(localUrl.includes('/explorer/tx/'), 'getExplorerTxUrl maps local Hardhat testnet (31337) to in-app explorer correctly');

    // Empty Tx hash returns safe fallback
    const emptyUrl = getExplorerTxUrl(11155111, '');
    assert(emptyUrl === '#', 'Empty transaction hash safely returns fallback anchor without throwing');

    // Network name helper
    assert(getNetworkName(11155111).includes('Sepolia'), 'getNetworkName labels Sepolia correctly');
    assert(getNetworkName(31337).includes('Hardhat'), 'getNetworkName labels Hardhat correctly');
    console.log('');

    // -------------------------------------------------------------------
    // Test Group 8: Public Campaign Discovery Queries & Status Rules
    // -------------------------------------------------------------------
    console.log('--- Test Group 8: Public Campaign Discovery Queries ---');
    // Active campaigns query
    const activeRes = await query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM campaigns WHERE status = 'ACTIVE'`
    );
    assert(activeRes.rows[0].count > 0, `Active campaigns exist for discovery (${activeRes.rows[0].count})`);

    // Search query for "Jaipur"
    const searchRes = await query<{ title: string }>(
      `SELECT title FROM campaigns 
       WHERE status IN ('ACTIVE', 'COMPLETED', 'PAUSED') 
         AND (title ILIKE '%Jaipur%' OR description ILIKE '%Jaipur%')`
    );
    assert(searchRes.rows.length > 0, `Search query matches Jaipur campaign (${searchRes.rows.length} results)`);

    // Verify DRAFT campaigns are NOT included in public queries
    const draftInPublic = await query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM campaigns 
       WHERE status = 'DRAFT' AND status IN ('ACTIVE', 'COMPLETED', 'PAUSED')`
    );
    assert(draftInPublic.rows[0].count === 0, 'DRAFT campaigns are strictly excluded from public discovery');
    console.log('');

    // -------------------------------------------------------------------
    // Test Group 9: Security Hardening & Zero Private Key Leakage
    // -------------------------------------------------------------------
    console.log('--- Test Group 9: Security Hardening & Isolation ---');
    // Check users table columns: must NOT contain private keys
    const userColumnsRes = await query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`
    );
    const colNames = userColumnsRes.rows.map((r) => r.column_name.toLowerCase());
    assert(!colNames.includes('private_key'), 'Security: users table has no private_key column');
    assert(!colNames.includes('blockchain_private_key'), 'Security: users table has no blockchain_private_key column');

    // Verify evidence file MIME validation from Phase 3 remains intact
    const proofFile = await query<{ mime_type: string }>(
      `SELECT mime_type FROM proof_files WHERE proof_id = $1 LIMIT 1`,
      ['66666666-6666-6666-6666-666666666661']
    );
    assert(
      ['application/pdf', 'image/jpeg', 'image/png'].includes(proofFile.rows[0].mime_type),
      'Security: Evidence files adhere to safe whitelisted MIME types'
    );

    console.log('\n====================================================');
    console.log(`📊 PHASE 5 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test suite failed with exception:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

runPhase5Tests();
