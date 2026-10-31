import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ethers } from 'ethers';
import { requireAuth, AppError } from '@/lib/permissions';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const NONCE_TTL_MS = 10 * 60 * 1000;
const nonces = new Map<string, { nonce: string; issuedAt: number }>();

const verifySchema = z.object({
  address: z.string().trim().regex(/^0x[0-9a-fA-F]{40}$/),
  signature: z.string().trim().min(20),
  nonce: z.string().trim().min(8),
});

/** Issue a short-lived signing challenge for wallet binding. */
export async function GET() {
  try {
    const user = await requireAuth();
    const nonce = ethers.hexlify(ethers.randomBytes(16)).slice(2);
    nonces.set(user.id, { nonce, issuedAt: Date.now() });
    return NextResponse.json({ nonce });
  } catch (error) {
    console.error('GET /api/auth/wallet/evm error:', error);
    return NextResponse.json({ error: 'Failed to issue nonce' }, { status: 500 });
  }
}

/** Verify a personal_sign signature and bind the EVM wallet to the account. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const parsed = verifySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const entry = nonces.get(user.id);
    nonces.delete(user.id);
    if (!entry || entry.nonce !== parsed.data.nonce || Date.now() - entry.issuedAt > NONCE_TTL_MS) {
      throw new AppError('Nonce expired — request a new challenge', 400);
    }

    const message = `VERA wallet binding\nAddress: ${parsed.data.address.toLowerCase()}\nNonce: ${parsed.data.nonce}`;
    let recovered: string;
    try {
      recovered = ethers.verifyMessage(message, parsed.data.signature);
    } catch {
      throw new AppError('Invalid signature', 400);
    }
    if (recovered.toLowerCase() !== parsed.data.address.toLowerCase()) {
      throw new AppError('Signature does not match the provided address', 400);
    }

    // Reject if another account already holds this wallet
    const taken = await query(
      `SELECT id FROM users WHERE wallet_address ILIKE $1 AND id != $2::uuid LIMIT 1`,
      [parsed.data.address, user.id]
    );
    if (taken.rows[0]) {
      throw new AppError('That wallet is already bound to another account', 409);
    }

    await query(`UPDATE users SET wallet_address = $2, updated_at = NOW() WHERE id = $1::uuid`, [
      user.id,
      ethers.getAddress(parsed.data.address),
    ]);

    return NextResponse.json({ ok: true, wallet_address: ethers.getAddress(parsed.data.address) });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/auth/wallet/evm error:', error);
    return NextResponse.json({ error: 'Failed to bind wallet' }, { status: 500 });
  }
}
