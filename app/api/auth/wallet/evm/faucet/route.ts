import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ethers } from 'ethers';
import { requireAuth, AppError } from '@/lib/permissions';
import { query } from '@/lib/db';
import { rateLimit } from '@/lib/rate_limit';

export const dynamic = 'force-dynamic';

const FAUCET_AMOUNT_ETH = '1.0';

const faucetSchema = z.object({
  address: z.string().trim().regex(/^0x[0-9a-fA-F]{40}$/),
});

/**
 * Local test-ETH faucet. On the Hardhat demo chain the platform relayer tops
 * up a bound wallet so MetaMask donations can pay gas. Hard-gated to the
 * local chain — this endpoint refuses to run against any public network.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    rateLimit(`evm-faucet:${user.id}`, 5, 60_000);

    const parsed = faucetSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const network = (process.env.BLOCKCHAIN_NETWORK || '').toLowerCase();
    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 31337);
    const isLocalChain =
      chainId === 31337 || /hardhat|localhost|local/i.test(network) || !process.env.BLOCKCHAIN_RPC_URL;
    if (!isLocalChain) {
      throw new AppError(
        'The faucet only exists on the local Hardhat demo chain — public networks use real funds',
        403
      );
    }

    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const relayer = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY as string, provider);

    const bal = await provider.getBalance(relayer.address);
    if (bal < ethers.parseEther('0.5')) {
      throw new AppError('Relayer is out of test ETH — restart the Hardhat node to refill it', 503);
    }

    const tx = await relayer.sendTransaction({
      to: ethers.getAddress(parsed.data.address),
      value: ethers.parseEther(FAUCET_AMOUNT_ETH),
    });
    await tx.wait(1);

    return NextResponse.json({
      ok: true,
      amount: FAUCET_AMOUNT_ETH,
      tx_hash: tx.hash,
      message: `${FAUCET_AMOUNT_ETH} test ETH sent to your wallet (local chain only)`,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/auth/wallet/evm/faucet error:', error);
    return NextResponse.json({ error: 'Faucet transfer failed' }, { status: 500 });
  }
}
