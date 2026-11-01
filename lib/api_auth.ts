import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { query } from './db';
import { User } from '../types';
import { UnauthorizedError } from './permissions';
import { getCurrentUser, verifyPassword } from './auth';

/**
 * Bearer-token auth for mobile clients (/api/v1/*).
 * Tokens are random, shown once, and stored hashed (sha256) in api_tokens.
 */

const TOKEN_PREFIX = 'vera_';

export async function issueApiToken(
  userId: string,
  name = 'mobile'
): Promise<{ token: string; expiresAt: Date | null }> {
  const raw = TOKEN_PREFIX + crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  await query(
    `INSERT INTO api_tokens (user_id, token_hash, name) VALUES ($1::uuid, $2, $3)`,
    [userId, tokenHash, name]
  );
  return { token: raw, expiresAt: null };
}

export async function revokeApiTokens(userId: string): Promise<void> {
  await query(`DELETE FROM api_tokens WHERE user_id = $1::uuid`, [userId]);
}

async function userFromBearer(req: NextRequest): Promise<User | null> {
  const header = req.headers.get('authorization') || '';
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  const raw = header.slice(7).trim();
  if (!raw.startsWith(TOKEN_PREFIX)) return null;

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
    // best-effort last-used touch (fire and forget)
    query(`UPDATE api_tokens SET last_used_at = NOW() WHERE token_hash = $1`, [tokenHash]).catch(
      () => {}
    );
  }
  return res.rows[0] ?? null;
}

/** API-auth: Bearer token first, falls back to the web session cookie. */
export async function requireApiAuth(req: NextRequest): Promise<User> {
  const bearerUser = await userFromBearer(req);
  if (bearerUser) return bearerUser;
  throw new UnauthorizedError('Authorization: Bearer <token> required');
}

export async function requireApiRole(req: NextRequest, roles: string[]): Promise<User> {
  const user = await requireApiAuth(req);
  if (!roles.includes(user.role)) {
    throw new UnauthorizedError(`Requires role: ${roles.join(', ')}`);
  }
  return user;
}

/**
 * Dual-stack auth for shared /api routes the Flutter app also calls:
 * web session cookie first (browser), then Bearer token (mobile).
 */
export async function requireAnyAuth(req: NextRequest): Promise<User> {
  const bearerUser = await userFromBearer(req);
  if (bearerUser) return bearerUser;
  const cookieUser = await getCurrentUser();
  if (cookieUser) return cookieUser;
  throw new UnauthorizedError('Authorization: Bearer <token> or session cookie required');
}

export async function requireAnyRole(req: NextRequest, roles: string[]): Promise<User> {
  const user = await requireAnyAuth(req);
  if (!roles.includes(user.role)) {
    throw new UnauthorizedError(`Requires role: ${roles.join(', ')}`);
  }
  return user;
}

/** Login + issue token in one step (mobile-friendly). */
export async function loginAndIssueToken(
  email: string,
  password: string
): Promise<
  | { ok: true; token: string; user: User }
  | { ok: false; reason: 'UNKNOWN_EMAIL' | 'INVALID_PASSWORD' }
> {
  const res = await query<User & { password_hash: string }>(
    `SELECT * FROM users WHERE email = $1 AND (account_status IS NULL OR account_status = 'ACTIVE')`,
    [email.toLowerCase()]
  );
  const user = res.rows[0];
  if (!user) return { ok: false, reason: 'UNKNOWN_EMAIL' };
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return { ok: false, reason: 'INVALID_PASSWORD' };
  const { token } = await issueApiToken(user.id);
  delete (user as any).password_hash;
  return { ok: true, token, user };
}
