import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSolanaStatus, isSolanaProgramConfigured } from '@/lib/solana';
import { isGeminiConfigured } from '@/lib/gemini';
import { isTigerConfigured } from '@/lib/tiger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 * Health check endpoint for monitoring and container orchestration.
 * Returns application status, uptime, and integration flags.
 */
export async function GET() {
  let dbOk = false;
  try {
    await query('SELECT 1');
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const solana = getSolanaStatus();

  return NextResponse.json({
    status: dbOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '0.3.0',
    integrations: {
      database: dbOk,
      gemini_vision: isGeminiConfigured(),
      solana_program: isSolanaProgramConfigured(),
      solana_network: solana.network,
      tiger_data: isTigerConfigured(),
    },
  });
}
