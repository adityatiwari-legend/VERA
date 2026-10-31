'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, X, Loader2, Lock, Coins, Wallet, Info } from 'lucide-react';
import { Donation } from '@/types';
import { formatRupees } from '@/lib/utils';
import { bindEvmWallet, useEthereumProvider } from '@/components/wallet/ConnectWallet';

interface DonationModalProps {
  campaignId: string;
  campaignTitle: string;
  remainingGoal: number;
  walletBound?: string | null;
}

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000];

function uuidToBytes32(uuid: string): string {
  return '0x' + uuid.replace(/-/g, '').toLowerCase();
}

export const DonationModal: React.FC<DonationModalProps> = ({
  campaignId,
  campaignTitle,
  remainingGoal,
  walletBound,
}) => {
  const router = useRouter();
  const eth = useEthereumProvider();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<number | ''>(1000);
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletBusy, setWalletBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedDonation, setConfirmedDonation] = useState<Donation | null>(null);
  const [ethInrRate, setEthInrRate] = useState<number | null>(null);
  const [faucetNote, setFaucetNote] = useState<string | null>(null);

  const handleOpen = () => {
    setError(null);
    setConfirmedDonation(null);
    setIsOpen(true);
    if (ethInrRate === null) {
      fetch('/api/blockchain/stats')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setEthInrRate(Number(d?.eth_inr_rate) || null))
        .catch(() => {});
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (confirmedDonation) {
      router.refresh();
    }
  };

  const submitDonation = async (payload: Record<string, unknown>) => {
    const res = await fetch(`/api/campaigns/${campaignId}/donate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      throw new Error(data.error || 'Failed to process donation');
    }
    setConfirmedDonation(data.donation);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('Please select or enter a valid donation amount.');
      return;
    }
    if (amount > remainingGoal) {
      setError(`Donation amount cannot exceed remaining goal of ${formatRupees(remainingGoal)}.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await submitDonation({ amount: Number(amount), purpose: purpose || null });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWalletDonate = async () => {
    if (!amount || amount <= 0) {
      setError('Choose an amount first.');
      return;
    }
    if (!eth) {
      setError('No Ethereum wallet detected. Install MetaMask to donate on-chain.');
      return;
    }
    setWalletBusy(true);
    setError(null);
    try {
      // 1. Ensure the wallet is bound to the account (signature-verified)
      let address = walletBound ?? null;
      if (!address) {
        const bound = await bindEvmWallet();
        address = bound.address;
      }

      // 2. Make sure the wallet is on the VERA network
      const stats = await fetch('/api/blockchain/stats').then((r) => (r.ok ? r.json() : null));
      const chainId = Number(stats?.chain_id ?? 31337);
      // API returns camelCase contractAddress — snake_case here made MetaMask
      // treat the tx as a contract DEPLOYMENT ("to" was undefined).
      const contractAddress = stats?.contractAddress;
      if (!contractAddress) {
        throw new Error('The VERA contract address is not configured on the server');
      }
      const currentHex: string = await eth.request({ method: 'eth_chainId' });
      if (Number(currentHex) !== chainId) {
        try {
          await eth.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x' + chainId.toString(16) }],
          });
        } catch (switchErr: any) {
          if (switchErr?.code === 4902) {
            await eth.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x' + chainId.toString(16),
                  chainName: stats?.network || 'VERA Local',
                  rpcUrls: ['http://127.0.0.1:8545'],
                  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                },
              ],
            });
          } else {
            throw new Error('Wrong network — switch your wallet to the VERA network');
          }
        }
      }

      // 3. Local demo chain only: ensure the wallet can pay gas + value. The
      //    platform faucet tops up 1 test ETH when the balance is short.
      const rate = Number(stats?.eth_inr_rate) || 300000;
      const valueWei = BigInt(Math.round((Number(amount) / rate) * 1e18));
      if (chainId === 31337) {
        const balanceHex: string = await eth.request({
          method: 'eth_getBalance',
          params: [address, 'latest'],
        });
        const gasBuffer = BigInt(Math.round(0.01 * 1e18));
        if (BigInt(balanceHex) < valueWei + gasBuffer) {
          setFaucetNote('Requesting 1 test ETH from the local faucet…');
          const faucetRes = await fetch('/api/auth/wallet/evm/faucet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address }),
          });
          const faucetData = await faucetRes.json().catch(() => ({}));
          setFaucetNote(null);
          if (!faucetRes.ok) {
            throw new Error(faucetData.error || 'Faucet top-up failed — the wallet cannot pay gas');
          }
        }
      }

      // 4. Send donate(campaignId) with real value from the user's wallet
      const data = await eth.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: address,
            to: contractAddress,
            value: '0x' + valueWei.toString(16),
            data:
              '0x' +
              // keccak256("donate(bytes32)") selector, verified against VERA.sol
              'c37067fa' +
              uuidToBytes32(campaignId).slice(2),
          },
        ],
      });

      // 5. Record the verified tx against the campaign
      await submitDonation({ tx_hash: data, purpose: purpose || null });
    } catch (err: any) {
      if (err?.code === 4001) {
        setError('Transaction rejected in MetaMask.');
      } else if (String(err?.message || '').toLowerCase().includes('insufficient funds')) {
        setError('Your wallet lacks test ETH for gas — click donate again to trigger the local faucet.');
      } else {
        setError(err?.message || 'Wallet donation failed');
      }
    } finally {
      setWalletBusy(false);
      setFaucetNote(null);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={remainingGoal <= 0}
        className="btn-primary !w-full !px-6 !py-2.5 !text-xs sm:!w-auto"
      >
        <Coins className="h-4 w-4" />
        <span>{remainingGoal <= 0 ? 'Goal Reached' : 'Donate to Campaign'}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
          <div className="card animate-rise relative w-full max-w-lg p-6 shadow-lift sm:p-8">
            <button
              onClick={handleClose}
              aria-label="Close donation dialog"
              className="absolute right-5 top-5 rounded-lg p-1 text-mute transition-colors hover:bg-mist hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>

            {confirmedDonation ? (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-ok/20 bg-ok-soft text-ok">
                  <CheckCircle2 className="h-6 w-6" />
                </div>

                <div className="space-y-1">
                  <h3 className="font-sans text-xl font-semibold tracking-tight text-ink">
                    Donation Confirmed &amp; Earmarked
                  </h3>
                  <p className="text-xs text-mute">
                    {confirmedDonation.is_demo === false
                      ? 'Your on-chain contribution is locked in the campaign escrow vault.'
                      : 'Your demo contribution is locked in the campaign ledger.'}
                  </p>
                </div>

                <div className="space-y-2 rounded-lg border border-line bg-mist p-4 text-left text-xs">
                  <div className="flex justify-between">
                    <span className="text-mute">Reference:</span>
                    <span className="font-mono font-bold text-ink">{confirmedDonation.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mute">Amount:</span>
                    <span className="font-mono text-sm font-bold text-ok">{formatRupees(confirmedDonation.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mute">Funds type:</span>
                    {confirmedDonation.is_demo === false ? (
                      <span className="font-mono font-semibold text-ok">ON-CHAIN ({confirmedDonation.blockchain_tx_hash?.slice(0, 10)}…)</span>
                    ) : (
                      <span className="rounded-full border border-warn/25 bg-warn-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-warn">
                        DEMO FUNDS
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mute">Status:</span>
                    <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-ok">
                      <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                      LOCKED IN ESCROW
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                  <Link
                    href={`/donor/donations/${confirmedDonation.id}/trace`}
                    className="btn-primary flex-1 !py-2.5 !px-4 !text-xs"
                  >
                    Trace Contribution →
                  </Link>
                  <button
                    onClick={handleClose}
                    className="btn-secondary !py-2.5 !px-4 !text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                  <span className="eyebrow">Escrow contribution</span>
                  <h3 className="pt-1 font-sans text-xl font-semibold tracking-tight text-ink">
                    Support this Initiative
                  </h3>
                  <p className="line-clamp-1 font-sans text-xs text-mute">
                    {campaignTitle}
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-bad/20 bg-bad-soft p-3 text-xs text-bad">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Preset Amounts */}
                <div className="space-y-1.5">
                  <label className="font-mono text-[11px] font-medium uppercase tracking-wider text-mute">
                    Select Amount (₹)
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {PRESET_AMOUNTS.map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setAmount(preset)}
                        className={`rounded-lg border py-2 px-2 text-xs font-semibold transition-all ${
                          amount === preset
                            ? 'border-accent/40 bg-accent-faint text-accent-deep'
                            : 'border-line bg-white text-mute hover:border-line-strong hover:text-ink'
                        }`}
                      >
                        {formatRupees(preset)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount Input */}
                <div className="space-y-1.5">
                  <label className="font-mono text-[11px] font-medium uppercase tracking-wider text-mute" htmlFor="donation-amount">
                    Custom Amount (₹)
                  </label>
                  <input
                    id="donation-amount"
                    type="number"
                    min="10"
                    max={remainingGoal}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    placeholder="Enter custom amount"
                    className="input font-mono font-semibold"
                  />
                  <span className="font-mono text-[11px] text-faint">
                    Remaining campaign goal: {formatRupees(remainingGoal)}
                  </span>
                </div>

                {/* Note / Purpose */}
                <div className="space-y-1.5">
                  <label className="font-mono text-[11px] font-medium uppercase tracking-wider text-mute" htmlFor="donation-purpose">
                    Message or Purpose (Optional)
                  </label>
                  <input
                    id="donation-purpose"
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g. In memory of / For classroom supplies"
                    className="input !py-2 !text-xs"
                  />
                </div>

                {/* Demo-funds notice */}
                <div className="flex items-start gap-2.5 rounded-lg border border-warn/25 bg-warn-soft/60 p-3 text-xs text-warn">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="leading-relaxed">
                    <strong>DEMO FUNDS</strong> — the default contribution records demo money in the platform
                    ledger, not a real payment. To move real value, use the on-chain wallet option below.
                  </p>
                </div>

                {/* Demo submit */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={loading || walletBusy || !amount || amount <= 0}
                    className="btn-primary w-full !py-3 !text-xs"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Confirming Escrow Lock...</span>
                      </>
                    ) : (
                      <span>Confirm {formatRupees(amount || 0)} Contribution (Demo)</span>
                    )}
                  </button>
                </div>

                {/* On-chain wallet option */}
                <div className="rounded-lg border border-line bg-mist p-3.5">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <Wallet className="h-4 w-4 text-accent" /> Donate real value on-chain
                  </p>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-mute">
                    {ethInrRate
                      ? `1 ETH = ₹${ethInrRate.toLocaleString('en-IN')} → ${formatRupees(Number(amount) || 0)} ≈ ${((Number(amount) || 0) / ethInrRate).toFixed(6)} ETH`
                      : 'Loads ETH rate…'}{' '}
                    · {walletBound ? 'wallet already bound' : 'you will sign a binding message first'}
                  </p>
                  <button
                    type="button"
                    onClick={handleWalletDonate}
                    disabled={loading || walletBusy || !amount || amount <= 0}
                    className="btn-secondary mt-2.5 w-full !py-2.5 !text-xs"
                  >
                    {walletBusy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{faucetNote || 'Check your wallet…'}</span>
                      </>
                    ) : (
                      <>
                        <Wallet className="h-4 w-4" />
                        <span>Donate with wallet (on-chain)</span>
                      </>
                    )}
                  </button>
                  {faucetNote && (
                    <p className="mt-1.5 font-mono text-[10px] text-accent-deep">{faucetNote}</p>
                  )}
                </div>

                <div className="flex items-start gap-2.5 rounded-lg border border-line bg-mist p-3 text-xs text-mute">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <p className="leading-relaxed">
                    100% of your contribution is locked in the campaign escrow vault and released only upon verified milestones.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DonationModal;
