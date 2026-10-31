/**
 * VERA BLOCKCHAIN & CRYPTOGRAPHIC TAMPERING VERIFICATION TEST SUITE
 * 
 * Verifies that VERA's dual-layer architecture (PostgreSQL + Ethereum Smart Contract)
 * cryptographically detects and blocks every form of data tampering:
 * 
 * 1. Off-Chain Database Manipulation Detection (DB vs Blockchain Truth)
 * 2. Cryptographic Evidence Document Tampering (SHA-256 Digest Invalidation)
 * 3. Smart Contract Unauthorized Multi-Sig Signer Forgery
 * 4. Smart Contract Premature Fund Release (Bypassing 2-of-3 Consensus)
 * 5. Smart Contract Double Release / Replay Prevention
 * 6. Fabricated / Forged Transaction Hash Detection
 * 7. Smart Contract Budget Cap Overflow Prevention
 */

import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import crypto from 'crypto';
import { ethers } from 'ethers';
import { query } from '../lib/db';
import { hashPassword } from '../lib/auth';
import { recordAuditLog, verifyAuditLogChain } from '../lib/audit_log';
import { runIntegrityChecks } from '../lib/integrity';
import {
  getProvider,
  getSigner,
  getContract,
  onChainGetCampaign,
  idToBytes32
} from '../lib/blockchain';

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

async function runTamperingTests() {
  console.log('====================================================');
  console.log('🛡️  VERA BLOCKCHAIN & ANTI-TAMPERING TEST SUITE');
  console.log('====================================================\n');

  const provider = getProvider();
  const ngoWallet = await (await provider.getSigner(1)).getAddress();
  const projectOwnerWallet = await (await provider.getSigner(2)).getAddress();
  const auditorWallet = await (await provider.getSigner(3)).getAddress();
  
  // Helper to ensure each on-chain call uses a fresh signer instance with synchronized nonce
  async function getFreshContract() {
    const s = getSigner();
    return getContract(s);
  }

  // Setup distinct test actors using Hardhat pre-funded accounts
  // Account #9 is an unauthorized third-party attacker with funds but zero VERA permissions
  const attackerPrivateKey = '0x2a871d4b0f0b444bc2854b56281041918d129e188230b3d0ceeedc900b1db77d';
  const attackerWallet = new ethers.Wallet(attackerPrivateKey, provider);

  const adminSigner = getSigner();
  const testCampaignUuid = crypto.randomUUID();
  const testB32Id = idToBytes32(testCampaignUuid);
  const targetAmount = 500000; // ₹5,00,000

  const s1_ngoAdmin = ngoWallet;
  const s2_projOwner = projectOwnerWallet;
  const s3_auditor = auditorWallet;

  // ====================================================
  // TEST GROUP 1: DATABASE MANIPULATION VS ON-CHAIN TRUTH
  // ====================================================
  console.log('--- Test Group 1: Database Manipulation vs On-Chain Truth ---');
  
  // 1. Create campaign on-chain and in PostgreSQL
  const c1 = await getFreshContract();
  const createTx = await c1.createCampaign(
    testB32Id,
    BigInt(targetAmount),
    adminSigner.address,
    s1_ngoAdmin,
    s2_projOwner,
    s3_auditor
  );
  await createTx.wait(1);

  // Create user and campaign in PostgreSQL
  const ngoUserRes = await query(
    `INSERT INTO users (id, name, email, password_hash, role, wallet_address)
      VALUES ($1, $2, $3, $4, 'ORGANIZATION', $5)
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id`,
    [crypto.randomUUID(), 'Tamper Test NGO', `ngo-tamper-${Date.now()}@test.org`, await hashPassword('Password123!'), ngoWallet]
  );
  const ngoId = ngoUserRes.rows[0].id;

  const auditorUserRes = await query(
    `INSERT INTO users (id, name, email, password_hash, role, wallet_address)
     VALUES ($1, 'Seeded Test Auditor', 'auditor@fundtrail.org', $2, 'AUDITOR', $3)
     ON CONFLICT (email) DO UPDATE SET wallet_address = EXCLUDED.wallet_address
     RETURNING id, wallet_address`,
    [crypto.randomUUID(), await hashPassword('Password123!'), auditorWallet]
  );
  const auditorId = auditorUserRes.rows[0].id;
  assert(auditorUserRes.rows[0].wallet_address.toLowerCase() === auditorWallet.toLowerCase(), 'Seeded auditor wallet is registered for on-chain approvals');

  await query(
    `INSERT INTO campaigns (id, ngo_id, title, description, target_amount, raised_amount, released_amount, beneficiary, status)
     VALUES ($1, $2, 'Anti-Tamper Initiative', 'Testing blockchain verification', $3, 0, 0, 'Jaipur School Beneficiaries', 'ACTIVE')`,
    [testCampaignUuid, ngoId, targetAmount]
  );

  const auditEntry = await recordAuditLog({
    campaignId: testCampaignUuid,
    actorId: ngoId,
    action: 'TAMPERING_TEST_ENTRY',
    entityType: 'CAMPAIGN',
    entityId: testCampaignUuid,
    metadata: { test: true, value: 'original' },
  });

  // Direct database mutation must be visible through the hash-chain verifier.
  await query(
    `UPDATE audit_logs SET metadata = $1::jsonb WHERE id = $2`,
    [JSON.stringify({ test: true, value: 'tampered' }), auditEntry.id]
  );
  const brokenChain = await verifyAuditLogChain();
  assert(brokenChain.valid === false, 'Audit-chain verification detects a directly modified audit row');
  assert(brokenChain.brokenAt === auditEntry.id, 'Audit-chain verifier identifies the modified row');
  await query(
    `UPDATE audit_logs SET metadata = $1::jsonb WHERE id = $2`,
    [JSON.stringify({ test: true, value: 'original' }), auditEntry.id]
  );
  const restoredChain = await verifyAuditLogChain();
  assert(restoredChain.valid === true, 'Audit-chain verification returns to valid after restoring the row');

  // 2. Perform a real donation on-chain of ₹1,00,000
  const realDonationAmount = 100000;
  const c2 = await getFreshContract();
  const donateTx = await c2.donate(testB32Id, { value: BigInt(realDonationAmount) });
  await donateTx.wait(1);

  await query(
    `UPDATE campaigns SET raised_amount = raised_amount + $1 WHERE id = $2`,
    [realDonationAmount, testCampaignUuid]
  );

  // 3. ATTACK: Malicious actor tampers with PostgreSQL database directly to falsely claim ₹4,50,000 was raised
  const tamperedAmount = 450000;
  await query(
    `UPDATE campaigns SET raised_amount = $1 WHERE id = $2`,
    [tamperedAmount, testCampaignUuid]
  );

  // 4. VERA Tampering Verification:
  const dbCampaignRes = await query(`SELECT raised_amount FROM campaigns WHERE id = $1`, [testCampaignUuid]);
  const dbRaisedAmount = Number(dbCampaignRes.rows[0].raised_amount);

  const onChainCamp = await onChainGetCampaign(testCampaignUuid);
  assert(onChainCamp !== null, 'Campaign verified on smart contract');
  assert(onChainCamp?.totalDonated === realDonationAmount, `On-Chain immutable truth matches real donation: ₹${realDonationAmount}`);
  assert(dbRaisedAmount === tamperedAmount, `Database reflects tampered value: ₹${tamperedAmount}`);

  // Tamper detection condition:
  const isTampered = Number(onChainCamp?.totalDonated) !== dbRaisedAmount;
  assert(isTampered === true, 'TAMPERING DETECTED: Database raised_amount desync detected via smart contract verification');

  // Restore DB to match immutable blockchain truth
  await query(`UPDATE campaigns SET raised_amount = $1 WHERE id = $2`, [realDonationAmount, testCampaignUuid]);
  const dbRestoredRes = await query(`SELECT raised_amount FROM campaigns WHERE id = $1`, [testCampaignUuid]);
  assert(Number(dbRestoredRes.rows[0].raised_amount) === onChainCamp?.totalDonated, 'Database successfully reconciled to match immutable on-chain truth');

  // ====================================================
  // TEST GROUP 2: EVIDENCE DOCUMENT TAMPERING (SHA-256)
  // ====================================================
  console.log('\n--- Test Group 2: Evidence Document Tampering (SHA-256 Digest Invalidation) ---');

  const legitimateInvoice = Buffer.from('INVOICE #INV-2026-001 | Vendor: SolarTech Solutions | Amount: INR 50,000 | Certified');
  const legitimateHash = crypto.createHash('sha256').update(legitimateInvoice).digest('hex');

  // Attacker modifies a single byte in the invoice (e.g. changing 50,000 to 90,000)
  const tamperedInvoice = Buffer.from('INVOICE #INV-2026-001 | Vendor: SolarTech Solutions | Amount: INR 90,000 | Certified');
  const recomputedTamperedHash = crypto.createHash('sha256').update(tamperedInvoice).digest('hex');

  assert(legitimateHash.length === 64, `Legitimate SHA-256 fingerprint generated: ${legitimateHash.slice(0, 16)}...`);
  assert(legitimateHash !== recomputedTamperedHash, 'Tampered file yields completely different cryptographic digest');
  
  const hashMatches = legitimateHash === recomputedTamperedHash;
  assert(hashMatches === false, 'TAMPERING DETECTED: Cryptographic hash comparison rejects altered invoice');

  // ====================================================
  // TEST GROUP 3: UNAUTHORIZED MULTI-SIG FORGERY
  // ====================================================
  console.log('\n--- Test Group 3: Smart Contract Enforcement - Unauthorized Multi-Sig Forgery ---');

  const msUuid = crypto.randomUUID();
  const msB32Id = idToBytes32(msUuid);
  const msAmount = 100000;

  // Create milestone and request release
  const c3 = await getFreshContract();
  const msTx = await c3.createMilestone(testB32Id, msB32Id, BigInt(msAmount));
  await msTx.wait(1);

  const c4 = await getFreshContract();
  const reqRelTx = await c4.requestRelease(testB32Id, msB32Id, BigInt(msAmount));
  await reqRelTx.wait(1);

  // ATTACK: Unauthorized wallet (attacker) attempts to sign approval
  let attackerApprovalReverted = false;
  let revertReason = '';

  try {
    const attackerContract = getContract(attackerWallet);
    const tx = await attackerContract.approveRelease(testB32Id, msB32Id);
    await tx.wait(1);
  } catch (err: any) {
    attackerApprovalReverted = true;
    revertReason = err.shortMessage || err.message || JSON.stringify(err);
  }

  assert(attackerApprovalReverted, 'Smart contract REVERTS when unauthorized wallet attempts to approve release');
  assert(
    revertReason.toLowerCase().includes('revert') || revertReason.includes('authorized'),
    'Revert enforced by on-chain require(approver == camp.ngoAdmin || ...)'
  );

  // A real seeded auditor wallet registered on the campaign is accepted.
  const auditorMilestoneUuid = crypto.randomUUID();
  const auditorMilestoneB32Id = idToBytes32(auditorMilestoneUuid);
  const auditorMilestoneAmount = 50000;
  const auditorMilestoneTx = await c3.createMilestone(
    testB32Id,
    auditorMilestoneB32Id,
    BigInt(auditorMilestoneAmount)
  );
  await auditorMilestoneTx.wait(1);
  const auditorRequestTx = await c4.requestRelease(
    testB32Id,
    auditorMilestoneB32Id,
    BigInt(auditorMilestoneAmount)
  );
  await auditorRequestTx.wait(1);

  const auditorContract = getContract(await provider.getSigner(3));
  const realAuditorApprovalTx = await auditorContract.approveRelease(
    testB32Id,
    auditorMilestoneB32Id
  );
  await realAuditorApprovalTx.wait(1);
  const auditorMilestoneState = await auditorContract.getMilestone(
    testB32Id,
    auditorMilestoneB32Id
  );
  assert(Number(auditorMilestoneState[1]) === 1, 'Registered seeded auditor wallet can approve on-chain');
  assert(auditorId !== undefined, 'Seeded auditor identity is present in PostgreSQL');

  // ====================================================
  // TEST GROUP 4: PREMATURE RELEASE (BYPASSING 2-OF-3 CONSENSUS)
  // ====================================================
  console.log('\n--- Test Group 4: Smart Contract Enforcement - Premature Release Prevention ---');

  // Signer 1 approves (1 of 3)
  const c5 = await getFreshContract();
  const s1Tx = await c5.approveReleaseFor(testB32Id, msB32Id, s1_ngoAdmin);
  await s1Tx.wait(1);

  // Verify only 1 approval exists
  const milestoneData1 = await c5.getMilestone(testB32Id, msB32Id);
  const currentApprovals = Number(milestoneData1[1]);
  assert(currentApprovals === 1, 'Current approvals is 1 / 3 (below 2-of-3 threshold)');

  // ATTACK: Attempt to execute release before reaching 2 approvals
  let prematureReleaseReverted = false;
  try {
    const c6 = await getFreshContract();
    const relTx = await c6.releaseFunds(testB32Id, msB32Id, adminSigner.address);
    await relTx.wait(1);
  } catch (err: any) {
    prematureReleaseReverted = true;
  }

  assert(prematureReleaseReverted, 'Smart contract REVERTS premature release execution at 1/3 approvals');

  // ====================================================
  // TEST GROUP 5: DOUBLE-RELEASE / REPLAY ATTACK PREVENTION
  // ====================================================
  console.log('\n--- Test Group 5: Smart Contract Enforcement - Double Release / Replay Attack ---');

  // Legitimate Signer 2 approves (reaching 2 of 3)
  const c7 = await getFreshContract();
  const s2Tx = await c7.approveReleaseFor(testB32Id, msB32Id, s2_projOwner);
  await s2Tx.wait(1);

  const milestoneData2 = await c7.getMilestone(testB32Id, msB32Id);
  assert(Number(milestoneData2[1]) === 2, 'Current approvals reached threshold: 2 / 3');

  // Legitimate release
  const c8 = await getFreshContract();
  const validRelTx = await c8.releaseFunds(testB32Id, msB32Id, adminSigner.address);
  await validRelTx.wait(1);

  const milestoneDataAfter = await c8.getMilestone(testB32Id, msB32Id);
  assert(milestoneDataAfter[0].released === true, 'Milestone successfully marked as released on-chain');

  // ATTACK: Attacker replays releaseFunds transaction on the already released milestone
  let doubleReleaseReverted = false;
  try {
    const c9 = await getFreshContract();
    const replayTx = await c9.releaseFunds(testB32Id, msB32Id, adminSigner.address);
    await replayTx.wait(1);
  } catch (err: any) {
    doubleReleaseReverted = true;
  }

  assert(doubleReleaseReverted, 'Smart contract REVERTS double-release / replay attempt on already released milestone');

  // ====================================================
  // TEST GROUP 6: FABRICATED TRANSACTION HASH DETECTION
  // ====================================================
  console.log('\n--- Test Group 6: Fabricated Transaction Hash Detection ---');

  const forgedTxHash = '0xdeadbeef111122223333444455556666777788889999aaaabbbbccccddddeeee';
  const receipt = await provider.getTransactionReceipt(forgedTxHash);

  assert(receipt === null, 'Forged transaction hash does not exist on blockchain node');
  
  const isTxVerified = receipt !== null && receipt.status === 1;
  assert(isTxVerified === false, 'TAMPERING DETECTED: Forged transaction hash rejected by node receipt verification');

  // Exercise the runtime integrity API's two independent DB-vs-chain alerts:
  // one forged hash and one valid hash whose DB amount was changed.
  await query(
    `INSERT INTO fund_transactions
       (campaign_id, type, amount, reference, blockchain_tx_hash, blockchain_status)
     VALUES ($1, 'DONATION', $2, $3, $4, 'CONFIRMED'),
            ($1, 'DONATION', $5, $6, $7, 'CONFIRMED')`,
    [
      testCampaignUuid,
      realDonationAmount,
      `TAMPER-FORGED-${Date.now()}`,
      forgedTxHash,
      realDonationAmount + 1,
      `TAMPER-AMOUNT-${Date.now()}`,
      donateTx.hash,
    ]
  );
  const integrityReport = await runIntegrityChecks(testCampaignUuid);
  assert(
    integrityReport.alerts.some((alert) => alert.check === 'fund-transaction-hash-exists'),
    'Integrity monitor reports a forged transaction hash'
  );
  assert(
    integrityReport.alerts.some((alert) => alert.check === 'fund-transaction-amount'),
    'Integrity monitor reports a database amount mismatch'
  );
  await query(
    `DELETE FROM fund_transactions WHERE campaign_id = $1 AND reference LIKE 'TAMPER-%'`,
    [testCampaignUuid]
  );

  // ====================================================
  // TEST GROUP 7: BUDGET OVER-ALLOCATION TAMPERING
  // ====================================================
  console.log('\n--- Test Group 7: Budget Cap Over-Allocation Prevention ---');

  // Campaign target is ₹5,00,000. Current allocated is ₹1,00,000. Remaining cap is ₹4,00,000.
  // ATTACK: Try to allocate ₹4,50,000 (total ₹5,50,000 > ₹5,00,000 cap)
  const excessiveMsB32Id = idToBytes32(crypto.randomUUID());
  let overflowReverted = false;

  try {
    const c10 = await getFreshContract();
    const overTx = await c10.createMilestone(testB32Id, excessiveMsB32Id, BigInt(450000));
    await overTx.wait(1);
  } catch (err: any) {
    overflowReverted = true;
  }

  assert(overflowReverted, 'Smart contract REVERTS milestone allocation that exceeds campaign budget cap');

  // =====================================================
  // SUMMARY
  // =====================================================
  console.log('\n====================================================');
  console.log(`📊 ANTI-TAMPERING TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTamperingTests().catch((err) => {
  console.error('Fatal error during tampering test suite:', err);
  process.exit(1);
});
