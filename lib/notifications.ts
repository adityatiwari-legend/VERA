import { query } from './db';
import { Notification } from '../types';

/**
 * Create an in-app notification. Never throws — notifications must not
 * break the primary action that triggered them.
 */
export async function notify(
  userId: string | null | undefined,
  type: string,
  title: string,
  body?: string | null,
  link?: string | null
): Promise<void> {
  if (!userId) return;
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1::uuid, $2, $3, $4, $5)`,
      [userId, type, title, body ?? null, link ?? null]
    );
  } catch (err) {
    console.error('[notifications] insert failed:', err);
  }
}

export async function notifyRole(
  roles: string[],
  type: string,
  title: string,
  body?: string | null,
  link?: string | null
): Promise<void> {
  if (roles.length === 0) return;
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       SELECT id, $2, $3, $4, $5 FROM users
       WHERE role = ANY($1::text[]) AND (account_status IS NULL OR account_status = 'ACTIVE')`,
      [roles, type, title, body ?? null, link ?? null]
    );
  } catch (err) {
    console.error('[notifications] role insert failed:', err);
  }
}

export async function listNotifications(userId: string, limit = 50): Promise<Notification[]> {
  const res = await query<Notification>(
    `SELECT * FROM notifications WHERE user_id = $1::uuid ORDER BY created_at DESC LIMIT $2`,
    [userId, Math.min(limit, 100)]
  );
  return res.rows;
}

export async function unreadCount(userId: string): Promise<number> {
  const res = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1::uuid AND read_at IS NULL`,
    [userId]
  );
  return Number(res.rows[0]?.count ?? 0);
}

export async function markNotificationsRead(userId: string, ids?: string[]): Promise<void> {
  if (ids && ids.length > 0) {
    await query(
      `UPDATE notifications SET read_at = NOW()
       WHERE user_id = $1::uuid AND read_at IS NULL AND id = ANY($2::uuid[])`,
      [userId, ids]
    );
  } else {
    await query(`UPDATE notifications SET read_at = NOW() WHERE user_id = $1::uuid AND read_at IS NULL`, [userId]);
  }
}
