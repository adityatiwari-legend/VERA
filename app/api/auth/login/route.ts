import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, clientIp } from '@/lib/rate_limit';
import { query } from '@/lib/db';
import { verifyPassword, signSessionToken, setSessionCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { UserWithPasswordHash } from '@/types';

export async function POST(request: NextRequest) {
  try {
    rateLimit(`web-login:${clientIp(request)}`, 10, 60_000);
    const body = await request.json();
    const validated = loginSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = validated.data;

    const res = await query<UserWithPasswordHash>(
      `SELECT id, name, email, password_hash, wallet_address, role, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (res.rowCount === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const userWithHash = res.rows[0];
    const passwordValid = await verifyPassword(password, userWithHash.password_hash);

    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const token = await signSessionToken({
      userId: userWithHash.id,
      email: userWithHash.email,
      role: userWithHash.role,
      name: userWithHash.name,
    });

    setSessionCookie(token);

    const { password_hash, ...user } = userWithHash;

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error during login' },
      { status: 500 }
    );
  }
}
