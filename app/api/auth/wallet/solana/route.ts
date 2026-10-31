import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';
import { requireAuth, AppError } from '@/lib/permissions';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const bindSchema = z.object({
  pubkey: z.string().trim().min(32).max(44),
});

/**
 * Bind a Solana payout wallet to the signed-in contractor (or any user).
 * The pubkey is validated syntactically (ed25519 on-curve). Payouts only move
 * via the on-chain escrow to this address, and contractors are admin-approved
 * before binding matters.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const parsed = bindSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    let pubkey: PublicKey;
    try {
      pubkey = new PublicKey(parsed.data.pubkey);
    } catch {
      throw new AppError('That is not a valid Solana public key', 400);
    }

    await query(`UPDATE users SET solana_pubkey = $2, updated_at = NOW() WHERE id = $1::uuid`, [
      user.id,
      pubkey.toBase58(),
    ]);

    return NextResponse.json({ ok: true, solana_pubkey: pubkey.toBase58() });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/auth/wallet/solana error:', error);
    return NextResponse.json({ error: 'Failed to bind wallet' }, { status: 500 });
  }
}
