/**
 * VERA PHASE 4: BLOCKCHAIN & ADVANCED FUND CONTROLS
 * Comprehensive Automated Backend Integration Test Suite
 * 
 * Verifies:
 * 1. Smart Contract & Testnet Integration
 * 2. On-chain Campaign Creation & Idempotency
 * 3. On-chain Milestone Allocation & Cap Enforcement
 * 4. On-chain Donation & Fund Escrow
 * 5. 2-of-3 Multi-Signature Release Lifecycle (NGO, Owner, Auditor)
 * 6. On-chain Fund Release & Database Ledger Sync
 * 7. Double Release Prevention
 * 8. Financial Invariants & Limit Enforcement
 * 9. Refund Path & Ledger Accounting
 * 10. Security & Key Non-Leakage
 */

import { ethers } from 'ethers';
import { query } from '../lib/db';
import { hashPassword } from '../lib/auth';
import { createCampaign, getCampaignById } from '../lib/campaigns';
import { createMilestone, getMilestonesForCampaign, updateMilestoneStatus } from '../lib/milestones';
import { createDonation } from '../lib/donations';
import { createProof, approveProof } from '../lib/proofs';
import {
  createReleaseRequest,
  signReleaseRequest,
  executeRelease,
  getReleaseRequestById,
  getReleaseRequestForMilestone
} from '../lib/release_requests';
import { processRefund } from '../lib/refunds';
import {
  getProvider,
  getSigner,
  getContract,
  onChainGetCampaign,
  onChainGetMilestone,
  getExplorerTxUrl,
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

async function runPhase4Tests() {
  console.log('\n====================================================');
  console.log('🧪 VERA PHASE 4: BLOCKCHAIN & ADVANCED CONTROLS TEST SUITE');
  console.log('====================================================\n');

  try {
    // ----------------------------------------------------
    // Test Group 1: Environment & Node Connectivity
    // ----------------------------------------------------
    console.log('--- Test Group 1: Blockchain Node & Contract Setup ---');

    const provider = getProvider();
    const ngoWallet = await (await provider.getSigner(1)).getAddress();
    const campaignOwnerWallet = await (await provider.getSigner(2)).getAddress();
    const auditorWallet = await (await provider.getSigner(3)).getAddress();
    const donorWallet = await (await provider.getSigner(4)).getAddress();
    const network = await provider.getNetwork();
    assert(Number(network.chainId) === 31337, `Connected to testnet (Chain ID: ${network.chainId})`);

    const blockNumber = await provider.getBlockNumber();
    assert(blockNumber >= 0, `Node is responsive at current block #${blockNumber}`);

    const signer = getSigner();
    const signerAddress = await signer.getAddress();
    assert(ethers.isAddress(signerAddress), `Server-side signer initialized (${signerAddress})`);

    const signerBalance = await provider.getBalance(signerAddress);
    assert(signerBalance > 0n, `Signer has testnet ETH funds (${ethers.formatEther(signerBalance)} ETH)`);

    const contract = getContract();
    const contractAddress = await contract.getAddress();
    assert(ethers.isAddress(contractAddress), `VERA contract loaded at ${contractAddress}`);

    const contractAdmin = await contract.admin();
    assert(contractAdmin.toLowerCase() === signerAddress.toLowerCase(), 'Signer is authorized contract admin');

    // ----------------------------------------------------
    // Test Group 2: Actor Setup
    // ----------------------------------------------------
    console.log('\n--- Test Group 2: User Registration & RBAC Setup ---');

    const ts = Date.now();
    const pwHash = await hashPassword('SecurePassword123!');

    const ngoAdminRes = await query(
      `INSERT INTO users (name, email, password_hash, role, wallet_address) VALUES ($1, $2, $3, 'ORGANIZATION', $4) RETURNING *`,
      ['Jaipur Education Trust Admin', `ngo.admin.${ts}@vera.org`, pwHash, ngoWallet]
    );
    const ngoAdmin = ngoAdminRes.rows[0];
    assert(ngoAdmin.role === 'ORGANIZATION', 'Registered NGO Admin user');

    const campaignOwnerRes = await query(
      `INSERT INTO users (name, email, password_hash, role, wallet_address) VALUES ($1, $2, $3, 'ORGANIZATION', $4) RETURNING *`,
      ['School Project Lead', `proj.lead.${ts}@vera.org`, pwHash, campaignOwnerWallet]
    );
    const campaignOwner = campaignOwnerRes.rows[0];
    assert(campaignOwner.role === 'ORGANIZATION', 'Registered Campaign Owner / Project Lead user');

    const auditorRes = await query(
      `INSERT INTO users (name, email, password_hash, role, wallet_address) VALUES ($1, $2, $3, 'AUDITOR', $4) RETURNING *`,
      ['Certified Auditor Rajiv', `auditor.${ts}@audit.org`, pwHash, auditorWallet]
    );
    const auditor = auditorRes.rows[0];
    assert(auditor.role === 'AUDITOR', 'Registered Certified Auditor user');

    const donorRes = await query(
      `INSERT INTO users (name, email, password_hash, role, wallet_address) VALUES ($1, $2, $3, 'USER', $4) RETURNING *`,
      ['Rohan Sharma (Donor)', `donor.${ts}@donor.org`, pwHash, donorWallet]
    );
    const donor = donorRes.rows[0];
    assert(donor.role === 'USER', 'Registered Donor user');

    // ----------------------------------------------------
    // Test Group 3: Campaign Creation & Blockchain Registration
    // ----------------------------------------------------
    console.log('\n--- Test Group 3: On-Chain Campaign Creation ---');

    const campaignTarget = 1000000; // ₹10,00,000 (Demo Scenario)
    const campaign = await createCampaign(ngoAdmin.id, {
      title: 'Government School Classroom — Jaipur',
      description: 'Upgrading electrical wiring, desks, and teaching equipment for rural classrooms.',
      target_amount: campaignTarget,
      beneficiary: 'Govt Model Sr Sec School, Jaipur',
      status: 'ACTIVE'
    });

    assert(campaign.id !== undefined, 'Campaign created in PostgreSQL');
    assert(campaign.blockchain_status === 'CONFIRMED', 'Campaign automatically registered on-chain');
    assert(Boolean(campaign.blockchain_campaign_id), `Campaign assigned on-chain bytes32 ID: ${campaign.blockchain_campaign_id}`);

    // Verify on-chain contract state
    const onChainCamp = await onChainGetCampaign(campaign.id);
    assert(onChainCamp !== null, 'Campaign verified on smart contract');
    assert(onChainCamp?.targetAmount === campaignTarget, `On-chain target matches ₹${campaignTarget}`);
    assert(onChainCamp?.active === true, 'On-chain campaign state is active');
    assert(onChainCamp?.totalDonated === 0, 'On-chain totalDonated initialized to 0');
    assert(onChainCamp?.totalReleased === 0, 'On-chain totalReleased initialized to 0');

    // ----------------------------------------------------
    // Test Group 4: Milestone Creation & On-Chain Allocation
    // ----------------------------------------------------
    console.log('\n--- Test Group 4: On-Chain Milestone Allocation ---');

    const milestoneAmount = 300000; // ₹3,00,000 (Electrical Work)
    const milestone = await createMilestone(ngoAdmin.id, campaign.id, {
      title: 'Electrical Work & Wiring',
      description: 'Complete classroom electrical wiring, LED fixtures, and main power distribution box.',
      amount: milestoneAmount,
      sequence: 1,
      proof_required: true
    });

    assert(milestone.id !== undefined, 'Milestone created in PostgreSQL');
    assert(milestone.blockchain_status === 'CONFIRMED', 'Milestone registered on-chain');
    assert(Boolean(milestone.blockchain_milestone_id), `Milestone assigned on-chain ID: ${milestone.blockchain_milestone_id}`);

    const onChainMs = await onChainGetMilestone(campaign.id, milestone.id);
    assert(onChainMs !== null, 'Milestone verified on smart contract');
    assert(onChainMs?.amount === milestoneAmount, `On-chain milestone amount matches ₹${milestoneAmount}`);
    assert(onChainMs?.released === false, 'On-chain milestone released is false');
    assert(onChainMs?.releaseRequested === false, 'On-chain releaseRequested is false');

    // Financial invariant test: Total milestones cannot exceed campaign target
    let capExceeded = false;
    try {
      await createMilestone(ngoAdmin.id, campaign.id, {
        title: 'Overbudget Milestone',
        description: 'Exceeding campaign target',
        amount: 800000, // 300000 + 800000 = 1100000 > 1000000
        sequence: 2,
        proof_required: true
      });
    } catch (err: any) {
      capExceeded = true;
    }
    assert(capExceeded, 'Enforced invariant: Milestone allocation cannot exceed campaign target');

    // ----------------------------------------------------
    // Test Group 5: On-Chain Donations & Locked Funds
    // ----------------------------------------------------
    console.log('\n--- Test Group 5: On-Chain Donations & Locked Funds ---');

    // Demo donation of ₹10,000
    const demoDonationAmount = 10000;
    const donation1 = await createDonation(donor.id, campaign.id, {
      amount: demoDonationAmount,
      purpose: 'Classroom lighting donation'
    });

    assert(donation1.id !== undefined, 'Donation 1 created');
    assert(donation1.blockchain_status === 'CONFIRMED', 'Donation 1 confirmed on-chain');
    assert(Boolean(donation1.blockchain_tx_hash), `Recorded on-chain tx hash: ${donation1.blockchain_tx_hash}`);
    assert(donation1.blockchain_tx_hash?.startsWith('0x') === true, 'Tx hash is valid 0x hex');

    // Verify campaign balance in database and on-chain
    const updatedCamp1 = await getCampaignById(campaign.id);
    assert(Number(updatedCamp1?.raised_amount) === demoDonationAmount, `Database raised amount: ₹${demoDonationAmount}`);

    const onChainCampAfterDon1 = await onChainGetCampaign(campaign.id);
    assert(onChainCampAfterDon1?.totalDonated === demoDonationAmount, `On-chain totalDonated matches: ${demoDonationAmount}`);

    // Fund the remaining campaign balance to reach full ₹10,00,000 for the demo release scenario
    const remainingToFund = campaignTarget - demoDonationAmount;
    const donation2 = await createDonation(donor.id, campaign.id, {
      amount: remainingToFund,
      purpose: 'Complete funding for classroom project'
    });
    assert(donation2.blockchain_status === 'CONFIRMED', 'Remaining funding confirmed on-chain');

    const fullyFundedCamp = await getCampaignById(campaign.id);
    assert(Number(fullyFundedCamp?.raised_amount) === campaignTarget, `Campaign 100% funded at ₹${campaignTarget}`);

    const onChainCampFullyFunded = await onChainGetCampaign(campaign.id);
    assert(onChainCampFullyFunded?.totalDonated === campaignTarget, `On-chain totalDonated is full target: ₹${campaignTarget}`);

    // ----------------------------------------------------
    // Test Group 6: Milestone Proof Lifecycle (Phase 3 -> 4 bridge)
    // ----------------------------------------------------
    console.log('\n--- Test Group 6: Milestone Proof Verification Bridge ---');

    // Move milestone to IN_PROGRESS
    await updateMilestoneStatus(ngoAdmin.id, milestone.id, 'IN_PROGRESS');

    // Submit proof
    const sampleInvoiceBuffer = Buffer.from('Sample invoice proof from ABC Electricals for Rs 2,85,000');
    const proof = await createProof(
      ngoAdmin.id,
      milestone.id,
      {
        description: 'Vendor invoice for wiring and installation',
        claimed_amount: 285000,
      },
      [
        {
          originalName: 'electrical_invoice.pdf',
          mimeType: 'application/pdf',
          buffer: sampleInvoiceBuffer,
        },
      ]
    );
    assert(proof.id !== undefined, 'Evidence proof submitted');

    // Approve proof as Certified Auditor
    const approvedProof = await approveProof(auditor.id, proof.id, 'Invoice verified with vendor ABC Electricals');
    assert(approvedProof.status === 'APPROVED', 'Proof approved by Auditor');

    const msAfterProof = (await getMilestonesForCampaign(campaign.id))[0];
    assert(msAfterProof.status === 'APPROVED', 'Milestone status is now APPROVED');

    // Verify ZERO funds released before Phase 4 multisig
    const campBeforeRelease = await getCampaignById(campaign.id);
    assert(Number(campBeforeRelease?.released_amount) === 0, 'ZERO funds released prior to multisig authorization');

    // ----------------------------------------------------
    // Test Group 7: 2-of-3 Multi-Signature Release Lifecycle
    // ----------------------------------------------------
    console.log('\n--- Test Group 7: 2-of-3 Multi-Signature Workflow ---');

    const requestedReleaseAmount = 285000; // ₹2,85,000 (Demo Scenario)

    // 1. Create Release Request
    const relReq = await createReleaseRequest(ngoAdmin.id, {
      milestoneId: milestone.id,
      amount: requestedReleaseAmount,
      notes: 'Vendor payment for completed wiring'
    });

    assert(relReq.id !== undefined, 'Release request created');
    assert(relReq.status === 'AWAITING_MULTISIG', 'Release request status is AWAITING_MULTISIG');
    assert(relReq.current_approvals === 0, 'Current approvals initialized to 0');
    assert(relReq.required_approvals === 2, 'Required approvals is 2 (2-of-3 threshold)');
    assert(relReq.blockchain_status === 'CONFIRMED', 'On-chain requestRelease confirmed');

    const onChainMsAfterReq = await onChainGetMilestone(campaign.id, milestone.id);
    assert(onChainMsAfterReq?.releaseRequested === true, 'On-chain releaseRequested is true');
    assert(onChainMsAfterReq?.requestedReleaseAmount === requestedReleaseAmount, `On-chain requested amount matches ₹${requestedReleaseAmount}`);

    // Attempt premature executeRelease before threshold is met
    let prematureReleaseBlocked = false;
    try {
      await executeRelease(ngoAdmin.id, relReq.id);
    } catch (err: any) {
      prematureReleaseBlocked = true;
    }
    assert(prematureReleaseBlocked, 'Blocked execution: Cannot release before 2-of-3 threshold is met');

    // 2. Signer 1: NGO Admin approves
    const sign1 = await signReleaseRequest(ngoAdmin.id, relReq.id, {
      comment: 'NGO Admin approval confirmed'
    });
    assert(sign1.approval.status === 'APPROVED', 'Signer 1 approval registered');
    assert(sign1.releaseRequest.current_approvals === 1, 'Current approvals updated to 1/3');
    assert(sign1.releaseRequest.status === 'AWAITING_MULTISIG', 'Status remains AWAITING_MULTISIG at 1 approval');

    // Enforce Rule: Signer 1 cannot approve twice
    let duplicateSignBlocked = false;
    try {
      await signReleaseRequest(ngoAdmin.id, relReq.id, {
        comment: 'Attempting second approval'
      });
    } catch (err: any) {
      duplicateSignBlocked = true;
    }
    assert(duplicateSignBlocked, 'Enforced Rule: One signer cannot approve twice');

    // Enforce Rule: Unauthorized non-signer (Donor) cannot approve
    let unauthorizedSignBlocked = false;
    try {
      await signReleaseRequest(donor.id, relReq.id, {
        comment: 'Donor trying to vote'
      });
    } catch (err: any) {
      unauthorizedSignBlocked = true;
    }
    assert(unauthorizedSignBlocked, 'Enforced Rule: Unauthorized user (Donor) cannot sign multisig');

    // Still cannot execute release with 1 approval
    let singleApprovalReleaseBlocked = false;
    try {
      await executeRelease(ngoAdmin.id, relReq.id);
    } catch (err: any) {
      singleApprovalReleaseBlocked = true;
    }
    assert(singleApprovalReleaseBlocked, 'Blocked execution: 1 approval is strictly below 2-of-3 threshold');

    // 3. Signer 2: Certified Auditor approves (reaching 2/3)
    const sign2 = await signReleaseRequest(auditor.id, relReq.id, {
      comment: 'Auditor independent verification approval'
    });
    assert(sign2.approval.status === 'APPROVED', 'Signer 2 (Auditor) approval registered');
    assert(sign2.releaseRequest.current_approvals === 2, 'Current approvals updated to 2/3');
    assert(sign2.releaseRequest.status === 'READY_TO_RELEASE', 'Status transitioned to READY_TO_RELEASE');

    // ----------------------------------------------------
    // Test Group 8: On-Chain Fund Release & Accounting
    // ----------------------------------------------------
    console.log('\n--- Test Group 8: On-Chain Fund Release & Ledger Sync ---');

    const vendorRecipientAddress = ngoWallet;
    const releaseResult = await executeRelease(ngoAdmin.id, relReq.id, vendorRecipientAddress);

    assert(releaseResult.releaseRequest.status === 'RELEASED', 'Release request status is RELEASED');
    assert(releaseResult.releaseRequest.blockchain_status === 'CONFIRMED', 'Blockchain release status is CONFIRMED');
    assert(Boolean(releaseResult.releaseRequest.blockchain_tx_hash), `Release transaction hash: ${releaseResult.releaseRequest.blockchain_tx_hash}`);
    assert(Boolean(releaseResult.fundTransaction.id), 'Fund transaction record created');
    assert(releaseResult.fundTransaction.type === 'RELEASE', 'Fund transaction type is RELEASE');
    assert(Number(releaseResult.fundTransaction.amount) === requestedReleaseAmount, `Released amount matches ₹${requestedReleaseAmount}`);

    // Verify smart contract state on-chain
    const onChainMsAfterRelease = await onChainGetMilestone(campaign.id, milestone.id);
    assert(onChainMsAfterRelease?.released === true, 'On-chain milestone released is true');
    assert(onChainMsAfterRelease?.releasedAmount === requestedReleaseAmount, `On-chain released amount matches ₹${requestedReleaseAmount}`);

    const onChainCampAfterRelease = await onChainGetCampaign(campaign.id);
    assert(onChainCampAfterRelease?.totalReleased === requestedReleaseAmount, `On-chain campaign totalReleased matches ₹${requestedReleaseAmount}`);

    // Verify PostgreSQL database financial accounting
    const updatedCampAfterRelease = await getCampaignById(campaign.id);
    assert(Number(updatedCampAfterRelease?.released_amount) === requestedReleaseAmount, `Database released_amount: ₹${requestedReleaseAmount}`);
    const remainingBalance = Number(updatedCampAfterRelease?.raised_amount) - Number(updatedCampAfterRelease?.released_amount);
    assert(remainingBalance === 715000, `Database remaining balance matches ₹7,15,000 (${1000000} - ${285000})`);

    // Verify Milestone state in database
    const finalMilestone = (await getMilestonesForCampaign(campaign.id))[0];
    assert(finalMilestone.status === 'RELEASED', 'Milestone status is RELEASED in PostgreSQL');
    assert(finalMilestone.blockchain_status === 'CONFIRMED', 'Milestone blockchain_status is CONFIRMED');

    // ----------------------------------------------------
    // Test Group 9: Double Release & Financial Safety Invariants
    // ----------------------------------------------------
    console.log('\n--- Test Group 9: Double Release Prevention & Invariants ---');

    let doubleReleaseBlocked = false;
    try {
      await executeRelease(ngoAdmin.id, relReq.id);
    } catch (err: any) {
      doubleReleaseBlocked = true;
    }
    assert(doubleReleaseBlocked, 'Enforced Invariant: Double release of same milestone is prevented');

    let newReqForReleasedMsBlocked = false;
    try {
      await createReleaseRequest(ngoAdmin.id, {
        milestoneId: milestone.id,
        amount: requestedReleaseAmount
      });
    } catch (err: any) {
      newReqForReleasedMsBlocked = true;
    }
    assert(newReqForReleasedMsBlocked, 'Enforced Invariant: Cannot request release for an already released milestone');

    // ----------------------------------------------------
    // Test Group 10: Refund Lifecycle
    // ----------------------------------------------------
    console.log('\n--- Test Group 10: Refund Lifecycle ---');

    // Create a 2nd milestone to simulate a failed phase refund
    const milestone2Amount = 100000;
    const milestone2 = await createMilestone(ngoAdmin.id, campaign.id, {
      title: 'Desks & Furniture',
      description: 'Classroom benches and desks',
      amount: milestone2Amount,
      sequence: 2,
      proof_required: true
    });

    const refundAmount = 50000;
    const refundReason = 'Vendor failed delivery specifications; partial refund executed';
    const refundRes = await processRefund({
      userId: ngoAdmin.id,
      campaignId: campaign.id,
      milestoneId: milestone2.id,
      amount: refundAmount,
      recipientAddress: vendorRecipientAddress,
      reason: refundReason
    });

    assert(refundRes.success === true, 'Refund executed successfully');
    assert(refundRes.fundTransaction.type === 'REFUND', 'Refund fund transaction recorded');
    assert(Number(refundRes.fundTransaction.amount) === refundAmount, `Refund amount matches ₹${refundAmount}`);
    assert(Boolean(refundRes.txHash), `Refund on-chain tx hash: ${refundRes.txHash}`);

    // Verify milestone 2 transitioned to FAILED
    const updatedMs2 = (await getMilestonesForCampaign(campaign.id))[1];
    assert(updatedMs2.status === 'FAILED', 'Milestone 2 transitioned to FAILED');

    // Verify refund cannot exceed available campaign balance
    let excessRefundBlocked = false;
    try {
      await processRefund({
        userId: ngoAdmin.id,
        campaignId: campaign.id,
        amount: 9999999, // Exceeds balance
        recipientAddress: vendorRecipientAddress,
        reason: 'Impossible refund'
      });
    } catch (err: any) {
      excessRefundBlocked = true;
    }
    assert(excessRefundBlocked, 'Enforced Invariant: Refund cannot exceed available balance');

    // ----------------------------------------------------
    // Test Group 11: Security & Private Key Non-Leakage
    // ----------------------------------------------------
    console.log('\n--- Test Group 11: Security & Non-Leakage ---');

    // 1. Verify Explorer URL generation
    const testTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const sepoliaUrl = getExplorerTxUrl(11155111, testTxHash);
    assert(sepoliaUrl.includes('sepolia.etherscan.io/tx/'), 'Explorer link helper formats Sepolia correctly');

    const localUrl = getExplorerTxUrl(31337, testTxHash);
    assert(localUrl.includes('/explorer/tx/'), 'Explorer link helper formats in-app explorer correctly');

    // 2. Verify private key is never returned in API payloads or user objects
    const queryUsers = await query('SELECT * FROM users WHERE id = $1', [ngoAdmin.id]);
    const userKeys = Object.keys(queryUsers.rows[0]);
    assert(!userKeys.includes('private_key'), 'Database users table never stores blockchain private keys');
    assert(!userKeys.includes('BLOCKCHAIN_PRIVATE_KEY'), 'Environment keys are completely isolated from DB');

    // ----------------------------------------------------
    // Test Summary
    // ----------------------------------------------------
    console.log('\n====================================================');
    console.log(`📊 PHASE 4 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error: any) {
    console.error('\n❌ Unhandled error during Phase 4 tests:', error);
    process.exit(1);
  }
}

runPhase4Tests();
