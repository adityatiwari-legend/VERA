/**
 * Seeds Hisaab demo data: 3 citizens, a demo pothole report,
 * demo agents (legit with clean history, fraud with failures), roughness
 * readings, and audit entries.
 * Run: npm run seed:hisaab
 */
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../lib/db';
import { recordAuditLog } from '../lib/audit_log';
import { recordRoughnessReadings } from '../lib/tiger';

const CITIZENS = [
  { id: 'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1', name: 'Aarav (Citizen 1)', email: 'aarav@vera.org' },
  { id: 'd2d2d2d2-d2d2-d2d2-d2d2-d2d2d2d2d2d2', name: 'Priya (Citizen 2)', email: 'priya@vera.org' },
  { id: 'd3d3d3d3-d3d3-d3d3-d3d3-d3d3d3d3d3d3', name: 'Rohan (Citizen 3)', email: 'rohan@vera.org' },
];

const REPORT_ID = 'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e0e0';
const CONTRACTOR_USER_ID = 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4';

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  await withTransaction(async (client) => {
    // Citizens + contractor (NGO-role user plays "thaker")
    for (const c of CITIZENS) {
      await client.query(
        `INSERT INTO users (id, name, email, password_hash, role)
         VALUES ($1,$2,$3,$4,'USER')
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = 'USER'`,
        [c.id, c.name, c.email, passwordHash]
      );
    }
    // Contractor = real CONTRACTOR-role account, approved, with a Solana payout
    // wallet (env-configured so the on-chain escrow can pay this exact key).
    const contractorPubkey = process.env.HISAAB_CONTRACTOR_PUBKEY || null;
    await client.query(
      `INSERT INTO users (id, name, email, password_hash, role, contractor_status, service_area, solana_pubkey)
       VALUES ($1,'RoadWorks Contractor','thaker@vera.org',$2,'CONTRACTOR','APPROVED','Jaipur — Zone 3', $3)
       ON CONFLICT (id) DO UPDATE SET
         role = 'CONTRACTOR', contractor_status = 'APPROVED', name = EXCLUDED.name,
         service_area = EXCLUDED.service_area,
         solana_pubkey = COALESCE(EXCLUDED.solana_pubkey, users.solana_pubkey)`,
      [CONTRACTOR_USER_ID, passwordHash, contractorPubkey]
    );

    // Demo pothole report (OPEN, awaiting confirmations)
    await client.query(
      `INSERT INTO pothole_reports (
         id, reporter_id, latitude, longitude, address_label, description,
         severity, size_estimate_cm, gemini_result, gemini_status, status
       ) VALUES ($1,$2,26.912435,75.787270,'MI Road, Jaipur — near Sanganeri Gate',
         'Main market ke saamne gehra gadha, two-wheeler ke liye khatarnak.',
         'HIGH', 62, $3, 'PASS', 'OPEN')
       ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, severity = 'HIGH'`,
      [
        REPORT_ID,
        CITIZENS[0].id,
        JSON.stringify({
          severity: 'HIGH',
          size_estimate_cm: 62,
          surface_type: 'asphalt',
          description_hinglish:
            'Bhai yeh toh bada gadha hai — nearly 2 feet chaura aur kaafi deep. Baarish ke baad aur kharab hoga. Two-wheeler riders ke liye accident risk hai, jaldi bharwao.',
          confidence: 0.87,
        }),
      ]
    );

    await recordAuditLog({
      campaignId: null,
      actorId: CITIZENS[0].id,
      action: 'HISAAB_REPORT_CREATED',
      entityType: 'pothole_report',
      entityId: REPORT_ID,
      metadata: { severity: 'HIGH', seeded: true },
      client,
    });

  });

  // Roughness sample readings for the demo report (Tiger Data or fallback)
  const readings = Array.from({ length: 80 }, (_, i) => ({
    accel_z: i < 25 ? 1.1 + Math.random() * 0.8 : 2.8 + Math.random() * 2.6,
    speed_kmh: 28 + Math.random() * 6,
    recorded_at: new Date(Date.now() - (80 - i) * 500).toISOString(),
  }));
  const rough = await recordRoughnessReadings(REPORT_ID, 'seed-drive-by', readings);
  console.log(`Roughness readings stored on ${rough.store}: ${rough.inserted}`);

  console.log('\n✅ Hisaab + AgentPass demo data seeded.');
  console.log('   Citizens:  aarav@vera.org / priya@vera.org / rohan@vera.org  (Password123!)');
  console.log('   Contractor (CONTRACTOR role): thaker@vera.org  (Password123!)');
  console.log(`   Demo report: ${REPORT_ID}  →  /hisaab/report/${REPORT_ID}`);

}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
