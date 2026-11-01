import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import { query } from './db';
import { User, SessionPayload, UserRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  console.warn('[auth] JWT_SECRET not set — using development fallback secret. Never run production like this.');
}
const DEV_FALLBACK_SECRET = 'fundtrail-dev-only-not-a-secret';
const secretKey = new TextEncoder().encode(JWT_SECRET || DEV_FALLBACK_SECRET);
const COOKIE_NAME = 'fundtrail_session';

/**
 * Hash plain password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify plain password against bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Sign JWT session token
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

/**
 * Verify JWT session token
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Get current session payload from cookies
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);
    if (!sessionCookie?.value) {
      return null;
    }
    return await verifySessionToken(sessionCookie.value);
  } catch {
    return null;
  }
}

/**
 * Get current authenticated user from database using session cookie
 */
export async function getCurrentUser(): Promise<User | null> {
  // 1. Check Bearer token in Authorization header (Mobile apps & API clients)
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization') || '';
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      const raw = authHeader.slice(7).trim();
      if (raw) {
        if (raw.startsWith('vera_')) {
          const crypto = await import('crypto');
          const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
          const res = await query<User>(
            `SELECT u.id, u.name, u.email, u.wallet_address, u.role, u.org_type, u.org_status,
                    u.org_registration_no, u.contractor_status, u.service_area, u.solana_pubkey,
                    u.account_status, u.created_at, u.updated_at
             FROM api_tokens t
             JOIN users u ON u.id = t.user_id
             WHERE t.token_hash = $1
               AND (t.expires_at IS NULL OR t.expires_at > NOW())
               AND (u.account_status IS NULL OR u.account_status = 'ACTIVE')`,
            [tokenHash]
          );
          if (res.rows[0]) {
            query(`UPDATE api_tokens SET last_used_at = NOW() WHERE token_hash = $1`, [tokenHash]).catch(() => {});
            return res.rows[0];
          }
        } else {
          const session = await verifySessionToken(raw);
          if (session?.userId) {
            const res = await query<User>(
              `SELECT id, name, email, wallet_address, role, org_type, org_status, org_registration_no,
                      contractor_status, service_area, solana_pubkey, account_status, created_at, updated_at
               FROM users
               WHERE id = $1 AND (account_status IS NULL OR account_status = 'ACTIVE')`,
              [session.userId]
            );
            if (res.rows[0]) return res.rows[0];
          }
        }
      }
    }
  } catch {
    // headers() may throw outside of request context
  }

  // 2. Check session cookie
  const session = await getSession();
  if (!session?.userId) {
    return null;
  }

  const result = await query<User>(
    `SELECT id, name, email, wallet_address, role, org_type, org_status, org_registration_no,
            contractor_status, service_area, solana_pubkey, account_status, created_at, updated_at
     FROM users
     WHERE id = $1 AND (account_status IS NULL OR account_status = 'ACTIVE')`,
    [session.userId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Set HTTP-only session cookie
 */
export function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

/**
 * Clear session cookie
 */
export function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export { COOKIE_NAME };
