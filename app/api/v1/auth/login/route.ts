import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validation';
import { loginAndIssueToken } from '@/lib/api_auth';
import { recordLoginEvent } from '@/lib/login_audit';
import { rateLimit, clientIp } from '@/lib/rate_limit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/auth/login  { email, password }
 * → { token, user }   (send the token as `Authorization: Bearer <token>`)
 */
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const userAgent = req.headers.get('user-agent');
    rateLimit(`v1-login:${ip}`, 10, 60_000);
    const parsed = loginSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { email, password } = parsed.data;
    const result = await loginAndIssueToken(email, password);
    if (!result.ok) {
      await recordLoginEvent({
        email,
        method: 'API',
        success: false,
        reason: result.reason,
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    await recordLoginEvent({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      method: 'API',
      success: true,
      ipAddress: ip,
      userAgent,
    });
    return NextResponse.json({ token: result.token, user: result.user });
  } catch (error: any) {
    if (error?.statusCode === 429) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error('POST /api/v1/auth/login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
