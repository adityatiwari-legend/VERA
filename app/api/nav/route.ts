import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { NavCounts, UserRole } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * Data-driven navigation for the role shells: every link target and badge
 * count is computed from real database state — no hardcoded ids anywhere.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role: UserRole = user.role;

    const one = async (sql: string, params: unknown[] = []): Promise<number> => {
      try {
        const res = await query<{ count: string }>(sql, params as any[]);
        return Number(res.rows[0]?.count ?? 0);
      } catch {
        return 0;
      }
    };

    let items: NavCounts['items'] = [];
    let org_status: string | null = null;
    let contractor_status: string | null = null;
    let has_solana_pubkey = Boolean(user.solana_pubkey);

    if (role === 'ADMIN') {
      const [openComplaints, pendingFundRequests, pendingContractors, activeEscrows, pendingProofs] =
        await Promise.all([
          one(`SELECT COUNT(*) AS count FROM pothole_reports WHERE status IN ('OPEN','CONFIRMED')`),
          one(`SELECT COUNT(*) AS count FROM fund_requests WHERE status IN ('DRAFT','SUBMITTED','APPROVED')`),
          one(`SELECT COUNT(*) AS count FROM users WHERE role = 'CONTRACTOR' AND contractor_status = 'PENDING'`),
          one(`SELECT COUNT(*) AS count FROM hisaab_escrows WHERE status = 'ACTIVE'`),
          one(`SELECT COUNT(*) AS count FROM proofs WHERE status IN ('SUBMITTED','UNDER_REVIEW')`),
        ]);
      const pendingOrgs = await one(
        `SELECT COUNT(*) AS count FROM users WHERE role = 'ORGANIZATION' AND org_status = 'PENDING'`
      );
      items = [
        { label: 'Admin Console', href: '/admin', icon: 'dashboard' },
        { label: 'Complaints', href: '/admin/complaints', icon: 'complaints', count: openComplaints },
        { label: 'Fund Requests', href: '/admin/fund-requests', icon: 'funds', count: pendingFundRequests },
        { label: 'Contractors', href: '/admin/contractors', icon: 'contractors', count: pendingContractors },
        { label: 'Organizations', href: '/admin/access', icon: 'directory', count: pendingOrgs },
        { label: 'Escrows', href: '/admin/escrows', icon: 'funds', count: activeEscrows },
        { label: 'Login Audit', href: '/admin/logins', icon: 'audit' },
        { label: 'VERA Review Queue', href: '/auditor/dashboard', icon: 'review', count: pendingProofs },
        { label: 'Campaigns', href: '/campaigns', icon: 'campaigns' },
      ];
    } else if (role === 'AUDITOR') {
      const [pendingProofs] = await Promise.all([
        one(`SELECT COUNT(*) AS count FROM proofs WHERE status IN ('SUBMITTED','UNDER_REVIEW')`),
      ]);
      items = [
        { label: 'Review Queue', href: '/auditor/dashboard', icon: 'review', count: pendingProofs },
        { label: 'Browse Campaigns', href: '/campaigns', icon: 'campaigns' },
        { label: 'Organizations', href: '/ngos', icon: 'directory' },
      ];
    } else if (role === 'ORGANIZATION') {
      org_status = user.org_status ?? null;
      const [myCampaigns, pendingProofs] = await Promise.all([
        one(`SELECT COUNT(*) AS count FROM campaigns WHERE ngo_id = $1`, [user.id]),
        one(
          `SELECT COUNT(*) AS count FROM proofs p
           JOIN milestones m ON p.milestone_id = m.id
           JOIN campaigns c ON m.campaign_id = c.id
           WHERE c.ngo_id = $1 AND p.status IN ('SUBMITTED','UNDER_REVIEW')`,
          [user.id]
        ),
      ]);
      items = [
        { label: 'My Campaigns', href: '/org/campaigns', icon: 'campaigns', count: myCampaigns },
        { label: 'New Campaign', href: '/org/campaigns/new', icon: 'new' },
        { label: 'Proofs in Review', href: '/org/campaigns', icon: 'review', count: pendingProofs },
        { label: 'Organizations', href: '/ngos', icon: 'directory' },
      ];
    } else if (role === 'CONTRACTOR') {
      contractor_status = user.contractor_status ?? null;
      has_solana_pubkey = Boolean(user.solana_pubkey);
      const [offeredJobs, activeJobs] = await Promise.all([
        one(
          `SELECT COUNT(*) AS count FROM contractor_assignments WHERE contractor_id = $1 AND status = 'OFFERED'`,
          [user.id]
        ),
        one(
          `SELECT COUNT(*) AS count FROM contractor_assignments WHERE contractor_id = $1 AND status = 'ACCEPTED'`,
          [user.id]
        ),
      ]);
      items = [
        { label: 'My Jobs', href: '/contractor', icon: 'jobs', count: offeredJobs },
        { label: 'Street Register', href: '/hisaab', icon: 'map' },
      ];
    } else {
      // USER (citizen)
      const [myReports, openReports] = await Promise.all([
        one(`SELECT COUNT(*) AS count FROM pothole_reports WHERE reporter_id = $1`, [user.id]),
        one(`SELECT COUNT(*) AS count FROM pothole_reports WHERE status IN ('OPEN','CONFIRMED')`),
      ]);
      items = [
        { label: 'Overview', href: '/dashboard', icon: 'dashboard' },
        { label: 'Browse Campaigns', href: '/campaigns', icon: 'compass' },
        { label: 'My Donations', href: '/donor/donations', icon: 'donations' },
        { label: 'My Reports', href: '/dashboard', icon: 'report', count: myReports },
        { label: 'Street Register', href: '/hisaab', icon: 'map', count: openReports },
        { label: 'Report an Issue', href: '/hisaab/report/new', icon: 'report' },
      ];
    }

    return NextResponse.json({
      role,
      org_status,
      contractor_status,
      has_solana_pubkey,
      items,
    } satisfies NavCounts);
  } catch (error) {
    console.error('GET /api/nav error:', error);
    return NextResponse.json({ error: 'Failed to load navigation' }, { status: 500 });
  }
}
