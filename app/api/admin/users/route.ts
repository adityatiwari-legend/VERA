import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, AppError } from '@/lib/permissions';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { notify } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

const orgStatusSchema = z.object({
  action: z.literal('org-status'),
  user_id: z.string().uuid(),
  status: z.enum(['VERIFIED', 'SUSPENDED', 'PENDING']),
});

const auditorSchema = z.object({
  action: z.literal('create-auditor'),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(6).max(100),
});

const contractorStatusSchema = z.object({
  action: z.literal('contractor-status'),
  user_id: z.string().uuid(),
  status: z.enum(['APPROVED', 'SUSPENDED', 'PENDING']),
});

/**
 * ADMIN access management:
 *  - verify/suspend ORGANIZATION accounts (gates campaign creation)
 *  - invite AUDITOR accounts (auditors cannot self-register)
 *  - approve/suspend CONTRACTOR accounts (see /api/hisaab/contractors)
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole(['ADMIN']);
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') || 'ORGANIZATION';
    const res = await query(
      `SELECT id, name, email, role, org_type, org_status, org_registration_no,
              contractor_status, service_area, created_at
       FROM users WHERE role = $1 ORDER BY created_at DESC LIMIT 200`,
      [role]
    );
    return NextResponse.json({ users: res.rows });
  } catch (error) {
    console.error('GET /api/admin/users error:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(['ADMIN']);
    const body = await req.json();

    if (body?.action === 'org-status') {
      const parsed = orgStatusSchema.safeParse(body);
      if (!parsed.success) throw new AppError('Invalid payload', 400);
      const { user_id, status } = parsed.data;
      const res = await query(
        `UPDATE users SET org_status = $2, updated_at = NOW()
         WHERE id = $1::uuid AND role = 'ORGANIZATION' RETURNING id, name, email, org_status`,
        [user_id, status]
      );
      if (!res.rows[0]) throw new AppError('Organization not found', 404);
      await notify(
        user_id,
        'ORG_STATUS',
        `Organization ${status.toLowerCase()}`,
        status === 'VERIFIED'
          ? 'Your organization is verified — you can now create fundraising campaigns.'
          : `Your organization status changed to ${status}.`,
        '/org/campaigns'
      );
      return NextResponse.json({ user: res.rows[0] });
    }

    if (body?.action === 'contractor-status') {
      const parsed = contractorStatusSchema.safeParse(body);
      if (!parsed.success) throw new AppError('Invalid payload', 400);
      const res = await query(
        `UPDATE users SET contractor_status = $2, updated_at = NOW()
         WHERE id = $1::uuid AND role = 'CONTRACTOR' RETURNING id, name, contractor_status`,
        [parsed.data.user_id, parsed.data.status]
      );
      if (!res.rows[0]) throw new AppError('Contractor not found', 404);
      return NextResponse.json({ user: res.rows[0] });
    }

    if (body?.action === 'create-auditor') {
      const parsed = auditorSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      const { name, email, password } = parsed.data;
      const existing = await query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase()]);
      if (existing.rows[0]) throw new AppError('Email already registered', 409);
      const passwordHash = await hashPassword(password);
      const res = await query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'AUDITOR')
         RETURNING id, name, email, role`,
        [name, email.toLowerCase(), passwordHash]
      );
      return NextResponse.json({ user: res.rows[0] }, { status: 201 });
    }

    throw new AppError('Unknown action', 400);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/admin/users error:', error);
    return NextResponse.json({ error: 'Failed to manage user' }, { status: 500 });
  }
}
