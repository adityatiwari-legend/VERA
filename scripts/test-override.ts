/**
 * Claim 7 end-to-end verification:
 * PASS approvals remain ordinary approvals, while FLAG approvals are recorded
 * as explicit authorized overrides and unapproved FLAG evidence cannot create
 * a release request.
 */
import crypto from 'crypto';
import { db, query } from '../lib/db';
import { hashPassword } from '../lib/auth';
import { createProof, approveProof } from '../lib/proofs';
import { createReleaseRequest } from '../lib/release_requests';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed += 1;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed += 1;
  }
}

async function createProofFixture(
  ngoId: string,
  auditorId: string,
  campaignId: string,
  milestoneId: string,
  claimedAmount: number,
  fileName: string,
  comment: string
) {
  const proof = await createProof(
    ngoId,
    milestoneId,
    {
      claimed_amount: claimedAmount,
      description: `Claim 7 verification fixture: ${fileName}`,
    },
    [
      {
        originalName: fileName,
        mimeType: 'application/pdf',
        buffer: Buffer.from(`${fileName} ${crypto.randomUUID()}`),
      },
    ]
  );

  const verification = await query<{ ai_status: string; discrepancy_amount: string }>(
    `SELECT ai_status, discrepancy_amount::text
     FROM verification_results
     WHERE proof_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [proof.id]
  );

  await approveProof(auditorId, proof.id, comment);
  const audit = await query<{ action: string; metadata: Record<string, any> }>(
    `SELECT action, metadata
     FROM audit_logs
     WHERE entity_type = 'PROOF' AND entity_id = $1
       AND action IN ('PROOF_APPROVED', 'PROOF_APPROVED_OVERRIDE')
     ORDER BY created_at DESC
     LIMIT 1`,
    [proof.id]
  );

  return {
    proof,
    verification: verification.rows[0],
    audit: audit.rows[0],
    campaignId,
    milestoneId,
  };
}

async function runOverrideTests() {
  const suffix = Date.now();
  const passwordHash = await hashPassword('Password123!');
  const ngoId = crypto.randomUUID();
  const auditorId = crypto.randomUUID();
  const campaignId = crypto.randomUUID();

  await query(
    `INSERT INTO users (id, name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, 'ORGANIZATION'), ($5, $6, $7, $4, 'AUDITOR')`,
    [
      ngoId,
      'Claim 7 Fixture NGO',
      `claim7-ngo-${suffix}@test.org`,
      passwordHash,
      auditorId,
      'Claim 7 Fixture Auditor',
      `claim7-auditor-${suffix}@test.org`,
    ]
  );

  await query(
    `INSERT INTO campaigns
       (id, ngo_id, title, description, target_amount, raised_amount, released_amount, beneficiary, status)
     VALUES ($1, $2, 'Claim 7 Fixture Campaign', 'Explicit override behavior test campaign', 1000000, 1000000, 0, 'Fixture Beneficiaries', 'ACTIVE')`,
    [campaignId, ngoId]
  );

  const passMilestoneId = crypto.randomUUID();
  const overrideMilestoneId = crypto.randomUUID();
  const withheldMilestoneId = crypto.randomUUID();
  await query(
    `INSERT INTO milestones
       (id, campaign_id, title, description, amount, sequence, status, proof_required)
     VALUES
       ($1, $4, 'PASS Evidence', 'Matching evidence fixture', 100000, 1, 'IN_PROGRESS', true),
       ($2, $4, 'FLAG Evidence', 'Override evidence fixture', 300000, 2, 'IN_PROGRESS', true),
       ($3, $4, 'WITHHELD Evidence', 'Unapproved discrepancy fixture', 300000, 3, 'IN_PROGRESS', true)`,
    [passMilestoneId, overrideMilestoneId, withheldMilestoneId, campaignId]
  );

  const pass = await createProofFixture(
    ngoId,
    auditorId,
    campaignId,
    passMilestoneId,
    100000,
    'receipt-claim7-pass.pdf',
    'Matching evidence approved normally.'
  );
  assert(pass.verification.ai_status === 'PASS', 'Control proof receives PASS verification');
  assert(pass.audit.action === 'PROOF_APPROVED', 'PASS proof uses ordinary approval action');
  assert(pass.audit.metadata.override !== true, 'PASS proof has no override marker');

  const override = await createProofFixture(
    ngoId,
    auditorId,
    campaignId,
    overrideMilestoneId,
    300000,
    'invoice-claim7-override.pdf',
    'Authorized auditor override after reviewing the discrepancy.'
  );
  assert(override.verification.ai_status === 'FLAG', 'Mismatched invoice receives FLAG verification');
  assert(Number(override.verification.discrepancy_amount) > 0, 'FLAG proof stores a positive discrepancy');
  assert(override.audit.action === 'PROOF_APPROVED_OVERRIDE', 'FLAG proof uses override approval action');
  assert(override.audit.metadata.override === true, 'FLAG proof records override:true');
  assert(override.audit.metadata.overridden_ai_status === 'FLAG', 'FLAG status is recorded in the override audit entry');

  const withheld = await createProof(
    ngoId,
    withheldMilestoneId,
    { claimed_amount: 300000, description: 'Unapproved flagged evidence fixture' },
    [{
      originalName: 'invoice-claim7-withheld.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(`withheld ${crypto.randomUUID()}`),
    }]
  );
  const withheldVerification = await query<{ ai_status: string }>(
    `SELECT ai_status FROM verification_results WHERE proof_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [withheld.id]
  );
  assert(withheldVerification.rows[0].ai_status === 'FLAG', 'Withheld proof is FLAGged before auditor approval');

  let releaseRejected = false;
  try {
    await createReleaseRequest(ngoId, { milestoneId: withheldMilestoneId });
  } catch (error: any) {
    releaseRejected = /must be approved|status/i.test(error.message || '');
  }
  assert(releaseRejected, 'Release request is withheld while FLAG evidence remains unapproved');
}

runOverrideTests()
  .then(() => {
    console.log(`\nClaim 7 override tests: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exitCode = 1;
  })
  .catch((error) => {
    console.error('Claim 7 override test failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
  });
