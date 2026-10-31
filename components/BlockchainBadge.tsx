'use client';

import React from 'react';
import { BlockchainStatus } from '@/types';
import { getExplorerTxUrl } from '@/lib/blockchain';

interface BlockchainBadgeProps {
  status?: BlockchainStatus | null;
  txHash?: string | null;
  network?: string | null;
  chainId?: number | string;
  className?: string;
  showExplorerLink?: boolean;
}

export const BlockchainBadge: React.FC<BlockchainBadgeProps> = ({
  status = 'NOT_SUBMITTED',
  txHash,
  network,
  chainId,
  className = '',
  showExplorerLink = true,
}) => {
  const currentStatus = status || 'NOT_SUBMITTED';

  const getStatusColor = () => {
    switch (currentStatus) {
      case 'CONFIRMED':
        return 'bg-ok-soft text-ok border-ok/25';
      case 'SUBMITTED':
      case 'PENDING':
        return 'bg-warn-soft text-warn border-warn/25 animate-pulse';
      case 'FAILED':
        return 'bg-bad-soft text-bad border-bad/25';
      case 'NOT_SUBMITTED':
      default:
        return 'bg-mist text-mute border-line';
    }
  };

  const getStatusLabel = () => {
    switch (currentStatus) {
      case 'CONFIRMED':
        return '✓ Blockchain Confirmed';
      case 'SUBMITTED':
        return '⏳ Submitted to Testnet';
      case 'PENDING':
        return '⏳ Blockchain Pending';
      case 'FAILED':
        return '✕ Blockchain Failed';
      case 'NOT_SUBMITTED':
      default:
        return '○ Not Submitted';
    }
  };

  const explorerUrl = txHash ? getExplorerTxUrl(chainId, txHash) : null;
  const truncatedHash = txHash ? `${txHash.substring(0, 8)}...${txHash.substring(txHash.length - 6)}` : null;

  return (
    <div className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
      <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold ${getStatusColor()}`}>
        {getStatusLabel()}
      </span>

      {network && (
        <span className="inline-flex items-center rounded-lg border border-accent/20 bg-accent-faint px-2 py-0.5 font-mono text-xs font-medium text-accent-deep">
          Network: {network}
        </span>
      )}

      {txHash && (
        <span className="chip">
          Tx: {truncatedHash}
        </span>
      )}

      {showExplorerLink && explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 font-mono text-xs text-accent underline transition-colors hover:text-accent-deep"
        >
          View on Explorer ↗
        </a>
      )}
    </div>
  );
};
