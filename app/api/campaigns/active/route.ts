import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Campaign } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = `
      SELECT 
        c.id,
        c.ngo_id,
        c.title,
        c.description,
        c.target_amount::numeric as target_amount,
        c.raised_amount::numeric as raised_amount,
        c.released_amount::numeric as released_amount,
        c.beneficiary,
        c.status,
        c.created_at,
        u.name as ngo_name,
        COUNT(DISTINCT m.id)::int as milestones_count,
        COUNT(DISTINCT d.id)::int as donors_count
      FROM campaigns c
      JOIN users u ON c.ngo_id = u.id
      LEFT JOIN milestones m ON c.id = m.campaign_id
      LEFT JOIN donations d ON c.id = d.campaign_id AND d.status = 'CONFIRMED'
      WHERE c.status = 'ACTIVE'
      GROUP BY c.id, u.name
      ORDER BY c.created_at DESC
    `;

    const res = await query<Campaign>(sql);
    return NextResponse.json({ campaigns: res.rows });
  } catch (error: any) {
    console.error('Error fetching active campaigns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
