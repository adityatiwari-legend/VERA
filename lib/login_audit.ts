import { query } from './db';

/**
 * Login-audit trail for the admin console (/admin/logins).
 * Every web + mobile login attempt lands in login_events; successful logins
 * also stamp users.last_login_at. Recording is best-effort: a failed insert
 * must never break the login flow itself.
 */
export interface RecordLoginEventParams {
  userId?: string | null;
  email: string;
  role?: string | null;
  method: 'WEB' | 'API';
  success: boolean;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const REASONS = ['UNKNOWN_EMAIL', 'INVALID_PASSWORD', 'ACCOUNT_INACTIVE'] as const;

export async function recordLoginEvent(params: RecordLoginEventParams): Promise<void> {
  try {
    const reason = params.reason && (REASONS as readonly string[]).includes(params.reason)
      ? params.reason
      : params.success
        ? null
        : 'UNKNOWN_EMAIL';
    await query(
      `INSERT INTO login_events (user_id, email, role, method, success, reason, ip_address, user_agent)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)`,
      [
        params.userId ?? null,
        params.email.toLowerCase(),
        params.role ?? null,
        params.method,
        params.success,
        reason,
        params.ipAddress ?? null,
        params.userAgent?.slice(0, 400) ?? null,
      ]
    );
    if (params.success && params.userId) {
      await query(`UPDATE users SET last_login_at = NOW() WHERE id = $1::uuid`, [params.userId]);
    }
  } catch (error: any) {
    console.warn('[login_audit] Failed to record login event:', error?.message);
  }
}
