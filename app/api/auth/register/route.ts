import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, clientIp } from '@/lib/rate_limit';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { registerSchema } from '@/lib/validation';
import { User } from '@/types';

// Self-serve registration: USER / ORGANIZATION / CONTRACTOR only.
// AUDITOR accounts are created by admin invite; ADMIN is seed-only.
export async function POST(request: NextRequest) {
  try {
    rateLimit(`web-register:${clientIp(request)}`, 5, 60_000);
    const body = await request.json();
    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password, role, org_type, org_registration_no, service_area } =
      validated.data;

    // Check if email already registered
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rowCount && existing.rowCount > 0) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const insertRes = await query<User>(
      `INSERT INTO users (name, email, password_hash, role, org_type, org_status, org_registration_no, contractor_status, service_area)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, email, wallet_address, role, org_type, org_status, contractor_status, created_at, updated_at`,
      [
        name,
        email.toLowerCase(),
        passwordHash,
        role,
        role === 'ORGANIZATION' ? org_type : null,
        role === 'ORGANIZATION' ? 'PENDING' : null,
        role === 'ORGANIZATION' ? org_registration_no || null : null,
        role === 'CONTRACTOR' ? 'PENDING' : null,
        role === 'CONTRACTOR' ? service_area || null : null,
      ]
    );

    const user = insertRes.rows[0];

    // Registration intentionally does NOT log the user in: organizations and
    // contractors start unverified, and the login page explains what happens next.
    return NextResponse.json(
      {
        user,
        message:
          role === 'ORGANIZATION'
            ? 'Organization registered. An admin must verify it before you can raise campaigns.'
            : role === 'CONTRACTOR'
              ? 'Contractor registered. An admin must approve your account before job offers arrive.'
              : 'Account created. Sign in to get started.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error during registration' },
      { status: 500 }
    );
  }
}
