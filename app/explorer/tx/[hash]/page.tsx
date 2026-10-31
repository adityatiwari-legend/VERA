import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ethers } from 'ethers';
import { getProvider, getNetworkName } from '@/lib/blockchain';
import { query } from '@/lib/db';
import { formatRupees } from '@/lib/utils';
import HashDisplay from '@/components/financial/HashDisplay';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ExternalLink,
  Database,
  Cpu,
  Layers,
  Sparkles,
  AlertCircle,
  SearchX
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { hash: string } }): Promise<Metadata> {
  const shortHash = params.hash ? `${params.hash.slice(0, 10)}...` : 'Transaction';
  return {
    title: `${shortHash} | VERA Block Explorer`,
    description: `Inspect verified blockchain transaction on VERA platform.`,
  };
}

interface PageProps {
  params: {
    hash: string;
  };
}

export default async function TransactionExplorerPage({ params }: PageProps) {
  const txHash = params.hash;

  if (!txHash || !txHash.startsWith('0x')) {
    return notFound();
  }

  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || 31337;
  const networkName = getNetworkName(chainId);
  // A public block-explorer link only exists for public networks — never fabricate one for local testnets.
  const publicExplorerUrl =
    Number(chainId) === 1
      ? `https://etherscan.io/tx/${txHash}`
      : Number(chainId) === 11155111
        ? `https://sepolia.etherscan.io/tx/${txHash}`
        : undefined;

  let txData: any = null;
  let receiptData: any = null;
  let blockData: any = null;
  let rpcConnected = false;
  let rpcError: string | null = null;

  try {
    const provider = getProvider();
    [txData, receiptData] = await Promise.all([
      provider.getTransaction(txHash).catch(() => null),
      provider.getTransactionReceipt(txHash).catch(() => null),
    ]);

    if (receiptData?.blockNumber) {
      blockData = await provider.getBlock(receiptData.blockNumber).catch(() => null);
    }
    rpcConnected = true;
  } catch (err: any) {
    rpcError = err.message || 'Failed to connect to blockchain node';
  }

  // Cross-reference with VERA off-chain ledger
  let ledgerRecord: any = null;
  try {
    const dbRes = await query(
      `SELECT
        ft.*,
        c.title as campaign_title,
        c.id as campaign_id,
        c.beneficiary as campaign_beneficiary,
        m.title as milestone_title,
        u.name as ngo_name
      FROM fund_transactions ft
      LEFT JOIN campaigns c ON ft.campaign_id = c.id
      LEFT JOIN milestones m ON ft.milestone_id = m.id
      LEFT JOIN users u ON c.ngo_id = u.id
      WHERE ft.blockchain_tx_hash = $1
      ORDER BY ft.created_at DESC
      LIMIT 1`,
      [txHash]
    );

    if (dbRes.rows.length > 0) {
      ledgerRecord = dbRes.rows[0];
    }
  } catch (dbErr) {
    console.warn('Could not query local ledger for tx:', dbErr);
  }

  // Honest "not found" state: no on-chain data AND no ledger reference, with the node reachable.
  const unknownTx = !txData && !receiptData && !ledgerRecord && !rpcError;

  const isConfirmed = receiptData ? receiptData.status === 1 : (ledgerRecord?.blockchain_status === 'CONFIRMED');
  const timestamp = blockData?.timestamp
    ? new Date(blockData.timestamp * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    : ledgerRecord?.created_at
    ? new Date(ledgerRecord.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    : '—';

  const breadcrumb = (
    <div className="flex items-center justify-between">
      <Link
        href={ledgerRecord?.campaign_id ? `/campaigns/${ledgerRecord.campaign_id}/audit` : '/campaigns'}
        className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-mute transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to {ledgerRecord?.campaign_id ? 'Campaign Audit Trail' : 'Campaigns'}</span>
      </Link>

      <div className="inline-flex items-center gap-2 rounded-lg border border-line bg-mist px-3 py-1 font-mono text-[11px] font-semibold text-accent-deep">
        <Cpu className="h-3.5 w-3.5 text-accent" />
        <span>Network: {networkName}</span>
      </div>
    </div>
  );

  if (unknownTx) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 pb-20 sm:px-6 lg:px-8">
        {breadcrumb}

        <div className="card flex flex-col items-center gap-3 p-14 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-mist text-mute">
            <SearchX className="h-5 w-5" />
          </span>
          <h1 className="text-lg font-semibold tracking-tight text-ink">Transaction not found</h1>
          <p className="max-w-md text-sm leading-relaxed text-mute">
            The {networkName} node has no record of this hash and it is not referenced in the
            VERA off-chain ledger. Check the hash and try again.
          </p>
          <span className="chip break-all">{txHash}</span>
          <Link href="/campaigns" className="pt-2 font-mono text-xs font-semibold text-accent hover:underline">
            Browse campaigns →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 pb-20 sm:px-6 lg:px-8">
      {/* Navigation Breadcrumb */}
      {breadcrumb}

      {rpcError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-warn/20 bg-warn-soft p-4 text-xs leading-relaxed text-warn">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Could not reach the {networkName} node — on-chain fields below may be incomplete.
            {rpcError ? ` (${rpcError})` : ''}
          </p>
        </div>
      )}

      {/* Header Title Card */}
      <div className="card space-y-4 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/20 bg-accent-faint text-accent">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-ink">
                VERA Block Explorer
              </h1>
              <p className="text-xs text-mute">
                Cryptographic proof &amp; state transition receipt on the immutable ledger
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 font-mono text-xs font-semibold ${
                isConfirmed
                  ? 'border-ok/20 bg-ok-soft text-ok'
                  : 'border-warn/20 bg-warn-soft text-warn'
              }`}
            >
              {isConfirmed ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>✓ Confirmed on Chain</span>
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5 animate-spin" />
                  <span>⏳ Pending Confirmation</span>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="border-t border-line pt-3">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <div className="font-mono text-[10px] uppercase tracking-wider text-faint">
              Transaction Hash
            </div>
            <HashDisplay hash={txHash} type="tx" explorerUrl={publicExplorerUrl} />
          </div>
          <div className="break-all rounded-lg border border-line bg-mist px-3 py-2 font-mono text-xs text-ink selection:bg-accent/20">
            {txHash}
          </div>
        </div>
      </div>

      {/* VERA Business Context (If Synchronized with Platform) */}
      {ledgerRecord && (
        <div className="card space-y-4 p-6">
          <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Synchronized VERA Audit Ledger Record</span>
            </div>
            <span className="chip">Ref: {ledgerRecord.reference}</span>
          </div>

          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 md:grid-cols-4">
            <div className="rounded-lg border border-line bg-mist p-3">
              <div className="font-mono text-[10px] uppercase text-faint">Action Type</div>
              <div className="mt-0.5 font-semibold text-ink">{ledgerRecord.type}</div>
            </div>

            <div className="rounded-lg border border-line bg-mist p-3">
              <div className="font-mono text-[10px] uppercase text-faint">Amount</div>
              <div className="mt-0.5 font-mono font-bold text-accent-deep">
                {formatRupees(Number(ledgerRecord.amount))}
              </div>
            </div>

            <div className="rounded-lg border border-line bg-mist p-3">
              <div className="font-mono text-[10px] uppercase text-faint">Initiative</div>
              <div className="mt-0.5 truncate font-semibold text-ink" title={ledgerRecord.campaign_title}>
                {ledgerRecord.campaign_title}
              </div>
            </div>

            <div className="rounded-lg border border-line bg-mist p-3">
              <div className="font-mono text-[10px] uppercase text-faint">Executing NGO</div>
              <div className="mt-0.5 truncate font-semibold text-ink">
                {ledgerRecord.ngo_name || '—'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-2 text-xs">
            <div className="text-mute">
              {ledgerRecord.milestone_title ? (
                <span>Assigned Milestone: <strong className="font-semibold text-ink">{ledgerRecord.milestone_title}</strong></span>
              ) : (
                <span>Funds securely allocated in campaign smart contract escrow</span>
              )}
            </div>

            <Link
              href={`/campaigns/${ledgerRecord.campaign_id}/audit`}
              className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-accent hover:underline"
            >
              <span>View Full Campaign Audit Trail</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Technical On-Chain Details Table */}
      <div className="card space-y-4 p-6">
        <div className="flex items-center gap-2 border-b border-line pb-3 text-sm font-semibold text-ink">
          <Layers className="h-4 w-4 text-accent" />
          <span>On-Chain Transaction Attributes</span>
        </div>

        <div className="divide-y divide-line font-mono text-xs">
          <div className="flex flex-col gap-1 py-2.5 sm:grid sm:grid-cols-3 sm:gap-4 sm:items-center">
            <dt className="text-faint">Status</dt>
            <dd className="flex items-center gap-2 font-semibold text-ink sm:col-span-2">
              <span className={`inline-block h-2 w-2 rounded-full ${isConfirmed ? 'bg-ok' : 'bg-warn'}`} />
              <span>{isConfirmed ? 'Success / Mined' : 'Pending'}</span>
            </dd>
          </div>

          <div className="flex flex-col gap-1 py-2.5 sm:grid sm:grid-cols-3 sm:gap-4 sm:items-center">
            <dt className="text-faint">Block Height</dt>
            <dd className="text-mute sm:col-span-2">
              {receiptData?.blockNumber ? `#${receiptData.blockNumber}` : (ledgerRecord?.blockchain_block_number ? `#${ledgerRecord.blockchain_block_number}` : '—')}
            </dd>
          </div>

          <div className="flex flex-col gap-1 py-2.5 sm:grid sm:grid-cols-3 sm:gap-4 sm:items-center">
            <dt className="text-faint">Timestamp</dt>
            <dd className="text-mute sm:col-span-2">
              {timestamp}
            </dd>
          </div>

          <div className="flex flex-col gap-1 py-2.5 sm:grid sm:grid-cols-3 sm:gap-4 sm:items-center">
            <dt className="text-faint">From (Sender)</dt>
            <dd className="break-all rounded-lg border border-line bg-mist p-2 text-mute sm:col-span-2">
              {txData?.from || '—'}
            </dd>
          </div>

          <div className="flex flex-col gap-1 py-2.5 sm:grid sm:grid-cols-3 sm:gap-4 sm:items-center">
            <dt className="text-faint">Interacted With (Contract)</dt>
            <dd className="break-all rounded-lg border border-line bg-mist p-2 text-accent-deep sm:col-span-2">
              {txData?.to ? (
                <>
                  {txData.to}
                  <span className="ml-1 font-sans text-[11px] text-faint">(VERA.sol)</span>
                </>
              ) : (
                '—'
              )}
            </dd>
          </div>

          <div className="flex flex-col gap-1 py-2.5 sm:grid sm:grid-cols-3 sm:gap-4 sm:items-center">
            <dt className="text-faint">Value Transacted</dt>
            <dd className="text-mute sm:col-span-2">
              {txData?.value ? `${ethers.formatEther(txData.value)} ETH (${txData.value.toString()} wei)` : '—'}
            </dd>
          </div>

          <div className="flex flex-col gap-1 py-2.5 sm:grid sm:grid-cols-3 sm:gap-4 sm:items-center">
            <dt className="text-faint">Gas Used</dt>
            <dd className="text-mute sm:col-span-2">
              {receiptData?.gasUsed ? `${receiptData.gasUsed.toString()} units` : '—'}
            </dd>
          </div>
        </div>
      </div>

      {/* Raw Receipt Payload — the page's single dark technical accent */}
      <div className="card space-y-3 p-6">
        <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
          <div className="flex items-center gap-2 font-mono text-xs font-semibold text-ink">
            <Database className="h-3.5 w-3.5 text-accent" />
            <span>Raw JSON-RPC State</span>
          </div>
          <span className="font-mono text-[10px] text-faint">JSON 2.0 Response</span>
        </div>

        <pre className="theme-night max-h-56 overflow-x-auto rounded-lg border border-white/[0.08] bg-night p-4 font-mono text-[11px] leading-relaxed text-night-mute">
          {JSON.stringify(
            {
              jsonrpc: '2.0',
              status: isConfirmed ? 'CONFIRMED' : 'PENDING',
              network: networkName,
              transactionHash: txHash,
              blockNumber: receiptData?.blockNumber ?? ledgerRecord?.blockchain_block_number ?? null,
              from: txData?.from ?? null,
              to: txData?.to ?? null,
              gasUsed: receiptData?.gasUsed?.toString() ?? null,
              veraLedgerReference: ledgerRecord?.reference ?? null
            },
            null,
            2
          )}
        </pre>
      </div>

      {/* Footer Info */}
      <div className="flex items-start gap-2.5 rounded-xl border border-line bg-mist p-4 text-xs leading-relaxed text-mute">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
        <p>
          VERA operates on EVM-compatible networks. On local testnets (Chain ID 31337), this in-app explorer translates raw JSON-RPC state transitions into transparent, human-auditable receipts. On public networks (such as Sepolia), transactions can also be verified on public block explorers.
        </p>
      </div>
    </div>
  );
}
