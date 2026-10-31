import crypto from 'crypto';
import { PoolClient } from 'pg';
import { query, withTransaction } from './db';
import { AuditLog } from '../types';

export interface RecordAuditLogParams {
  campaignId: string | null;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
  createdAt?: Date | string;
  client?: PoolClient;
}

/**
 * JSON.stringify with deterministic object-key ordering. PostgreSQL jsonb emits
 * object keys in the same canonical order used by the backfill migration.
 */
export function canonicalizeAuditPayload(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeAuditPayload(item)).join(',')}]`;
  }

  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalizeAuditPayload(object[key])}`)
    .join(',')}}`;
}

export function getAuditPayload(entry: {
  campaign_id: string | null;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, any>;
}) {
  return {
    action: entry.action,
    actor_id: entry.actor_id,
    campaign_id: entry.campaign_id,
    entity_id: entry.entity_id,
    entity_type: entry.entity_type,
    metadata: entry.metadata || {},
  };
}

export function calculateAuditEntryHash(prevHash: string | null, payload: unknown): string {
  return crypto
    .createHash('sha256')
    .update(`${prevHash || ''}${canonicalizeAuditPayload(payload)}`)
    .digest('hex');
}

async function appendAuditLog(client: PoolClient, params: RecordAuditLogParams): Promise<AuditLog> {
  // Transaction-scoped lock serializes head reads and inserts across all writers.
  await client.query('SELECT pg_advisory_xact_lock($1)', [74839201]);

  const head = await client.query<{ entry_hash: string }>(
    `SELECT entry_hash
     FROM audit_logs
     ORDER BY chain_position DESC
     LIMIT 1`
  );
  const prevHash = head.rows[0]?.entry_hash || null;
  const metadata = params.metadata || {};
  const payload = getAuditPayload({
    campaign_id: params.campaignId,
    actor_id: params.actorId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    metadata,
  });
  const entryHash = calculateAuditEntryHash(prevHash, payload);

  const result = await client.query<AuditLog>(
    `INSERT INTO audit_logs (
       campaign_id,
       actor_id,
       action,
       entity_type,
       entity_id,
       metadata,
       created_at,
       prev_hash,
       entry_hash
     )
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()), $8, $9)
     RETURNING id, campaign_id, actor_id, action, entity_type, entity_id,
               metadata, created_at, prev_hash, entry_hash, chain_position`,
    [
      params.campaignId,
      params.actorId,
      params.action,
      params.entityType,
      params.entityId,
      JSON.stringify(metadata),
      params.createdAt || null,
      prevHash,
      entryHash,
    ]
  );

  return result.rows[0];
}

/**
 * Append exactly one hash-linked audit record. When a caller supplies a client,
 * that client's surrounding transaction is used; otherwise this helper owns the
 * transaction boundary.
 */
export async function recordAuditLog(params: RecordAuditLogParams): Promise<AuditLog> {
  if (params.client) {
    return appendAuditLog(params.client, params);
  }

  return withTransaction((client) => appendAuditLog(client, params));
}

export interface AuditChainVerification {
  valid: boolean;
  brokenAt: string | null;
}

export async function verifyAuditLogChain(): Promise<AuditChainVerification> {
  const result = await query<{
    id: string;
    campaign_id: string | null;
    actor_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    metadata: Record<string, any>;
    prev_hash: string | null;
    entry_hash: string | null;
    chain_position: string;
  }>(
    `SELECT id, campaign_id, actor_id, action, entity_type, entity_id, metadata,
            prev_hash, entry_hash, chain_position
     FROM audit_logs
     ORDER BY chain_position ASC`
  );

  let previousHash: string | null = null;
  for (const row of result.rows) {
    if (row.prev_hash !== previousHash) {
      return { valid: false, brokenAt: row.id };
    }

    const expectedHash = calculateAuditEntryHash(
      previousHash,
      getAuditPayload(row)
    );
    if (row.entry_hash !== expectedHash) {
      return { valid: false, brokenAt: row.id };
    }

    previousHash = row.entry_hash;
  }

  return { valid: true, brokenAt: null };
}

/**
 * Retrieve all audit log entries for a given campaign, newest first.
 * (Merged from lib/audit.ts — one audit module, one source of truth.)
 */
export async function getAuditLogsForCampaign(campaignId: string): Promise<AuditLog[]> {
  const sql = `
    SELECT 
      a.id,
      a.campaign_id,
      a.actor_id,
      a.action,
      a.entity_type,
      a.entity_id,
      a.metadata,
      a.created_at,
      u.name as actor_name,
      u.role as actor_role
    FROM audit_logs a
    LEFT JOIN users u ON a.actor_id = u.id
    WHERE a.campaign_id = $1
    ORDER BY a.created_at DESC
  `;

  const res = await query<AuditLog>(sql, [campaignId]);
  return res.rows;
}
