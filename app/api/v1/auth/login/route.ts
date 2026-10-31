import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validation';
import { loginAndIssueToken } from '@/lib/api_auth';
import { rateLimit, clientIp } from '@/lib/rate_limit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/auth/login  { email, password }
 * → { token, user }   (send the token as `Authorization: Bearer <token>`)
 */
export async function POST(req: NextRequest) {
  try {
    rateLimit(`v1-login:${clientIp(req)}`, 10, 60_000);
    const parsed = loginSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const result = await loginAndIssueToken(parsed.data.email, parsed.data.password);
    if (!result) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.statusCode === 429) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error('POST /api/v1/auth/login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
