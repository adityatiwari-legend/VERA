import bcrypt from 'bcryptjs';
import { query, db } from '../lib/db';
import { hashPassword, verifyPassword, signSessionToken, verifySessionToken } from '../lib/auth';
import {
  createCampaign,
  getCampaignsForNgo,
  getCampaignById,
  updateCampaign,
  updateCampaignStatus,
} from '../lib/campaigns';
import { getAuditLogsForCampaign } from '../lib/audit_log';
import { assertCanManageCampaign, ForbiddenError } from '../lib/permissions';
import { createCampaignSchema } from '../lib/validation';
import { User, CampaignStatus } from '../types';

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

async function runPhase1Tests() {
  console.log('====================================================');
  console.log('🧪 FUNDTRAIL PHASE 1: COMPREHENSIVE TEST SUITE');
  console.log('====================================================\n');

  try {
    // 1. Password Hashing & Security Check
    console.log('--- Test Group 1: Password Security ---');
    const rawPass = 'SecretPassword123!';
    const hashed = await hashPassword(rawPass);
    assert(hashed !== rawPass, 'Password is never stored in plain text');
    assert(hashed.startsWith('$2a$') || hashed.startsWith('$2b$'), 'Password is valid bcrypt hash');
    const isValid = await verifyPassword(rawPass, hashed);
    assert(isValid === true, 'Bcrypt correctly verifies plain password');
    const isInvalid = await verifyPassword('WrongPassword', hashed);
    assert(isInvalid === false, 'Bcrypt rejects incorrect password');

    // 2. JWT Session Security
    console.log('\n--- Test Group 2: Session & JWT Management ---');
    const dummyPayload = {
      userId: 'test-user-id',
      email: 'test@fundtrail.org',
      role: 'ORGANIZATION' as const,
      name: 'Test NGO',
    };
    const token = await signSessionToken(dummyPayload);
    assert(typeof token === 'string' && token.length > 20, 'Signed JWT token generated successfully');
    const decoded = await verifySessionToken(token);
    assert(decoded?.userId === dummyPayload.userId, 'JWT token correctly decodes and validates');
    const invalidDecoded = await verifySessionToken('corrupt.token.string');
    assert(invalidDecoded === null, 'Invalid JWT token safely returns null');

    // 3. User Registration in PostgreSQL
    console.log('\n--- Test Group 3: User Registration & Persistence ---');
    const ngo1Email = `ngo1_${Date.now()}@fundtrail.org`;
    const ngo1PassHash = await hashPassword('Password123!');
    const user1Res = await query<User>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['Water Relief Foundation', ngo1Email, ngo1PassHash, 'ORGANIZATION']
    );
    const ngo1 = user1Res.rows[0];
    assert(ngo1.role === 'ORGANIZATION', 'NGO 1 registered successfully in database');
    assert(ngo1.id !== undefined, 'User assigned valid UUID primary key');

    // 4. Second NGO Registration
    const ngo2Email = `ngo2_${Date.now()}@fundtrail.org`;
    const ngo2PassHash = await hashPassword('Password123!');
    const user2Res = await query<User>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['Education First NGO', ngo2Email, ngo2PassHash, 'ORGANIZATION']
    );
    const ngo2 = user2Res.rows[0];
    assert(ngo2.role === 'ORGANIZATION', 'NGO 2 registered successfully');

    // 5. Donor Registration
    const donorEmail = `donor_${Date.now()}@fundtrail.org`;
    const donorPassHash = await hashPassword('Password123!');
    const donorRes = await query<User>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      ['Individual Donor', donorEmail, donorPassHash, 'USER']
    );
    const donor = donorRes.rows[0];
    assert(donor.role === 'USER', 'Donor registered successfully');

    // 6. Campaign Input Validation (Zod)
    console.log('\n--- Test Group 4: Server-Side Validation ---');
    const invalidTarget = createCampaignSchema.safeParse({
      title: 'Valid Title',
      description: 'Valid description with enough characters',
      target_amount: -500, // Invalid: negative
      beneficiary: 'Beneficiary',
    });
    assert(invalidTarget.success === false, 'Rejects negative target amount (target_amount <= 0)');

    const zeroTarget = createCampaignSchema.safeParse({
      title: 'Valid Title',
      description: 'Valid description with enough characters',
      target_amount: 0, // Invalid: zero
      beneficiary: 'Beneficiary',
    });
    assert(zeroTarget.success === false, 'Rejects zero target amount');

    const emptyTitle = createCampaignSchema.safeParse({
      title: 'ab', // Invalid: min 3
      description: 'Valid description with enough characters',
      target_amount: 10000,
      beneficiary: 'Beneficiary',
    });
    assert(emptyTitle.success === false, 'Rejects titles shorter than 3 characters');

    // 7. Campaign Creation by NGO 1
    console.log('\n--- Test Group 5: Campaign CRUD & Financial Truth ---');
    const createdCampaign = await createCampaign(ngo1.id, {
      title: 'Clean Water Purification Project',
      description: 'Installing reverse osmosis water filtration across 5 schools.',
      target_amount: 600000,
      beneficiary: '500 School Children in Rural Block',
      status: 'DRAFT',
    });
    assert(createdCampaign.id !== undefined, 'Campaign created successfully');
    assert(createdCampaign.ngo_id === ngo1.id, 'Campaign ngo_id matches NGO 1');
    assert(Number(createdCampaign.raised_amount) === 0, 'Raised amount strictly defaults to ₹0');
    assert(Number(createdCampaign.released_amount) === 0, 'Released amount strictly defaults to ₹0');
    assert(createdCampaign.status === 'DRAFT', 'Initial status set to DRAFT');

    // 8. Campaign Retrieval
    const ngo1Campaigns = await getCampaignsForNgo(ngo1.id);
    assert(
      ngo1Campaigns.some((c) => c.id === createdCampaign.id),
      'Campaign appears in NGO 1 campaign listing'
    );

    const fetchedDetails = await getCampaignById(createdCampaign.id);
    assert(fetchedDetails?.id === createdCampaign.id, 'Fetched campaign details by ID successfully');
    assert(fetchedDetails?.ngo_name === 'Water Relief Foundation', 'Joined NGO details retrieved');

    // 9. Campaign Update
    console.log('\n--- Test Group 6: Campaign Mutations & Status Transitions ---');
    const updated = await updateCampaign(createdCampaign.id, ngo1.id, {
      title: 'Clean Water Purification Project - Updated Scope',
      target_amount: 750000,
    });
    assert(updated.title === 'Clean Water Purification Project - Updated Scope', 'Campaign title updated');
    assert(Number(updated.target_amount) === 750000, 'Campaign target amount updated');

    // 10. Status Transition: DRAFT -> ACTIVE
    const activated = await updateCampaignStatus(createdCampaign.id, ngo1.id, 'ACTIVE');
    assert(activated.status === 'ACTIVE', 'Campaign status updated from DRAFT to ACTIVE');

    // 11. Status Transition: ACTIVE -> PAUSED
    const paused = await updateCampaignStatus(createdCampaign.id, ngo1.id, 'PAUSED');
    assert(paused.status === 'PAUSED', 'Campaign status updated from ACTIVE to PAUSED');

    // 12. Invalid Status Transition: DRAFT cannot jump directly to COMPLETED
    try {
      // Re-create a draft campaign to test invalid jump
      const draftCamp = await createCampaign(ngo1.id, {
        title: 'Draft Camp Test',
        description: 'Short test description for draft testing',
        target_amount: 100000,
        beneficiary: 'Village',
        status: 'DRAFT',
      });
      await updateCampaignStatus(draftCamp.id, ngo1.id, 'COMPLETED');
      assert(false, 'Expected invalid status transition from DRAFT to COMPLETED to fail');
    } catch (err: any) {
      assert(true, 'Disallows invalid status transition from DRAFT to COMPLETED');
    }

    // 13. Audit Logging Verification
    console.log('\n--- Test Group 7: Immutable Audit Trail ---');
    const auditLogs = await getAuditLogsForCampaign(createdCampaign.id);
    assert(auditLogs.length >= 3, 'Audit logs recorded for CREATE, UPDATE, and STATUS transitions');

    const actions = auditLogs.map((l) => l.action);
    assert(actions.includes('CREATE_CAMPAIGN'), 'CREATE_CAMPAIGN logged in audit table');
    assert(actions.includes('UPDATE_CAMPAIGN'), 'UPDATE_CAMPAIGN logged in audit table');
    assert(actions.includes('CHANGE_CAMPAIGN_STATUS'), 'CHANGE_CAMPAIGN_STATUS logged in audit table');

    const createLog = auditLogs.find((l) => l.action === 'CREATE_CAMPAIGN');
    assert(createLog?.actor_id === ngo1.id, 'Audit log correctly attributes actor_id to NGO 1');
    assert(createLog?.metadata?.title !== undefined, 'Audit log stores structured JSON metadata');

    // 14. Authorization & Cross-Tenant Security
    console.log('\n--- Test Group 8: Multi-Tenant Authorization & RBAC ---');
    // NGO 2 tries to edit NGO 1's campaign
    try {
      await updateCampaign(createdCampaign.id, ngo2.id, {
        title: 'Malicious Overwrite Attempt',
      });
      assert(false, 'NGO 2 should NEVER be able to edit NGO 1 campaign');
    } catch (err: any) {
      assert(
        err instanceof ForbiddenError || err.statusCode === 403,
        'NGO 2 modification of NGO 1 campaign rejected with Forbidden (403)'
      );
    }

    // NGO 2 tries to change NGO 1's campaign status
    try {
      await updateCampaignStatus(createdCampaign.id, ngo2.id, 'CANCELLED');
      assert(false, 'NGO 2 should NEVER be able to change NGO 1 campaign status');
    } catch (err: any) {
      assert(
        err instanceof ForbiddenError || err.statusCode === 403,
        'NGO 2 status modification rejected with Forbidden (403)'
      );
    }

    // Donor cannot manage campaign
    try {
      assertCanManageCampaign(donor, { ngo_id: ngo1.id });
      assert(false, 'Donor should not have campaign management permissions');
    } catch (err: any) {
      assert(
        err instanceof ForbiddenError,
        'Donor role rejected from campaign management operations'
      );
    }

    // NGO 1 only sees their own campaigns in getCampaignsForNgo
    const ngo2CampaignList = await getCampaignsForNgo(ngo2.id);
    assert(
      !ngo2CampaignList.some((c) => c.id === createdCampaign.id),
      'NGO 2 campaign list does not contain NGO 1 campaigns'
    );

    console.log('\n====================================================');
    console.log(`📊 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
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

runPhase1Tests();
