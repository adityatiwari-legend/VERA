import { NextResponse } from 'next/server';
import { requireAuth, AppError } from '@/lib/permissions';
import { createDonationSchema } from '@/lib/validation';
import { createDonation } from '@/lib/donations';
import { verifyUserDonationTx, weiToInr } from '@/lib/blockchain';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const validated = createDonationSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { tx_hash: txHash, amount, purpose } = validated.data;

    if (txHash) {
      // Wallet donation: the user signed and broadcast the transaction
      // themselves. We verify it on-chain and derive the credited amount.
      const verification = await verifyUserDonationTx(txHash);
      if (!verification.ok || verification.valueWei === null) {
        return NextResponse.json(
          { error: verification.error || 'On-chain verification failed' },
          { status: 400 }
        );
      }
      const creditedInr = weiToInr(verification.valueWei);
      if (creditedInr <= 0) {
        return NextResponse.json({ error: 'Transaction value too small to credit' }, { status: 400 });
      }
      const donation = await createDonation(
        user.id,
        params.id,
        { amount: creditedInr, purpose: purpose ?? undefined },
        { isDemo: false, evmTxHash: txHash, evmBlockNumber: verification.blockNumber }
      );
      return NextResponse.json(
        {
          message: `On-chain donation credited: ${creditedInr.toLocaleString('en-IN')} ₹ at the configured ETH rate`,
          donation,
        },
        { status: 201 }
      );
    }

    if (!amount) {
      return NextResponse.json(
        { error: 'amount is required (or provide tx_hash for an on-chain wallet donation)' },
        { status: 400 }
      );
    }

    // Demo donation: recorded in the platform ledger, clearly labeled demo.
    const donation = await createDonation(user.id, params.id, { amount, purpose });
    return NextResponse.json(
      {
        message: 'Demo funds locked in the ledger (DEMO — not real money)',
        donation,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error(`Error in POST /api/campaigns/${params.id}/donate:`, error);
    return NextResponse.json({ error: 'Internal server error during donation' }, { status: 500 });
  }
}
