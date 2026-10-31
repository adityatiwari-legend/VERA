'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * EVM wallet connect + binding via raw EIP-1193 (window.ethereum).
 * Binding = personal_sign of a server-issued nonce; the server recovers the
 * address from the signature, so nobody can claim someone else's wallet.
 */
export function useEthereumProvider(): any | null {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    return (window as any).ethereum;
  }
  return null;
}

export async function bindEvmWallet(): Promise<{ address: string }> {
  const eth = (window as any).ethereum;
  if (!eth) {
    throw new Error('No Ethereum wallet detected. Install MetaMask (or any EIP-1193 wallet).');
  }
  const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
  const address = accounts?.[0];
  if (!address) throw new Error('Wallet returned no account');

  const nonceRes = await fetch('/api/auth/wallet/evm');
  const { nonce } = await nonceRes.json();
  if (!nonce) throw new Error('Could not start wallet binding (login required)');

  const message = `VERA wallet binding\nAddress: ${address.toLowerCase()}\nNonce: ${nonce}`;
  const signature: string = await eth.request({
    method: 'personal_sign',
    params: [message, address],
  });

  const verifyRes = await fetch('/api/auth/wallet/evm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature, nonce }),
  });
  const data = await verifyRes.json();
  if (!verifyRes.ok) throw new Error(data.error || 'Wallet binding failed');
  return { address: data.wallet_address ?? address };
}

export default function ConnectWallet({
  bound,
  compact,
}: {
  bound?: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const connect = async () => {
    setLoading(true);
    setError(null);
    try {
      const { address } = await bindEvmWallet();
      setDone(address);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Wallet connection failed');
    } finally {
      setLoading(false);
    }
  };

  const address = bound || done;

  return (
    <div className="space-y-2">
      {address ? (
        <p className="flex items-center gap-2 font-mono text-xs text-ok">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Wallet bound: {address.slice(0, 6)}…{address.slice(-4)}
        </p>
      ) : (
        <button
          onClick={connect}
          disabled={loading}
          className={compact ? 'btn-secondary !px-3 !py-1.5 !text-[11px]' : 'btn-primary !text-xs'}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
          Connect wallet
        </button>
      )}
      {error && (
        <p className="flex items-start gap-1.5 text-[11px] text-bad">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
