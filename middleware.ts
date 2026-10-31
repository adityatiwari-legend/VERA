import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Single auth choke point: verifies the session JWT (edge-compatible via jose)
 * and gates role-scoped route trees. Route handlers and pages still re-check
 * authorization against the database — this layer only handles routing.
 */

const DEV_FALLBACK_SECRET = 'fundtrail-dev-only-not-a-secret';
const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || DEV_FALLBACK_SECRET);

export const ROLE_HOME: Record<string, string> = {
  USER: '/dashboard',
  ORGANIZATION: '/org/campaigns',
  CONTRACTOR: '/contractor',
  AUDITOR: '/auditor/dashboard',
  ADMIN: '/admin',
};

const ROUTE_ROLES: { prefix: RegExp; roles: string[] }[] = [
  { prefix: /^\/admin(\/|$)/, roles: ['ADMIN'] },
  { prefix: /^\/auditor(\/|$)/, roles: ['AUDITOR', 'ADMIN'] },
  { prefix: /^\/org(\/|$)/, roles: ['ORGANIZATION', 'ADMIN'] },
  { prefix: /^\/contractor(\/|$)/, roles: ['CONTRACTOR', 'ADMIN'] },
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const rule = ROUTE_ROLES.find((r) => r.prefix.test(pathname));
  const needsAuth =
    Boolean(rule) ||
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname.startsWith('/donor/') ||
    pathname === '/hisaab/report/new';

  if (!needsAuth) {
    return NextResponse.next();
  }

  const token = req.cookies.get('fundtrail_session')?.value;
  let role: string | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secretKey);
      role = (payload as { role?: string }).role ?? null;
    } catch {
      role = null;
    }
  }

  if (!role) {
    const login = new URL('/login', req.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  if (rule && !rule.roles.includes(role)) {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/auditor/:path*',
    '/org/:path*',
    '/contractor/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/donor/:path*',
    '/hisaab/report/new',
  ],
};
