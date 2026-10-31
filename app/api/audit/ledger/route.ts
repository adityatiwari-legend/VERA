import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { AuditTransaction } from '@/lib/types';
import { runIntegrityChecks } from '@/lib/integrity';
import { requireRole } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRole(['AUDITOR', 'ADMIN']);

    const sql = `
      SELECT 
        ft.id,
        ft.created_at,
        c.title as campaign,
        m.title as milestone,
        ft.amount::numeric as amount,
        ft.type,
        ft.transaction_hash as tx_hash,
        ft.blockchain_tx_hash,
        pf.sha256_hash,
        u.name as ngo_name,
        vr.discrepancy_amount::numeric as discrepancy
      FROM fund_transactions ft
      JOIN campaigns c ON ft.campaign_id = c.id
      JOIN users u ON c.ngo_id = u.id
      LEFT JOIN milestones m ON ft.milestone_id = m.id
      LEFT JOIN proofs p ON m.id = p.milestone_id
      LEFT JOIN proof_files pf ON p.id = pf.proof_id
      LEFT JOIN verification_results vr ON p.id = vr.proof_id
      ORDER BY ft.created_at DESC
      LIMIT 20
    `;

    const res = await query<{
      id: string;
      created_at: string;
      campaign: string;
      milestone: string | null;
      amount: number;
      type: string;
      tx_hash: string | null;
      blockchain_tx_hash: string | null;
      sha256_hash: string | null;
      ngo_name: string;
      discrepancy: number | null;
    }>(sql);

    const statusMap: Record<string, AuditTransaction['status']> = {
      RELEASE: 'RELEASED',
      LOCK: 'ESCROW_LOCKED',
      DONATION: 'RECORDED',
      SPEND: 'RECORDED',
      REFUND: 'REFUNDED',
    };

    // The proof/verification JOINs can multiply one fund transaction into
    // several rows — collapse them back to one entry per fund transaction.
    const seen = new Set<string>();
    const dbTransactions: AuditTransaction[] = res.rows
      .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
      .map((r) => ({
      id: `TX-${r.id.substring(0, 8).toUpperCase()}`,
      timestamp: new Date(r.created_at).toISOString(),
      campaign: r.campaign,
      milestone: r.milestone || `Direct allocation: ${r.type.toLowerCase()}`,
      amount: Number(r.amount),
      currency: '₹',
      type: r.type,
      status: statusMap[r.type] || 'RECORDED',
      txHash: r.blockchain_tx_hash || r.tx_hash || null,
      evidenceHash: r.sha256_hash || null,
      ngoName: r.ngo_name,
      ocrDiscrepancy: r.discrepancy === null ? null : Number(r.discrepancy),
    }));

    return NextResponse.json({
      transactions: dbTransactions,
      integrity: await runIntegrityChecks(),
    });
  } catch (error: any) {
    // Auth errors must surface with their status; genuine DB failures are
    // reported as 500 instead of masquerading as an empty ledger.
    if (error?.statusCode) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Audit ledger query error:', error.message);
    return NextResponse.json({ error: 'Failed to load audit ledger' }, { status: 500 });
  }
}
