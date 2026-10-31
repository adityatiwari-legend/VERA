import { NextResponse } from 'next/server';
import { getLiveBlockchainStats } from '@/lib/blockchain';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getLiveBlockchainStats();
    return NextResponse.json(stats);
  } catch (err: any) {
    // Honest offline state — never fabricate chain telemetry.
    return NextResponse.json({
      connected: false,
      blockNumber: null,
      network: process.env.BLOCKCHAIN_NETWORK || 'Hardhat Localnet',
      contractAddress: process.env.CONTRACT_ADDRESS || null,
    });
  }
}
