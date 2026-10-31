import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

/**
 * Tiger Data (TimescaleDB cloud) connection for road-roughness time-series.
 * Falls back to an equivalent table in the main Postgres database so the demo
 * never breaks when the cloud service is unreachable.
 */

const TIGER_URL = process.env.TIGER_DATABASE_URL || '';

declare global {
  // eslint-disable-next-line no-var
  var __tigerPool: Pool | null | undefined;
}

export function getPool(): Pool | null {
  if (!TIGER_URL) return null;
  if (global.__tigerPool === undefined) {
    global.__tigerPool = new Pool({
      connectionString: TIGER_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
    });
  }
  return global.__tigerPool ?? null;
}

export function isTigerConfigured(): boolean {
  return Boolean(TIGER_URL);
}

const HYPERTABLE_DDL = `
CREATE TABLE IF NOT EXISTS roughness_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID,
  device_label VARCHAR(120),
  accel_z REAL NOT NULL,
  speed_kmh REAL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT create_hypertable('roughness_readings', 'recorded_at', if_not_exists => TRUE, migrate_data => TRUE);
`;

let schemaReady: Promise<boolean> | null = null;

async function ensureSchema(): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;
  try {
    await pool.query(HYPERTABLE_DDL);
    return true;
  } catch (err) {
    console.error('Tiger Data schema setup failed:', err);
    global.__tigerPool = null;
    return false;
  }
}

export function ensureTigerSchema(): Promise<boolean> {
  if (!schemaReady) {
    schemaReady = ensureSchema();
  }
  return schemaReady;
}

export interface RoughnessReadingInput {
  accel_z: number;
  speed_kmh?: number | null;
  recorded_at?: string | null;
}

export interface RoughnessWriteResult {
  store: 'TIGER_DATA' | 'LOCAL_FALLBACK';
  inserted: number;
  tigerError?: string;
}

export async function recordRoughnessReadings(
  reportId: string,
  deviceLabel: string,
  readings: RoughnessReadingInput[]
): Promise<RoughnessWriteResult> {
  const pool = getPool();
  let tigerError: string | undefined;

  if (pool) {
    try {
      await ensureTigerSchema();
      const values: any[] = [];
      const tuples = readings.map((r, i) => {
        values.push(reportId, deviceLabel, r.accel_z, r.speed_kmh ?? null, r.recorded_at || null);
        const b = i * 5;
        return `($${b + 1}::uuid, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5})`;
      });
      await pool.query(
        `INSERT INTO roughness_readings (report_id, device_label, accel_z, speed_kmh, recorded_at)
         VALUES ${tuples.join(', ')}`,
        values
      );
      return { store: 'TIGER_DATA', inserted: readings.length };
    } catch (err) {
      tigerError = err instanceof Error ? err.message : String(err);
      console.error('Tiger Data insert failed, falling back to local:', tigerError);
      global.__tigerPool = null;
    }
  }

  const { query } = await import('./db');
  for (const r of readings) {
    await query(
      `INSERT INTO roughness_readings (report_id, device_label, accel_z, speed_kmh, recorded_at)
       VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, NOW()))`,
      [reportId, deviceLabel, r.accel_z, r.speed_kmh ?? null, r.recorded_at || null]
    );
  }
  return { store: 'LOCAL_FALLBACK', inserted: readings.length, tigerError };
}

export async function getRoughnessReadings(reportId: string): Promise<{
  store: 'TIGER_DATA' | 'LOCAL_FALLBACK';
  rows: { accel_z: number; speed_kmh: number | null; recorded_at: string }[];
}> {
  const pool = getPool();
  if (pool) {
    try {
      await ensureTigerSchema();
      const res = await pool.query(
        `SELECT accel_z, speed_kmh, recorded_at FROM roughness_readings
         WHERE report_id = $1::uuid ORDER BY recorded_at ASC LIMIT 2000`,
        [reportId]
      );
      if (res.rowCount && res.rowCount > 0) {
        return { store: 'TIGER_DATA', rows: res.rows };
      }
    } catch (err) {
      console.error('Tiger Data read failed, falling back to local:', err);
    }
  }
  const { query } = await import('./db');
  const res = await query(
    `SELECT accel_z, speed_kmh, recorded_at FROM roughness_readings
     WHERE report_id = $1::uuid ORDER BY recorded_at ASC LIMIT 2000`,
    [reportId]
  );
  return { store: 'LOCAL_FALLBACK', rows: res.rows };
}
