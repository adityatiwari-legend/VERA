import * as dotenv from 'dotenv';
import path from 'path';
import { db, query } from '../lib/db';
import { recordAuditLog } from '../lib/audit_log';
import { readFileWithSha256, resolveSafeStoragePath } from '../lib/storage';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

async function rehashAllProofs() {
  const files = await query<{
    id: string;
    proof_id: string;
    file_path: string;
    sha256_hash: string;
    campaign_id: string;
    submitted_by: string;
  }>(
    `SELECT pf.id, pf.proof_id, pf.file_path, pf.sha256_hash,
            c.id as campaign_id, p.submitted_by
     FROM proof_files pf
     JOIN proofs p ON pf.proof_id = p.id
     JOIN milestones m ON p.milestone_id = m.id
     JOIN campaigns c ON m.campaign_id = c.id
     ORDER BY pf.uploaded_at ASC`
  );

  let matches = 0;
  let mismatches = 0;

  console.log(`Re-hashing ${files.rowCount || 0} stored proof file(s)...`);

  for (const file of files.rows) {
    let actualHash = 'MISSING';
    try {
      const stored = await readFileWithSha256(resolveSafeStoragePath(file.file_path));
      actualHash = stored.sha256Hash;
    } catch {
      // Missing files are integrity failures and are reported like hash mismatches.
    }

    const matchesReference = actualHash !== 'MISSING' && actualHash === file.sha256_hash;
    if (matchesReference) {
      matches += 1;
      console.log(`MATCH     ${file.id} ${actualHash}`);
      continue;
    }

    mismatches += 1;
    console.log(`MISMATCH  ${file.id} expected=${file.sha256_hash} actual=${actualHash}`);
    await recordAuditLog({
      campaignId: file.campaign_id,
      actorId: file.submitted_by,
      action: 'PROOF_FILE_INTEGRITY_FAILED',
      entityType: 'PROOF_FILE',
      entityId: file.id,
      metadata: {
        proof_id: file.proof_id,
        expected_sha256: file.sha256_hash,
        actual_sha256: actualHash,
        integrity_failed: true,
        source: 'rehash-all-proofs',
      },
    });
  }

  console.log(`Report: ${matches} match(es), ${mismatches} mismatch(es).`);
}

rehashAllProofs()
  .catch((error) => {
    console.error('Proof rehash failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
  });
